import type { World } from 'koota'
import { Feed, Score, type Toast } from '../ecs/world'

let nextId = 1
const MAX_TOASTS = 4

/**
 * Helpers systems use to talk to the player. They only write world traits; the React HUD
 * decides how and for how long to show them.
 */
export function toast(world: World, text: string, kind: Toast['kind'] = '') {
  const feed = world.get(Feed)!
  world.set(Feed, { ...feed, toasts: [{ id: nextId++, text, kind }, ...feed.toasts].slice(0, MAX_TOASTS) })
}

export function bigMessage(world: World, text: string, bad = false) {
  world.set(Feed, { ...world.get(Feed)!, big: { id: nextId++, text, bad } })
}

export function hitMarker(world: World) {
  const feed = world.get(Feed)!
  world.set(Feed, { ...feed, hits: feed.hits + 1 })
}

export function addScore(world: World, change: { money?: number; arrests?: number; fines?: number }) {
  const s = world.get(Score)!
  world.set(Score, {
    money: s.money + (change.money ?? 0),
    arrests: s.arrests + (change.arrests ?? 0),
    fines: s.fines + (change.fines ?? 0),
  })
}

/** Colombian peso formatting, e.g. "$ 50.000" or "−$ 20.000". */
export const formatCOP = (v: number) => (v < 0 ? '−' : '') + '$ ' + Math.abs(Math.round(v)).toLocaleString('es-CO')
