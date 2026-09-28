import type { World } from 'koota'
import { PrevTransform, Transform } from '../ecs/traits'

/** Runs first in each fixed step: remembers where everything was, for render interpolation. */
export function snapshotTransformsSystem(world: World) {
  world.query(Transform, PrevTransform).updateEach(([t, prev]) => {
    prev.x = t.x
    prev.y = t.y
    prev.z = t.z
    prev.yaw = t.yaw
  })
}
