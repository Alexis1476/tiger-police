import { useTrait, useWorld } from 'koota/react'
import { GameMode, Stats } from '../ecs/world'
import type { GameFlow } from '../game/flow'

/**
 * React draws menus and HUD only. It reads ECS state through Koota hooks and changes it
 * through GameFlow; it never runs gameplay.
 */
export function App({ flow }: { flow: GameFlow }) {
  const world = useWorld()
  const mode = useTrait(world, GameMode)?.mode
  const stats = useTrait(world, Stats)

  return (
    <>
      {mode === 'title' && (
        <div className="overlay">
          <div className="panel">
            <h1>Tiger Police</h1>
            <p className="sub">Bogotá · prototipo ECS</p>
            <button onClick={flow.start}>Jugar</button>
            <Controls />
          </div>
        </div>
      )}

      {mode === 'pause' && (
        <div className="overlay">
          <div className="panel">
            <h2>Pausa</h2>
            <button onClick={flow.resume}>Continuar</button>
            <Controls />
          </div>
        </div>
      )}

      {mode === 'play' && <div className="crosshair" />}

      {stats && (
        <div className="stats">
          {stats.fps} fps · {stats.entities} entidades · {stats.civilians} civiles
        </div>
      )}
    </>
  )
}

function Controls() {
  return (
    <p className="controls">
      WASD mover · Shift correr · Espacio saltar · Ratón mirar · Esc pausa
    </p>
  )
}
