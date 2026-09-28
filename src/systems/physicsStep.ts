import type { World } from 'koota'
import type { GameContext } from '../engine/context'

/** Advances Rapier one fixed step. Runs after every system that moves bodies. */
export function physicsStepSystem(_world: World, { physics }: GameContext) {
  physics.world.step()
}
