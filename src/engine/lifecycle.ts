import type { World } from 'koota'
import { CharacterBody, VehicleBody, View } from '../ecs/traits'
import type { GameContext } from './context'

/**
 * Keeps engine objects in sync with entity lifetimes: adding a View puts it in the scene,
 * adding a body registers its collider, destroying an entity removes both. Gameplay code
 * never calls scene.add or removeRigidBody itself.
 */
export function registerLifecycle(world: World, { render, physics }: GameContext) {
  const unsubs = [
    world.onAdd(View, (e) => render.scene.add(e.get(View)!)),
    world.onRemove(View, (e) => e.get(View)!.removeFromParent()),
    world.onAdd(CharacterBody, (e) => physics.owners.set(e.get(CharacterBody)!.collider.handle, e)),
    world.onRemove(CharacterBody, (e) => {
      const { body, collider } = e.get(CharacterBody)!
      physics.owners.delete(collider.handle)
      physics.world.removeRigidBody(body)
    }),
    world.onAdd(VehicleBody, (e) => physics.owners.set(e.get(VehicleBody)!.collider.handle, e)),
    world.onRemove(VehicleBody, (e) => {
      const { body, collider } = e.get(VehicleBody)!
      physics.owners.delete(collider.handle)
      physics.world.removeRigidBody(body)
    }),
  ]
  return () => unsubs.forEach((u) => u())
}
