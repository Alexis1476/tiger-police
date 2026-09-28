/** Tuning constants. Gameplay values come from the legacy build so the feel stays the same. */

/** Simulation runs at a fixed 60 Hz, independent of the display refresh rate. */
export const FIXED_DT = 1 / 60
/** Longest frame we try to catch up on (avoids the "spiral of death" after a tab switch). */
export const MAX_FRAME_DT = 0.25

export const GRAVITY = 19
export const JUMP_BUFFER = 0.12
export const COYOTE_TIME = 0.12

export const PLAYER = {
  walk: 3.5,
  sprint: 6.6,
  jump: 6.3,
  radius: 0.38,
  height: 1.8,
  spawn: { x: 0, z: 14 },
}

export const CIVILIAN = {
  count: 150,
  radius: 0.34,
  height: 1.7,
  minSpeed: 1.0,
  maxSpeed: 1.8,
  wanderRadius: 14,
}

export const CAMERA = {
  sensitivity: 0.0022,
  distance: 3.9,
  shoulder: 0.55,
  headHeight: 1.62,
  minPitch: -1.2,
  maxPitch: 0.9,
}

/** Half-size of the playable square, in metres. */
export const WORLD_HALF = 48
