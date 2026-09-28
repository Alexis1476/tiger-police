import * as THREE from 'three'
import { randRange } from '../core/math'
import type { Look } from './humanoid'

const SKINS = ['#f1c7a4', '#e6b08a', '#d49a70', '#b97d55', '#98603f', '#774a30']

/** The player: a caricature president in a navy suit and tie, beard, pistol in hand. */
export const PRESIDENT: Look = {
  skin: '#d99b72',
  top: 0xf4f3ee, // the shirt; the suit jacket goes over it
  sleeve: 0x1a2440,
  pants: 0x1f2d4d,
  shoes: 0x161a24,
  hair: 'receding',
  hairColor: 0x1f212a,
  headScale: 1.1,
  nose: 1.25,
  face: { mouth: 'smile', googly: true, beard: '#24262e', browW: 9, brow: '#1c1d24', eyeGap: 34, eyeW: 16, eyeH: 17 },
  extras: 'president',
}

const CIVILIANS: Omit<Look, 'skin'>[] = [
  { top: 0x7b3f3f, pants: 0x3a3a45, skirt: 0x3b3350, legs: '#6a5a50', hair: 'bun', hairColor: 0x9a9a9a, extras: 'ruana', ruana: ['#6b4a32', '#d8c7a4', '#3d2a1d', '#a0522d'], face: { mouth: 'smile', lashes: true, worried: true } },
  { top: 0x5a4a3a, pants: 0x4a4238, hair: 'buzz', hairColor: 0xcfcfcf, hat: 'sombrero', hatColor: 0x2a2622, extras: 'ruana', ruana: ['#3b3b3b', '#8a8a8a', '#5b2e2e', '#c9b28a'], face: { mouth: 'flat', stubble: true } },
  { top: 0xf2f2f0, pants: 0x3b4250, hair: 'short', hairColor: 0x1c1512, extras: 'tie', face: { mouth: 'flat' } },
  { top: 0xf2c230, pants: 0x2f4a6b, hair: 'buzz', hairColor: 0x2c1d14, hat: 'cap', hatColor: 0x1d3a6b, extras: 'backpack', face: { mouth: 'smile' }, shortSleeve: true },
  { top: 0xb9302a, pants: 0x2a3b55, hair: 'long', hairColor: 0x161010, extras: 'handbag', face: { mouth: 'smile', lashes: true, lipstick: true } },
  { top: 0x2f6b4f, pants: 0x3a3a3a, hair: 'buzz', hairColor: 0x2a1d14, hat: 'cap', hatColor: 0xe8e2d0, extras: 'apron', face: { mouth: 'grin' } },
  { top: 0x6a4c93, pants: 0x222a38, hair: 'long', hairColor: 0x3a2416, extras: 'backpack', face: { mouth: 'smile', lashes: true }, shortSleeve: true },
  { top: 0x3d5a80, pants: 0x5a5046, hair: 'short', hairColor: 0x7a6a5a, face: { mouth: 'smile', stubble: true } },
]

export function civilianLook(i: number): Look {
  const t = CIVILIANS[i % CIVILIANS.length]
  return {
    ...t,
    skin: SKINS[Math.floor(Math.random() * SKINS.length)],
    scale: randRange(0.9, 1.0),
    sleeve: t.extras === 'ruana' && t.ruana ? new THREE.Color(t.ruana[0]).getHex() : undefined,
  }
}

export function banditLook(i: number): Look {
  const top = [0x3a3f45, 0x4a5a3a, 0x5a2d2d, 0x2c3a52, 0x454545, 0x6b5a3a][i % 6]
  const hood = i % 2 === 1
  return {
    skin: SKINS[Math.floor(Math.random() * SKINS.length)],
    top,
    pants: i % 3 === 0 ? 0x2a2a30 : 0x2f4a6b,
    shoes: 0xe6e6e6,
    hair: hood ? 'none' : 'buzz',
    hairColor: 0x1a120c,
    hat: hood ? 'hood' : 'cap',
    hatColor: hood ? top : [0x1a1a1a, 0xb22222, 0x1d3a6b][i % 3],
    face: { angry: true, bandana: ['#8a1c1c', '#1c3f8a', '#222222', '#2f5a2f'][i % 4], iris: '#3a2618' },
    extras: 'bandido',
    scale: randRange(0.92, 1.0),
  }
}

/** Standing height of a Humanoid of scale 1 (feet to top of head), for its collider. */
export const HUMANOID_HEIGHT = 1.9
