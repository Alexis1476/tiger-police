import type { World } from 'koota'
import type { AnimState, FaceMode } from '../characters/rig'
import {
  BanditBrain,
  BanditState,
  CivilianBrain,
  CivilianState,
  Locomotion,
  Rig,
  Velocity,
  Weapon,
} from '../ecs/traits'
import { CameraRig, GameMode, Time } from '../ecs/world'

const state: AnimState = { pose: 'loco', speed: 0 }

/**
 * Derives every character's animation state from gameplay traits and advances its rig.
 * This is the only place that knows how game states map to poses and faces.
 */
export function animationSystem(world: World) {
  if (world.get(GameMode)!.mode === 'pause') return
  const { frameDelta: dt, elapsed } = world.get(Time)!
  const pitch = world.get(CameraRig)!.pitch

  world.query(Rig, Velocity, Locomotion).readEach(([rig, v, loco], e) => {
    state.pose = loco.grounded ? 'loco' : 'air'
    state.speed = Math.hypot(v.x, v.z)
    state.gun = state.aim = state.carry = false
    state.reload = 0
    state.pitch = 0
    let face: FaceMode = 'open'

    const weapon = e.get(Weapon)
    if (weapon) {
      state.gun = true
      state.aim = weapon.aiming || weapon.aimHold > 0
      state.pitch = pitch
      state.reload = weapon.reload
    }
    const bandit = e.get(BanditBrain)
    if (bandit) {
      state.carry = true
      if (bandit.state === BanditState.Stunned) {
        state.pose = 'stun'
        state.speed = 0
        face = 'dizzy'
      } else if (bandit.state === BanditState.Cuffed) {
        state.pose = 'cuffed'
        state.speed = 0
      }
    }
    if (e.get(CivilianBrain)?.state === CivilianState.HandsUp) state.pose = 'handsup'

    rig.setFace(face)
    rig.update(dt, state, elapsed)
  })
}
