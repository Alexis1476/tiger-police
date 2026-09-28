import * as THREE from 'three'
import { xf } from './batcher'
import type { CityBuilder } from './cityBuilder'
import { PAL } from './palette'

/** Street lamp. `classic` = the plaza's twin-globe lanterns. Registers its light for night glow. */
export function streetLamp(b: CityBuilder, x: number, z: number, rotY: number, classic = false) {
  const g0 = b.heightAt(x, z)
  const ax = Math.sin(rotY)
  const az = Math.cos(rotY)
  const dark = PAL.metal
  if (classic) {
    b.cyl(0.08, 0.13, 3.6, 8, x, g0 + 1.8, z, 0x1d1f1e)
    b.cyl(0.2, 0.24, 0.35, 8, x, g0 + 0.18, z, 0x1d1f1e)
    for (const s of [-1, 1]) {
      const px = x + Math.cos(rotY) * 0.55 * s
      const pz = z - Math.sin(rotY) * 0.55 * s
      b.blk(Math.min(x, px) - 0.03, Math.max(x, px) + 0.03, g0 + 3.5, g0 + 3.56, Math.min(z, pz) - 0.03, Math.max(z, pz) + 0.03, 0x1d1f1e)
      b.sph(0.2, px, g0 + 3.35, pz, 0xffffff, 'glow', 12, 8)
      b.cyl(0.1, 0.16, 0.14, 8, px, g0 + 3.6, pz, 0x1d1f1e)
      b.lamps.push(new THREE.Vector3(px, g0 + 3.3, pz))
    }
    b.addCol(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 4)
    return
  }
  b.cyl(0.085, 0.12, 5.4, 8, x, g0 + 2.7, z, dark)
  b.cyl(0.16, 0.2, 0.5, 8, x, g0 + 0.25, z, dark)
  const arm = new THREE.BoxGeometry(0.08, 0.08, 1.5)
  xf(arm, x + ax * 0.7, g0 + 5.3, z + az * 0.7, 0, rotY, 0)
  b.push('solid', arm, dark)
  const head = new THREE.BoxGeometry(0.36, 0.16, 0.72)
  xf(head, x + ax * 1.42, g0 + 5.22, z + az * 1.42, 0, rotY, 0)
  b.push('solid', head, dark)
  const bulb = new THREE.BoxGeometry(0.28, 0.05, 0.56)
  xf(bulb, x + ax * 1.42, g0 + 5.12, z + az * 1.42, 0, rotY, 0)
  b.push('glow', bulb, 0xffffff)
  b.lamps.push(new THREE.Vector3(x + ax * 1.42, g0 + 5.0, z + az * 1.42))
  b.addCol(x - 0.16, x + 0.16, z - 0.16, z + 0.16, 5.5)
}

export function tree(b: CityBuilder, x: number, z: number, s = 1, conifer = false) {
  const g0 = b.heightAt(x, z)
  b.blk(x - 0.65, x + 0.65, g0, g0 + 0.04, z - 0.65, z + 0.65, 0x4a3a2c)
  b.cyl(0.11 * s, 0.17 * s, 2.3 * s, 6, x, g0 + 1.15 * s, z, 0x5a4030)
  if (conifer) {
    for (let i = 0; i < 3; i++) b.cyl(0, (1.4 - i * 0.35) * s, 1.8 * s, 7, x, g0 + (2.2 + i * 1.0) * s, z, b.jit(0x3d6a3a, 0.04))
  } else {
    const greens = [0x4d7f38, 0x5e9444, 0x3f6e33, 0x6a9a45]
    const n = 3 + Math.floor(b.rng() * 2)
    for (let i = 0; i < n; i++) {
      b.ico(
        (0.95 + b.rng() * 0.6) * s,
        1,
        x + (b.rng() - 0.5) * 1.3 * s,
        g0 + (2.7 + b.rng() * 1.3) * s,
        z + (b.rng() - 0.5) * 1.3 * s,
        b.jit(b.pick(greens), 0.04),
        1,
        0.82,
        1,
      )
    }
  }
  b.addCol(x - 0.24, x + 0.24, z - 0.24, z + 0.24, 3)
}

export function bench(b: CityBuilder, x: number, z: number, rotY: number) {
  const g0 = b.heightAt(x, z)
  const dx = Math.cos(rotY)
  const dz = -Math.sin(rotY)
  const fx = Math.sin(rotY)
  const fz = Math.cos(rotY)
  const seat = new THREE.BoxGeometry(1.8, 0.07, 0.48)
  xf(seat, x, g0 + 0.46, z, 0, rotY, 0)
  b.push('solid', seat, 0x8a5a3a)
  const back = new THREE.BoxGeometry(1.8, 0.42, 0.06)
  xf(back, x - fx * 0.22, g0 + 0.78, z - fz * 0.22, 0, rotY, 0)
  b.push('solid', back, 0x8a5a3a)
  for (const s of [-0.75, 0.75]) {
    const leg = new THREE.BoxGeometry(0.07, 0.46, 0.46)
    xf(leg, x + dx * s, g0 + 0.23, z + dz * s, 0, rotY, 0)
    b.push('solid', leg, 0x2b302d)
  }
  b.addCol(x - 0.9, x + 0.9, z - 0.9, z + 0.9, 0.9)
}

export function trashBin(b: CityBuilder, x: number, z: number) {
  const g0 = b.heightAt(x, z)
  b.cyl(0.26, 0.22, 0.8, 10, x, g0 + 0.4, z, 0x2f6b3f)
  b.cyl(0.28, 0.28, 0.06, 10, x, g0 + 0.82, z, 0x245531)
  b.addCol(x - 0.28, x + 0.28, z - 0.28, z + 0.28, 1)
}

/** Street-food cart with a striped umbrella and a painted sign. */
export function vendorCart(b: CityBuilder, x: number, z: number, rotY: number, colA: number, colB: number, text: string) {
  const g0 = b.heightAt(x, z)
  const fx = Math.sin(rotY)
  const fz = Math.cos(rotY)
  const body = new THREE.BoxGeometry(1.5, 0.8, 0.9)
  xf(body, x, g0 + 0.75, z, 0, rotY, 0)
  b.push('solid', body, colA)
  const top = new THREE.BoxGeometry(1.6, 0.06, 1.0)
  xf(top, x, g0 + 1.18, z, 0, rotY, 0)
  b.push('solid', top, 0xdcd6c8)
  for (const s of [-0.55, 0.55]) {
    const w = new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12)
    xf(w, x + Math.cos(rotY) * s, g0 + 0.22, z - Math.sin(rotY) * s, 0, rotY, Math.PI / 2)
    b.push('solid', w, 0x222222)
  }
  b.cyl(0.03, 0.03, 1.4, 5, x, g0 + 1.9, z, 0x777777)
  for (let i = 0; i < 8; i++) {
    const g = new THREE.ConeGeometry(1.15, 0.45, 8, 1, true, (i * Math.PI) / 4, Math.PI / 4)
    xf(g, x, g0 + 2.7, z)
    b.push('solid', g, i % 2 ? colB : 0xf6f1e4)
  }
  b.addCol(x - 0.9, x + 0.9, z - 0.9, z + 0.9, 1.4)
  b.signs.push({ raw: true, x: x + fx * 0.47, y: g0 + 0.78, z: z + fz * 0.47, ry: rotY, w: 1.3, h: 0.32, text, bg: '#fff6dc', fg: '#8a2a1f' })
}
