import type { World } from 'koota'
import { CharacterBody, Locomotion, MoveIntent, Transform, Velocity } from '../ecs/traits'
import { Time } from '../ecs/world'
import type { GameContext } from '../engine/context'
import { COYOTE_TIME, GRAVITY, JUMP_BUFFER } from '../game/config'
import { angleLerp, damp } from '../core/math'

const desired = { x: 0, y: 0, z: 0 }
const next = { x: 0, y: 0, z: 0 }

/**
 * Moves every character (player and NPCs alike) from its MoveIntent: acceleration, gravity,
 * jump buffering and coyote time, then collision through Rapier's character controller.
 */
export function locomotionSystem(world: World, { physics }: GameContext) {
  const dt = world.get(Time)!.delta
  const { controller } = physics

  world
    .query(Transform, Velocity, MoveIntent, Locomotion, CharacterBody)
    .updateEach(([t, v, intent, loco, cb]) => {
      const k = damp(loco.grounded ? loco.accel : loco.airAccel, dt)
      v.x += (intent.x * intent.speed - v.x) * k
      v.z += (intent.z * intent.speed - v.z) * k

      loco.jumpBuffer = intent.jump ? JUMP_BUFFER : Math.max(0, loco.jumpBuffer - dt)
      loco.coyote = loco.grounded ? COYOTE_TIME : Math.max(0, loco.coyote - dt)
      if (loco.jumpBuffer > 0 && loco.coyote > 0) {
        v.y = loco.jumpSpeed
        loco.jumpBuffer = 0
        loco.coyote = 0
      }
      v.y -= GRAVITY * dt

      desired.x = v.x * dt
      desired.y = v.y * dt
      desired.z = v.z * dt
      controller.computeColliderMovement(cb.collider, desired)
      const moved = controller.computedMovement()
      loco.grounded = controller.computedGrounded()
      if (loco.grounded && v.y < 0) v.y = 0
      if (v.y > 0 && moved.y < desired.y * 0.5) v.y = 0 // bumped a ceiling

      const pos = cb.body.translation()
      next.x = pos.x + moved.x
      next.y = pos.y + moved.y
      next.z = pos.z + moved.z
      cb.body.setNextKinematicTranslation(next)
      t.x = next.x
      t.y = next.y - cb.offsetY
      t.z = next.z

      if (Math.hypot(v.x, v.z) > 0.3) t.yaw = angleLerp(t.yaw, Math.atan2(v.x, v.z), damp(10, dt))
    })
}
