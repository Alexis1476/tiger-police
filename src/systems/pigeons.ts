import type { World } from 'koota'
import * as THREE from 'three'
import { IsPlayer, Noise, Pigeon, PigeonFlock, PigeonState, PrevTransform, Transform, View } from '../ecs/traits'
import { GameMode, Time } from '../ecs/world'
import type { GameContext } from '../engine/context'
import { randomPlazaSpot } from '../entities/pigeons'
import { angleLerp, damp, lerp, randRange } from '../core/math'
import { CURB } from '../world/palette'

let flapCooldown = 0

/** Pigeons peck and hop around; the player or a gunshot sends them flying, then they land. */
export function pigeonSystem(world: World, { audio }: GameContext) {
  const dt = world.get(Time)!.delta
  const playing = world.get(GameMode)!.mode === 'play'
  const player = world.queryFirst(IsPlayer, Transform)?.get(Transform)
  const noises = world.query(Noise).map((e) => e.get(Noise)!)
  flapCooldown -= dt
  let flapped = false

  world.query(Pigeon, Transform).updateEach(([p, t]) => {
    p.t += dt
    p.pitch = 0
    p.flap = 1
    if (p.state === PigeonState.Pecking) {
      const dx = player ? t.x - player.x : 99
      const dz = player ? t.z - player.z : 99
      const d = Math.hypot(dx, dz)
      const scared = (playing && d < 2.8) || noises.some((n) => Math.hypot(t.x - n.x, t.z - n.z) < n.radius)
      if (scared) {
        p.state = PigeonState.Flying
        p.flyTimer = randRange(3, 6)
        p.hasLanding = false
        p.vx = (dx / (d || 1)) * 4 + randRange(-1.2, 1.2)
        p.vz = (dz / (d || 1)) * 4 + randRange(-1.2, 1.2)
        p.vy = randRange(4, 6)
        flapped = true
        return
      }
      p.hopTimer -= dt
      if (p.hopTimer <= 0) {
        p.hopTimer = randRange(0.6, 2.8)
        t.yaw += randRange(-1.3, 1.3)
        p.hopX = Math.sin(t.yaw) * 0.3
        p.hopZ = Math.cos(t.yaw) * 0.3
        p.hop = 0.25
      }
      if (p.hop > 0) {
        p.hop -= dt
        t.x += p.hopX * dt * 4
        t.z += p.hopZ * dt * 4
        if (Math.abs(t.x) > 12 || Math.abs(t.z) > 12 || Math.hypot(t.x, t.z) < 3) {
          t.yaw += Math.PI
          t.x -= p.hopX * dt * 8
          t.z -= p.hopZ * dt * 8
        }
      }
      p.pitch = Math.sin(p.t * 7 + p.slot) > 0.55 ? 0.65 : 0
      t.y = CURB + (p.hop > 0 ? Math.sin(((0.25 - p.hop) / 0.25) * Math.PI) * 0.07 : 0)
      return
    }

    // Flying: climb away, then glide back down to a free spot.
    p.flyTimer -= dt
    p.flap = 1 + 0.4 * Math.abs(Math.sin(p.t * 30))
    if (p.flyTimer > 0) {
      p.vy -= 2.5 * dt
      if (t.y > 9) p.vy = Math.min(p.vy, 0.3)
      t.x += p.vx * dt
      t.y += p.vy * dt
      t.z += p.vz * dt
    } else {
      if (!p.hasLanding) {
        ;[p.landX, p.landZ] = randomPlazaSpot()
        p.hasLanding = true
      }
      const dx = p.landX - t.x
      const dz = p.landZ - t.z
      const d = Math.hypot(dx, dz)
      const sp = Math.min(6, d * 1.5 + 0.5)
      p.vx = (dx / (d || 1)) * sp
      p.vz = (dz / (d || 1)) * sp
      t.x += p.vx * dt
      t.z += p.vz * dt
      t.y = lerp(t.y, CURB + Math.min(8, d * 0.6), damp(2, dt))
      if (d < 0.3 && t.y < CURB + 0.4) {
        p.state = PigeonState.Pecking
        t.y = CURB
        t.x = p.landX
        t.z = p.landZ
      }
    }
    t.yaw = Math.atan2(p.vx, p.vz)
    p.pitch = -0.2
  })

  if (flapped && flapCooldown <= 0) {
    audio.flap({ x: 0, z: 0 })
    flapCooldown = 1.2
  }
}

const m = new THREE.Matrix4()
const q = new THREE.Quaternion()
const e = new THREE.Euler()
const p = new THREE.Vector3()
const s = new THREE.Vector3()

/** Writes every pigeon's interpolated pose into the flock's instanced mesh. */
export function pigeonRenderSystem(world: World) {
  const mesh = world.queryFirst(PigeonFlock, View)?.get(View) as THREE.InstancedMesh | undefined
  if (!mesh) return
  const a = world.get(Time)!.alpha
  world.query(Pigeon, Transform, PrevTransform).readEach(([pg, t, prev]) => {
    e.set(pg.pitch, angleLerp(prev.yaw, t.yaw, a), 0)
    q.setFromEuler(e)
    m.compose(p.set(lerp(prev.x, t.x, a), lerp(prev.y, t.y, a), lerp(prev.z, t.z, a)), q, s.set(pg.flap, 1, 1))
    mesh.setMatrixAt(pg.slot, m)
  })
  mesh.instanceMatrix.needsUpdate = true
}
