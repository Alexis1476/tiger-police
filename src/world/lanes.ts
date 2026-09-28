/**
 * Closed driving loops: a polygon of street corners, offset to the right-hand lane and
 * rounded at each corner. Cars store only their distance `s` along a loop.
 */
export type LanePath = { points: { x: number; z: number }[]; cum: number[]; length: number }

export function lanePath(corners: [number, number][], offset = 2.2, radius = 6): LanePath {
  const n = corners.length
  const points: { x: number; z: number }[] = []
  for (let i = 0; i < n; i++) {
    const [ax, az] = corners[(i - 1 + n) % n]
    const [bx, bz] = corners[i]
    const [cx, cz] = corners[(i + 1) % n]
    const li = Math.hypot(bx - ax, bz - az)
    const lo = Math.hypot(cx - bx, cz - bz)
    const din = { x: (bx - ax) / li, z: (bz - az) / li }
    const dout = { x: (cx - bx) / lo, z: (cz - bz) / lo }
    // Right-hand normals (−dz, dx), summed: offset the corner into the lane.
    const ox = bx + (-din.z - dout.z) * offset
    const oz = bz + (din.x + dout.x) * offset
    const sx = ox - din.x * radius
    const sz = oz - din.z * radius
    const ex = ox + dout.x * radius
    const ez = oz + dout.z * radius
    for (let k = 0; k <= 6; k++) {
      const t = k / 6
      const a = (1 - t) * (1 - t)
      const b = 2 * (1 - t) * t
      const c = t * t
      points.push({ x: a * sx + b * ox + c * ex, z: a * sz + b * oz + c * ez })
    }
  }
  const cum = [0]
  for (let i = 1; i <= points.length; i++) {
    const p = points[i % points.length]
    const q = points[i - 1]
    cum.push(cum[i - 1] + Math.hypot(p.x - q.x, p.z - q.z))
  }
  return { points, cum, length: cum[points.length] }
}

/** Position at distance `s` along the loop (wraps around). */
export function pathPoint(path: LanePath, s: number, out: { x: number; z: number }) {
  s = ((s % path.length) + path.length) % path.length
  let lo = 0
  let hi = path.points.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (path.cum[mid] <= s) lo = mid
    else hi = mid - 1
  }
  const a = path.points[lo]
  const b = path.points[(lo + 1) % path.points.length]
  const seg = path.cum[lo + 1] - path.cum[lo]
  const t = seg > 1e-6 ? (s - path.cum[lo]) / seg : 0
  out.x = a.x + (b.x - a.x) * t
  out.z = a.z + (b.z - a.z) * t
  return out
}
