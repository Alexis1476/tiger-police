import type { Physics } from '../engine/physics'
import { Layer, groups } from '../engine/physics'

/**
 * Feet height characters spawn at. Slightly above the tallest curb (0.15 m) so a new body
 * never starts inside a sidewalk; gravity settles it within a few frames.
 */
export const SPAWN_Y = 0.3

/** Kinematic capsule for a character whose feet start at (x, SPAWN_Y, z). */
export function createCharacterBody(physics: Physics, x: number, z: number, radius: number, height: number) {
  const { rapier, world } = physics
  const halfHeight = (height - 2 * radius) / 2
  const offsetY = halfHeight + radius
  const body = world.createRigidBody(
    rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(x, offsetY + SPAWN_Y, z),
  )
  const collider = world.createCollider(
    rapier.ColliderDesc.capsule(halfHeight, radius).setCollisionGroups(groups(Layer.Character)),
    body,
  )
  return { body, collider, offsetY, radius }
}
