import type { System } from '../engine/context'
import { cameraSystem } from '../systems/camera'
import { locomotionSystem } from '../systems/locomotion'
import { physicsStepSystem } from '../systems/physicsStep'
import { playerControlSystem } from '../systems/playerControl'
import { renderSyncSystem } from '../systems/renderSync'
import { snapshotTransformsSystem } from '../systems/snapshotTransforms'
import { statsSystem } from '../systems/stats'
import { wanderSystem } from '../systems/wander'

/**
 * System order is explicit and lives in one place.
 * Fixed systems run in 1/60 s steps (gameplay and physics); frame systems run once per render.
 */
export const pipeline: { fixed: System[]; frame: System[] } = {
  fixed: [
    snapshotTransformsSystem,
    // Controllers decide what entities want to do…
    playerControlSystem,
    wanderSystem,
    // …then shared systems carry it out.
    locomotionSystem,
    physicsStepSystem,
  ],
  frame: [cameraSystem, renderSyncSystem, statsSystem],
}
