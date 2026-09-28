/**
 * The map of downtown Bogotá (a caricature): Plaza de Bolívar in the middle, the cathedral,
 * the Capitol, the city hall and the palace of justice around it, La Candelaria's colonial
 * streets, office towers, a park and a ring of shops. Ported from the legacy build.
 */
import * as THREE from 'three'
import { smooth } from '../core/math'
import { xf } from './batcher'
import { brickBuilding, colonialHouse, colonialRow, tower } from './buildings'
import type { CityBuilder } from './cityBuilder'
import { addSign, awning, doorUnit, faceOf, fbox, gableRoof, hipRoof, windowUnit } from './facades'
import { CURB, PAL } from './palette'
import { bench, streetLamp, trashBin, tree, vendorCart } from './props'

/** Sidewalk blocks are 27 m squares on a 36 m grid; streets run between them. */
export const SLAB = 13.5
export const LOT = 10.5
export const STREETS = [-54, -18, 18, 54]
/** The player can't leave this square. */
export const LIMIT = 61

export function layoutCity(b: CityBuilder) {
  groundAndSidewalks(b)
  pedestrianGraph(b)
  roadMarkings(b)
  plazaDeBolivar(b)
  cathedral(b)
  capitol(b)
  cityHall(b)
  palaceOfJustice(b)
  candelaria(b)
  towers(b)
  park(b)
  outerRing(b)
  streetFurniture(b)
  distantScenery(b)
}

function groundAndSidewalks(b: CityBuilder) {
  b.surf('road', -76, 76, -76, 76, 0, 9)
  for (let bi = -1; bi <= 1; bi++) {
    for (let bj = -1; bj <= 1; bj++) {
      const cx = bi * 36
      const cz = bj * 36
      b.blk(cx - SLAB, cx + SLAB, 0, CURB, cz - SLAB, cz + SLAB, PAL.curb)
      b.addSlab(cx - SLAB, cx + SLAB, cz - SLAB, cz + SLAB, CURB)
      if (bi === 0 && bj === 0) b.surf('plaza', cx - SLAB, cx + SLAB, cz - SLAB, cz + SLAB, CURB + 0.002, 6)
      else if (bi === -1 && bj === 1) {
        b.surf('walk', cx - SLAB, cx + SLAB, cz - SLAB, cz - LOT, CURB + 0.002, 4)
        b.surf('walk', cx - SLAB, cx + SLAB, cz + LOT, cz + SLAB, CURB + 0.002, 4)
        b.surf('walk', cx - SLAB, cx - LOT, cz - LOT, cz + LOT, CURB + 0.002, 4)
        b.surf('walk', cx + LOT, cx + SLAB, cz - LOT, cz + LOT, CURB + 0.002, 4)
        b.surf('grass', cx - LOT, cx + LOT, cz - LOT, cz + LOT, CURB + 0.003, 6)
      } else b.surf('walk', cx - SLAB, cx + SLAB, cz - SLAB, cz + SLAB, CURB + 0.002, 4)
    }
  }
  for (const [x0, x1, z0, z1] of [
    [-76, 76, -76, -58.5],
    [-76, 76, 58.5, 76],
    [-76, -58.5, -58.5, 58.5],
    [58.5, 76, -58.5, 58.5],
  ]) {
    b.blk(x0, x1, 0, CURB, z0, z1, PAL.curb)
    b.addSlab(x0, x1, z0, z1, CURB)
    b.surf('walk', x0, x1, z0, z1, CURB + 0.002, 4)
  }
}

/** Nodes around every block's sidewalk, linked across the streets at crosswalks. */
function pedestrianGraph(b: CityBuilder) {
  const { node, link, nodes } = b.nav
  for (let bi = -1; bi <= 1; bi++) {
    for (let bj = -1; bj <= 1; bj++) {
      const cx = bi * 36
      const cz = bj * 36
      const ring = [[-12, -12], [0, -12], [12, -12], [12, 0], [12, 12], [0, 12], [-12, 12], [-12, 0]].map(([x, z]) => node(cx + x, cz + z))
      for (let i = 0; i < 8; i++) link(ring[i], ring[(i + 1) % 8])
      if (bi < 1) {
        for (const dz of [-12, 12]) {
          link(node(cx + 12, cz + dz), node(cx + 24, cz + dz))
          b.crosswalks.push({ x: cx + 18, z: cz + dz, alongX: true })
        }
      }
      if (bj < 1) {
        for (const dx of [-12, 12]) {
          link(node(cx + dx, cz + 12), node(cx + dx, cz + 24))
          b.crosswalks.push({ x: cx + dx, z: cz + 18, alongX: false })
        }
      }
    }
  }
  // Paths inside the plaza.
  const p = [[-6, -6], [6, -6], [6, 6], [-6, 6]].map(([x, z]) => node(x, z))
  for (let i = 0; i < 4; i++) link(p[i], p[(i + 1) % 4])
  link(p[0], node(-12, -12))
  link(p[1], node(12, -12))
  link(p[2], node(12, 12))
  link(p[3], node(-12, 12))
  // Paths inside the park.
  const [px, pz] = [-36, 36]
  const d = [[0, -6], [6, 0], [0, 6], [-6, 0]].map(([x, z]) => node(px + x, pz + z))
  for (let i = 0; i < 4; i++) link(d[i], d[(i + 1) % 4])
  link(d[0], node(px, pz - 12))
  link(d[1], node(px + 12, pz))
  link(d[2], node(px, pz + 12))
  link(d[3], node(px - 12, pz))
  for (const [a, c] of [[[0, -12], [0, -6]], [[12, 0], [6, 0]], [[0, 12], [0, 6]], [[-12, 0], [-6, 0]]]) {
    b.surfStrip('walk', px + a[0], pz + a[1], px + c[0], pz + c[1], 2.4, CURB + 0.006, 4)
  }
  for (let i = 0; i < 4; i++) {
    const A = nodes[d[i]]
    const B = nodes[d[(i + 1) % 4]]
    b.surfStrip('walk', A.x, A.z, B.x, B.z, 2.2, CURB + 0.007, 4)
  }
}

function roadMarkings(b: CityBuilder) {
  for (const s of STREETS) {
    for (let t = -58; t < 58; t += 4) {
      if (STREETS.some((q) => Math.abs(t + 1 - q) < 8.5)) continue
      b.blk(s - 0.08, s + 0.08, 0.004, 0.018, t, t + 2, 0xe9c43a, 'mark')
      b.blk(t, t + 2, 0.004, 0.018, s - 0.08, s + 0.08, 0xe9c43a, 'mark')
    }
  }
  for (const cw of b.crosswalks) {
    for (let k = -4; k <= 3.6; k += 1) {
      if (cw.alongX) b.blk(cw.x + k, cw.x + k + 0.5, 0.004, 0.02, cw.z - 1.5, cw.z + 1.5, 0xf2f2ee, 'mark')
      else b.blk(cw.x - 1.5, cw.x + 1.5, 0.004, 0.02, cw.z + k, cw.z + k + 0.5, 0xf2f2ee, 'mark')
    }
  }
}

function plazaDeBolivar(b: CityBuilder) {
  const g = CURB
  b.blk(-2.4, 2.4, g, g + 0.5, -2.4, 2.4, 0xa8a293)
  b.blk(-1.8, 1.8, g + 0.5, g + 1.0, -1.8, 1.8, 0xb7b1a2)
  b.blk(-1.1, 1.1, g + 1.0, g + 3.2, -1.1, 1.1, 0xc9c3b4)
  b.blk(-1.3, 1.3, g + 3.2, g + 3.45, -1.3, 1.3, 0xa8a293)
  // The statue (a caricature in bronze).
  const bronze = 0x4f5f4a
  const y0 = g + 3.45
  b.cyl(0.26, 0.34, 1.0, 8, 0, y0 + 0.5, 0, bronze)
  b.cyl(0.3, 0.62, 1.35, 10, 0, y0 + 0.9, -0.05, bronze)
  b.cyl(0.3, 0.26, 0.75, 10, 0, y0 + 1.9, 0, bronze)
  b.sph(0.2, 0, y0 + 2.5, 0, bronze, 'solid', 12, 10, 0, Math.PI)
  const arm = new THREE.CylinderGeometry(0.07, 0.08, 0.8, 6)
  xf(arm, 0.34, y0 + 2.35, 0.18, -0.9, 0, -0.5)
  b.push('solid', arm, bronze)
  const sword = new THREE.BoxGeometry(0.04, 0.9, 0.04)
  xf(sword, 0.62, y0 + 2.8, 0.45, -0.7, 0, -0.5)
  b.push('solid', sword, 0x3d4a39)
  b.addCol(-2.4, 2.4, -2.4, 2.4, 4)
  for (const [x, z, r] of [[8, 0, Math.PI / 2], [-8, 0, -Math.PI / 2], [0, 8, 0], [0, -8, Math.PI]]) {
    streetLamp(b, x, z, r + Math.PI / 2, true)
  }
  vendorCart(b, -10.5, 7, Math.PI / 2, 0xf2c230, 0xd6342c, 'OBLEAS')
  vendorCart(b, 10.5, -7, -Math.PI / 2, 0x2f7fbf, 0xf2c230, "MAÍZ PA' PALOMAS")
}

function cathedral(b: CityBuilder) {
  const s0 = CURB
  const stone = 0xe6dcc6
  const stone2 = 0xd6c9ad
  b.blk(25.5, 28, s0, s0 + 0.15, -9.5, 9.5, 0xbdb4a2)
  b.addSlab(25.5, 28, -9.5, 9.5, s0 + 0.15)
  b.blk(26.3, 28, s0 + 0.15, s0 + 0.3, -9.5, 9.5, 0xc4bba9)
  b.addSlab(26.3, 28, -9.5, 9.5, s0 + 0.3)
  b.blk(27.1, 28, s0 + 0.3, s0 + 0.45, -9.5, 9.5, 0xcbc2b0)
  b.addSlab(27.1, 28, -9.5, 9.5, s0 + 0.45)
  const g = s0 + 0.45
  b.blk(28, 32, g, g + 15, -5.5, 5.5, stone)
  for (const sz of [-1, 1]) {
    const z0 = sz < 0 ? -9.8 : 5.5
    const z1 = sz < 0 ? -5.5 : 9.8
    const zc = (z0 + z1) / 2
    b.blk(28, 32.4, g, g + 19, z0, z1, stone2)
    b.blk(27.8, 32.6, g + 15, g + 15.4, z0 - 0.2, z1 + 0.2, stone)
    b.blk(28.3, 32.1, g + 19, g + 22.6, z0 + 0.3, z1 - 0.3, stone)
    for (const side of ['w', 'e', 'n', 's'] as const) {
      const f = faceOf(28.3, 32.1, z0 + 0.3, z1 - 0.3, side)
      const u = f.len / 2
      fbox(b, f, u - 0.65, u + 0.65, g + 19.6, g + 21.7, -0.02, 0.05, 0x2b2620)
    }
    b.blk(27.9, 32.5, g + 22.6, g + 22.9, z0 + 0.1, z1 + 0.1, stone2)
    b.sph(1.75, 30.2, g + 22.9, zc, 0x7a8f86, 'solid', 14, 8, 0, Math.PI / 2)
    b.cyl(0.35, 0.4, 0.8, 8, 30.2, g + 25, zc, stone)
    b.cyl(0, 0.45, 0.6, 8, 30.2, g + 25.7, zc, 0x7a8f86)
    b.blk(30.15, 30.25, g + 26, g + 27.1, zc - 0.05, zc + 0.05, 0x2b2b2b)
    b.blk(30.15, 30.25, g + 26.6, g + 26.72, zc - 0.32, zc + 0.32, 0x2b2b2b)
    const fw = faceOf(28, 32.4, z0, z1, 'w')
    windowUnit(b, fw, fw.len / 2, g + 7, 1.0, 2.4, stone2, { lit: false, sill: true })
    windowUnit(b, fw, fw.len / 2, g + 12, 0.9, 1.8, stone2, { lit: false })
    doorUnit(b, fw, fw.len / 2, g, 1.4, 3.0, 0x5a3a26, stone2)
  }
  const ped = new THREE.Shape()
  ped.moveTo(-5.8, 0)
  ped.lineTo(5.8, 0)
  ped.lineTo(0, 3.3)
  ped.lineTo(-5.8, 0)
  const pg = new THREE.ExtrudeGeometry(ped, { depth: 1.0, bevelEnabled: false })
  pg.rotateY(Math.PI / 2)
  pg.translate(28, g + 15, 0)
  b.push('solid', pg, stone)
  b.blk(27.6, 32.2, g + 14.6, g + 15.05, -5.8, 5.8, stone2)
  for (const z of [-4.3, -1.5, 1.5, 4.3]) {
    b.cyl(0.42, 0.46, 9.6, 12, 27.5, g + 4.8, z, 0xf1e8d4)
    b.blk(27.0, 28.0, g + 9.6, g + 10.0, z - 0.55, z + 0.55, stone2)
    b.blk(27.0, 28.0, g, g + 0.3, z - 0.55, z + 0.55, stone2)
    b.addCol(27.0, 28.0, z - 0.5, z + 0.5, 10)
  }
  b.blk(26.9, 28.1, g + 10, g + 11.2, -5.5, 5.5, stone)
  const fw = faceOf(28, 32, -5.5, 5.5, 'w')
  fbox(b, fw, 5.5 - 1.35, 5.5 + 1.35, g, g + 5.4, -0.02, 0.1, 0x4a3020)
  const arch = new THREE.CylinderGeometry(1.35, 1.35, 0.12, 18, 1, false, 0, Math.PI)
  xf(arch, 27.94, g + 5.4, 0, 0, 0, Math.PI / 2)
  b.push('solid', arch, 0x4a3020)
  b.cyl(1.25, 1.25, 0.14, 20, 27.93, g + 12.5, 0, 0x3b4f66, 'solid', 0, 0, Math.PI / 2)
  b.cyl(0.8, 0.8, 0.18, 16, 27.9, g + 12.5, 0, 0x22303f, 'glassLit', 0, 0, Math.PI / 2)
  b.blk(32, 46, g, g + 12.5, -7.5, 7.5, stone2)
  gableRoof(b, 32, 46.2, -7.5, 7.5, g + 12.5, stone2, 0x8d4a36, true)
  for (const f of [faceOf(32, 46, -7.5, 7.5, 'n'), faceOf(32, 46, -7.5, 7.5, 's')]) {
    for (let k = 0; k < 4; k++) windowUnit(b, f, 1.8 + k * 3.4, g + 5, 1.0, 3.2, stone, { lit: false })
  }
  b.addCol(28, 46.5, -10, 10, 26)
}

function capitol(b: CityBuilder) {
  const s0 = CURB
  const grey = 0xc2beb4
  const grey2 = 0xb1ada2
  b.blk(-7.5, 7.5, s0, s0 + 0.15, 25.5, 29.4, 0xb3aea0)
  b.addSlab(-7.5, 7.5, 25.5, 29.4, s0 + 0.15)
  b.blk(-7.5, 7.5, s0 + 0.15, s0 + 0.3, 26.3, 29.4, 0xbab5a7)
  b.addSlab(-7.5, 7.5, 26.3, 29.4, s0 + 0.3)
  b.blk(-7.5, 7.5, s0 + 0.3, s0 + 0.45, 27.1, 29.4, 0xc1bcae)
  b.addSlab(-7.5, 7.5, 27.1, 29.4, s0 + 0.45)
  const g = s0 + 0.45
  b.blk(-10, 10, s0, s0 + 12.5, 29.4, 45, grey)
  b.blk(-10.2, 10.2, s0 + 12.5, s0 + 13.2, 29.2, 45.2, grey2)
  for (let i = 0; i < 8; i++) {
    const x = -5.25 + i * 1.5
    b.cyl(0.38, 0.42, 9.2, 12, x, g + 4.6, 28.1, 0xe2ddd2)
    b.blk(x - 0.5, x + 0.5, g + 9.2, g + 9.6, 27.6, 28.6, grey2)
    b.blk(x - 0.5, x + 0.5, g, g + 0.25, 27.6, 28.6, grey2)
    b.addCol(x - 0.45, x + 0.45, 27.65, 28.55, 10)
  }
  b.blk(-6.3, 6.3, g + 9.6, g + 10.8, 27.4, 29.4, grey)
  const ped = new THREE.Shape()
  ped.moveTo(-6.3, 0)
  ped.lineTo(6.3, 0)
  ped.lineTo(0, 2.5)
  ped.lineTo(-6.3, 0)
  const pg = new THREE.ExtrudeGeometry(ped, { depth: 2.0, bevelEnabled: false })
  pg.translate(0, g + 10.8, 27.4)
  b.push('solid', pg, grey)
  const fn = faceOf(-10, 10, 29.4, 45, 'n')
  for (let k = 0; k < 5; k++) doorUnit(b, fn, 6 + k * 2, g, 1.1, 3.2, 0x4a3526, grey2)
  for (const u of [1.5, 3.5, 16.5, 18.5]) {
    windowUnit(b, fn, u, g + 1.2, 1.1, 2.2, grey2, { lit: false })
    windowUnit(b, fn, u, g + 6.5, 1.1, 2.4, grey2, { lit: false })
  }
  for (let k = 0; k < 5; k++) windowUnit(b, fn, 6 + k * 2, g + 6.3, 1.0, 2.2, grey2, { lit: false })
  for (const s of ['e', 'w'] as const) {
    const f = faceOf(-10, 10, 29.4, 45, s)
    for (let k = 0; k < 5; k++) {
      windowUnit(b, f, 1.8 + k * 3.1, g + 1.2, 1.1, 2.2, grey2)
      windowUnit(b, f, 1.8 + k * 3.1, g + 6.5, 1.1, 2.4, grey2)
    }
  }
  b.addCol(-10, 10, 29.4, 45, 14)
  b.flags.push({ x: 0, y: s0 + 13.2, z: 37, h: 5 })
}

function cityHall(b: CityBuilder) {
  const s0 = CURB
  const cream = 0xead9a9
  const cream2 = 0xd9c38f
  b.blk(-46, -29, s0, s0 + 11, -10, 10, cream)
  b.blk(-29, -26, s0 + 4.6, s0 + 11, -10, 10, cream)
  b.blk(-29.1, -25.9, s0 + 4.3, s0 + 4.7, -10.1, 10.1, cream2)
  for (let i = 0; i < 9; i++) {
    const z = -9.6 + i * 2.4
    b.blk(-26.6, -25.9, s0, s0 + 4.3, z - 0.3, z + 0.3, cream2)
    b.addCol(-26.6, -25.9, z - 0.3, z + 0.3, 5)
  }
  const fgA = faceOf(-46, -29, -10, 10, 'e')
  for (let i = 0; i < 8; i++) {
    const u = 1.6 + i * 2.4
    if (i % 2 === 0) doorUnit(b, fgA, u, s0, 1.1, 2.6, 0x4a3526, cream2)
    else windowUnit(b, fgA, u, s0 + 1.0, 1.0, 1.6, cream2, { bars: true })
  }
  const fe = faceOf(-29, -26, -10, 10, 'e')
  for (const fl of [0, 1]) {
    for (let i = 0; i < 7; i++) {
      const u = 1.4 + i * 2.87
      windowUnit(b, fe, u, s0 + 5.4 + fl * 2.9, 0.95, 1.9, 0xf4f1ea)
      if (fl === 0 && i % 2 === 0) fbox(b, fe, u - 0.8, u + 0.8, s0 + 5.3, s0 + 5.42, 0, 0.55, 0x2b2b2b)
    }
  }
  b.blk(-46.3, -25.7, s0 + 11, s0 + 11.4, -10.3, 10.3, cream2)
  hipRoof(b, -46, -26, -10, 10, s0 + 11.4, 3.2, 0x4b525c, 0.72)
  for (let i = 0; i < 5; i++) {
    const z = -7.5 + i * 3.75
    b.blk(-27.7, -26.9, s0 + 12.3, s0 + 13.6, z - 0.5, z + 0.5, 0x4b525c)
    windowUnit(b, faceOf(-27.7, -26.9, z - 0.5, z + 0.5, 'e'), 0.5, s0 + 12.45, 0.55, 0.9, 0xf4f1ea, { sill: false })
  }
  for (const s of ['n', 's'] as const) {
    const f = faceOf(-46, -26, -10, 10, s)
    for (const fl of [0, 1, 2]) for (let k = 0; k < 6; k++) windowUnit(b, f, 1.8 + k * 3.3, s0 + 1.2 + fl * 3.3, 0.95, 1.8, 0xf4f1ea)
  }
  b.addCol(-46, -29, -10, 10, 15)
  b.flags.push({ x: -36, y: s0 + 14.6, z: 0, h: 4 })
}

function palaceOfJustice(b: CityBuilder) {
  const s0 = CURB
  const st = 0xcdbf9f
  const st2 = 0xb9ab8b
  b.blk(-10, 10, s0, s0 + 14, -45, -27.5, st)
  b.blk(-10.3, 10.3, s0 + 14, s0 + 14.6, -45.3, -27.2, st2)
  const fs = faceOf(-10, 10, -45, -27.5, 's')
  for (let k = 0; k < 9; k++) {
    const u = 2 + k * 2
    if (k >= 3 && k <= 5) continue
    fbox(b, fs, u - 0.55, u + 0.55, s0 + 2.3, s0 + 12.7, 0, 0.25, st2)
    fbox(b, fs, u - 0.3, u + 0.3, s0 + 2.5, s0 + 12.5, -0.02, 0.3, 0, 'glassDark')
  }
  fbox(b, fs, 7, 13, s0, s0 + 4.2, -0.02, 0.04, 0x2a2c30)
  fbox(b, fs, 6.6, 13.4, s0 + 4.2, s0 + 4.8, 0, 1.2, st2)
  for (const u of [7.2, 12.8]) {
    fbox(b, fs, u - 0.25, u + 0.25, s0, s0 + 4.2, 0, 1.1, st2)
    b.addCol(-10 + u - 0.25, -10 + u + 0.25, -27.5, -26.4, 5)
  }
  fbox(b, fs, 7.6, 12.4, s0, s0 + 3.4, 0.04, 0.08, 0, 'glassLit')
  for (const s of ['e', 'w'] as const) {
    const f = faceOf(-10, 10, -45, -27.5, s)
    for (let k = 0; k < 6; k++) fbox(b, f, 1.6 + k * 2.8 - 0.3, 1.6 + k * 2.8 + 0.3, s0 + 2.5, s0 + 12.5, -0.02, 0.1, 0, 'glassDark')
  }
  b.addCol(-10, 10, -45, -27.5, 15)
}

function candelaria(b: CityBuilder) {
  colonialRow(b, 25.5, 46.5, -46.5, -36, 'n', 3, ['w', 'e'], [
    {},
    { shop: true, balcony: false, sign: 'PANADERÍA LA SÉPTIMA', awnA: 0xb03a2e },
    {},
  ])
  colonialRow(b, 25.5, 46.5, -36, -25.5, 's', 3, ['w', 'e'], [
    { shop: true, balcony: false, sign: 'CAFÉ EL TINTO', awnA: 0x2e6b4f, signFg: '#244a2a' },
    {},
    { shop: true, balcony: false, sign: 'CANELAZO · CHICHA', awnA: 0x7a3b8a, signFg: '#5a2a6b' },
  ])
  colonialRow(b, 25.5, 36, 25.5, 46.5, 'w', 3, ['n', 's'], [
    { mural: 'n', sides: [] },
    { shop: true, balcony: false, sign: 'ARTESANÍAS', awnA: 0xd0832a },
    {},
  ])
  colonialRow(b, 36, 46.5, 25.5, 46.5, 'e', 3, ['n', 's'], [
    {},
    { shop: true, balcony: false, sign: 'EMPANADAS DOÑA ROSA', awnA: 0xc0392b },
    {},
  ])
}

function towers(b: CityBuilder) {
  tower(b, -46, -37.5, -46, -37.5, 54, { crown: true, color: 0x8a939c, lit: 0.45 })
  tower(b, -34, -26, -46, -39, 31, { color: 0x9aa2a8, lit: 0.35 })
  tower(b, -46, -38.5, -34.5, -26, 23, { color: 0x7f8a92, lit: 0.5 })
  const g = CURB
  b.blk(-33, -29.5, g, g + 0.55, -35.6, -34.2, 0x8a8478)
  b.ico(0.7, 1, -32.2, g + 0.95, -34.9, 0x4f8a3c, 1.2, 0.7, 0.8)
  b.ico(0.6, 1, -30.4, g + 0.9, -34.9, 0x5e9444, 1.1, 0.7, 0.8)
  b.addCol(-33, -29.5, -35.6, -34.2, 1)
  // Red modern sculpture.
  for (let i = 0; i < 3; i++) {
    const s = new THREE.BoxGeometry(0.5, 2.6, 0.5)
    xf(s, -30.5 + i * 0.35, g + 1.5 + i * 0.4, -29.5, 0.3 * i, 0.8 * i, 0.5 - 0.35 * i)
    b.push('solid', s, 0xc0392b)
  }
  b.addCol(-31.2, -29.2, -30.5, -28.5, 3)
  bench(b, -34, -29, Math.PI / 2)
  bench(b, -28, -33, 0)
}

function park(b: CityBuilder) {
  const [cx, cz] = [-36, 36]
  const g = CURB
  b.cyl(3.0, 3.1, 0.55, 24, cx, g + 0.27, cz, 0xb9b2a2)
  b.cyl(2.6, 2.6, 0.08, 24, cx, g + 0.5, cz, 0x9a9384)
  b.cyl(0.5, 0.6, 1.2, 12, cx, g + 0.9, cz, 0xb9b2a2)
  b.cyl(1.0, 0.7, 0.25, 16, cx, g + 1.5, cz, 0xb9b2a2)
  b.cyl(0.2, 0.25, 0.7, 10, cx, g + 1.9, cz, 0xb9b2a2)
  b.addCol(cx - 3, cx + 3, cz - 3, cz + 3, 1)
  b.water.push({ x: cx, y: g + 0.5, z: cz, r: 2.55 })
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1]]) {
    tree(b, cx + sx * 6.5, cz + sz * 9, b.range(1, 1.25), b.rng() < 0.35)
    tree(b, cx + sx * 9, cz + sz * 6.3, b.range(1, 1.25), b.rng() < 0.35)
    tree(b, cx + sx * 9.3, cz + sz * 9.3, b.range(0.9, 1.1))
  }
  bench(b, cx + 3.2, cz + 9, Math.PI)
  bench(b, cx + 9, cz + 3.2, -Math.PI / 2)
  bench(b, cx - 9, cz + 3.2, Math.PI / 2)
  bench(b, cx + 3.2, cz - 9, 0)
  // Corner shop.
  const [k0, k1, k2, k3] = [cx - 10, cx - 6.2, cz - 10, cz - 6.8]
  b.blk(k0, k1, g, g + 2.8, k2, k3, 0xf0c35c)
  b.blk(k0 - 0.04, k1 + 0.04, g, g + 0.7, k2 - 0.04, k3 + 0.04, 0x2e6b4f)
  gableRoof(b, k0, k1, k2, k3, g + 2.8, 0xf0c35c, 0xb4553c, true)
  const kf = faceOf(k0, k1, k2, k3, 's')
  fbox(b, kf, 0.5, 2.3, g + 0.9, g + 2.1, -0.02, 0.08, 0, 'glassLit')
  fbox(b, kf, 0.4, 2.4, g + 0.85, g + 0.95, 0, 0.42, 0x8a5a3a)
  doorUnit(b, kf, 3.1, g, 0.9, 2.1, 0x3a6b8a, 0xf4f1ea)
  awning(b, kf, 0.3, 2.5, g + 2.2, 0.8, 0x2e8b57, 0xf3efe6)
  addSign(b, kf, 1.9, g + 2.52, 2.6, 0.44, 'TIENDA DON CHUCHO', '#fff6dc', '#1e5a34', 0.12)
  b.addCol(k0, k1, k2, k3, 4)
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    streetLamp(b, cx + sx * 4.6, cz + sz * 4.6, Math.atan2(-sx, -sz) + Math.PI / 2, true)
  }
}

function outerRing(b: CityBuilder) {
  const shopNames = [
    'DROGUERÍA', 'PAPELERÍA', 'MISCELÁNEA', 'FRUTERÍA', 'ASADERO', 'PANADERÍA', 'FERRETERÍA',
    'CACHARRERÍA', 'PELUQUERÍA', 'LAVANDERÍA', 'ALMACÉN', 'RESTAURANTE', 'CHANCE Y LOTERÍA', 'MINUTOS A TODO OPERADOR',
  ]
  const side = (axis: 'x' | 'z', f0: number, f1: number, from: number, to: number, front: 'n' | 's' | 'e' | 'w') => {
    let a = from
    while (a < to - 0.5) {
      let w = b.range(7, 12)
      if (to - a - w < 6) w = to - a
      const e = a + w
      const [x0, x1, z0, z1] = axis === 'x' ? [a, e, f0, f1] : [f0, f1, a, e]
      const shop = b.rng() < 0.55
      const sign = shop ? b.pick(shopNames) : null
      if (b.rng() < 0.62) brickBuilding(b, x0, x1, z0, z1, front, { shop, sign, floors: 2 + Math.floor(b.rng() * 4) })
      else colonialHouse(b, x0, x1, z0, z1, front, { shop, sign, floors: b.rng() < 0.5 ? 2 : 3, balcony: shop ? false : undefined })
      a = e
    }
  }
  side('x', -71.5, -61.5, -71.5, 71.5, 's')
  side('x', 61.5, 71.5, -71.5, 71.5, 'n')
  side('z', -71.5, -61.5, -61.5, 61.5, 'e')
  side('z', 61.5, 71.5, -61.5, 61.5, 'w')
}

function streetFurniture(b: CityBuilder) {
  const civicFront: Record<string, string> = { '1,0': 'w', '-1,0': 'e', '0,1': 'n', '0,-1': 's' }
  for (let bi = -1; bi <= 1; bi++) {
    for (let bj = -1; bj <= 1; bj++) {
      const cx = bi * 36
      const cz = bj * 36
      const isPlaza = bi === 0 && bj === 0
      const sides: [string, number, number, number][] = [
        ['n', 0, -13, Math.PI],
        ['s', 0, 13, 0],
        ['w', -13, 0, -Math.PI / 2],
        ['e', 13, 0, Math.PI / 2],
      ]
      for (const [s, ox, oz, rot] of sides) {
        for (const t of [-6.5, 6.5]) streetLamp(b, cx + (ox || t), cz + (oz || t), rot)
        if (!isPlaza && civicFront[bi + ',' + bj] !== s) tree(b, cx + (ox || 0), cz + (oz || 0), b.range(0.9, 1.15))
        if (!isPlaza && b.rng() < 0.55) {
          const t = b.rng() < 0.5 ? -3 : 3
          trashBin(b, cx + (ox || t), cz + (oz || t))
        }
      }
    }
  }
  for (const t of [-45, -27, -9, 9, 27, 45]) {
    streetLamp(b, t, -59.2, 0)
    streetLamp(b, t, 59.2, Math.PI)
    streetLamp(b, -59.2, t, Math.PI / 2)
    streetLamp(b, 59.2, t, -Math.PI / 2)
  }
  for (const t of [-36, 0, 36]) {
    tree(b, t, -60, b.range(0.9, 1.1))
    tree(b, t, 60, b.range(0.9, 1.1))
    tree(b, -60, t, b.range(0.9, 1.1))
    tree(b, 60, t, b.range(0.9, 1.1))
  }
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const x = sx * 13.15
    const z = sz * 13.15
    b.cyl(0.07, 0.09, 3.4, 8, x, CURB + 1.7, z, 0x2b2f33)
    b.addCol(x - 0.12, x + 0.12, z - 0.12, z + 0.12, 3.5)
    b.trafficLights.push({ x, z, sx, sz })
  }
}

/** Height of the eastern hills (Monserrate) at (x, z). */
function mountainH(x: number, z: number) {
  const t = smooth(88, 200, x)
  let h = t * 92
  h += t * (Math.sin(z * 0.031 + 1.3) * 16 + Math.sin(z * 0.083 + 0.4) * 7 + Math.sin(x * 0.06 + z * 0.045) * 6)
  h += Math.exp(-(((x - 178) / 30) ** 2 + ((z + 22) / 24) ** 2)) * 42
  h += Math.exp(-(((x - 188) / 34) ** 2 + ((z - 78) / 28) ** 2)) * 34
  h += t * Math.sin(x * 0.21 + z * 0.17) * 2.5
  return h - 3
}

/** Eastern hills with the church on top, the savanna and a low distant city. */
function distantScenery(b: CityBuilder) {
  const W = 300
  const D = 460
  const g = new THREE.PlaneGeometry(W, D, 60, 92)
  g.rotateX(-Math.PI / 2)
  g.translate(80 + W / 2, 0, 0)
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) pos.setY(i, mountainH(pos.getX(i), pos.getZ(i)))
  const ng = g.toNonIndexed()
  ng.computeVertexNormals()
  const p = ng.attributes.position
  const col = new Float32Array(p.count * 3)
  const cA = new THREE.Color(0x5a843e)
  const cB = new THREE.Color(0x3b6132)
  const cC = new THREE.Color(0x7d7a62)
  const cD = new THREE.Color(0x2e5030)
  const tmp = new THREE.Color()
  for (let i = 0; i < p.count; i += 3) {
    const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3
    const r = b.rng()
    tmp.copy(cA).lerp(cB, smooth(8, 70, y))
    if (y > 55 && r < 0.35) tmp.lerp(cC, 0.6)
    if (r < 0.12) tmp.lerp(cD, 0.5)
    tmp.offsetHSL(0, 0, (b.rng() - 0.5) * 0.03)
    for (let k = 0; k < 3; k++) {
      col[(i + k) * 3] = tmp.r
      col[(i + k) * 3 + 1] = tmp.g
      col[(i + k) * 3 + 2] = tmp.b
    }
  }
  ng.setAttribute('color', new THREE.BufferAttribute(col, 3))
  ;(b.buckets.far ??= []).push(ng)

  // Church on the summit (generic silhouette).
  const mx = 178
  const mz = -22
  const my = mountainH(mx, mz) - 0.5
  const s = 2.4
  b.blk(mx - 3 * s, mx + 3 * s, my, my + 4 * s, mz - 2 * s, mz + 2 * s, 0xf4f1ea, 'far')
  for (const sz of [-1, 1]) {
    b.blk(mx - 3.2 * s, mx - 1.6 * s, my, my + 7 * s, mz + sz * 1.3 * s - 0.8 * s, mz + sz * 1.3 * s + 0.8 * s, 0xf7f4ee, 'far')
    b.cyl(0, 0.9 * s, 1.4 * s, 4, mx - 2.4 * s, my + 7.7 * s, mz + sz * 1.3 * s, 0xb4553c, 'far')
  }
  gableRoof(b, mx - 1.6 * s, mx + 3 * s, mz - 2 * s, mz + 2 * s, my + 4 * s, 0xf4f1ea, 0xb4553c, true)

  // Savanna and the far city.
  const ground = new THREE.PlaneGeometry(2000, 2000)
  ground.rotateX(-Math.PI / 2)
  ground.translate(0, -0.06, 0)
  b.push('far', ground, 0x5f6e48)
  for (let i = 0; i < 520; i++) {
    const a = b.rng() * Math.PI * 2
    const r = b.range(84, 340)
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (x > 76) continue
    if (Math.abs(x) < 78 && Math.abs(z) < 78) continue
    const w = b.range(8, 22)
    const d = b.range(8, 22)
    const tall = b.rng() < 0.08
    const h = tall ? b.range(22, 50) : b.range(4, 13)
    const c = b.rng() < 0.62 ? b.jit(b.pick(PAL.brick), 0.05) : b.jit(b.pick([0xb9b4aa, 0xd8d2c4, 0x9aa3ab, 0xc9b89a]), 0.05)
    b.blk(x - w / 2, x + w / 2, 0, h, z - d / 2, z + d / 2, c, 'far')
  }
}
