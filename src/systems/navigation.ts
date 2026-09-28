import type { World } from 'koota'
import { CharacterBody, MoveIntent, Navigator, Transform } from '../ecs/traits'
import { NavGraph, Time } from '../ecs/world'
import { nearestNode, nextNode } from '../world/nav'

const STUCK_CHECK = 1.2
/** Characters closer than this push each other apart (legacy value). */
const PERSONAL_SPACE = 0.9
/** Someone this close ahead makes us step to our right, so head-on pairs pass each other. */
const PASSING_RANGE = 1.4

const others: { x: number; z: number }[] = []

/**
 * Steers every Navigator along the pedestrian graph, keeps people from walking into each
 * other, and re-plans for anyone stuck.
 */
export function navigationSystem(world: World) {
  const dt = world.get(Time)!.delta
  const { nodes } = world.get(NavGraph)!
  if (!nodes.length) return

  // Everyone with a body is an obstacle, including the player. O(n²): fine for dozens of
  // characters; hundreds would want a spatial grid here.
  others.length = 0
  world.query(Transform, CharacterBody).readEach(([t]) => others.push({ x: t.x, z: t.z }))

  world.query(Transform, MoveIntent, Navigator).updateEach(([t, intent, nav]) => {
    intent.jump = false
    if (nav.speed <= 0) {
      intent.x = intent.z = intent.speed = 0
      nav.stuckTimer = 0
      return
    }
    const flee = nav.flee ? { x: nav.fromX, z: nav.fromZ } : undefined
    if (nav.node < 0) {
      nav.node = nearestNode(nodes, t.x, t.z)
      nav.target = nav.node
    }
    if (nav.replan) {
      nav.replan = false
      nav.target = nextNode(nodes, nav.node, nav.prev, flee)
    }

    let target = nodes[nav.target]
    let d = Math.hypot(target.x - t.x, target.z - t.z)
    if (d < 0.5) {
      nav.prev = nav.node
      nav.node = nav.target
      nav.target = nextNode(nodes, nav.node, nav.prev, flee)
      target = nodes[nav.target]
      d = Math.hypot(target.x - t.x, target.z - t.z)
    }
    const dx = d > 1e-3 ? (target.x - t.x) / d : 0
    const dz = d > 1e-3 ? (target.z - t.z) / d : 0

    // Separation (m/s), added on top of the path direction.
    let sx = 0
    let sz = 0
    for (const o of others) {
      const ox = t.x - o.x
      const oz = t.z - o.z
      const od = Math.hypot(ox, oz)
      if (od < 1e-3 || od > PASSING_RANGE) continue // (the 1e-3 check skips ourselves)
      if (od < PERSONAL_SPACE) {
        const push = (PERSONAL_SPACE - od) * 2
        sx += (ox / od) * push
        sz += (oz / od) * push
      }
      if (-(ox * dx + oz * dz) / od > 0.6) {
        // Ahead of us: sidestep right (right of (dx, dz) is (-dz, dx)).
        sx += -dz * 0.6
        sz += dx * 0.6
      }
    }

    const vx = dx * nav.speed + sx
    const vz = dz * nav.speed + sz
    const v = Math.hypot(vx, vz)
    intent.x = v > 1e-3 ? vx / v : 0
    intent.z = v > 1e-3 ? vz / v : 0
    intent.speed = v

    // Still blocked (by a car, a wall corner…)? Re-plan from the nearest node.
    nav.stuckTimer += dt
    if (nav.stuckTimer > STUCK_CHECK) {
      if (Math.hypot(t.x - nav.lastX, t.z - nav.lastZ) < 0.3 * nav.speed) {
        nav.node = nearestNode(nodes, t.x, t.z)
        nav.prev = -1
        nav.target = nextNode(nodes, nav.node, -1, flee)
      }
      nav.stuckTimer = 0
      nav.lastX = t.x
      nav.lastZ = t.z
    }
  })
}
