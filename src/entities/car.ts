import type { World } from 'koota'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Rng } from '../core/math'
import { IsCar, PrevTransform, Transform, Vehicle, VehicleBody, VehicleKind, View } from '../ecs/traits'
import { Lanes } from '../ecs/world'
import type { GameContext } from '../engine/context'
import { Layer, groups } from '../engine/physics'
import { GeometryBatcher } from '../world/batcher'
import { pathPoint } from '../world/lanes'
import type { CityMaterials } from '../world/materials'

type Kind = (typeof VehicleKind)[keyof typeof VehicleKind]

const SIZE: Record<Kind, { length: number; halfWidth: number; height: number }> = {
  [VehicleKind.Sedan]: { length: 4.4, halfWidth: 0.95, height: 1.6 },
  [VehicleKind.Taxi]: { length: 4.4, halfWidth: 0.95, height: 1.6 },
  [VehicleKind.Bus]: { length: 12.4, halfWidth: 1.3, height: 3.3 },
}

/** Low-poly car or bus: body (s), glass (g) and lights (l), merged into three meshes. */
function carModel(kind: Kind, rng: Rng, materials: CityMaterials) {
  const b = new GeometryBatcher(rng)
  const W = 0x1a1a1a
  if (kind === VehicleKind.Bus) {
    const red = 0xc62f2a
    b.blk(-1.25, 1.25, 0.45, 3.05, -6.1, 6.1, red, 's')
    b.blk(-1.27, 1.27, 0.45, 0.8, -6.12, 6.12, 0x2d2d2d, 's')
    b.blk(-1.28, 1.28, 1.45, 2.65, -5.6, -0.6, 0, 'g')
    b.blk(-1.28, 1.28, 1.45, 2.65, 0.6, 5.3, 0, 'g')
    b.blk(-1.1, 1.1, 1.2, 2.8, 6.08, 6.14, 0, 'g')
    b.blk(-1.26, 1.26, 0.55, 3.0, -0.45, 0.45, 0x1e1e1e, 's')
    b.blk(-0.9, 0.9, 3.05, 3.35, -4.5, -1.2, 0xe5e5e5, 's')
    b.blk(-0.9, 0.9, 3.05, 3.35, 1.2, 4.5, 0xe5e5e5, 's')
    b.blk(-1.26, 1.26, 2.8, 2.9, -6.1, 6.1, 0xf2f2f2, 's')
    b.blk(-0.8, 0.8, 2.85, 3.05, 6.1, 6.16, 0x111111, 's')
    b.blk(-0.7, 0.7, 2.88, 3.02, 6.16, 6.18, 0xffa21a, 'l')
    for (const z of [-4.3, -2.6, 2.2, 4.3]) {
      for (const s of [-1, 1]) {
        b.cyl(0.5, 0.5, 0.34, 14, s * 1.12, 0.5, z, W, 's', 0, 0, Math.PI / 2)
        b.cyl(0.26, 0.26, 0.36, 10, s * 1.12, 0.5, z, 0x9a9a9a, 's', 0, 0, Math.PI / 2)
      }
    }
    b.blk(-1.05, -0.7, 0.9, 1.1, 6.1, 6.16, 0xfff4d6, 'l')
    b.blk(0.7, 1.05, 0.9, 1.1, 6.1, 6.16, 0xfff4d6, 'l')
    b.blk(-1.1, -0.8, 0.9, 1.3, -6.16, -6.1, 0xff2a1a, 'l')
    b.blk(0.8, 1.1, 0.9, 1.3, -6.16, -6.1, 0xff2a1a, 'l')
  } else {
    const col = kind === VehicleKind.Taxi ? 0xf4c21c : b.pick([0x9aa5b1, 0x2a4a7a, 0x8a1f1f, 0xe8e6e0, 0x2f2f33, 0x3f6b4a])
    b.blk(-0.9, 0.9, 0.32, 0.95, -2.15, 2.15, col, 's')
    b.blk(-0.92, 0.92, 0.3, 0.55, -2.2, 2.2, 0x262626, 's')
    b.blk(-0.8, 0.8, 0.95, 1.48, -1.25, 0.75, col, 's')
    b.blk(-0.82, 0.82, 1.0, 1.42, -1.1, 0.6, 0, 'g')
    b.blk(-0.72, 0.72, 1.0, 1.43, 0.74, 0.8, 0, 'g')
    b.blk(-0.72, 0.72, 1.0, 1.43, -1.3, -1.24, 0, 'g')
    for (const z of [-1.35, 1.35]) {
      for (const s of [-1, 1]) {
        b.cyl(0.33, 0.33, 0.24, 14, s * 0.84, 0.33, z, W, 's', 0, 0, Math.PI / 2)
        b.cyl(0.17, 0.17, 0.26, 10, s * 0.84, 0.33, z, 0xb5b5b5, 's', 0, 0, Math.PI / 2)
      }
    }
    b.blk(-0.8, -0.52, 0.66, 0.82, 2.13, 2.18, 0xfff4d6, 'l')
    b.blk(0.52, 0.8, 0.66, 0.82, 2.13, 2.18, 0xfff4d6, 'l')
    b.blk(-0.84, -0.56, 0.66, 0.84, -2.18, -2.13, 0xff2a1a, 'l')
    b.blk(0.56, 0.84, 0.66, 0.84, -2.18, -2.13, 0xff2a1a, 'l')
    if (kind === VehicleKind.Taxi) {
      b.blk(-0.28, 0.28, 1.48, 1.7, -0.45, 0.05, 0xfff8e0, 'l')
      b.blk(-0.91, 0.91, 0.62, 0.7, -2.16, 2.16, 0x1a1a1a, 's')
    }
  }
  const group = new THREE.Group()
  const add = (arr: THREE.BufferGeometry[], mat: THREE.Material, cast: boolean) => {
    const m = new THREE.Mesh(mergeGeometries(arr, false)!, mat)
    m.castShadow = cast
    m.receiveShadow = true
    group.add(m)
  }
  add(b.buckets.s, materials.solid, true)
  add(b.buckets.g, materials.carGlass, false)
  add(b.buckets.l, materials.carLights, false)
  return group
}

const at = { x: 0, z: 0 }
const ahead = { x: 0, z: 0 }
let nextPriority = 0

export function spawnCar(
  world: World,
  { physics }: GameContext,
  kind: Kind,
  lane: number,
  s: number,
  maxSpeed: number,
  rng: Rng,
  materials: CityMaterials,
) {
  const path = world.get(Lanes)!.paths[lane]
  const size = SIZE[kind]
  pathPoint(path, s, at)
  pathPoint(path, s + 2.5, ahead)
  const yaw = Math.atan2(ahead.x - at.x, ahead.z - at.z)

  const { rapier } = physics
  const body = physics.world.createRigidBody(
    rapier.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(at.x, size.height / 2, at.z)
      .setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }),
  )
  const collider = physics.world.createCollider(
    rapier.ColliderDesc.cuboid(size.halfWidth, size.height / 2, size.length / 2).setCollisionGroups(groups(Layer.Vehicle)),
    body,
  )
  const t = { x: at.x, y: 0, z: at.z, yaw }
  return world.spawn(
    IsCar,
    Vehicle({ kind, lane, s, speed: maxSpeed, maxSpeed, priority: nextPriority++, ...size }),
    VehicleBody({ body, collider }),
    Transform(t),
    PrevTransform(t),
    View(carModel(kind, rng, materials)),
  )
}
