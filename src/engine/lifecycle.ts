import type { World } from 'koota'
import { CharacterBody, View } from '../ecs/traits'
import type { GameContext } from './context'

/**
 * Keeps engine objects in sync with entity lifetimes: adding a View puts it in the scene,
 * destroying an entity removes its mesh and its physics body. Gameplay code never has to
 * call scene.add or removeRigidBody itself.
 */
export function registerLifecycle(world: World, { render, physics }: GameContext) {
  const unsubs = [
    world.onAdd(View, (e) => render.scene.add(e.get(View)!)),
    world.onRemove(View, (e) => e.get(View)!.removeFromParent()),
    world.onRemove(CharacterBody, (e) => physics.world.removeRigidBody(e.get(CharacterBody)!.body)),
  ]
  return () => unsubs.forEach((u) => u())
}
