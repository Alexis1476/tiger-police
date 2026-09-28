import type { Entity, World } from 'koota'
import { BanditBrain, BanditState, Hit, IsBandit, IsPlayer, Navigator, Noise, Transform } from '../ecs/traits'
import { BanditSpawner, GameMode, Time } from '../ecs/world'
import type { GameContext } from '../engine/context'
import { hitMarker, toast } from '../game/feedback'
import { LINES } from '../game/lines'
import { say } from '../game/speech'
import { BANDIT } from '../game/config'

/**
 * Bandits: roam → flee when the police get close or shoot → stunned when hit (the player
 * can arrest them with E) → recover and flee again. Arrested bandits are led away and a
 * replacement appears elsewhere later.
 */
export function banditBrainSystem(world: World, { audio, effects }: GameContext) {
  const dt = world.get(Time)!.delta
  const playing = world.get(GameMode)!.mode === 'play'
  const noises = world.query(Noise).map((e) => e.get(Noise)!)
  const player = world.queryFirst(IsPlayer, Transform)?.get(Transform)
  const spawner = world.get(BanditSpawner)!
  const removed: Entity[] = []

  world.query(IsBandit, BanditBrain, Navigator, Transform).updateEach(([brain, nav, t], e) => {
    const dp = player ? Math.hypot(t.x - player.x, t.z - player.z) : Infinity
    const startFleeing = () => {
      brain.state = BanditState.Flee
      brain.farTimer = 0
      nav.replan = true
    }

    if (e.has(Hit) && brain.state !== BanditState.Cuffed) {
      if (brain.state !== BanditState.Stunned) {
        say(e, LINES.banditHit)
        toast(world, 'Bandido aturdido: arréstalo con E', 'good')
      }
      brain.state = BanditState.Stunned
      brain.timer = BANDIT.stunTime
      audio.boing(t)
      hitMarker(world)
    }

    if (brain.state === BanditState.Roam) {
      const heard = noises.some((n) => Math.hypot(t.x - n.x, t.z - n.z) < n.radius)
      if (heard) startFleeing()
      else if (playing && dp < BANDIT.spotDistance) {
        startFleeing()
        say(e, LINES.banditSpotted)
        audio.alert(t)
      }
    }

    // Always flee from where the player is now.
    if (player) {
      nav.fromX = player.x
      nav.fromZ = player.z
    }

    switch (brain.state) {
      case BanditState.Roam:
        nav.speed = brain.walkSpeed
        nav.flee = false
        break
      case BanditState.Flee:
        nav.speed = BANDIT.fleeSpeed
        nav.flee = true
        if (dp > BANDIT.escapeDistance) {
          brain.farTimer += dt
          if (brain.farTimer > 4) brain.state = BanditState.Roam
        } else brain.farTimer = 0
        break
      case BanditState.Stunned:
        nav.speed = 0
        brain.timer -= dt
        if (brain.timer <= 0) {
          startFleeing()
          say(e, LINES.banditRecovered)
        }
        break
      case BanditState.Cuffed:
        nav.speed = 0
        brain.timer -= dt
        if (brain.timer <= 0) removed.push(e)
        break
    }
  })

  // Led away: a puff of police-light colours, then a replacement is scheduled.
  for (const e of removed) {
    const t = e.get(Transform)!
    const at = { x: t.x, y: t.y + 0.9, z: t.z }
    effects.emit(at, { n: 12, color: 0x7fb3ff, speed: 2.4, size: 0.5, life: 0.7, up: 0.8 })
    effects.emit(at, { n: 10, color: 0xff6b6b, speed: 2.4, size: 0.5, life: 0.7, up: 0.8 })
    e.destroy()
    spawner.pending.push(BANDIT.respawnTime)
  }
}
