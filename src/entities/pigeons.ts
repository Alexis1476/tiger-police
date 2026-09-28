import type { World } from 'koota'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Rng } from '../core/math'
import { Pigeon, PigeonFlock, PrevTransform, Transform, View } from '../ecs/traits'
import { GeometryBatcher } from '../world/batcher'
import { std } from '../world/materials'
import { CURB } from '../world/palette'

/** A free spot on the plaza, away from the statue and the vendor carts. */
export function randomPlazaSpot(rand: () => number = Math.random): [number, number] {
  for (;;) {
    const x = rand() * 23 - 11.5
    const z = rand() * 23 - 11.5
    if (Math.hypot(x, z) > 3.2 && Math.abs(x + 10.5) + Math.abs(z - 7) > 2 && Math.abs(x - 10.5) + Math.abs(z + 7) > 2) {
      return [x, z]
    }
  }
}

/** The pigeons of Plaza de Bolívar: `count` entities sharing one instanced mesh. */
export function spawnPigeons(world: World, count: number, rng: Rng) {
  const b = new GeometryBatcher(rng)
  b.sph(0.11, 0, 0.13, 0, 0x7d8595, 'p', 10, 8, 0, Math.PI, 0.8, 0.75, 1.25)
  b.sph(0.07, 0, 0.19, 0.07, 0x5f7f6a, 'p', 8, 6)
  b.sph(0.055, 0, 0.25, 0.11, 0x6a7182, 'p', 8, 6)
  b.cyl(0, 0.016, 0.045, 5, 0, 0.24, 0.175, 0x3a3030, 'p', Math.PI / 2, 0, 0)
  b.blk(-0.045, 0.045, 0.11, 0.13, -0.24, -0.1, 0x5d6472, 'p')
  for (const s of [-1, 1]) {
    b.sph(0.06, s * 0.075, 0.15, -0.01, 0x8e96a4, 'p', 8, 6, 0, Math.PI, 0.4, 0.6, 1.5)
    b.blk(s * 0.03 - 0.008, s * 0.03 + 0.008, 0, 0.07, -0.01, 0.01, 0xb35a4a, 'p')
  }
  const mesh = new THREE.InstancedMesh(
    mergeGeometries(b.buckets.p, false)!,
    std({ vertexColors: true, flatShading: true, roughness: 0.8 }),
    count,
  )
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.frustumCulled = false
  world.spawn(PigeonFlock, View(mesh))

  for (let i = 0; i < count; i++) {
    const [x, z] = randomPlazaSpot(rng)
    const t = { x, y: CURB, z, yaw: rng() * Math.PI * 2 }
    world.spawn(Pigeon({ slot: i, t: rng() * 10, hopTimer: rng() * 2 }), Transform(t), PrevTransform(t))
  }
}
