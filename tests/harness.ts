import * as THREE from 'three'
import { CameraRig, GameMode, Input, createGameWorld } from '../src/ecs/world'
import { createAudio } from '../src/engine/audio'
import type { GameContext } from '../src/engine/context'
import { createEffects } from '../src/engine/effects'
import { createTicker } from '../src/engine/loop'
import { createPhysics } from '../src/engine/physics'
import type { Render } from '../src/engine/renderer'
import { pipeline } from '../src/game/pipeline'
import { setupGame, type SetupOptions } from '../src/game/setup'

/**
 * A complete headless game: real ECS world, real Rapier physics, the real system pipeline.
 * Only the WebGL renderer is replaced by a scene that is never drawn.
 */
export async function createTestGame(options: SetupOptions = {}) {
  const world = createGameWorld()
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 400)
  // No WebGL in Node: `renderer` is absent, so environment maps and tone mapping are skipped.
  const render = { scene, camera, quality: 'low', shadowMapSize: 1024, setQuality() {}, setBloomNight() {}, render() {} } as unknown as Render
  const ctx: GameContext = {
    physics: await createPhysics(),
    render,
    audio: createAudio(),
    effects: createEffects(scene),
  }
  // Gameplay tests default to the small, stable proving ground.
  const { player } = setupGame(world, ctx, { level: 'proving-ground', ...options })
  const tick = createTicker(world, ctx, pipeline)

  return {
    world,
    ctx,
    player,
    input: world.get(Input)!,
    rig: world.get(CameraRig)!,
    play: () => world.set(GameMode, { mode: 'play' }),
    /** Advances `seconds` of game time at 60 fps. */
    run(seconds: number) {
      for (let i = 0, n = Math.round(seconds * 60); i < n; i++) tick(1 / 60)
    },
    /** Presses a key (or 'Click') for exactly one frame. */
    press(code: string) {
      const input = world.get(Input)!
      input.pressed.add(code)
      input.pressedThisFrame.add(code)
      tick(1 / 60)
    },
  }
}

/**
 * An empty level in play mode. The player stands at (0, 14) facing -z; the camera sits
 * 0.55 m to the player's right, so a target at x = 0.55 is under the crosshair.
 */
export async function createShootingRange() {
  const game = await createTestGame({ civilians: 0, bandits: 0 })
  game.play()
  game.rig.pitch = -0.05
  game.run(0.3) // let the camera settle behind the player
  return game
}
