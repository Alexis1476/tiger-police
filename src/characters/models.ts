import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { GltfRig, type ModelSource, type ModelSpec } from './gltfRig'
import { Humanoid, type Look } from './humanoid'
import type { CharacterRig } from './rig'

export type Role = 'player' | 'civilian' | 'bandit'

/**
 * Optional skinned models per role. Leave a role out to use the procedural Humanoid.
 * To use a model: put the .glb in public/models/ and describe it here, e.g.
 *
 *   civilian: {
 *     url: 'models/civilian.glb',
 *     clips: { idle: 'Idle', walk: 'Walking', run: 'Running', handsup: 'Surrender' },
 *     scale: 0.01, // Mixamo exports are in centimetres
 *   },
 */
export const CHARACTER_MODELS: Partial<Record<Role, ModelSpec>> = {}

const loaded = new Map<Role, ModelSource>()

/** Loads every configured model before the level spawns characters. Failures fall back. */
export async function preloadCharacterModels(models = CHARACTER_MODELS) {
  const loader = new GLTFLoader()
  await Promise.all(
    (Object.entries(models) as [Role, ModelSpec][]).map(async ([role, spec]) => {
      try {
        loaded.set(role, await loader.loadAsync(spec.url))
      } catch (err) {
        console.warn(`Could not load ${spec.url}; using the procedural character for "${role}".`, err)
      }
    }),
  )
}

/** Registers an already-loaded model (used by tests, or for models built at runtime). */
export function registerCharacterModel(role: Role, source: ModelSource, spec: ModelSpec) {
  CHARACTER_MODELS[role] = spec
  loaded.set(role, source)
}

export function createRig(role: Role, look: Look): CharacterRig {
  const spec = CHARACTER_MODELS[role]
  const source = loaded.get(role)
  return spec && source ? new GltfRig(source, spec) : new Humanoid(look)
}
