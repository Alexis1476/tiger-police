import { describe, expect, it } from 'vitest'
import { IsCivilian, Locomotion, Transform } from '../src/ecs/traits'
import { createTestGame } from './harness'

const empty = { civilians: 0, bandits: 0 }

describe('movement', () => {
  it('lands on the ground after spawning', async () => {
    const game = await createTestGame(empty)
    game.run(1)
    expect(game.player.get(Locomotion)!.grounded).toBe(true)
    expect(game.player.get(Transform)!.y).toBeCloseTo(0, 1)
  })

  it('walks at the legacy speed (3.5 m/s) in the camera direction', async () => {
    const game = await createTestGame(empty)
    game.play()
    game.run(0.5)
    const z0 = game.player.get(Transform)!.z
    game.input.keys.add('KeyW')
    game.run(1) // accelerate
    const z1 = game.player.get(Transform)!.z
    game.run(1)
    const z2 = game.player.get(Transform)!.z
    expect(z1).toBeLessThan(z0) // camera yaw PI faces -z
    expect(z1 - z2).toBeGreaterThan(3.3)
    expect(z1 - z2).toBeLessThan(3.6)
  })

  it('jumps about 1 m high and lands again', async () => {
    const game = await createTestGame(empty)
    game.play()
    game.run(0.5)
    game.press('Space')
    let peak = 0
    for (let i = 0; i < 60; i++) {
      game.run(1 / 60)
      peak = Math.max(peak, game.player.get(Transform)!.y)
    }
    expect(peak).toBeGreaterThan(0.9)
    expect(peak).toBeLessThan(1.15)
    expect(game.player.get(Locomotion)!.grounded).toBe(true)
  })

  it('is blocked by the fountain', async () => {
    const game = await createTestGame(empty)
    game.play()
    game.rig.yaw = Math.PI // straight at the fountain (radius 3.2 at the origin)
    game.input.keys.add('KeyW')
    game.run(4)
    const t = game.player.get(Transform)!
    expect(Math.hypot(t.x, t.z)).toBeGreaterThan(3.2)
  })

  it('NPCs keep walking: nobody deadlocks, nobody overlaps, nobody falls', async () => {
    // Regression: civilians spawned inside each other used to lock up forever.
    const game = await createTestGame({ civilians: 30, bandits: 0 })
    const civs = game.world.query(IsCivilian, Transform)
    let prev = civs.map((e) => ({ ...e.get(Transform)! }))
    for (let k = 0; k < 5; k++) {
      game.run(2)
      const now = civs.map((e) => ({ ...e.get(Transform)! }))
      now.forEach((t, i) => {
        expect(Math.hypot(t.x - prev[i].x, t.z - prev[i].z)).toBeGreaterThan(1) // progressing
        expect(t.y).toBeGreaterThan(-0.5)
        for (let j = i + 1; j < now.length; j++) {
          expect(Math.hypot(now[j].x - t.x, now[j].z - t.z)).toBeGreaterThan(0.45) // no deep overlap
        }
      })
      prev = now
    }
  })
})
