import type { CityBuilder } from './cityBuilder'
import { addSign, awning, balcony, doorUnit, faceOf, fbox, gableRoof, windowUnit, type Side } from './facades'
import { CURB, PAL, shade } from './palette'

export type HouseOptions = {
  floors?: number
  wall?: number
  band?: number
  frame?: number
  roof?: number
  shop?: boolean
  balcony?: boolean
  sign?: string | null
  signBg?: string
  signFg?: string
  awnA?: number
  awnB?: number
  sides?: Side[]
  mural?: Side
}

/** Two-storey colonial house of La Candelaria: gabled tile roof, balconies, barred windows. */
export function colonialHouse(b: CityBuilder, x0: number, x1: number, z0: number, z1: number, front: Side, opt: HouseOptions = {}) {
  const base = CURB
  const floors = opt.floors ?? 2
  const fh = 3.2
  const h = floors * fh + 0.4
  const wall = b.jit(opt.wall ?? b.pick(PAL.walls), 0.03)
  const band = opt.band ?? b.pick(PAL.band)
  const frame = opt.frame ?? b.pick(PAL.frames)
  b.blk(x0, x1, base, base + h, z0, z1, wall)
  b.blk(x0 - 0.05, x1 + 0.05, base, base + 0.9, z0 - 0.05, z1 + 0.05, band)
  b.blk(x0 - 0.1, x1 + 0.1, base + h - 0.22, base + h, z0 - 0.1, z1 + 0.1, shade(wall, -0.08))
  const ridgeX = front === 'n' || front === 's'
  gableRoof(b, x0, x1, z0, z1, base + h, wall, b.jit(opt.roof ?? PAL.roof, 0.05), ridgeX)
  const f = faceOf(x0, x1, z0, z1, front)
  const n = Math.max(1, Math.round(f.len / 2.6))
  const sp = f.len / n
  const doorIdx = Math.floor(n / 2)
  for (let i = 0; i < n; i++) {
    const u = sp * (i + 0.5)
    if (i === doorIdx) doorUnit(b, f, u, base, 1.25, 2.45, PAL.wood, frame)
    else if (opt.shop && i === doorIdx - 1) {
      fbox(b, f, u - 0.75, u + 0.75, base + 0.3, base + 2.5, -0.02, 0.1, 0, 'glassLit')
      fbox(b, f, u - 0.85, u + 0.85, base + 2.5, base + 2.62, -0.02, 0.12, frame)
    } else windowUnit(b, f, u, base + 1.05, 0.95, 1.35, frame, { bars: true })
  }
  for (let fl = 1; fl < floors; fl++) {
    const y = base + fl * fh
    if (opt.balcony ?? b.rng() < 0.65) {
      balcony(b, f, sp * 0.18, f.len - sp * 0.18, y + 0.12)
      for (let i = 0; i < n; i++) windowUnit(b, f, sp * (i + 0.5), y + 0.14, 0.9, 2.1, frame, { sill: false })
    } else {
      const sh = b.rng() < 0.45 ? frame : null
      for (let i = 0; i < n; i++) windowUnit(b, f, sp * (i + 0.5), y + 0.6, 0.9, 1.4, frame, { shutters: sh })
    }
  }
  for (const s of opt.sides ?? []) {
    const sf = faceOf(x0, x1, z0, z1, s)
    const m = Math.max(1, Math.floor(sf.len / 3.4))
    for (let fl = 0; fl < floors; fl++) {
      for (let k = 0; k < m; k++) {
        windowUnit(b, sf, (sf.len / m) * (k + 0.5), base + fl * fh + (fl ? 0.6 : 1.05), 0.9, 1.3, frame, { bars: fl === 0 })
      }
    }
  }
  if (opt.shop) {
    const u = sp * (doorIdx - 0.5 + (n > 1 ? 0 : 0.5))
    awning(b, f, Math.max(0.2, u - 1.5), Math.min(f.len - 0.2, u + 1.5), base + 3.0, 1.1, opt.awnA ?? 0xc0392b, opt.awnB ?? 0xf4efe6)
    if (opt.sign) addSign(b, f, u, base + 3.45, 2.6, 0.62, opt.sign, opt.signBg ?? '#f4efe3', opt.signFg ?? '#7a2a1f', 0.12)
  }
  if (opt.mural) b.murals.push({ f: faceOf(x0, x1, z0, z1, opt.mural), y: base + 1.2, h: floors * fh - 1.6 })
  b.addCol(x0, x1, z0, z1, base + h + 3)
}

/** A row of `n` colonial houses along one block edge; `extra[i]` customises house i. */
export function colonialRow(
  b: CityBuilder,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  front: Side,
  n: number,
  sides: Side[],
  extra: HouseOptions[] = [],
) {
  const alongX = front === 'n' || front === 's'
  const L = alongX ? x1 - x0 : z1 - z0
  const w = L / n
  for (let i = 0; i < n; i++) {
    const a = (alongX ? x0 : z0) + i * w
    const e = a + w
    const [bx0, bx1, bz0, bz1] = alongX ? [a, e, z0, z1] : [x0, x1, a, e]
    const s: Side[] = []
    if (i === 0) s.push(alongX ? 'w' : 'n')
    if (i === n - 1) s.push(alongX ? 'e' : 's')
    const opt: HouseOptions = { floors: b.rng() < 0.28 ? 1 : 2, sides: s.filter((x) => sides.includes(x)), ...extra[i] }
    colonialHouse(b, bx0, bx1, bz0, bz1, front, opt)
  }
}

/** Republican-era brick building, often with a shop front on the ground floor. */
export function brickBuilding(b: CityBuilder, x0: number, x1: number, z0: number, z1: number, front: Side, opt: HouseOptions = {}) {
  const base = CURB
  const floors = opt.floors ?? 2 + Math.floor(b.rng() * 3)
  const fh = 3.0
  const h = floors * fh + 0.5
  const wall = b.jit(opt.wall ?? b.pick(PAL.brick), 0.04)
  const trim = 0xd9d4c8
  b.blk(x0, x1, base, base + h, z0, z1, wall)
  for (let fl = 1; fl < floors; fl++) b.blk(x0 - 0.06, x1 + 0.06, base + fl * fh - 0.12, base + fl * fh + 0.1, z0 - 0.06, z1 + 0.06, trim)
  b.blk(x0 - 0.1, x1 + 0.1, base + h, base + h + 0.55, z0 - 0.1, z1 + 0.1, trim)
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  if (b.rng() < 0.8) {
    // Water tank on the roof.
    const tx = cx + b.range(-1, 1) * (x1 - x0) * 0.25
    const tz = cz + b.range(-1, 1) * (z1 - z0) * 0.25
    b.blk(tx - 0.7, tx + 0.7, base + h + 0.55, base + h + 0.9, tz - 0.7, tz + 0.7, 0x8a8a88)
    b.cyl(0.55, 0.55, 1.1, 12, tx, base + h + 1.45, tz, 0x1b1d20)
  }
  if (b.rng() < 0.4) b.cyl(0.03, 0.03, 2.2, 5, cx + b.range(-2, 2), base + h + 1.6, cz + b.range(-2, 2), 0x444444)
  const f = faceOf(x0, x1, z0, z1, front)
  const frame = b.rng() < 0.5 ? 0xe8e6e0 : 0xb9bec3
  const n = Math.max(1, Math.round(f.len / 2.7))
  const sp = f.len / n
  for (let fl = 1; fl < floors; fl++) for (let i = 0; i < n; i++) windowUnit(b, f, sp * (i + 0.5), base + fl * fh + 0.75, 1.1, 1.45, frame, { sill: true })
  if (opt.shop) {
    const u0 = 0.4
    const u1 = f.len - 0.4
    fbox(b, f, u0, u1, base + 0.25, base + 2.55, -0.02, 0.1, 0, 'glassLit')
    const mullion = Math.max(1.2, (u1 - u0) / Math.round((u1 - u0) / 1.8))
    for (let u = u0; u <= u1 + 0.01; u += mullion) fbox(b, f, u - 0.05, u + 0.05, base + 0.25, base + 2.55, 0.1, 0.13, 0x2a2a2a)
    fbox(b, f, u0 - 0.1, u1 + 0.1, base + 2.55, base + 2.75, -0.02, 0.14, 0x2a2a2a)
    if (b.rng() < 0.5) fbox(b, f, u0 + (u1 - u0) * 0.55, u1, base + 1.6, base + 2.55, 0.13, 0.18, 0x8f969c)
    awning(b, f, u0, u1, base + 3.05, 1.15, opt.awnA ?? b.pick([0x1f6f9f, 0xc0392b, 0x2e8b57, 0xe0a100]), 0xf3efe6)
    if (opt.sign) addSign(b, f, (u0 + u1) / 2, base + 3.5, Math.min(f.len - 0.8, 4.2), 0.7, opt.sign, opt.signBg ?? '#fff6dc', opt.signFg ?? '#1e3a5f', 0.12)
  } else {
    for (let i = 0; i < n; i++) {
      const u = sp * (i + 0.5)
      if (i === Math.floor(n / 2)) doorUnit(b, f, u, base, 1.2, 2.3, 0x4a3a2c, frame)
      else windowUnit(b, f, u, base + 1.0, 1.0, 1.3, frame, { bars: true })
    }
  }
  for (const s of opt.sides ?? []) {
    const sf = faceOf(x0, x1, z0, z1, s)
    const m = Math.max(1, Math.floor(sf.len / 3))
    for (let fl = 1; fl < floors; fl++) for (let k = 0; k < m; k++) windowUnit(b, sf, (sf.len / m) * (k + 0.5), base + fl * fh + 0.75, 1.0, 1.4, frame)
  }
  b.addCol(x0, x1, z0, z1, base + h + 2)
}

/** Modern glass office tower with a lobby, mullions and a rooftop mast. */
export function tower(b: CityBuilder, x0: number, x1: number, z0: number, z1: number, h: number, opt: { color?: number; lit?: number; crown?: boolean } = {}) {
  const base = CURB
  const core = b.jit(opt.color ?? 0x8e959c, 0.03)
  const fh = 3.4
  const lobby = 4.4
  const mx = (x0 + x1) / 2
  const mz = (z0 + z1) / 2
  b.blk(x0 + 0.9, x1 - 0.9, base, base + lobby, z0 + 0.9, z1 - 0.9, 0, 'glassLit')
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
    const px = x - 0.45 * Math.sign(x - mx)
    const pz = z - 0.45 * Math.sign(z - mz)
    b.blk(px - 0.45, px + 0.45, base, base + lobby, pz - 0.45, pz + 0.45, core)
  }
  b.blk(x0, x1, base + lobby, base + h, z0, z1, core)
  const floors = Math.floor((h - lobby - 1) / fh)
  for (const s of ['n', 's', 'e', 'w'] as const) {
    const f = faceOf(x0, x1, z0, z1, s)
    const nseg = Math.max(1, Math.round(f.len / 3.1))
    for (let fl = 0; fl < floors; fl++) {
      const y = base + lobby + fl * fh + 0.75
      for (let k = 0; k < nseg; k++) {
        const u0 = (f.len / nseg) * k + 0.1
        const u1 = (f.len / nseg) * (k + 1) - 0.1
        fbox(b, f, u0, u1, y, y + 2.05, -0.02, 0.1, 0, b.rng() < (opt.lit ?? 0.4) ? 'glassLit' : 'glassDark')
      }
    }
    for (let k = 0; k <= nseg; k++) {
      const u = (f.len / nseg) * k
      fbox(b, f, Math.max(0, u - 0.07), Math.min(f.len, u + 0.07), base + lobby, base + h, -0.02, 0.24, 0xdfe3e7)
    }
  }
  b.blk(x0 - 0.2, x1 + 0.2, base + h, base + h + 0.6, z0 - 0.2, z1 + 0.2, 0xdfe3e7)
  b.blk(mx - 1.8, mx + 1.8, base + h + 0.6, base + h + 2.6, mz - 1.4, mz + 1.4, 0x7b8288)
  b.cyl(0.06, 0.09, 6, 6, mx, base + h + 5.6, mz, 0x9aa0a6)
  b.sph(0.22, mx, base + h + 8.7, mz, 0xff2a2a, 'glow')
  if (opt.crown) {
    for (let i = 0; i < 3; i++) {
      const y = base + h - 1.2 - i * 2.2
      b.blk(x0 - 0.16, x1 + 0.16, y, y + 0.34, z0 - 0.16, z1 + 0.16, 0xffffff, 'neon')
    }
  }
  b.addCol(x0, x1, z0, z1, base + h + 3)
}
