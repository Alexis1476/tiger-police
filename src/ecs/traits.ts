/**
 * Traits (components) — plain data, no behaviour. Systems in src/systems read and write them.
 *
 * Schema traits (`trait({ ... })`) are stored as Structure-of-Arrays: fast for numbers that
 * many entities share. Factory traits (`trait(() => ...)`) are stored as Array-of-Structures
 * and hold references to engine objects (three.js meshes, Rapier bodies).
 */
import { trait } from 'koota'
import type * as THREE from 'three'
import type RAPIER from '@dimforge/rapier3d-compat'

// ── Spatial ──────────────────────────────────────────────────────────────────

/** Feet position and facing (yaw, radians). The gameplay source of truth. */
export const Transform = trait({ x: 0, y: 0, z: 0, yaw: 0 })

/** Transform at the start of the last fixed step, so rendering can interpolate between steps. */
export const PrevTransform = trait({ x: 0, y: 0, z: 0, yaw: 0 })

export const Velocity = trait({ x: 0, y: 0, z: 0 })

// ── Movement ─────────────────────────────────────────────────────────────────

/**
 * What an entity wants to do this step: a world-space direction (length ≤ 1), a speed and a
 * jump request. Controllers (player input, AI) write it; the locomotion system consumes it.
 * This is what lets the player and every NPC share one movement system.
 */
export const MoveIntent = trait({ x: 0, z: 0, speed: 0, jump: false })

export const Locomotion = trait({
  grounded: false,
  coyote: 0,
  jumpBuffer: 0,
  jumpSpeed: 6.3,
  accel: 14,
  airAccel: 4,
})

// ── Engine bindings ──────────────────────────────────────────────────────────

/** Kinematic Rapier body moved by the shared character controller. */
export const CharacterBody = trait(() => ({
  body: null as unknown as RAPIER.RigidBody,
  collider: null as unknown as RAPIER.Collider,
  /** Distance from the feet (Transform.y) to the collider centre. */
  offsetY: 0,
}))

/** The three.js object that represents this entity. Added to the scene automatically. */
export const View = trait(() => null as unknown as THREE.Object3D)

// ── AI ───────────────────────────────────────────────────────────────────────

export const WanderState = { Idle: 0, Walk: 1 } as const

/** Simple two-state machine: stand around, then stroll in a random direction near home. */
export const Wander = trait({
  state: WanderState.Idle as number,
  timer: 0,
  dirX: 0,
  dirZ: 1,
  homeX: 0,
  homeZ: 0,
  radius: 14,
  speed: 1.4,
})

// ── Tags ─────────────────────────────────────────────────────────────────────

export const IsPlayer = trait()
export const IsCivilian = trait()
export const IsStatic = trait()
