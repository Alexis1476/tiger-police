import * as THREE from 'three'
import { clamp } from '../core/math'

export const CURB = 0.15

export const PAL = {
  walls: [0xf1ece0, 0xe9d7a6, 0xd98b5f, 0x6d9dc5, 0xc4574a, 0x86b38f, 0xf0c35c, 0xb9a3d0, 0xe8e2d4, 0xe6a86b],
  band: [0x2f5d8a, 0x8a2f2f, 0x2e6b4f, 0x3b3b3b, 0x7a4b2a, 0xb8872f],
  frames: [0x2f5d8a, 0x2e6b4f, 0x6b4228, 0xf4f1ea, 0x8a2f2f],
  brick: [0x9b4b35, 0xa85a3f, 0x8e4430, 0xb0674b, 0x94503a],
  wood: 0x6b4228,
  roof: 0xb4553c,
  stone: 0xd2c9b4,
  concrete: 0xbcb7ad,
  curb: 0xa9a59c,
  metal: 0x2b302d,
}

export type ColorLike = number | THREE.Color

/** Colour with its lightness shifted by `amount` (−1…1). */
export function shade(hex: ColorLike, amount: number) {
  const c = new THREE.Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  c.setHSL(hsl.h, hsl.s, clamp(hsl.l + amount, 0, 1))
  return c
}
