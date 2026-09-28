import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Rng } from '../core/math'
import { shade, type ColorLike } from './palette'

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()

/** Applies position, rotation and scale to a geometry in place. */
export function xf(geo: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz)
  _q.setFromEuler(_e)
  _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz))
  geo.applyMatrix4(_m)
  return geo
}

/**
 * Collects many small vertex-coloured shapes into "buckets" (one per material), then merges
 * each bucket into a single mesh. A whole city becomes about a dozen draw calls.
 */
export class GeometryBatcher {
  buckets: Record<string, THREE.BufferGeometry[]> = {}

  constructor(public rng: Rng) {}

  range = (a: number, b: number) => a + (b - a) * this.rng()
  pick = <T,>(arr: readonly T[]) => arr[Math.floor(this.rng() * arr.length)]
  /** Slight random lightness variation so repeated colours don't look flat. */
  jit = (hex: ColorLike, amount = 0.035) => shade(hex, (this.rng() * 2 - 1) * amount)

  push(bucket: string, geo: THREE.BufferGeometry, color: ColorLike = 0xffffff) {
    if (geo.index) geo = geo.toNonIndexed()
    const c = color instanceof THREE.Color ? color : new THREE.Color(color)
    const n = geo.attributes.position.count
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      arr[i * 3] = c.r
      arr[i * 3 + 1] = c.g
      arr[i * 3 + 2] = c.b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
    ;(this.buckets[bucket] ??= []).push(geo)
    return geo
  }

  /** Axis-aligned box from (x0, y0, z0) to (x1, y1, z1). */
  blk(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: ColorLike, bucket = 'solid') {
    const g = new THREE.BoxGeometry(
      Math.max(0.001, Math.abs(x1 - x0)),
      Math.max(0.001, Math.abs(y1 - y0)),
      Math.max(0.001, Math.abs(z1 - z0)),
    )
    xf(g, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    return this.push(bucket, g, color)
  }

  cyl(rt: number, rb: number, h: number, seg: number, x: number, y: number, z: number, color: ColorLike, bucket = 'solid', rx = 0, ry = 0, rz = 0) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg)
    xf(g, x, y, z, rx, ry, rz)
    return this.push(bucket, g, color)
  }

  ico(r: number, detail: number, x: number, y: number, z: number, color: ColorLike, sx = 1, sy = 1, sz = 1, bucket = 'solid') {
    const g = new THREE.IcosahedronGeometry(r, detail)
    xf(g, x, y, z, 0, this.rng() * 6, 0, sx, sy, sz)
    return this.push(bucket, g, color)
  }

  sph(r: number, x: number, y: number, z: number, color: ColorLike, bucket = 'solid', ws = 12, hs = 8, ts = 0, tl = Math.PI, sx = 1, sy = 1, sz = 1) {
    const g = new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, ts, tl)
    xf(g, x, y, z, 0, 0, 0, sx, sy, sz)
    return this.push(bucket, g, color)
  }

  /** Flat textured ground rectangle; `tile` is the texture repeat size in metres. */
  surf(bucket: string, x0: number, x1: number, z0: number, z1: number, y: number, tile: number, tint: ColorLike = 0xffffff) {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0)
    g.rotateX(-Math.PI / 2)
    g.translate((x0 + x1) / 2, y, (z0 + z1) / 2)
    worldUVs(g, tile)
    return this.push(bucket, g, tint)
  }

  /** Flat textured strip from (ax, az) to (bx, bz). */
  surfStrip(bucket: string, ax: number, az: number, bx: number, bz: number, width: number, y: number, tile: number) {
    const g = new THREE.PlaneGeometry(width, Math.hypot(bx - ax, bz - az))
    g.rotateX(-Math.PI / 2)
    g.rotateY(Math.atan2(bx - ax, bz - az))
    g.translate((ax + bx) / 2, y, (az + bz) / 2)
    worldUVs(g, tile)
    return this.push(bucket, g, 0xffffff)
  }

  /** Merges one bucket into a single static mesh (and empties the bucket). */
  bake(name: string, material: THREE.Material, cast = true, receive = true) {
    const arr = this.buckets[name]
    if (!arr?.length) return null
    const g = mergeGeometries(arr, false)
    delete this.buckets[name]
    if (!g) return null
    g.computeBoundingSphere()
    const m = new THREE.Mesh(g, material)
    m.castShadow = cast
    m.receiveShadow = receive
    m.matrixAutoUpdate = false
    m.updateMatrix()
    return m
  }
}

function worldUVs(g: THREE.BufferGeometry, tile: number) {
  const p = g.attributes.position
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / tile, -p.getZ(i) / tile)
}
