import type { World } from 'koota'
import { Hit, IsEvent } from '../ecs/traits'
import { Input } from '../ecs/world'

/**
 * Last fixed system: events only live for one step. Removes Hit traits, destroys event
 * entities and clears edge-triggered input, so nothing is handled twice.
 */
export function cleanupSystem(world: World) {
  for (const e of [...world.query(Hit)]) e.remove(Hit)
  for (const e of [...world.query(IsEvent)]) e.destroy()
  world.get(Input)!.pressed.clear()
}
