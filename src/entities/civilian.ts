import type { World } from 'koota'
import { HUMANOID_HEIGHT, civilianLook } from '../characters/looks'
import { createRig } from '../characters/models'
import {
  CharacterBody,
  CivilianBrain,
  IsCivilian,
  Locomotion,
  MoveIntent,
  Navigator,
  PrevTransform,
  Rig,
  Transform,
  Velocity,
  View,
} from '../ecs/traits'
import type { GameContext } from '../engine/context'
import { CIVILIAN } from '../game/config'
import { range, TAU, type Rng } from '../core/math'
import { SPAWN_Y, createCharacterBody } from './character'

let spawned = 0

export function spawnCivilian(world: World, { physics }: GameContext, x: number, z: number, rng: Rng) {
  const look = civilianLook(spawned++)
  const body = createCharacterBody(physics, x, z, CIVILIAN.radius, HUMANOID_HEIGHT * (look.scale ?? 1))
  const rig = createRig('civilian', look)
  const start = { x, y: SPAWN_Y, z, yaw: rng() * TAU }
  return world.spawn(
    IsCivilian,
    Transform(start),
    PrevTransform(start),
    Velocity,
    MoveIntent,
    Locomotion,
    CharacterBody(body),
    Navigator,
    CivilianBrain({ walkSpeed: range(rng, CIVILIAN.minSpeed, CIVILIAN.maxSpeed) }),
    Rig(rig),
    View(rig.root),
  )
}
