import type { Pipeline } from '../engine/loop'
import { animationSystem } from '../systems/animation'
import { arrestSystem } from '../systems/arrest'
import { banditBrainSystem } from '../systems/banditBrain'
import { banditSpawnerSystem } from '../systems/banditSpawner'
import { cameraSystem } from '../systems/camera'
import { civilianBrainSystem } from '../systems/civilianBrain'
import { cleanupSystem } from '../systems/cleanup'
import { locomotionSystem } from '../systems/locomotion'
import { navigationSystem } from '../systems/navigation'
import { overheadSystem } from '../systems/overhead'
import { physicsStepSystem } from '../systems/physicsStep'
import { pigeonRenderSystem, pigeonSystem } from '../systems/pigeons'
import { flagSystem, scenerySystem, trafficLightSystem } from '../systems/scenery'
import { trafficSystem } from '../systems/traffic'
import { playerControlSystem } from '../systems/playerControl'
import { playerFacingSystem } from '../systems/playerFacing'
import { playerSoundsSystem } from '../systems/playerSounds'
import { audioSystem, effectsSystem, frameCleanupSystem, hudSystem } from '../systems/presentation'
import { projectileSystem } from '../systems/projectiles'
import { renderSyncSystem } from '../systems/renderSync'
import { snapshotTransformsSystem } from '../systems/snapshotTransforms'
import { statsSystem } from '../systems/stats'
import { weaponSystem } from '../systems/weapon'

/**
 * System order is explicit and lives in one place.
 * Fixed systems run in 1/60 s steps (gameplay and physics); frame systems run once per render.
 */
export const pipeline: Pipeline = {
  fixed: [
    snapshotTransformsSystem,
    // 1. Player input.
    playerControlSystem,
    // 2. Actions: shooting spawns bullets, bullets raise Hit events.
    weaponSystem,
    projectileSystem,
    // 3. Brains react to this step's events (Hit, Noise) and pick what to do.
    civilianBrainSystem,
    banditBrainSystem,
    arrestSystem,
    banditSpawnerSystem,
    pigeonSystem,
    // 4. Movement: brains' decisions → MoveIntent → collision-checked motion.
    trafficSystem,
    navigationSystem,
    locomotionSystem,
    playerFacingSystem,
    physicsStepSystem,
    playerSoundsSystem,
    // 5. Events only live for one step.
    cleanupSystem,
  ],
  frame: [
    cameraSystem,
    renderSyncSystem,
    animationSystem,
    pigeonRenderSystem,
    overheadSystem,
    scenerySystem,
    flagSystem,
    trafficLightSystem,
    effectsSystem,
    audioSystem,
    hudSystem,
    statsSystem,
    frameCleanupSystem,
  ],
}
