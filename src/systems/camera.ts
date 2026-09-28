import type { World } from 'koota'
import * as THREE from 'three'
import { IsPlayer, PrevTransform, Transform } from '../ecs/traits'
import { CameraRig, GameMode, Input, Time } from '../ecs/world'
import type { GameContext } from '../engine/context'
import { Layer, groups } from '../engine/physics'
import { CAMERA } from '../game/config'
import { clamp, damp, lerp } from '../core/math'

const pivot = new THREE.Vector3()
const back = new THREE.Vector3()
/** The camera ray only hits level geometry, never characters. */
const STATIC_ONLY = groups(0xffff, Layer.Static)

/** Over-the-shoulder third-person camera that pulls in when a wall is behind the player. */
export function cameraSystem(world: World, { render, physics }: GameContext) {
  const rig = world.get(CameraRig)!
  const input = world.get(Input)!
  const { frameDelta: dt, alpha } = world.get(Time)!
  const { mode } = world.get(GameMode)!
  const camera = render.camera

  if (mode === 'title') {
    rig.attract += dt * 0.05
    const a = rig.attract
    camera.position.set(Math.cos(a) * 30, 13 + Math.sin(a * 0.7) * 2, Math.sin(a) * 30)
    camera.lookAt(0, 2, 0)
    input.lookX = input.lookY = 0
    return
  }

  if (mode === 'play') {
    rig.yaw -= input.lookX * CAMERA.sensitivity
    rig.pitch = clamp(rig.pitch - input.lookY * CAMERA.sensitivity, CAMERA.minPitch, CAMERA.maxPitch)
  }
  input.lookX = input.lookY = 0

  const player = world.queryFirst(IsPlayer, Transform, PrevTransform)
  if (!player) return
  const t = player.get(Transform)!
  const p = player.get(PrevTransform)!

  const cp = Math.cos(rig.pitch)
  const fx = Math.sin(rig.yaw) * cp
  const fy = Math.sin(rig.pitch)
  const fz = Math.cos(rig.yaw) * cp

  pivot.set(lerp(p.x, t.x, alpha), lerp(p.y, t.y, alpha) + CAMERA.headHeight, lerp(p.z, t.z, alpha))
  pivot.x += -Math.cos(rig.yaw) * CAMERA.shoulder
  pivot.z += Math.sin(rig.yaw) * CAMERA.shoulder
  back.set(-fx, -fy, -fz)

  const { rapier } = physics
  const hit = physics.world.castRay(
    new rapier.Ray(pivot, back),
    CAMERA.distance + 0.3,
    true,
    undefined,
    STATIC_ONLY,
  )
  const want = hit ? Math.max(0.35, hit.timeOfImpact - 0.3) : CAMERA.distance
  // Snap in immediately so we never see through walls; ease back out.
  rig.currentDistance = want < rig.currentDistance ? want : lerp(rig.currentDistance, want, damp(5, dt))

  camera.position.copy(pivot).addScaledVector(back, rig.currentDistance)
  camera.lookAt(pivot.x + fx * 20, pivot.y + fy * 20, pivot.z + fz * 20)
}
