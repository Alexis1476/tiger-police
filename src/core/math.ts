export const TAU = Math.PI * 2

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Wraps an angle to [-PI, PI). */
export function wrapAngle(a: number) {
  a = (a + Math.PI) % TAU
  if (a < 0) a += TAU
  return a - Math.PI
}

/** Interpolates between two angles along the shortest arc. */
export const angleLerp = (a: number, b: number, t: number) => a + wrapAngle(b - a) * t

/** Hermite smoothstep between e0 and e1. */
export function smooth(e0: number, e1: number, x: number) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Frame-rate independent smoothing factor for `x += (target - x) * k`. */
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt)

/** Small, fast seeded PRNG so level generation is reproducible. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Rng = () => number
export const range = (rng: Rng, a: number, b: number) => a + (b - a) * rng()
export const pick = <T,>(rng: Rng, arr: readonly T[]) => arr[Math.floor(rng() * arr.length)]

/** Non-deterministic helpers for gameplay variety (not level generation). */
export const randRange = (a: number, b: number) => a + (b - a) * Math.random()
export const randPick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)]
