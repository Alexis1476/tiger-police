# Presidente en Bogotá

A cartoonish 3D game set in downtown Bogotá. Patrol Plaza de Bolívar and La Candelaria with a
rubber-bullet pistol: stun bandits, arrest them before they recover, and don't shoot citizens.

**Stack:** TypeScript · [Vite](https://vite.dev) · [three.js](https://threejs.org) (rendering) ·
[Koota](https://github.com/pmndrs/koota) (ECS) · [Rapier](https://rapier.rs) (physics) ·
React (menus and HUD) · [Vitest](https://vitest.dev) (tests).

> The original single-file version is kept in [`legacy/index.html`](legacy/index.html) for reference.

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173 (hot reload)
npm test           # headless gameplay tests
npm run build      # type-check + production build into dist/
```

URL options: `#rendimiento` starts in low graphics quality; `#proving-ground` loads the small test level.

## Controls

WASD move · Shift sprint · Space jump · mouse look · left click shoot · right click aim ·
R reload · E arrest a stunned bandit · V first/third person · M mute · Esc pause.

## Architecture: Entity Component System

There is no class per kind of object (`class NPC`, `class Car`…). Instead:

- **Entity**: just an ID.
- **Trait** (component): plain data, no logic — [`src/ecs/traits.ts`](src/ecs/traits.ts).
- **System**: a function that runs over every entity with certain traits — [`src/systems/`](src/systems).

A bandit is `Transform + Velocity + MoveIntent + Locomotion + CharacterBody + Navigator + BanditBrain + Rig + View`.
A civilian swaps `BanditBrain` for `CivilianBrain`; the player swaps both for `IsPlayer + Weapon`.
Brains (and player input) only write a `MoveIntent`; the **same** `locomotion` system then moves everyone.

### Frame of the game

Gameplay and physics run in fixed 1/60 s steps; rendering interpolates between them
([`engine/loop.ts`](src/engine/loop.ts)). The order of every system is listed in one place,
[`game/pipeline.ts`](src/game/pipeline.ts):

1. **Input** → player `MoveIntent`.
2. **Actions**: the weapon spawns projectiles; projectiles ray-cast their path and add a `Hit` event trait to whoever they hit, and a shot spawns a `Noise` event entity.
3. **Brains** react to this step's events (civilians panic or raise their hands, bandits flee or get stunned, E arrests).
4. **Movement**: navigation along the sidewalk graph → locomotion (Rapier character controller) → physics step; cars drive their lanes.
5. **Cleanup**: event traits and entities are removed, so each event is handled exactly once.

Then once per rendered frame: camera, interpolated transforms, character animation, sky/day cycle, HUD.

### Layout

```
src/
├─ main.tsx               boot: renderer, physics, level, loop, React UI
├─ core/math.ts           helpers (clamp, lerp, seeded PRNG…)
├─ ecs/
│  ├─ traits.ts           every component
│  └─ world.ts            world factory + singleton traits (Time, Input, Score, DayCycle, NavGraph…)
├─ engine/                technical services, no game rules
│  ├─ loop.ts             fixed-timestep loop (createTicker is shared with the tests)
│  ├─ physics.ts          Rapier world, character controller, collision layers
│  ├─ renderer.ts         WebGL renderer, quality presets (AO + bloom), resize
│  ├─ input.ts            DOM events → Input trait (pointer lock, drag-to-look fallback)
│  ├─ audio.ts            synthesized sound effects (no audio files)
│  ├─ effects.ts          pooled particles and muzzle flash
│  └─ lifecycle.ts        adds/removes meshes and physics bodies with their entities
├─ systems/               game logic, one responsibility per file
├─ entities/              factories: spawnPlayer, spawnBandit, spawnCivilian, spawnCar, spawnPigeons…
├─ characters/            rigs: procedural Humanoid, GltfRig, looks, model registry
├─ world/                 the levels: city layout, buildings, facades, props, environment, lanes, nav graph
├─ game/
│  ├─ config.ts           gameplay tuning
│  ├─ pipeline.ts         system execution ORDER
│  ├─ setup.ts            builds a level and spawns everyone (used by the app and the tests)
│  └─ flow.ts, feedback.ts, lines.ts, speech.ts
└─ ui/                    React: title, pause, HUD, minimap (reads the ECS, never runs the game)
tests/                    headless gameplay tests on the real pipeline
```

### Adding a feature

1. Add the data to `ecs/traits.ts` (e.g. `Health`, `Stunned`).
2. Write a system in `systems/` that queries those traits.
3. Register it in `game/pipeline.ts` at the right point.
4. Give the traits to the relevant entities in `entities/`.
5. Add a test in `tests/` (see below).

## Characters and 3D models

Characters are drawn by a **rig** behind one interface ([`characters/rig.ts`](src/characters/rig.ts)).
The animation system turns gameplay state into an `AnimState` (pose, speed, aiming…) and the rig displays it:

- `Humanoid` — the procedural cartoon character from the original game (used by default).
- `GltfRig` — a skinned `.glb` model whose clips are cross-faded from the same `AnimState`.

To use a model, put it in `public/models/` and describe it in
[`characters/models.ts`](src/characters/models.ts):

```ts
export const CHARACTER_MODELS = {
  civilian: {
    url: 'models/civilian.glb',
    clips: { idle: 'Idle', walk: 'Walking', run: 'Running', handsup: 'Surrender' },
    scale: 0.01, // Mixamo exports are in centimetres
  },
}
```

Roles left out (or models that fail to load) fall back to the procedural character. Nothing else changes.

## Tests

`npm test` runs the real ECS world, Rapier physics and system pipeline in Node — only WebGL is
replaced by a scene that is never drawn ([`tests/harness.ts`](tests/harness.ts)). Most tests use
the small **proving ground** level so they don't break when the city changes; `city.test.ts`
covers the city itself. Examples: walking speed and jump height match the original, a shot bandit
is stunned and can be arrested, cars stop for pedestrians, NPCs never deadlock.

## Publishing with GitHub Pages

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and publishes the game on
every push to `main`. One-time setup: Settings → Pages → Source: **GitHub Actions**.

## Not ported yet

- Touch controls (virtual joystick and buttons) from the original.
- LOD / instancing for characters: the procedural rig is ~25 meshes per character, fine for dozens;
  for hundreds, use a skinned GLTF model (a few draw calls each) and a spatial grid in the
  navigation and locomotion systems (both are O(n²) today and say so in comments).
