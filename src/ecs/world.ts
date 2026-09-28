/**
 * The ECS world and its singleton traits (global resources). World traits live on the world
 * itself rather than on an entity: `world.get(Time)`.
 */
import { createWorld, trait } from 'koota'
import { FIXED_DT } from '../game/config'

export type GameModeName = 'title' | 'play' | 'pause'

export const Time = trait(() => ({
  /** Fixed simulation step, in seconds. */
  delta: FIXED_DT,
  /** Real time since the previous rendered frame, in seconds. */
  frameDelta: 0,
  /** Simulated time since boot. */
  elapsed: 0,
  /** Progress between the last two fixed steps (0–1), used for render interpolation. */
  alpha: 0,
}))

export const GameMode = trait(() => ({ mode: 'title' as GameModeName }))

/** Raw player input, filled by DOM listeners and consumed by systems. */
export const Input = trait(() => ({
  keys: new Set<string>(),
  /** Accumulated mouse movement since the camera last read it. */
  lookX: 0,
  lookY: 0,
  /** Edge-triggered: set on key down, cleared once a fixed step has read it. */
  jumpPressed: false,
  pointerLocked: false,
}))

export const CameraRig = trait(() => ({
  yaw: Math.PI,
  pitch: -0.15,
  /** Smoothed distance behind the shoulder after collision. */
  currentDistance: 3.9,
  /** Angle of the orbit on the title screen. */
  attract: 0,
}))

/** Numbers shown in the HUD. Updated a few times per second so React re-renders rarely. */
export const Stats = trait(() => ({ fps: 0, entities: 0, civilians: 0 }))

export const world = createWorld(Time, GameMode, Input, CameraRig, Stats)
