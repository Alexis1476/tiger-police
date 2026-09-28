/**
 * The ECS world and its singleton traits (global resources). World traits live on the world
 * itself rather than on an entity: `world.get(Time)`.
 */
import { createWorld, trait } from 'koota'
import type * as THREE from 'three'
import { FIXED_DT } from '../game/config'
import type { Environment } from '../world/environment'
import type { LanePath } from '../world/lanes'

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
  /** Keys currently held (KeyboardEvent.code). */
  keys: new Set<string>(),
  /**
   * Keys and clicks pressed since the last fixed step ("KeyR", "Space", "Click"…), for
   * gameplay systems. Cleared after every fixed step.
   */
  pressed: new Set<string>(),
  /**
   * The same presses, for per-frame systems (camera toggle, mute). Cleared after every frame.
   * Kept separate because a frame can run zero or several fixed steps.
   */
  pressedThisFrame: new Set<string>(),
  fireHeld: false,
  aimHeld: false,
  /** On-screen joystick, −1…1 (y = forward). */
  stickX: 0,
  stickY: 0,
  /** Touch "Correr" button: sprint stays on until tapped again. */
  runToggle: false,
  /** Accumulated mouse movement since the camera last read it. */
  lookX: 0,
  lookY: 0,
  pointerLocked: false,
}))

/** Input device in use. Touch mode shows the on-screen controls and skips pointer lock. */
export const Device = trait(() => ({ touch: false }))

export const CameraRig = trait(() => ({
  yaw: Math.PI,
  pitch: -0.1,
  /** Smoothed distance behind the shoulder after collision. */
  currentDistance: 3.9,
  /** 0 = hip, 1 = aiming down sights (narrower FOV, closer camera). */
  aimBlend: 0,
  /** Decaying kick added to the look target after each shot. */
  recoil: 0,
  firstPerson: false,
  /** Angle of the orbit on the title screen. */
  attract: 0.4,
}))

export const Score = trait(() => ({ money: 0, arrests: 0, fines: 0 }))

export type Toast = { id: number; text: string; kind: '' | 'good' | 'bad' }

/** One-off messages for the UI. React renders them; systems only push. */
export const Feed = trait(() => ({
  toasts: [] as Toast[],
  big: null as { id: number; text: string; bad: boolean } | null,
  /** Incremented on every confirmed hit so the UI can flash the hit marker. */
  hits: 0,
}))

/** Numbers the HUD shows. Published ~10×/s so React re-renders rarely. */
export const Hud = trait(() => ({
  ammo: 8,
  magazine: 8,
  reloadProgress: 0,
  reloading: false,
  /** Crosshair gap in px (grows with movement and recoil). */
  spread: 7,
  canArrest: false,
  looseBandits: 0,
  clock: '15:00',
  day: 'Lun',
}))

export const Stats = trait(() => ({ fps: 0, entities: 0 }))

export type NavNode = { x: number; z: number; links: number[] }

/** Pedestrian graph (sidewalks, crossings, plaza paths) NPCs walk along. Built by the level. */
export const NavGraph = trait(() => ({ nodes: [] as NavNode[] }))

/** Seconds until each arrested bandit's replacement appears. */
export const BanditSpawner = trait(() => ({ pending: [] as number[] }))

/** Closed driving loops cars follow (see world/lanes.ts). */
export const Lanes = trait(() => ({ paths: [] as LanePath[] }))

/** In-game clock: one game hour per real minute while playing. */
export const DayCycle = trait(() => ({ hour: 15, day: 0 }))

export type Rect = { x0: number; x1: number; z0: number; z1: number }

/** Static facts about the loaded level, for the minimap and gameplay bounds. */
export const LevelInfo = trait(() => ({
  name: '',
  /** The player is kept inside ±limit on x and z. */
  limit: 60,
  minimap: {
    /** Half-size of the area the minimap shows, centred on the origin. */
    half: 68,
    walks: [] as Rect[],
    buildings: [] as Rect[],
    plaza: null as Rect | null,
    park: null as Rect | null,
  },
}))

/** Engine-side scenery of the level (sky, lights, materials), or null for levels without it. */
export const Scenery = trait(() => ({
  environment: null as Environment | null,
  lamps: [] as THREE.Vector3[],
}))

/** A fresh game world with every singleton. The app makes one; each test makes its own. */
export const createGameWorld = () =>
  createWorld(
    Time,
    GameMode,
    Input,
    Device,
    CameraRig,
    Score,
    Feed,
    Hud,
    Stats,
    NavGraph,
    BanditSpawner,
    Lanes,
    DayCycle,
    LevelInfo,
    Scenery,
  )
