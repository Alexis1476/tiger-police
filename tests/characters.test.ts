import * as THREE from 'three'
import { afterEach, describe, expect, it } from 'vitest'
import { GltfRig } from '../src/characters/gltfRig'
import { Humanoid } from '../src/characters/humanoid'
import { CHARACTER_MODELS, registerCharacterModel } from '../src/characters/models'
import { BanditBrain, BanditState, CivilianBrain, CivilianState, MoveIntent, Rig } from '../src/ecs/traits'
import { spawnBandit } from '../src/entities/bandit'
import { spawnCivilian } from '../src/entities/civilian'
import { mulberry32 } from '../src/core/math'
import { createShootingRange } from './harness'

describe('procedural characters', () => {
  it('everyone gets a Humanoid rig by default', async () => {
    const game = await createShootingRange()
    expect(game.player.get(Rig)).toBeInstanceOf(Humanoid)
  })

  it('a shot bandit is knocked to the ground, then cuffed with E', async () => {
    const game = await createShootingRange()
    const bandit = spawnBandit(game.world, game.ctx, 0.55, 8)
    bandit.remove(MoveIntent)
    const rig = bandit.get(Rig)!
    game.run(0.5)
    expect(rig.hips.position.y).toBeGreaterThan(0.85) // standing

    game.press('Click')
    game.run(1)
    expect(bandit.get(BanditBrain)!.state).toBe(BanditState.Stunned)
    expect(rig.hips.position.y).toBeLessThan(0.3) // lying down

    game.input.keys.add('KeyW')
    game.run(1.5)
    game.input.keys.delete('KeyW')
    game.press('KeyE')
    game.run(0.5)
    expect(bandit.get(BanditBrain)!.state).toBe(BanditState.Cuffed)
    expect(rig.hips.getObjectByName('cuffs')!.visible).toBe(true)
  })

  it('first person hides only the head', async () => {
    const game = await createShootingRange()
    const rig = game.player.get(Rig)!
    game.press('KeyV')
    expect(rig.head.visible).toBe(false)
    expect(rig.root.visible).toBe(true)
    game.press('KeyV')
    expect(rig.head.visible).toBe(true)
  })
})

/** A tiny stand-in for a skinned .glb: two named bones and one clip per state. */
function syntheticModel() {
  const scene = new THREE.Group()
  const hips = new THREE.Bone()
  hips.name = 'Hips'
  const head = new THREE.Bone()
  head.name = 'Head'
  hips.add(head)
  scene.add(hips)
  const clip = (name: string) =>
    new THREE.AnimationClip(name, 1, [new THREE.VectorKeyframeTrack('Hips.position', [0, 1], [0, 0.9, 0, 0, 1, 0])])
  return { scene, animations: ['Idle', 'Walk', 'Run', 'Surrender'].map(clip) }
}

describe('GLTF characters', () => {
  afterEach(() => {
    delete CHARACTER_MODELS.civilian
  })

  it('a registered model replaces the procedural rig and plays the matching clips', async () => {
    registerCharacterModel('civilian', syntheticModel(), {
      url: 'synthetic',
      clips: { idle: 'Idle', walk: 'Walk', run: 'Run', handsup: 'Surrender' },
    })
    const game = await createShootingRange()
    const walker = spawnCivilian(game.world, game.ctx, -12, -12, mulberry32(4))
    const rig = walker.get(Rig) as GltfRig
    expect(rig).toBeInstanceOf(GltfRig)
    expect(rig.head.name).toBe('Head')
    game.run(2)
    expect(rig.playing).toBe('walk') // strolling along the graph

    const target = spawnCivilian(game.world, game.ctx, 0.55, 8, mulberry32(5))
    target.remove(MoveIntent) // stand still under the crosshair
    game.press('Click')
    game.run(0.5)
    expect(target.get(CivilianBrain)!.state).toBe(CivilianState.HandsUp)
    expect((target.get(Rig) as GltfRig).playing).toBe('handsup')
  })

  it('falls back to idle for states without a clip', async () => {
    registerCharacterModel('civilian', syntheticModel(), { url: 'synthetic', clips: { idle: 'Idle', walk: 'Walk' } })
    const rig = new GltfRig(syntheticModel(), { url: 'synthetic', clips: { idle: 'Idle', walk: 'Walk' } })
    rig.update(1 / 60, { pose: 'handsup', speed: 0 })
    expect(rig.playing).toBe('idle')
    rig.update(1 / 60, { pose: 'loco', speed: 5 }) // no run clip: keep walking, faster
    expect(rig.playing).toBe('walk')
  })
})
