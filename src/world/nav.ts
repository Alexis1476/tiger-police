import type { NavNode } from '../ecs/world'

/** Builds a pedestrian graph; nodes at the same spot (to 0.1 m) are merged. */
export function createNavBuilder() {
  const nodes: NavNode[] = []
  const byKey = new Map<string, number>()
  return {
    nodes,
    node(x: number, z: number) {
      const key = x.toFixed(1) + ',' + z.toFixed(1)
      let id = byKey.get(key)
      if (id === undefined) {
        id = nodes.length
        nodes.push({ x, z, links: [] })
        byKey.set(key, id)
      }
      return id
    },
    link(a: number, b: number) {
      if (a === b) return
      if (!nodes[a].links.includes(b)) nodes[a].links.push(b)
      if (!nodes[b].links.includes(a)) nodes[b].links.push(a)
    },
  }
}

export function nearestNode(nodes: NavNode[], x: number, z: number) {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < nodes.length; i++) {
    const d = (nodes[i].x - x) ** 2 + (nodes[i].z - z) ** 2
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

/** A random node at least `minDist` from (x, z), if one can be found quickly. */
export function randomNodeAwayFrom(nodes: NavNode[], x: number, z: number, minDist: number) {
  for (let i = 0; i < 80; i++) {
    const id = Math.floor(Math.random() * nodes.length)
    if (Math.hypot(nodes[id].x - x, nodes[id].z - z) >= minDist) return id
  }
  return Math.floor(Math.random() * nodes.length)
}

/**
 * Picks where to go from `node`, avoiding a U-turn to `prev` when possible. When fleeing,
 * prefers the link that ends farthest from the threat (with a little randomness).
 */
export function nextNode(nodes: NavNode[], node: number, prev: number, flee?: { x: number; z: number }) {
  const links = nodes[node].links
  let options = links.filter((l) => l !== prev)
  if (!options.length) options = links
  if (!options.length) return node
  if (!flee) return options[Math.floor(Math.random() * options.length)]
  let best = options[0]
  let bestScore = -Infinity
  for (const l of options) {
    const score = Math.hypot(nodes[l].x - flee.x, nodes[l].z - flee.z) + Math.random() * 4
    if (score > bestScore) {
      bestScore = score
      best = l
    }
  }
  return best
}
