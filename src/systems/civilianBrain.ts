import type { World } from 'koota'
import { CivilianBrain, CivilianState, Hit, IsCivilian, IsPlayer, Navigator, Noise, Transform } from '../ecs/traits'
import { Time } from '../ecs/world'
import type { GameContext } from '../engine/context'
import { addScore, bigMessage, formatCOP, hitMarker, toast } from '../game/feedback'
import { LINES } from '../game/lines'
import { say } from '../game/speech'
import { SCORE } from '../game/config'
import { randRange } from '../core/math'

/**
 * Civilians: stroll (Calm) → hands up when shot (HandsUp, and the player is fined) → run
 * away (Panic) → calm down. Gunshots nearby also cause panic.
 */
export function civilianBrainSystem(world: World, { audio }: GameContext) {
  const dt = world.get(Time)!.delta
  const noises = world.query(Noise).map((e) => e.get(Noise)!)
  const player = world.queryFirst(IsPlayer, Transform)?.get(Transform)

  world.query(IsCivilian, CivilianBrain, Navigator, Transform).updateEach(([brain, nav, t], e) => {
    const fleeFrom = (x: number, z: number) => {
      nav.flee = true
      nav.fromX = x
      nav.fromZ = z
      nav.replan = true
    }

    if (e.has(Hit)) {
      audio.bonk(t)
      hitMarker(world)
      if (brain.state !== CivilianState.HandsUp) {
        brain.state = CivilianState.HandsUp
        brain.timer = 2.4
        say(e, LINES.civilianHit)
        addScore(world, { money: -SCORE.civilianFine, fines: 1 })
        toast(world, `Multa por disparar a un ciudadano  ${formatCOP(-SCORE.civilianFine)}`, 'bad')
        bigMessage(world, formatCOP(-SCORE.civilianFine), true)
      }
    }

    if (brain.state === CivilianState.Calm) {
      for (const n of noises) {
        if (Math.hypot(t.x - n.x, t.z - n.z) > n.radius) continue
        brain.state = CivilianState.Panic
        brain.timer = randRange(3, 5)
        fleeFrom(n.x, n.z)
        if (Math.random() < 0.5) say(e, LINES.civilianScared)
        break
      }
    }

    switch (brain.state) {
      case CivilianState.Calm:
        nav.speed = brain.walkSpeed
        nav.flee = false
        break
      case CivilianState.HandsUp:
        nav.speed = 0
        brain.timer -= dt
        if (brain.timer <= 0) {
          brain.state = CivilianState.Panic
          brain.timer = 3.5
          if (player) fleeFrom(player.x, player.z)
        }
        break
      case CivilianState.Panic:
        nav.speed = 3.6
        brain.timer -= dt
        if (brain.timer <= 0) brain.state = CivilianState.Calm
        break
    }
  })
}
