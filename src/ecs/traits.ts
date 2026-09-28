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
import type { CharacterRig } from '../characters/rig'

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
  /** Set for the step in which the entity jumped / landed (landImpact = fall speed). */
  jumped: false,
  landImpact: 0,
})

// ── Engine bindings ──────────────────────────────────────────────────────────

/** Kinematic Rapier body moved by the shared character controller. */
export const CharacterBody = trait(() => ({
  body: null as unknown as RAPIER.RigidBody,
  collider: null as unknown as RAPIER.Collider,
  /** Distance from the feet (Transform.y) to the collider centre. */
  offsetY: 0,
  radius: 0.35,
}))

/** The three.js object that represents this entity. Added to the scene automatically. */
export const View = trait(() => null as unknown as THREE.Object3D)

/** Animated character (procedural or GLTF). Its root is also the entity's View. */
export const Rig = trait(() => null as unknown as CharacterRig)

// ── Combat ───────────────────────────────────────────────────────────────────

export const Weapon = trait({
  ammo: 8,
  magazine: 8,
  /** Seconds until the next shot is allowed. */
  cooldown: 0,
  fireInterval: 0.2,
  /** Seconds of reload left (0 = not reloading). */
  reload: 0,
  reloadTime: 1.3,
  /** Delay before an automatic reload after emptying the magazine. */
  autoReload: 0,
  /** Keeps the body turned toward the camera for a moment after firing. */
  aimHold: 0,
  aiming: false,
  muzzleSpeed: 40,
  /** Extra crosshair gap from recent shots, in px. */
  spread: 0,
})

/** A rubber bullet. Moves by ray-casting its path each step, so it can't tunnel through walls. */
export const Projectile = trait({
  life: 2.6,
  bounces: 0,
  /** Collider handle of whoever fired it (ignored by its ray casts). */
  ownerCollider: -1,
  born: 0,
})

/**
 * Event trait: "this entity was hit this step". Added by the projectile system, read by
 * reaction systems (bandits, civilians), removed by the cleanup system at the end of the step.
 */
export const Hit = trait({ x: 0, y: 0, z: 0 })

/** Event entity: a loud noise (a gunshot) that nearby NPCs react to. */
export const Noise = trait({ x: 0, z: 0, radius: 14 })

/** Marks one-shot event entities, destroyed at the end of every fixed step. */
export const IsEvent = trait()

// ── AI ───────────────────────────────────────────────────────────────────────

/**
 * Walks the pedestrian graph node to node. Brains only set `speed` (0 = stand still) and
 * `flee`; this trait's system turns that into a MoveIntent and recovers when stuck.
 */
export const Navigator = trait({
  node: -1,
  prev: -1,
  target: -1,
  speed: 0,
  /** When fleeing, pick links that lead away from (fromX, fromZ). */
  flee: false,
  fromX: 0,
  fromZ: 0,
  /** Set by a brain to pick a new target now (e.g. when it starts fleeing). */
  replan: false,
  stuckTimer: 0,
  lastX: 0,
  lastZ: 0,
})

export const CivilianState = { Calm: 0, HandsUp: 1, Panic: 2 } as const
export const CivilianBrain = trait({ state: CivilianState.Calm as number, timer: 0, walkSpeed: 1.2 })

export const BanditState = { Roam: 0, Flee: 1, Stunned: 2, Cuffed: 3 } as const
export const BanditBrain = trait({
  state: BanditState.Roam as number,
  timer: 0,
  /** How long the player has been far away while fleeing. */
  farTimer: 0,
  walkSpeed: 1.6,
})

/** Speech bubble above a character's head. */
export const Speech = trait({ text: '', timer: 0 })

// ── Vehicles ─────────────────────────────────────────────────────────────────

export const VehicleKind = { Sedan: 0, Taxi: 1, Bus: 2 } as const

/** A car driving a closed lane loop. It slows for anything in front of it. */
export const Vehicle = trait({
  kind: VehicleKind.Sedan as number,
  /** Index into the Lanes world trait. */
  lane: 0,
  /** Distance travelled along the lane. */
  s: 0,
  speed: 0,
  maxSpeed: 8,
  length: 4.4,
  halfWidth: 0.95,
  height: 1.6,
  /** Tie-breaker at crossings: the lower number yields. */
  priority: 0,
  /** Seconds blocked by the player (honks after 2). */
  blocked: 0,
})

/** Kinematic box collider moved along the lane (bullets bounce off, characters bump). */
export const VehicleBody = trait(() => ({
  body: null as unknown as RAPIER.RigidBody,
  collider: null as unknown as RAPIER.Collider,
}))

// ── Pigeons ──────────────────────────────────────────────────────────────────

export const PigeonState = { Pecking: 0, Flying: 1 } as const

/**
 * A plaza pigeon. All pigeons are drawn by one InstancedMesh (on the PigeonFlock entity);
 * `slot` is this pigeon's instance index in it.
 */
export const Pigeon = trait({
  slot: 0,
  state: PigeonState.Pecking as number,
  t: 0,
  hopTimer: 0,
  hop: 0,
  hopX: 0,
  hopZ: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  flyTimer: 0,
  landX: 0,
  landZ: 0,
  hasLanding: false,
  /** Visual: head bob / body pitch and wing flap scale. */
  pitch: 0,
  flap: 1,
})
export const PigeonFlock = trait()

// ── Ambient props ────────────────────────────────────────────────────────────

/** A waving flag: its cloth mesh and the rest positions of its vertices. */
export const Flag = trait(() => ({
  cloth: null as unknown as THREE.Mesh,
  rest: new Float32Array(0),
  phase: 0,
}))

/** Traffic light head: its three lamp meshes (red, amber, green) and cycle offset. */
export const TrafficLight = trait(() => ({ lamps: [] as THREE.Mesh[], phase: 0 }))

// ── Tags ─────────────────────────────────────────────────────────────────────

export const IsPlayer = trait()
export const IsCivilian = trait()
export const IsBandit = trait()
export const IsCar = trait()
export const IsStatic = trait()
