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
