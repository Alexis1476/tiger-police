import type { World } from 'koota'
import { IsPlayer, Transform, Weapon } from '../ecs/traits'
import { CameraRig, Time } from '../ecs/world'
import { angleLerp, damp } from '../core/math'

/** While aiming (or just after a shot) the player turns to face where the camera looks. */
export function playerFacingSystem(world: World) {
  const dt = world.get(Time)!.delta
  const { yaw } = world.get(CameraRig)!
  world.query(IsPlayer, Transform, Weapon).updateEach(([t, w]) => {
    if (w.aiming || w.aimHold > 0) t.yaw = angleLerp(t.yaw, yaw, damp(22, dt))
  })
}
