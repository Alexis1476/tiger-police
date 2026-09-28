import type { World } from 'koota'
import { HUMANOID_HEIGHT, PRESIDENT } from '../characters/looks'
import { createRig } from '../characters/models'
import {
  CharacterBody,
  IsPlayer,
  Locomotion,
  MoveIntent,
  PrevTransform,
  Rig,
  Transform,
  Velocity,
  View,
  Weapon,
} from '../ecs/traits'
import type { GameContext } from '../engine/context'
import { PLAYER } from '../game/config'
import { SPAWN_Y, createCharacterBody } from './character'

export function spawnPlayer(world: World, { physics }: GameContext, at: { x: number; z: number; yaw: number }) {
  const body = createCharacterBody(physics, at.x, at.z, PLAYER.radius, HUMANOID_HEIGHT)
  const rig = createRig('player', PRESIDENT)
  const start = { x: at.x, y: SPAWN_Y, z: at.z, yaw: at.yaw }
  return world.spawn(
    IsPlayer,
    Transform(start),
    PrevTransform(start),
    Velocity,
    MoveIntent,
    Locomotion({ jumpSpeed: PLAYER.jump }),
    Weapon,
    CharacterBody(body),
    Rig(rig),
    View(rig.root),
  )
}
