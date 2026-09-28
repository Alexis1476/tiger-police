import type { World } from 'koota'
import { Stats, Time } from '../ecs/world'

let acc = 0
let frames = 0

/** Publishes the frame rate and entity count four times a second. */
export function statsSystem(world: World) {
  acc += world.get(Time)!.frameDelta
  frames++
  if (acc < 0.25) return
  world.set(Stats, { fps: Math.round(frames / acc), entities: world.entities.length })
  acc = 0
  frames = 0
}
