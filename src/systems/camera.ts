import type { World } from 'koota'
import * as THREE from 'three'
import { IsPlayer, PrevTransform, Rig, Transform, View } from '../ecs/traits'
import { CameraRig, GameMode, Input, Time } from '../ecs/world'
import type { GameContext } from '../engine/context'
import { Layer, groups } from '../engine/physics'
import { CAMERA } from '../game/config'
import { angleLerp, clamp, damp, lerp } from '../core/math'

const pivot = new THREE.Vector3()
const back = new THREE.Vector3()
/** The camera ray only hits level geometry, never characters. */
const STATIC_ONLY = groups(0xffff, Layer.Static)

/**
 * Third-person over-the-shoulder camera that pulls in when a wall is behind the player,
 * zooms when aiming, kicks on recoil, and toggles to first person with V.
 */
export function cameraSystem(world: World, { render, physics }: GameContext) {
  const rig = world.get(CameraRig)!
  const input = world.get(Input)!
  const { frameDelta: dt, alpha } = world.get(Time)!
  const { mode } = world.get(GameMode)!
  const camera = render.camera

  if (mode === 'title') {
    rig.attract += dt * 0.03
    const a = Math.PI + 0.5 * Math.sin(rig.attract)
    camera.position.set(Math.cos(a) * 17, 9 + Math.sin(rig.attract * 0.7) * 1.5, Math.sin(a) * 14)
    camera.lookAt(26, 9, 0)
    setFov(camera, 58, 1)
    input.lookX = input.lookY = 0
    return
  }

  if (mode === 'play') {
    const k = CAMERA.sensitivity * (rig.aimBlend > 0.5 ? 0.6 : 1)
    rig.yaw -= input.lookX * k
    rig.pitch = clamp(rig.pitch - input.lookY * k, CAMERA.minPitch, CAMERA.maxPitch)
    if (input.pressedThisFrame.has('KeyV')) rig.firstPerson = !rig.firstPerson
  }
  input.lookX = input.lookY = 0
  rig.aimBlend = lerp(rig.aimBlend, mode === 'play' && input.aimHeld ? 1 : 0, damp(10, dt))
  rig.recoil = Math.max(0, rig.recoil - dt * 8)

  const player = world.queryFirst(IsPlayer, Transform, PrevTransform)
  if (!player) return
  const t = player.get(Transform)!
  const p = player.get(PrevTransform)!
  const x = lerp(p.x, t.x, alpha)
  const y = lerp(p.y, t.y, alpha)
  const z = lerp(p.z, t.z, alpha)

  const cp = Math.cos(rig.pitch)
  const fx = Math.sin(rig.yaw) * cp
  const fy = Math.sin(rig.pitch)
  const fz = Math.cos(rig.yaw) * cp

  // First person: hide the head (it would fill the screen); arms and gun stay visible.
  const body = player.get(Rig)
  if (body) body.head.visible = !rig.firstPerson
  else {
    const view = player.get(View)
    if (view) view.visible = !rig.firstPerson
  }

  if (rig.firstPerson) {
    const bodyYaw = angleLerp(p.yaw, t.yaw, alpha)
    setFov(camera, 72, dt)
    camera.position.set(x + Math.sin(bodyYaw) * 0.14, y + 1.74, z + Math.cos(bodyYaw) * 0.14)
    camera.lookAt(camera.position.x + fx, camera.position.y + fy + rig.recoil * 0.02, camera.position.z + fz)
    return
  }

  setFov(camera, lerp(62, 46, rig.aimBlend), dt)
  const distance = lerp(CAMERA.distance, 2.1, rig.aimBlend)
  const shoulder = lerp(CAMERA.shoulder, 0.62, rig.aimBlend)
  const height = lerp(CAMERA.headHeight, 1.58, rig.aimBlend)

  pivot.set(x - Math.cos(rig.yaw) * shoulder, y + height, z + Math.sin(rig.yaw) * shoulder)
  back.set(-fx, -fy, -fz)

  const { rapier } = physics
  const hit = physics.world.castRay(new rapier.Ray(pivot, back), distance + 0.3, true, undefined, STATIC_ONLY)
  const want = hit ? Math.max(0.35, hit.timeOfImpact - 0.3) : distance
  // Snap in immediately so we never see through walls; ease back out.
  rig.currentDistance = want < rig.currentDistance ? want : lerp(rig.currentDistance, want, damp(5, dt))

  camera.position.copy(pivot).addScaledVector(back, rig.currentDistance)
  camera.lookAt(pivot.x + fx * 20, pivot.y + fy * 20 + rig.recoil * 0.3, pivot.z + fz * 20)
}

function setFov(camera: THREE.PerspectiveCamera, target: number, dt: number) {
  if (Math.abs(camera.fov - target) < 0.05) return
  camera.fov = lerp(camera.fov, target, damp(12, dt))
  camera.updateProjectionMatrix()
}
