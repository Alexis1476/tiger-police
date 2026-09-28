import type { World } from 'koota'
import { DayCycle, Device, GameMode, Scenery, type GameModeName } from '../ecs/world'
import type { Audio } from '../engine/audio'
import { requestPointerLock } from '../engine/input'
import type { Quality, Render } from '../engine/renderer'

export type GameFlow = ReturnType<typeof createGameFlow>

/**
 * High-level actions the UI can trigger (start, pause, settings). Systems read the results
 * from world traits; React never touches gameplay state directly.
 */
export function createGameFlow(world: World, canvas: HTMLCanvasElement, audio: Audio, render: Render) {
  const setMode = (mode: GameModeName) => world.set(GameMode, { mode })
  const play = () => {
    audio.init() // browsers only allow audio after a user gesture
    setMode('play')
    if (!world.get(Device)!.touch) requestPointerLock(canvas)
  }
  return {
    start: play,
    resume: play,
    pause: () => {
      if (world.get(GameMode)!.mode === 'play') setMode('pause')
    },
    toggleMute: () => audio.setMuted(!audio.muted),
    isMuted: () => audio.muted,
    quality: () => render.quality,
    setQuality: (q: Quality) => render.setQuality(q),
    hour: () => world.get(DayCycle)!.hour,
    setHour: (hour: number) => {
      world.set(DayCycle, { ...world.get(DayCycle)!, hour })
      world.get(Scenery)!.environment?.applyDaylight(hour, true)
    },
  }
}
