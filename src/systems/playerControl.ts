import type { World } from 'koota'
import { IsPlayer, MoveIntent } from '../ecs/traits'
import { CameraRig, GameMode, Input } from '../ecs/world'
import { PLAYER } from '../game/config'

/** Turns keyboard state into a camera-relative MoveIntent for the player. */
export function playerControlSystem(world: World) {
  const input = world.get(Input)!
  const { yaw } = world.get(CameraRig)!
  const playing = world.get(GameMode)!.mode === 'play'
  const k = input.keys

  let ix = 0
  let iz = 0
  if (playing) {
    if (k.has('KeyW') || k.has('ArrowUp')) iz += 1
    if (k.has('KeyS') || k.has('ArrowDown')) iz -= 1
    if (k.has('KeyD') || k.has('ArrowRight')) ix += 1
    if (k.has('KeyA') || k.has('ArrowLeft')) ix -= 1
    const len = Math.hypot(ix, iz)
    if (len > 1) {
      ix /= len
      iz /= len
    }
  }
  const sprint = k.has('ShiftLeft') || k.has('ShiftRight')

  // Camera forward and right on the ground plane.
  const fx = Math.sin(yaw)
  const fz = Math.cos(yaw)
  const rx = -Math.cos(yaw)
  const rz = Math.sin(yaw)

  world.query(IsPlayer, MoveIntent).updateEach(([intent]) => {
    intent.x = fx * iz + rx * ix
    intent.z = fz * iz + rz * ix
    intent.speed = sprint ? PLAYER.sprint : PLAYER.walk
    intent.jump = playing && input.jumpPressed
  })
  input.jumpPressed = false
}
