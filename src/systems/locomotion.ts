import type { World } from 'koota'
import { CharacterBody, Locomotion, MoveIntent, Transform, Velocity } from '../ecs/traits'
import { Time } from '../ecs/world'
import type { GameContext } from '../engine/context'
import { Layer, groups } from '../engine/physics'
import { COYOTE_TIME, GRAVITY, JUMP_BUFFER } from '../game/config'
import { angleLerp, damp } from '../core/math'

const desired = { x: 0, y: 0, z: 0 }
const next = { x: 0, y: 0, z: 0 }
/** The controller only collides with the world and vehicles; characters overlap softly. */
const SOLID_ONLY = groups(0xffff, Layer.Static | Layer.Vehicle)
/** Fraction of an overlap between two characters resolved per step (each side). */
const SOFTNESS = 0.25

const bodies: { x: number; z: number; r: number }[] = []

/**
 * Moves every character (player and NPCs alike) from its MoveIntent: acceleration, gravity,
 * jump buffering and coyote time, a soft push away from overlapping characters, then
 * collision with the world through Rapier's character controller.
 */
export function locomotionSystem(world: World, { physics }: GameContext) {
  const dt = world.get(Time)!.delta
  const { controller } = physics

  // Positions at the start of the step, so the push is symmetric. O(n²): fine for dozens.
  bodies.length = 0
  world.query(Transform, CharacterBody).readEach(([t, cb]) => bodies.push({ x: t.x, z: t.z, r: cb.radius }))

  world
    .query(Transform, Velocity, MoveIntent, Locomotion, CharacterBody)
    .updateEach(([t, v, intent, loco, cb]) => {
      const k = damp(loco.grounded ? loco.accel : loco.airAccel, dt)
      v.x += (intent.x * intent.speed - v.x) * k
      v.z += (intent.z * intent.speed - v.z) * k

      loco.jumpBuffer = intent.jump ? JUMP_BUFFER : Math.max(0, loco.jumpBuffer - dt)
      loco.coyote = loco.grounded ? COYOTE_TIME : Math.max(0, loco.coyote - dt)
      loco.jumped = false
      loco.landImpact = 0
      if (loco.jumpBuffer > 0 && loco.coyote > 0) {
        v.y = loco.jumpSpeed
        loco.jumpBuffer = 0
        loco.coyote = 0
        loco.jumped = true
      }
      v.y -= GRAVITY * dt

      desired.x = v.x * dt
      desired.y = v.y * dt
      desired.z = v.z * dt

      // Soft character-vs-character collision.
      for (const o of bodies) {
        const ox = t.x - o.x
        const oz = t.z - o.z
        const d = Math.hypot(ox, oz)
        const overlap = cb.radius + o.r - d
        if (d < 1e-4 || overlap <= 0) continue // (d ≈ 0 is ourselves)
        desired.x += (ox / d) * overlap * SOFTNESS
        desired.z += (oz / d) * overlap * SOFTNESS
      }

      controller.computeColliderMovement(cb.collider, desired, undefined, SOLID_ONLY)
      const moved = controller.computedMovement()
      const wasGrounded = loco.grounded
      loco.grounded = controller.computedGrounded()
      if (loco.grounded && !wasGrounded) loco.landImpact = -v.y
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
