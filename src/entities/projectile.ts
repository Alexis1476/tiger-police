import type { World } from 'koota'
import * as THREE from 'three'
import { IsEvent, Noise, PrevTransform, Projectile, Transform, Velocity, View } from '../ecs/traits'
import { geometry } from './materials'

const MAX_PROJECTILES = 24

const bulletMaterial = new THREE.MeshStandardMaterial({
  color: 0xff7a1a,
  emissive: 0xff6a00,
  emissiveIntensity: 1.4,
  roughness: 0.4,
})

type Vec = { x: number; y: number; z: number }

export function spawnProjectile(world: World, pos: Vec, vel: Vec, ownerCollider: number, now: number) {
  // Cap live bullets: recycle the oldest, like the legacy game.
  const live = world.query(Projectile)
  if (live.length >= MAX_PROJECTILES) {
    let oldest = live[0]
    for (const e of live) if (e.get(Projectile)!.born < oldest.get(Projectile)!.born) oldest = e
    oldest.destroy()
  }

  const mesh = new THREE.Mesh(geometry('bullet', () => new THREE.SphereGeometry(0.05, 10, 8)), bulletMaterial)
  mesh.position.set(pos.x, pos.y, pos.z)
  const t = { x: pos.x, y: pos.y, z: pos.z, yaw: 0 }
  return world.spawn(
    Projectile({ ownerCollider, born: now }),
    Transform(t),
    PrevTransform(t),
    Velocity(vel),
    View(mesh),
  )
}

/** A loud noise NPCs react to this step (destroyed automatically at the end of the step). */
export function emitNoise(world: World, x: number, z: number, radius: number) {
  world.spawn(IsEvent, Noise({ x, z, radius }))
}
