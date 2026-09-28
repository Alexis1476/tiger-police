import { describe, expect, it } from 'vitest'
import {
  BanditBrain,
  BanditState,
  CivilianBrain,
  CivilianState,
  IsBandit,
  MoveIntent,
  Speech,
  Transform,
} from '../src/ecs/traits'
import { Hud, Score } from '../src/ecs/world'
import { spawnBandit } from '../src/entities/bandit'
import { spawnCivilian } from '../src/entities/civilian'
import { mulberry32 } from '../src/core/math'
import { BANDIT, SCORE } from '../src/game/config'
import { createShootingRange } from './harness'

describe('bandits', () => {
  it('flee when the police come close', async () => {
    const game = await createShootingRange()
    const bandit = spawnBandit(game.world, game.ctx, 0, 8) // 6 m from the player
    game.run(0.1)
    expect(bandit.get(BanditBrain)!.state).toBe(BanditState.Flee)
    expect(bandit.has(Speech)).toBe(true)
    game.run(3)
    const t = bandit.get(Transform)!
    expect(Math.hypot(t.x, t.z - 14)).toBeGreaterThan(10) // ran away
  })

  it('are stunned by a shot, then arrested with E', async () => {
    const game = await createShootingRange()
    const bandit = spawnBandit(game.world, game.ctx, 0.55, 8)
    bandit.remove(MoveIntent) // hold still so the shot lands
    game.press('Click')
    game.run(0.4)
    expect(bandit.get(BanditBrain)!.state).toBe(BanditState.Stunned)

    // Walk up to it and arrest.
    game.input.keys.add('KeyW')
    game.run(1.5)
    game.input.keys.delete('KeyW')
    game.run(0.2)
    expect(game.world.get(Hud)!.canArrest).toBe(true)
    game.press('KeyE')
    expect(bandit.get(BanditBrain)!.state).toBe(BanditState.Cuffed)
    expect(game.world.get(Score)!).toMatchObject({ arrests: 1, money: SCORE.arrest })

    // Led away, then replaced far from the player.
    game.run(BANDIT.cuffTime + 0.2)
    expect(game.world.has(bandit)).toBe(false)
    expect(game.world.query(IsBandit).length).toBe(0)
    let waited = 0
    while (!game.world.query(IsBandit).length && waited < BANDIT.respawnTime + 1) {
      game.run(1 / 60)
      waited += 1 / 60
    }
    expect(waited).toBeGreaterThan(BANDIT.respawnTime - 0.3) // 0.2 s already elapsed above
    const [replacement] = game.world.query(IsBandit)
    expect(replacement).toBeDefined()
    const t = replacement.get(Transform)!
    const p = game.player.get(Transform)!
    expect(Math.hypot(t.x - p.x, t.z - p.z)).toBeGreaterThan(BANDIT.respawnDistance - 0.5)
  })

  it('recover from the stun and run', async () => {
    const game = await createShootingRange()
    const bandit = spawnBandit(game.world, game.ctx, 0.55, 8)
    bandit.remove(MoveIntent)
    game.press('Click')
    game.run(0.4)
    expect(bandit.get(BanditBrain)!.state).toBe(BanditState.Stunned)
    game.run(BANDIT.stunTime)
    expect(bandit.get(BanditBrain)!.state).toBe(BanditState.Flee)
  })
})

describe('civilians', () => {
  it('panic when a shot is fired nearby', async () => {
    const game = await createShootingRange()
    const civ = spawnCivilian(game.world, game.ctx, -6, 10, mulberry32(3))
    game.run(0.2)
    expect(civ.get(CivilianBrain)!.state).toBe(CivilianState.Calm)
    game.rig.yaw = 0 // shoot away from everyone
    game.press('Click')
    expect(civ.get(CivilianBrain)!.state).toBe(CivilianState.Panic)
  })

  it('put their hands up when shot, and are only fined once', async () => {
    const game = await createShootingRange()
    const civ = spawnCivilian(game.world, game.ctx, 0.55, 8, mulberry32(1))
    civ.remove(MoveIntent)
    game.press('Click')
    game.run(0.25)
    game.press('Click')
    game.run(0.4)
    expect(civ.get(CivilianBrain)!.state).toBe(CivilianState.HandsUp)
    expect(game.world.get(Score)!.fines).toBe(1)
  })
})
