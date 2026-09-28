import RAPIER from '@dimforge/rapier3d-compat'
import { FIXED_DT } from '../game/config'

/** Collision layers. A collider's membership is the high 16 bits, its filter the low 16. */
export const Layer = {
  Static: 0x0001,
  Character: 0x0002,
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

  return { rapier: RAPIER, world, controller }
}
