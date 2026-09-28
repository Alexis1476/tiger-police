import { describe, expect, it } from 'vitest'
import { MoveIntent, Projectile, Weapon } from '../src/ecs/traits'
import { Feed, Score } from '../src/ecs/world'
import { spawnCivilian } from '../src/entities/civilian'
import { mulberry32 } from '../src/core/math'
import { SCORE } from '../src/game/config'
import { createShootingRange as range } from './harness'

describe('combat', () => {
  it('firing spends a bullet and spawns a projectile', async () => {
    const game = await range()
    game.press('Click')
    expect(game.player.get(Weapon)!.ammo).toBe(7)
    expect(game.world.query(Projectile).length).toBe(1)
  })

  it('respects the fire interval', async () => {
    const game = await range()
    game.input.fireHeld = true
    game.run(1)
    game.input.fireHeld = false
    // 0.2 s between shots → 5 shots in one second (±1 for step alignment).
    const fired = 8 - game.player.get(Weapon)!.ammo
    expect(fired).toBeGreaterThanOrEqual(5)
    expect(fired).toBeLessThanOrEqual(6)
  })

  it('reloads automatically after emptying the magazine', async () => {
    const game = await range()
    game.input.fireHeld = true
    game.run(2)
    game.input.fireHeld = false
    expect(game.player.get(Weapon)!.reload).toBeGreaterThan(0)
    game.run(1.8)
    expect(game.player.get(Weapon)!.ammo).toBe(8)
  })

  it('hitting a civilian costs a fine', async () => {
    const game = await range()
    const civ = spawnCivilian(game.world, game.ctx, 0.55, 8, mulberry32(1))
    civ.remove(MoveIntent) // keep the target still
    game.run(0.3)
    game.press('Click')
    game.run(0.5)
    const score = game.world.get(Score)!
    expect(score.fines).toBe(1)
    expect(score.money).toBe(-SCORE.civilianFine)
    expect(game.world.get(Feed)!.hits).toBe(1)
  })

  it('bullets bounce off walls and eventually disappear', async () => {
    const game = await range()
    game.rig.yaw = Math.PI / 2 // toward the buildings at +x
    game.run(0.3)
    game.press('Click')
    let bounced = false
    for (let i = 0; i < 180 && game.world.query(Projectile).length; i++) {
      game.run(1 / 60)
      const p = game.world.queryFirst(Projectile)
      if (p && p.get(Projectile)!.bounces > 0) bounced = true
    }
    expect(bounced).toBe(true)
    expect(game.world.query(Projectile).length).toBe(0)
  })
})
