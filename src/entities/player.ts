import type { World } from 'koota'
import {
  CharacterBody,
  IsPlayer,
  Locomotion,
  MoveIntent,
  PrevTransform,
  Transform,
  Velocity,
  View,
} from '../ecs/traits'
import type { GameContext } from '../engine/context'
import { PLAYER } from '../game/config'
import { createCharacterBody, makeCharacterMesh } from './character'

export function spawnPlayer(world: World, { physics }: GameContext) {
  const { x, z } = PLAYER.spawn
  const body = createCharacterBody(physics, x, z, PLAYER.radius, PLAYER.height)
  const start = { x, y: 0.05, z, yaw: Math.PI }
  return world.spawn(
    IsPlayer,
    Transform(start),
    PrevTransform(start),
    Velocity,
    MoveIntent,
    Locomotion({ jumpSpeed: PLAYER.jump }),
    CharacterBody(body),
    View(makeCharacterMesh({ height: PLAYER.height, body: 0x3d5a36, skin: 0xc68a5c, hat: 0x1f2f1c })),
  )
}
