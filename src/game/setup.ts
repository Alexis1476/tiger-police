import type { World } from 'koota'
import { mulberry32 } from '../core/math'
import { CameraRig, NavGraph } from '../ecs/world'
import type { GameContext } from '../engine/context'
import { registerLifecycle } from '../engine/lifecycle'
import { spawnBandit } from '../entities/bandit'
import { spawnCivilian } from '../entities/civilian'
import { spawnPlayer } from '../entities/player'
import { buildCity } from '../world/city'
import { randomNodeAwayFrom } from '../world/nav'
import { buildProvingGround } from '../world/provingGround'
import { BANDIT, CIVILIAN } from './config'

export type LevelName = 'city' | 'proving-ground'
export type SetupOptions = { level?: LevelName; seed?: number; civilians?: number; bandits?: number }

const LEVELS = { city: buildCity, 'proving-ground': buildProvingGround }

/** Builds the level and spawns everyone. Shared by the app and the tests. */
export function setupGame(
  world: World,
  ctx: GameContext,
  { level = 'city', seed = 7042026, civilians = CIVILIAN.count, bandits = BANDIT.count }: SetupOptions = {},
) {
  registerLifecycle(world, ctx)
  const rng = mulberry32(seed)
  const { spawn } = LEVELS[level](world, ctx, rng)
  const player = spawnPlayer(world, ctx, spawn)
  world.get(CameraRig)!.yaw = spawn.yaw

  // NPCs start on the pedestrian graph, not too close to the player.
  const { nodes } = world.get(NavGraph)!
  for (let i = 0; i < bandits; i++) {
    const n = nodes[randomNodeAwayFrom(nodes, spawn.x, spawn.z, BANDIT.spawnDistance)]
    spawnBandit(world, ctx, n.x, n.z)
  }
  for (let i = 0; i < civilians; i++) {
    const n = nodes[randomNodeAwayFrom(nodes, spawn.x, spawn.z, 4)]
    spawnCivilian(world, ctx, n.x + (rng() - 0.5), n.z + (rng() - 0.5), rng)
  }
  return { player }
}
