import type { Entity } from 'koota'
import { Speech } from '../ecs/traits'
import { randPick } from '../core/math'

/** Shows a speech bubble over `entity` for `duration` seconds. */
export function say(entity: Entity, lines: readonly string[] | string, duration = 2.2) {
  const text = typeof lines === 'string' ? lines : randPick(lines)
  if (entity.has(Speech)) entity.set(Speech, { text, timer: duration })
  else entity.add(Speech({ text, timer: duration }))
}
