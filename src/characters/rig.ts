import type * as THREE from 'three'

export type Pose = 'loco' | 'air' | 'stun' | 'cuffed' | 'handsup'
export type FaceMode = 'open' | 'closed' | 'dizzy'

/** What a character is doing this frame, derived from ECS state by the animation system. */
export type AnimState = {
  pose: Pose
  /** Horizontal speed, m/s (drives walk/run cycles). */
  speed: number
  /** Holding the pistol (the player). */
  gun?: boolean
  aim?: boolean
  /** Camera pitch while aiming, radians. */
  pitch?: number
  /** Seconds of reload left. */
  reload?: number
  /** Carrying a loot bag (bandits). */
  carry?: boolean
}

/**
 * Anything that can display a character: the procedural Humanoid, or a GltfRig playing clips
 * from a model file. Gameplay never sees which one; swap them without touching systems.
 */
export interface CharacterRig {
  /** Origin at the feet, facing +z. This is the entity's View. */
  readonly root: THREE.Object3D
  /** Hidden in first person; status icons (dizzy stars) attach here. */
  readonly head: THREE.Object3D
  /** Where handcuffs attach when a bandit is arrested. */
  readonly hips: THREE.Object3D
  update(dt: number, state: AnimState, time: number): void
  setFace(mode: FaceMode): void
}
