import * as THREE from 'three'
import type { Rng } from '../core/math'
import { GeometryBatcher } from './batcher'
import { createNavBuilder } from './nav'
import type { Face } from './facades'

export type Box = { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number }
export type Slab = { x0: number; x1: number; z0: number; z1: number; h: number }

export type SignSpec =
  | { raw?: false; f: Face; u: number; y: number; w: number; h: number; text: string; bg: string; fg: string; o: number }
  | {
      raw: true
      double?: boolean
      x: number
      y: number
      z: number
      ry: number
      w: number
      h: number
      text: string
      bg: string
      fg: string
    }

/**
 * Everything the legacy city code accumulated in globals: geometry buckets, collision boxes,
 * walkable slab heights, the pedestrian graph and spots for lamps, flags, signs and so on.
 * The layout code fills it; `buildCity` then turns it into meshes, colliders and entities.
 */
export class CityBuilder extends GeometryBatcher {
  colliders: Box[] = []
  slabs: Slab[] = []
  nav = createNavBuilder()
  crosswalks: { x: number; z: number; alongX: boolean }[] = []
  lamps: THREE.Vector3[] = []
  flags: { x: number; y: number; z: number; h: number }[] = []
  water: { x: number; y: number; z: number; r: number }[] = []
  trafficLights: { x: number; z: number; sx: number; sz: number }[] = []
  signs: SignSpec[] = []
  murals: { f: Face; y: number; h: number }[] = []

  constructor(rng: Rng) {
    super(rng)
  }

  /** Solid obstacle over a footprint, from the ground up to y1. */
  addCol(x0: number, x1: number, z0: number, z1: number, y1 = 40) {
    this.colliders.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y0: 0, y1 })
  }

  /** Walkable raised surface (sidewalk, steps) of height h. */
  addSlab(x0: number, x1: number, z0: number, z1: number, h: number) {
    this.slabs.push({ x0, x1, z0, z1, h })
  }

  /** Ground height at (x, z): the highest slab there. */
  heightAt(x: number, z: number) {
    let h = 0
    for (const s of this.slabs) if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1 && s.h > h) h = s.h
    return h
  }
}
