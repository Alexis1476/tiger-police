import type { World } from 'koota'
import { HUMANOID_HEIGHT, banditLook } from '../characters/looks'
import { createRig } from '../characters/models'
import {
  BanditBrain,
  CharacterBody,
  IsBandit,
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
import { BANDIT } from '../game/config'
import { randRange, TAU } from '../core/math'
import { SPAWN_Y, createCharacterBody } from './character'

let spawned = 0

export function spawnBandit(world: World, { physics }: GameContext, x: number, z: number) {
  const look = banditLook(spawned++)
  const body = createCharacterBody(physics, x, z, BANDIT.radius, HUMANOID_HEIGHT * (look.scale ?? 1))
  const rig = createRig('bandit', look)
  const start = { x, y: SPAWN_Y, z, yaw: Math.random() * TAU }
  return world.spawn(
    IsBandit,
    Transform(start),
    PrevTransform(start),
    Velocity,
    MoveIntent,
    Locomotion,
    CharacterBody(body),
    Navigator,
    BanditBrain({ walkSpeed: randRange(BANDIT.minWalk, BANDIT.maxWalk) }),
    Rig(rig),
    View(rig.root),
  )
}
