import type { World } from 'koota'
import { IsPlayer, Locomotion, Velocity } from '../ecs/traits'
import { Time } from '../ecs/world'
import type { GameContext } from '../engine/context'
import { PLAYER } from '../game/config'

let stride = 0

/** Footsteps, jumps and landings for the player (locomotion only records what happened). */
export function playerSoundsSystem(world: World, { audio }: GameContext) {
  const dt = world.get(Time)!.delta
  const player = world.queryFirst(IsPlayer, Locomotion, Velocity)
  if (!player) return
  const loco = player.get(Locomotion)!
  const v = player.get(Velocity)!

  if (loco.jumped) audio.jump()
  if (loco.landImpact > 4) audio.land()

  const speed = Math.hypot(v.x, v.z)
  if (loco.grounded && speed > 0.5) {
    stride += speed * dt
    if (stride > (speed > PLAYER.walk + 0.5 ? 1.6 : 1.15)) {
      stride = 0
      audio.step()
    }
  }
}
