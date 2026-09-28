import { beforeAll, describe, expect, it } from 'vitest'
import { CharacterBody, IsCar, IsCivilian, Locomotion, Pigeon, Transform, Vehicle } from '../src/ecs/traits'
import { DayCycle, Lanes, NavGraph } from '../src/ecs/world'
import { pathPoint } from '../src/world/lanes'
import { createTestGame } from './harness'

type Game = Awaited<ReturnType<typeof createTestGame>>

/** Moves the player instantly (physics body and gameplay transform together). */
function teleport(game: Game, x: number, z: number) {
  const cb = game.player.get(CharacterBody)!
  cb.body.setTranslation({ x, y: cb.offsetY + 0.3, z }, true)
  game.player.set(Transform, { ...game.player.get(Transform)!, x, y: 0.3, z })
}

describe('city', () => {
  let game: Game
  beforeAll(async () => {
    game = await createTestGame({ level: 'city', civilians: 16, bandits: 6 })
  })

  it('builds with traffic, pigeons and a connected pedestrian graph', () => {
    expect(game.world.query(IsCar).length).toBe(7)
    expect(game.world.query(Pigeon).length).toBe(34)
    const { nodes } = game.world.get(NavGraph)!
    expect(nodes.length).toBeGreaterThan(60)
    // Every node reachable from node 0.
    const seen = new Set([0])
    const stack = [0]
    while (stack.length) for (const l of nodes[stack.pop()!].links) if (!seen.has(l)) (seen.add(l), stack.push(l))
    expect(seen.size).toBe(nodes.length)
  })

  it('the player lands on the plaza (15 cm above the street)', () => {
    game.run(1)
    expect(game.player.get(Locomotion)!.grounded).toBe(true)
    expect(game.player.get(Transform)!.y).toBeCloseTo(0.15, 1)
  })

  it('civilians keep walking across streets and curbs', () => {
    const civs = game.world.query(IsCivilian, Transform)
    let prev = civs.map((e) => ({ ...e.get(Transform)! }))
    let stalled = 0
    for (let k = 0; k < 5; k++) {
      game.run(2)
      const now = civs.map((e) => ({ ...e.get(Transform)! }))
      now.forEach((t, i) => {
        if (Math.hypot(t.x - prev[i].x, t.z - prev[i].z) < 1) stalled++
        expect(t.y).toBeGreaterThan(-0.1)
        expect(t.y).toBeLessThan(1)
      })
      prev = now
    }
    // Waiting for a car at a crossing is fine; being stuck isn't.
    expect(stalled).toBeLessThan(civs.length * 5 * 0.1)
  })
})

describe('city movement', () => {
  it('the player steps down into the street and up the next curb', async () => {
    const game = await createTestGame({ level: 'city', civilians: 0, bandits: 0 })
    game.play()
    game.run(0.5)
    game.rig.yaw = -Math.PI / 2 // west: plaza edge at x = −13.5, city hall block at −22.5
    game.input.keys.add('KeyW')
    let lowest = Infinity
    // 5.5 s: ~13 m of walking plus time to get around passing traffic on the plaza loop.
    for (let i = 0; i < 5.5 * 60; i++) {
      game.run(1 / 60)
      lowest = Math.min(lowest, game.player.get(Transform)!.y)
    }
    const t = game.player.get(Transform)!
    expect(lowest).toBeLessThan(0.05) // was down in the street
    expect(t.x).toBeLessThan(-22.6) // made it onto the far sidewalk
    expect(t.y).toBeCloseTo(0.15, 1)
  })

  it('cars drive their lanes and stop for someone in the way', async () => {
    const game = await createTestGame({ level: 'city', civilians: 0, bandits: 0 })
    game.play()
    const car = game.world.query(IsCar, Vehicle).find((e) => e.get(Vehicle)!.lane === 1)!
    const lane = game.world.get(Lanes)!.paths[1]
    game.run(1)
    const v = car.get(Vehicle)!
    expect(v.speed).toBeGreaterThan(5)

    // Stand in the lane 9 m ahead of the car.
    const spot = pathPoint(lane, v.s + 9, { x: 0, z: 0 })
    teleport(game, spot.x, spot.z)
    game.run(3)
    expect(car.get(Vehicle)!.speed).toBeLessThan(0.5)
    const c = car.get(Transform)!
    const p = game.player.get(Transform)!
    expect(Math.hypot(c.x - p.x, c.z - p.z)).toBeGreaterThan(v.length / 2)

    // Step aside and it drives on.
    teleport(game, spot.x + 6, spot.z + 6)
    game.run(3)
    expect(car.get(Vehicle)!.speed).toBeGreaterThan(5)
  })

  it('the clock runs one game hour per real minute while playing', async () => {
    const game = await createTestGame({ level: 'city', civilians: 0, bandits: 0 })
    const start = game.world.get(DayCycle)!.hour
    game.run(6)
    expect(game.world.get(DayCycle)!.hour).toBe(start) // title screen: frozen
    game.play()
    game.run(6)
    expect(game.world.get(DayCycle)!.hour - start).toBeCloseTo(0.1, 2)
  })
})
