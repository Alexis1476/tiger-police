import type { Entity, World } from 'koota'
import { BanditBrain, BanditState, IsBandit, IsPlayer, Transform } from '../ecs/traits'
import { GameMode, Input } from '../ecs/world'
import type { GameContext } from '../engine/context'
import { addScore, bigMessage, formatCOP, toast } from '../game/feedback'
import { LINES } from '../game/lines'
import { say } from '../game/speech'
import { BANDIT, SCORE } from '../game/config'

/** The stunned bandit within arrest reach of the player, if any. */
export function nearestStunnedBandit(world: World): Entity | undefined {
  const player = world.queryFirst(IsPlayer, Transform)?.get(Transform)
  if (!player) return undefined
  let best: Entity | undefined
  let bestD: number = BANDIT.arrestReach
  world.query(IsBandit, BanditBrain, Transform).readEach(([brain, t], e) => {
    if (brain.state !== BanditState.Stunned) return
    const d = Math.hypot(t.x - player.x, t.z - player.z)
    if (d < bestD) {
      bestD = d
      best = e
    }
  })
  return best
}

/** E cuffs the nearest stunned bandit. */
export function arrestSystem(world: World, { audio }: GameContext) {
  if (world.get(GameMode)!.mode !== 'play' || !world.get(Input)!.pressed.has('KeyE')) return
  const bandit = nearestStunnedBandit(world)
  const player = world.queryFirst(IsPlayer, Transform)?.get(Transform)
  if (!bandit || !player) return

  const t = bandit.get(Transform)!
  bandit.set(BanditBrain, { ...bandit.get(BanditBrain)!, state: BanditState.Cuffed, timer: BANDIT.cuffTime })
  bandit.set(Transform, { ...t, yaw: Math.atan2(t.x - player.x, t.z - player.z) })
  say(bandit, LINES.banditArrested)

  addScore(world, { money: SCORE.arrest, arrests: 1 })
  bigMessage(world, `¡Arrestado! +${formatCOP(SCORE.arrest)}`)
  toast(world, `Arresto confirmado  +${formatCOP(SCORE.arrest)}`, 'good')
  audio.siren()
}
