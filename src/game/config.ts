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
  aimWalk: 2.6,
  jump: 6.3,
  radius: 0.38,
}

export const CIVILIAN = {
  count: 16,
  radius: 0.34,
  minSpeed: 1.0,
  maxSpeed: 1.45,
}

export const BANDIT = {
  count: 6,
  radius: 0.34,
  minWalk: 1.45,
  maxWalk: 1.8,
  fleeSpeed: 4.9,
  /** Bandits notice the police within this distance. */
  spotDistance: 9,
  /** …and calm down after staying this far away for a few seconds. */
  escapeDistance: 26,
  stunTime: 7,
  cuffTime: 1.9,
  arrestReach: 2.4,
  respawnTime: 14,
  /** New bandits appear at least this far from the player. */
  spawnDistance: 18,
  respawnDistance: 36,
}

export const PROJECTILE = {
  gravity: 7,
  /** Hits that leave a bullet slower than this (m/s) stop it. */
  minSpeed: Math.SQRT2,
  maxBounces: 5,
  restitution: 0.45,
  friction: 0.8,
}

export const SCORE = {
  arrest: 50_000,
  civilianFine: 20_000,
}

export const CAMERA = {
  sensitivity: 0.0022,
  distance: 3.9,
  shoulder: 0.55,
  headHeight: 1.62,
  minPitch: -1.2,
  maxPitch: 0.9,
}
