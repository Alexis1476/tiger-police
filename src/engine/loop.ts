import type { World } from 'koota'
import { GameMode, Time } from '../ecs/world'
import { FIXED_DT, MAX_FRAME_DT } from '../game/config'
import type { GameContext, System } from './context'

export type Pipeline = { fixed: System[]; frame: System[] }

/**
 * Fixed-timestep game loop ("Fix Your Timestep"): gameplay and physics advance in exact
 * 1/60 s steps so they behave the same at 30, 60 or 144 fps; rendering runs once per
 * display frame and interpolates between the last two steps.
 *
 * Returns `tick(dt)`, which advances one display frame. The browser drives it from
 * requestAnimationFrame; tests call it directly.
 */
export function createTicker(world: World, ctx: GameContext, pipeline: Pipeline) {
  const time = world.get(Time)!
  let accumulator = 0

  return function tick(frameDt: number) {
    const dt = Math.min(frameDt, MAX_FRAME_DT)
    time.frameDelta = dt

    if (world.get(GameMode)!.mode !== 'pause') {
      accumulator += dt
      while (accumulator >= FIXED_DT) {
        time.delta = FIXED_DT
        time.elapsed += FIXED_DT
        for (const system of pipeline.fixed) system(world, ctx)
        accumulator -= FIXED_DT
      }
    }
    time.alpha = accumulator / FIXED_DT

    for (const system of pipeline.frame) system(world, ctx)
    ctx.render.render()
  }
}

export function startLoop(world: World, ctx: GameContext, pipeline: Pipeline) {
  const tick = createTicker(world, ctx, pipeline)
  let last = performance.now()
  let raf = 0
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    tick((now - last) / 1000)
    last = now
  }
  raf = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(raf)
}
