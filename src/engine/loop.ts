import type { World } from 'koota'
import { GameMode, Time } from '../ecs/world'
import { FIXED_DT, MAX_FRAME_DT } from '../game/config'
import type { GameContext, System } from './context'

/**
 * Fixed-timestep game loop ("Fix Your Timestep"): gameplay and physics advance in exact
 * 1/60 s steps so they behave the same at 30, 60 or 144 fps; rendering runs once per
 * display frame and interpolates between the last two steps.
 */
export function startLoop(
  world: World,
  ctx: GameContext,
  pipeline: { fixed: System[]; frame: System[] },
) {
  const time = world.get(Time)!
  let accumulator = 0
  let last = performance.now()
  let raf = 0

  function tick(now: number) {
    raf = requestAnimationFrame(tick)
    const dt = Math.min((now - last) / 1000, MAX_FRAME_DT)
    last = now
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

  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}
