import type { World } from 'koota'
import * as THREE from 'three'
import { BanditBrain, BanditState, CharacterBody, IsBandit, IsPlayer, Transform, Weapon } from '../ecs/traits'
import { CameraRig, Device, GameMode, Input, Time } from '../ecs/world'
import type { GameContext } from '../engine/context'
import { emitNoise, spawnProjectile } from '../entities/projectile'
import { clamp } from '../core/math'
import { CAMERA, PROJECTILE } from '../game/config'

const forward = new THREE.Vector3()
const aim = new THREE.Vector3()
const shoulder = new THREE.Vector3()
const dir = new THREE.Vector3()
const muzzle = new THREE.Vector3()
const vel = new THREE.Vector3()

/** Firing, reloading and aiming for every entity with a Weapon (only the player, for now). */
export function weaponSystem(world: World, ctx: GameContext) {
  const dt = world.get(Time)!.delta
  const now = world.get(Time)!.elapsed
  const input = world.get(Input)!
  const rig = world.get(CameraRig)!
  const playing = world.get(GameMode)!.mode === 'play'
  const touch = world.get(Device)!.touch

  world.query(IsPlayer, Weapon, Transform, CharacterBody).updateEach(([w, t, cb]) => {
    w.cooldown = Math.max(0, w.cooldown - dt)
    w.aimHold = Math.max(0, w.aimHold - dt)
    w.spread = Math.max(0, w.spread - dt * 30)
    // On touch, holding the fire button also aims (there's no second mouse button).
    w.aiming = playing && (input.aimHeld || (touch && input.fireHeld))

    if (w.reload > 0) {
      w.reload -= dt
      if (w.reload <= 0) {
        w.reload = 0
        w.ammo = w.magazine
      }
    }
    if (w.autoReload > 0) {
      w.autoReload -= dt
      if (w.autoReload <= 0) startReload(w, ctx)
    }
    if (!playing) return

    if (input.pressed.has('KeyR')) startReload(w, ctx)

    const wantsFire = input.fireHeld || input.pressed.has('Click')
    if (!wantsFire || w.reload > 0 || w.cooldown > 0) return
    if (w.ammo <= 0) {
      ctx.audio.dry()
      startReload(w, ctx)
      w.cooldown = 0.3
      return
    }

    w.ammo--
    w.cooldown = w.fireInterval
    w.aimHold = 1.4
    t.yaw = rig.yaw

    // Aim where the crosshair points: first thing the camera ray hits (not the shooter).
    const camera = ctx.render.camera
    camera.getWorldDirection(forward)
    const { rapier, world: pw } = ctx.physics
    const hit = pw.castRay(new rapier.Ray(camera.position, forward), 90, true, undefined, undefined, cb.collider)
    const dist = hit && hit.timeOfImpact > 0.4 ? hit.timeOfImpact : 90
    aim.copy(camera.position).addScaledVector(forward, dist)
    if (touch) assistAim(world, camera.position, forward, aim)

    // Fire from the right shoulder toward that point. If the point is behind or too close,
    // fall back to straight ahead.
    shoulder.set(t.x - Math.cos(rig.yaw) * 0.3, t.y + 1.45, t.z + Math.sin(rig.yaw) * 0.3)
    dir.copy(aim).sub(shoulder)
    const len = dir.length()
    dir.divideScalar(len || 1)
    if (dir.dot(forward) < 0.2 || len < 1.2) {
      dir.copy(forward)
      aim.copy(shoulder).addScaledVector(forward, 30)
    }
    muzzle.copy(shoulder).addScaledVector(dir, 0.62)

    // Ballistic compensation: launch slightly upward so gravity brings it onto the aim point.
    vel.copy(aim).sub(muzzle)
    const flight = Math.max(0.5, vel.length()) / w.muzzleSpeed
    vel.divideScalar(flight)
    vel.y += 0.5 * PROJECTILE.gravity * flight

    spawnProjectile(world, muzzle, vel, cb.collider.handle, now)
    ctx.effects.muzzleFlash(muzzle)
    ctx.audio.shot()
    rig.pitch = clamp(rig.pitch + 0.01, CAMERA.minPitch, CAMERA.maxPitch)
    rig.recoil = 1
    w.spread = Math.min(w.spread + 6, 16)
    emitNoise(world, t.x, t.z, 14)
    if (w.ammo === 0) w.autoReload = 0.35
  })
}

const toTarget = new THREE.Vector3()

/**
 * Touch aim assist (from the legacy build): fingers are imprecise, so a shot snaps to the
 * body of the bandit closest to the crosshair, within ~6° and 45 m.
 */
function assistAim(world: World, from: THREE.Vector3, forward: THREE.Vector3, aim: THREE.Vector3) {
  let bestAngle = 0.11
  world.query(IsBandit, BanditBrain, Transform).readEach(([brain, t]) => {
    if (brain.state === BanditState.Cuffed) return
    const bodyY = t.y + (brain.state === BanditState.Stunned ? 0.6 : 1.15)
    toTarget.set(t.x, bodyY, t.z).sub(from)
    if (toTarget.length() > 45) return
    const angle = toTarget.normalize().angleTo(forward)
    if (angle < bestAngle) {
      bestAngle = angle
      aim.set(t.x, bodyY, t.z)
    }
  })
}

function startReload(w: { reload: number; ammo: number; magazine: number; reloadTime: number }, ctx: GameContext) {
  if (w.reload > 0 || w.ammo >= w.magazine) return
  w.reload = w.reloadTime
  ctx.audio.reload()
}
