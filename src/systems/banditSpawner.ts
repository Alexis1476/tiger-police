import type { World } from 'koota'
import { IsPlayer, Transform } from '../ecs/traits'
import { BanditSpawner, NavGraph, Time } from '../ecs/world'
import type { GameContext } from '../engine/context'
import { spawnBandit } from '../entities/bandit'
import { BANDIT } from '../game/config'
import { randomNodeAwayFrom } from '../world/nav'

/** Brings in a replacement some time after each arrest, far from the player. */
export function banditSpawnerSystem(world: World, ctx: GameContext) {
  const spawner = world.get(BanditSpawner)!
  if (!spawner.pending.length) return
  const dt = world.get(Time)!.delta
  const { nodes } = world.get(NavGraph)!
  const player = world.queryFirst(IsPlayer, Transform)?.get(Transform) ?? { x: 0, z: 0 }

  for (let i = spawner.pending.length - 1; i >= 0; i--) {
    spawner.pending[i] -= dt
    if (spawner.pending[i] > 0) continue
    spawner.pending.splice(i, 1)
    const n = nodes[randomNodeAwayFrom(nodes, player.x, player.z, BANDIT.respawnDistance)]
    spawnBandit(world, ctx, n.x, n.z)
  }
}
