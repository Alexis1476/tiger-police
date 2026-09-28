import type { World } from 'koota'
import { IsCivilian, Transform } from '../ecs/traits'
import { Stats, Time } from '../ecs/world'

let acc = 0
let frames = 0

/** Publishes HUD numbers four times a second (world.set notifies React subscribers). */
export function statsSystem(world: World) {
  acc += world.get(Time)!.frameDelta
  frames++
  if (acc < 0.25) return
  world.set(Stats, {
    fps: Math.round(frames / acc),
    entities: world.query(Transform).length,
    civilians: world.query(IsCivilian).length,
  })
  acc = 0
  frames = 0
}
