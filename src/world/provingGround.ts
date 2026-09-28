import type { World } from 'koota'
import * as THREE from 'three'
import { pick, range, type Rng } from '../core/math'
import { IsStatic, View } from '../ecs/traits'
import { LevelInfo, NavGraph, type Rect } from '../ecs/world'
import type { GameContext } from '../engine/context'
import { Layer, groups } from '../engine/physics'
import { geometry, material, shadowMesh } from '../entities/materials'
import type { LevelResult } from './city'
import { createNavBuilder } from './nav'

const HALF = 48
const WALLS = [0xf2e6cf, 0xefd9a8, 0xe8c07a, 0xdfe7e0, 0xf0c9b0, 0xcfe0ea]
const ROOFS = [0xa9472f, 0x8f3b28, 0xb85a3c]

/**
 * Small, predictable test level: a square with a fountain, stairs up to a platform, crates
 * and a ring of buildings. Gameplay tests run here because nothing about it changes when the
 * city does. Load it in the browser with `#proving-ground`.
 */
export function buildProvingGround(world: World, ctx: GameContext, rng: Rng): LevelResult {
  const blockers: Rect[] = []
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: number, block = true) => {
    addBox(world, ctx, x, y, z, w, h, d, color)
    if (block) blockers.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 })
  }

  box(0, -0.5, 0, 200, 1, 200, 0x6f6c66, false)
  addFlat(world, 0, 0.01, 0, HALF * 2 - 12, HALF * 2 - 12, 0xb9ab93)

  // Fountain in the middle.
  addCylinder(world, ctx, 0, 0.35, 0, 3.2, 0.7, 0xd8d2c4)
  addCylinder(world, ctx, 0, 1.2, 0, 0.5, 1.7, 0xd8d2c4)
  blockers.push({ x0: -4.5, x1: 4.5, z0: -4.5, z1: 4.5 })

  // Stairs up to a platform (autostep and jumping).
  for (let i = 1; i <= 5; i++) box(18, i * 0.15, 3.2 - i * 0.8, 6, i * 0.3, 0.8, 0xcfc4b0)
  box(18, 0.9, -3.2, 6, 1.8, 4, 0xcfc4b0)

  // Crates to jump over.
  for (const [x, z] of [[-14, 8], [-15.2, 8.6], [-14.6, 9.8]]) box(x, 0.5, z, 1, 1, 1, 0x8a6a45)

  // A ring of buildings: north/south rows own the corners, east/west rows fit between.
  const inner = HALF - 6
  for (const side of [0, 1, 2, 3]) {
    const along = side < 2
    const end = along ? HALF + 2 : inner
    let u = -end
    while (u < end) {
      let w = range(rng, 6, 10)
      if (end - u - w < 4) w = end - u
      const h = range(rng, 6, 14)
      const d = 8
      const c = u + w / 2
      const off = (side % 2 === 0 ? 1 : -1) * (inner + d / 2)
      const [x, z] = along ? [c, off] : [off, c]
      const [bw, bd] = along ? [w - 0.2, d] : [d, w - 0.2]
      box(x, h / 2, z, bw, h, bd, pick(rng, WALLS))
      addBox(world, ctx, x, h + 0.2, z, bw + 0.6, 0.4, bd + 0.6, pick(rng, ROOFS))
      u += w
    }
  }

  // Simple lighting (the city has a full day/night environment instead).
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.4)
  sun.position.set(-40, 70, 30)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 200 })
  const lights = new THREE.Group()
  lights.add(new THREE.HemisphereLight(0xdfeaff, 0x6b5a45, 1.3), sun)
  ctx.render.scene.background = new THREE.Color(0xa9cbe8)
  world.spawn(IsStatic, View(lights))

  world.set(NavGraph, { nodes: gridNavGraph(blockers) })
  world.set(LevelInfo, {
    name: 'Proving ground',
    limit: HALF - 6,
    minimap: { half: HALF, walks: [], buildings: blockers, plaza: null, park: null },
  })
  return { spawn: { x: 0, z: 14, yaw: Math.PI } }
}

/** A walkable grid over the open square, skipping obstacles. */
function gridNavGraph(blockers: Rect[]) {
  const nav = createNavBuilder()
  const step = 6
  const half = HALF - 12
  const id = new Map<string, number>()
  for (let x = -half; x <= half; x += step) {
    for (let z = -half; z <= half; z += step) {
      if (isClear(blockers, x, z, 1.2)) id.set(`${x},${z}`, nav.node(x, z))
    }
  }
  const clearPath = (x0: number, z0: number, x1: number, z1: number) => {
    for (let k = 1; k < 6; k++) {
      if (!isClear(blockers, x0 + ((x1 - x0) * k) / 6, z0 + ((z1 - z0) * k) / 6, 0.6)) return false
    }
    return true
  }
  for (const [key, a] of id) {
    const [x, z] = key.split(',').map(Number)
    for (const [nx, nz] of [[x + step, z], [x, z + step]]) {
      const b = id.get(`${nx},${nz}`)
      if (b !== undefined && clearPath(x, z, nx, nz)) nav.link(a, b)
    }
  }
  return nav.nodes
}

function isClear(blockers: Rect[], x: number, z: number, margin: number) {
  return !blockers.some((b) => x > b.x0 - margin && x < b.x1 + margin && z > b.z0 - margin && z < b.z1 + margin)
}

function addBox(world: World, { physics }: GameContext, x: number, y: number, z: number, w: number, h: number, d: number, color: number) {
  const mesh = shadowMesh(geometry(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d)), material(color))
  mesh.position.set(x, y, z)
  const { rapier } = physics
  const body = physics.world.createRigidBody(rapier.RigidBodyDesc.fixed().setTranslation(x, y, z))
  physics.world.createCollider(rapier.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setCollisionGroups(groups(Layer.Static)), body)
  world.spawn(IsStatic, View(mesh))
}

function addCylinder(world: World, { physics }: GameContext, x: number, y: number, z: number, r: number, h: number, color: number) {
  const mesh = shadowMesh(geometry(`cyl:${r}:${h}`, () => new THREE.CylinderGeometry(r, r, h, 32)), material(color))
  mesh.position.set(x, y, z)
  const { rapier } = physics
  const body = physics.world.createRigidBody(rapier.RigidBodyDesc.fixed().setTranslation(x, y, z))
  physics.world.createCollider(rapier.ColliderDesc.cylinder(h / 2, r).setCollisionGroups(groups(Layer.Static)), body)
  world.spawn(IsStatic, View(mesh))
}

function addFlat(world: World, x: number, y: number, z: number, w: number, d: number, color: number) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material(color, 0.95))
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(x, y, z)
  mesh.receiveShadow = true
  world.spawn(IsStatic, View(mesh))
}
