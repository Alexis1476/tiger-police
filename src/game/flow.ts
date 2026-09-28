import type { World } from 'koota'
import { GameMode, type GameModeName } from '../ecs/world'
import { requestPointerLock } from '../engine/input'

export type GameFlow = ReturnType<typeof createGameFlow>

/** High-level state changes (title → play ⇄ pause). The UI calls these; systems read GameMode. */
export function createGameFlow(world: World, canvas: HTMLCanvasElement) {
  const setMode = (mode: GameModeName) => world.set(GameMode, { mode })
  const play = () => {
    setMode('play')
    requestPointerLock(canvas)
  }
  return {
    start: play,
    resume: play,
    pause: () => {
      if (world.get(GameMode)!.mode === 'play') setMode('pause')
    },
  }
}
