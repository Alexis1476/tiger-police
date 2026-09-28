import * as THREE from 'three'
import type { Physics } from '../engine/physics'
import { Layer, groups } from '../engine/physics'
import { geometry, material, shadowMesh } from './materials'

/** Kinematic capsule for a character whose feet start at (x, 0, z). */
export function createCharacterBody(physics: Physics, x: number, z: number, radius: number, height: number) {
  const { rapier, world } = physics
  const halfHeight = (height - 2 * radius) / 2
  const offsetY = halfHeight + radius
  const body = world.createRigidBody(
    rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(x, offsetY + 0.05, z),
  )
  const collider = world.createCollider(
    rapier.ColliderDesc.capsule(halfHeight, radius).setCollisionGroups(groups(Layer.Character)),
    body,
  )
  return { body, collider, offsetY }
}

type Look = { height: number; body: number; skin: number; hat?: number }

/**
 * Placeholder character: capsule body, head, and a nose so you can see which way it faces.
 * Origin is at the feet. Replace with a skinned GLTF model later — nothing else changes.
 */
export function makeCharacterMesh({ height, body, skin, hat }: Look) {
  const bodyH = height * 0.75
  const bodyR = height * 0.19
  const headR = height * 0.12
  const headY = bodyH + headR * 0.85

  const group = new THREE.Group()
  const torso = shadowMesh(
    geometry(`torso:${height}`, () => new THREE.CapsuleGeometry(bodyR, bodyH - 2 * bodyR, 4, 12)),
    material(body),
  )
  torso.position.y = bodyH / 2
  const head = shadowMesh(geometry(`head:${height}`, () => new THREE.SphereGeometry(headR, 16, 12)), material(skin))
  head.position.y = headY
  const nose = shadowMesh(geometry(`nose:${height}`, () => new THREE.BoxGeometry(0.05, 0.05, 0.08)), material(skin))
  nose.position.set(0, headY, headR)
  group.add(torso, head, nose)

  if (hat !== undefined) {
    const cap = shadowMesh(
      geometry(`cap:${height}`, () => new THREE.CylinderGeometry(headR * 1.05, headR * 1.1, headR * 0.6, 16)),
      material(hat),
    )
    cap.position.y = headY + headR * 0.6
    const brim = shadowMesh(
      geometry(`brim:${height}`, () => new THREE.BoxGeometry(headR * 1.6, 0.03, headR * 1.1)),
      material(hat),
    )
    brim.position.set(0, headY + headR * 0.35, headR * 0.7)
    group.add(cap, brim)
  }
  return group
}
