import type { World } from 'koota'
import {
  CharacterBody,
  IsCivilian,
  Locomotion,
  MoveIntent,
  PrevTransform,
  Transform,
  Velocity,
  View,
  Wander,
} from '../ecs/traits'
import type { GameContext } from '../engine/context'
import { CIVILIAN } from '../game/config'
import { pick, range, TAU, type Rng } from '../core/math'
import { createCharacterBody, makeCharacterMesh } from './character'

const RUANAS = [0xb33a3a, 0x3a6fb3, 0xd9a441, 0x6b8e4e, 0x8b5a9e, 0xe07b39, 0x5c5c5c, 0x2f7f7a]
const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524]

export function spawnCivilian(world: World, { physics }: GameContext, x: number, z: number, rng: Rng) {
  const height = CIVILIAN.height * range(rng, 0.92, 1.06)
  const body = createCharacterBody(physics, x, z, CIVILIAN.radius, height)
  const start = { x, y: 0.05, z, yaw: rng() * TAU }
  return world.spawn(
    IsCivilian,
    Transform(start),
    PrevTransform(start),
    Velocity,
    MoveIntent,
    Locomotion,
    CharacterBody(body),
    Wander({
      homeX: x,
      homeZ: z,
      radius: CIVILIAN.wanderRadius,
      speed: range(rng, CIVILIAN.minSpeed, CIVILIAN.maxSpeed),
      timer: rng() * 3,
    }),
    View(makeCharacterMesh({ height, body: pick(rng, RUANAS), skin: pick(rng, SKINS) })),
  )
}
