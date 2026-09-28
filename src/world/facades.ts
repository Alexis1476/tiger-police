import * as THREE from 'three'
import { xf } from './batcher'
import type { CityBuilder } from './cityBuilder'
import { PAL, shade, type ColorLike } from './palette'

/**
 * A building face: `axis` is the axis it faces along, `pos` its coordinate, `dir` which way
 * it faces (±1), and `a`…`a + len` the extent along the wall. Facade coordinates are
 * u (along the wall), y (height) and o (outward offset).
 */
export type Face = { axis: 'x' | 'z'; pos: number; dir: number; a: number; len: number }
export type Side = 'n' | 's' | 'e' | 'w'

export function faceOf(x0: number, x1: number, z0: number, z1: number, side: Side): Face {
  switch (side) {
    case 'n':
      return { axis: 'z', pos: z0, dir: -1, a: x0, len: x1 - x0 }
    case 's':
      return { axis: 'z', pos: z1, dir: 1, a: x0, len: x1 - x0 }
    case 'w':
      return { axis: 'x', pos: x0, dir: -1, a: z0, len: z1 - z0 }
    default:
      return { axis: 'x', pos: x1, dir: 1, a: z0, len: z1 - z0 }
  }
}

/** Box in facade coordinates. */
export function fbox(b: CityBuilder, f: Face, u0: number, u1: number, y0: number, y1: number, o0: number, o1: number, color: ColorLike, bucket = 'solid') {
  const a = f.pos + f.dir * o0
  const c = f.pos + f.dir * o1
  if (f.axis === 'z') return b.blk(f.a + u0, f.a + u1, y0, y1, Math.min(a, c), Math.max(a, c), color, bucket)
  return b.blk(Math.min(a, c), Math.max(a, c), y0, y1, f.a + u0, f.a + u1, color, bucket)
}

export function fpoint(f: Face, u: number, o: number): [number, number] {
  return f.axis === 'z' ? [f.a + u, f.pos + f.dir * o] : [f.pos + f.dir * o, f.a + u]
}

export function faceYaw(f: Face) {
  return f.axis === 'z' ? (f.dir > 0 ? 0 : Math.PI) : f.dir > 0 ? Math.PI / 2 : -Math.PI / 2
}

type WindowOpts = { lit?: boolean | null; sill?: boolean; bars?: boolean; shutters?: ColorLike | null }

export function windowUnit(b: CityBuilder, f: Face, u: number, y: number, w: number, h: number, frame: ColorLike, { lit = null, sill = true, bars = false, shutters = null }: WindowOpts = {}) {
  const bucket = (lit === null ? b.rng() < 0.45 : lit) ? 'glassLit' : 'glassDark'
  fbox(b, f, u - w / 2 - 0.1, u + w / 2 + 0.1, y - 0.1, y + h + 0.1, -0.02, 0.07, frame)
  fbox(b, f, u - w / 2, u + w / 2, y, y + h, -0.02, 0.09, 0x000000, bucket)
  fbox(b, f, u - 0.03, u + 0.03, y, y + h, 0.09, 0.11, frame)
  fbox(b, f, u - w / 2, u + w / 2, y + h * 0.62 - 0.03, y + h * 0.62 + 0.03, 0.09, 0.11, frame)
  if (sill) fbox(b, f, u - w / 2 - 0.18, u + w / 2 + 0.18, y - 0.16, y - 0.04, -0.02, 0.22, 0xdedad2)
  if (bars) for (let k = -2; k <= 2; k++) fbox(b, f, u + (k * w) / 5 - 0.016, u + (k * w) / 5 + 0.016, y, y + h, 0.13, 0.16, 0x1e1e1e)
  if (shutters !== null) {
    fbox(b, f, u - w / 2 - 0.52, u - w / 2 - 0.1, y, y + h, 0.02, 0.08, shutters)
    fbox(b, f, u + w / 2 + 0.1, u + w / 2 + 0.52, y, y + h, 0.02, 0.08, shutters)
  }
}

export function doorUnit(b: CityBuilder, f: Face, u: number, y: number, w: number, h: number, color: ColorLike, frame: ColorLike) {
  fbox(b, f, u - w / 2 - 0.13, u + w / 2 + 0.13, y, y + h + 0.13, -0.02, 0.08, frame)
  fbox(b, f, u - w / 2, u + w / 2, y, y + h, -0.02, 0.1, color)
  const dk = shade(color, -0.07)
  fbox(b, f, u - w / 2 + 0.1, u - 0.05, y + 0.25, y + h - 0.3, 0.1, 0.13, dk)
  fbox(b, f, u + 0.05, u + w / 2 - 0.1, y + 0.25, y + h - 0.3, 0.1, 0.13, dk)
}

export function balcony(b: CityBuilder, f: Face, u0: number, u1: number, y: number, depth = 0.72) {
  const W = PAL.wood
  fbox(b, f, u0, u1, y - 0.12, y, 0, depth, W)
  fbox(b, f, u0, u1, y + 0.92, y + 1.02, depth - 0.08, depth, W)
  fbox(b, f, u0, u0 + 0.08, y + 0.92, y + 1.02, 0, depth, W)
  fbox(b, f, u1 - 0.08, u1, y + 0.92, y + 1.02, 0, depth, W)
  for (let u = u0 + 0.12; u < u1 - 0.06; u += 0.24) fbox(b, f, u, u + 0.05, y, y + 0.92, depth - 0.07, depth - 0.02, W)
  fbox(b, f, u0 + 0.1, u0 + 0.24, y - 0.45, y - 0.12, 0, depth * 0.75, W)
  fbox(b, f, u1 - 0.24, u1 - 0.1, y - 0.45, y - 0.12, 0, depth * 0.75, W)
}

export function awning(b: CityBuilder, f: Face, u0: number, u1: number, y: number, depth: number, colA: ColorLike, colB: ColorLike) {
  const a = 0.35
  const L = depth / Math.cos(a)
  const seg = 0.55
  for (let u = u0, i = 0; u < u1 - 0.01; u += seg, i++) {
    const e = Math.min(u + seg, u1)
    const len = e - u
    const [x, z] = fpoint(f, (u + e) / 2, depth / 2)
    const yy = y - (Math.tan(a) * depth) / 2
    const g = f.axis === 'z' ? new THREE.BoxGeometry(len, 0.05, L) : new THREE.BoxGeometry(L, 0.05, len)
    if (f.axis === 'z') xf(g, x, yy, z, f.dir * a, 0, 0)
    else xf(g, x, yy, z, 0, 0, -f.dir * a)
    b.push('solid', g, i % 2 ? colA : colB)
  }
  const [x1, z1] = fpoint(f, u0, depth)
  const [x2, z2] = fpoint(f, u1, depth)
  const yb = y - Math.tan(a) * depth
  if (f.axis === 'z') b.blk(Math.min(x1, x2), Math.max(x1, x2), yb - 0.22, yb, z1 - 0.03, z1 + 0.03, colA)
  else b.blk(x1 - 0.03, x1 + 0.03, yb - 0.22, yb, Math.min(z1, z2), Math.max(z1, z2), colA)
}

export function gableRoof(b: CityBuilder, x0: number, x1: number, z0: number, z1: number, y: number, wallColor: ColorLike, roofColor: ColorLike, ridgeX: boolean) {
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const span = ridgeX ? z1 - z0 : x1 - x0
  const len = ridgeX ? x1 - x0 : z1 - z0
  const ang = 0.42
  const ov = 0.55
  const rise = (Math.tan(ang) * span) / 2
  const slopeLen = (span / 2 + ov) / Math.cos(ang)
  const th = 0.16
  const sh = new THREE.Shape()
  sh.moveTo(-span / 2, 0)
  sh.lineTo(span / 2, 0)
  sh.lineTo(0, rise)
  sh.lineTo(-span / 2, 0)
  for (const end of [0, 1]) {
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: false })
    if (ridgeX) {
      g.rotateY(Math.PI / 2)
      g.translate(end ? x1 - 0.25 : x0, y, cz)
    } else g.translate(cx, y, end ? z1 - 0.25 : z0)
    b.push('solid', g, wallColor)
  }
  const midY = y + (rise - ov * Math.tan(ang)) / 2 + th * 0.6
  for (const s of [-1, 1]) {
    let g: THREE.BoxGeometry
    if (ridgeX) {
      g = new THREE.BoxGeometry(len + ov * 1.1, th, slopeLen)
      xf(g, cx, midY, cz + (s * (span / 2 + ov)) / 2, s * ang, 0, 0)
    } else {
      g = new THREE.BoxGeometry(slopeLen, th, len + ov * 1.1)
      xf(g, cx + (s * (span / 2 + ov)) / 2, midY, cz, 0, 0, -s * ang)
    }
    b.push('solid', g, roofColor)
  }
  const rc = shade(roofColor, -0.12)
  if (ridgeX) b.blk(x0 - ov * 0.55, x1 + ov * 0.55, y + rise - 0.02, y + rise + 0.2, cz - 0.17, cz + 0.17, rc)
  else b.blk(cx - 0.17, cx + 0.17, y + rise - 0.02, y + rise + 0.2, z0 - ov * 0.55, z1 + ov * 0.55, rc)
}

export function hipRoof(b: CityBuilder, x0: number, x1: number, z0: number, z1: number, y: number, h: number, color: ColorLike, top = 0.7) {
  const g = new THREE.CylinderGeometry(top * Math.SQRT1_2, Math.SQRT1_2, h, 4, 1)
  g.rotateY(Math.PI / 4)
  xf(g, (x0 + x1) / 2, y + h / 2, (z0 + z1) / 2, 0, 0, 0, x1 - x0, 1, z1 - z0)
  b.push('solid', g, color)
}

export function addSign(b: CityBuilder, f: Face, u: number, y: number, w: number, h: number, text: string, bg: string, fg: string, o = 0.13) {
  b.signs.push({ f, u, y, w, h, text, bg, fg, o })
}
