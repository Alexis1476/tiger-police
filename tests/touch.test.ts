import { describe, expect, it } from 'vitest'
import { BanditBrain, BanditState, MoveIntent, Transform } from '../src/ecs/traits'
import { Device } from '../src/ecs/world'
import { spawnBandit } from '../src/entities/bandit'
import { createShootingRange } from './harness'

async function touchRange() {
  const game = await createShootingRange()
  game.world.set(Device, { touch: true })
  return game
}

describe('touch controls', () => {
  it('the joystick walks the player in the camera direction', async () => {
    const game = await touchRange()
    const z0 = game.player.get(Transform)!.z
    game.input.stickY = 1 // push forward
    game.run(1)
    game.input.stickY = 0
    expect(z0 - game.player.get(Transform)!.z).toBeGreaterThan(2.5) // camera faces −z
  })

  it('the run toggle sprints until tapped again', async () => {
    const game = await touchRange()
    game.input.stickY = 1
    game.input.runToggle = true
    game.run(0.5)
    const z1 = game.player.get(Transform)!.z
    game.run(1)
    expect(z1 - game.player.get(Transform)!.z).toBeGreaterThan(6) // sprint: 6.6 m/s
  })

  it('aim assist lands a shot on a bandit slightly off the crosshair', async () => {
    const miss = async (touch: boolean) => {
      const game = await createShootingRange()
      game.world.set(Device, { touch })
      const bandit = spawnBandit(game.world, game.ctx, 1.8, 6) // ~1.2 m right of the crosshair
      bandit.remove(MoveIntent)
      game.run(0.2)
      game.press('Click')
      game.run(0.6)
      return bandit.get(BanditBrain)!.state !== BanditState.Stunned
    }
    expect(await miss(false)).toBe(true) // mouse: no help
    expect(await miss(true)).toBe(false) // touch: assisted hit
  })
})
