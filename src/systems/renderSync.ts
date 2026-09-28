import type { World } from 'koota'
import { PrevTransform, Transform, View } from '../ecs/traits'
import { Time } from '../ecs/world'
import { angleLerp, lerp } from '../core/math'

/** Copies interpolated gameplay transforms onto three.js objects, once per rendered frame. */
export function renderSyncSystem(world: World) {
  const a = world.get(Time)!.alpha

  world.query(Transform, PrevTransform, View).updateEach(
    ([t, p, view]) => {
      view.position.set(lerp(p.x, t.x, a), lerp(p.y, t.y, a), lerp(p.z, t.z, a))
      view.rotation.y = angleLerp(p.yaw, t.yaw, a)
    },
    { changeDetection: 'never' },
  )
}
