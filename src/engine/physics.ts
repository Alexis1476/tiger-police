import RAPIER from '@dimforge/rapier3d-compat'
import type { Entity } from 'koota'
import { FIXED_DT } from '../game/config'

/** Collision layers. A collider's membership is the high 16 bits, its filter the low 16. */
export const Layer = {
  Static: 0x0001,
  Character: 0x0002,
  Vehicle: 0x0004,
} as const

export const groups = (membership: number, filter = 0xffff) => (membership << 16) | filter

export type Physics = ReturnType<typeof createPhysicsWorld>

export async function createPhysics() {
  await RAPIER.init()
  return createPhysicsWorld()
}

function createPhysicsWorld() {
  // Gravity is applied by the locomotion system; kinematic characters ignore world gravity.
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 })
  world.timestep = FIXED_DT

  // One controller is shared by every character: it holds settings, not per-body state.
  const controller = world.createCharacterController(0.02)
  controller.setSlideEnabled(true)
  controller.enableAutostep(0.35, 0.2, false)
  controller.enableSnapToGround(0.3)
  controller.setApplyImpulsesToDynamicBodies(true)

  /** Collider handle → entity, so ray hits can be turned back into gameplay entities. */
  const owners = new Map<number, Entity>()

  return { rapier: RAPIER, world, controller, owners }
}

/**
 * Fixed box collider spanning x0..x1, y0..y1, z0..z1 — the legacy level format. Returns
 * nothing: static geometry never needs to be looked up again.
 */
export function addStaticBox(
  physics: Physics,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
) {
  const { rapier, world } = physics
  const body = world.createRigidBody(
    rapier.RigidBodyDesc.fixed().setTranslation((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2),
  )
  world.createCollider(
    rapier.ColliderDesc.cuboid(Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2).setCollisionGroups(
      groups(Layer.Static),
    ),
    body,
  )
}
