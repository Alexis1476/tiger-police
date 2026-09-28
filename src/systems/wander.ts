import type { World } from 'koota'
import { MoveIntent, Transform, Wander, WanderState } from '../ecs/traits'
import { Time } from '../ecs/world'
import { TAU } from '../core/math'

/** AI for civilians: idle a few seconds, walk a few seconds, and drift back toward home. */
export function wanderSystem(world: World) {
  const dt = world.get(Time)!.delta

  world.query(Transform, MoveIntent, Wander).updateEach(([t, intent, w]) => {
    w.timer -= dt
    if (w.timer <= 0) {
      if (w.state === WanderState.Idle) {
        w.state = WanderState.Walk
        w.timer = 2 + Math.random() * 4
        const hx = w.homeX - t.x
        const hz = w.homeZ - t.z
        const angle =
          Math.hypot(hx, hz) > w.radius
            ? Math.atan2(hx, hz) + (Math.random() - 0.5)
            : Math.random() * TAU
        w.dirX = Math.sin(angle)
        w.dirZ = Math.cos(angle)
      } else {
        w.state = WanderState.Idle
        w.timer = 1 + Math.random() * 3
      }
    }

    const walking = w.state === WanderState.Walk
    intent.x = walking ? w.dirX : 0
    intent.z = walking ? w.dirZ : 0
    intent.speed = w.speed
    intent.jump = false
  })
}
