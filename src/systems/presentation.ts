import type { World } from 'koota'
import { BanditBrain, BanditState, IsBandit, IsPlayer, Transform, Velocity, Weapon } from '../ecs/traits'
import { CameraRig, DayCycle, GameMode, Hud, Input, Time } from '../ecs/world'
import type { GameContext } from '../engine/context'
import { toast } from '../game/feedback'
import { nearestStunnedBandit } from './arrest'

/** Advances pooled particles and the muzzle flash. */
export function effectsSystem(world: World, { effects }: GameContext) {
  if (world.get(GameMode)!.mode !== 'pause') effects.update(world.get(Time)!.frameDelta)
}

/** Keeps the audio listener on the player; M toggles mute. */
export function audioSystem(world: World, { audio }: GameContext) {
  const player = world.queryFirst(IsPlayer, Transform)
  if (player) {
    const t = player.get(Transform)!
    audio.listener.x = t.x
    audio.listener.z = t.z
  }
  if (world.get(Input)!.pressedThisFrame.has('KeyM') && world.get(GameMode)!.mode === 'play') {
    audio.setMuted(!audio.muted)
    toast(world, audio.muted ? 'Sonido desactivado' : 'Sonido activado')
  }
}

let hudTimer = 0
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/** Publishes HUD numbers ten times a second; React re-renders only then. */
export function hudSystem(world: World) {
  hudTimer -= world.get(Time)!.frameDelta
  if (hudTimer > 0 || world.get(GameMode)!.mode !== 'play') return
  hudTimer = 0.1

  const player = world.queryFirst(IsPlayer, Weapon, Velocity)
  if (!player) return
  const w = player.get(Weapon)!
  const v = player.get(Velocity)!
  const rig = world.get(CameraRig)!
  const { hour, day } = world.get(DayCycle)!
  const hh = Math.floor(hour)
  const mm = Math.floor((hour - hh) * 60)
  world.set(Hud, {
    clock: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
    day: DAYS[day],
    ammo: w.ammo,
    magazine: w.magazine,
    reloading: w.reload > 0,
    reloadProgress: w.reload > 0 ? 1 - w.reload / w.reloadTime : 0,
    spread: 7 + w.spread + Math.hypot(v.x, v.z) * 0.9 - rig.aimBlend * 3,
    canArrest: nearestStunnedBandit(world) !== undefined,
    looseBandits: world
      .query(IsBandit, BanditBrain)
      .filter((e) => e.get(BanditBrain)!.state !== BanditState.Cuffed).length,
  })
}

/** Last frame system: per-frame input edges have been seen by everyone. */
export function frameCleanupSystem(world: World) {
  world.get(Input)!.pressedThisFrame.clear()
}
