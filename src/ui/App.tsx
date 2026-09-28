import { useTrait, useWorld } from 'koota/react'
import { useState } from 'react'
import { Device, GameMode, Stats } from '../ecs/world'
import type { GameFlow } from '../game/flow'
import { Hud } from './Hud'
import { TouchControls } from './TouchControls'

/**
 * React draws menus and HUD only. It reads ECS state through Koota hooks and changes it
 * through GameFlow; it never runs gameplay.
 */
export function App({ flow }: { flow: GameFlow }) {
  const world = useWorld()
  const mode = useTrait(world, GameMode)?.mode
  const stats = useTrait(world, Stats)
  const touch = useTrait(world, Device)?.touch ?? false

  return (
    <div className={touch ? 'ui-root touch-ui' : 'ui-root'}>
      {mode === 'play' && <Hud />}
      {mode === 'play' && touch && <TouchControls flow={flow} />}
      {mode === 'title' && <Title flow={flow} touch={touch} />}
      {mode === 'pause' && <Pause flow={flow} />}
      {stats && (
        <div className="perf">
          {stats.fps} fps · {stats.entities} entidades
        </div>
      )}
    </div>
  )
}

function Title({ flow, touch }: { flow: GameFlow; touch: boolean }) {
  return (
    <div className="screen title">
      <div className="card">
        <div className="kicker">Bogotá · 2.640 m s. n. m.</div>
        <h1>
          Patria
          <br />
          <span>Milagro</span>
        </h1>
        <p>
          Patrulla la Plaza de Bolívar y La Candelaria de traje y con pistola de balas de goma. Aturde a
          los bandidos y arréstalos antes de que se recuperen. Dispararle a un ciudadano cuesta una multa.
        </p>
        {touch ? <TouchHelp /> : <Controls />}
        <QualityPicker flow={flow} />
        <button className="primary" onClick={flow.start}>
          Salir a patrullar
        </button>
        <div className="fine">Personajes, lugares y situaciones son caricaturas ficticias.</div>
      </div>
    </div>
  )
}

const TIMES = [
  { label: 'Mañana', hour: 10.5 },
  { label: 'Atardecer', hour: 17.4 },
  { label: 'Noche', hour: 21 },
]

/** Which time-of-day button matches the current hour. */
const timeSlot = (h: number) => (h < 7 || h >= 19.5 ? 21 : h >= 16.5 ? 17.4 : 10.5)

function QualityPicker({ flow }: { flow: GameFlow }) {
  const [quality, setQuality] = useState(flow.quality())
  return (
    <div className="row">
      <span className="lbl">Gráficos</span>
      <div className="seg" role="group" aria-label="Calidad gráfica">
        {(['high', 'low'] as const).map((q) => (
          <button
            key={q}
            aria-pressed={quality === q}
            onClick={() => {
              flow.setQuality(q)
              setQuality(q)
            }}
          >
            {q === 'high' ? 'Altos' : 'Rendimiento'}
          </button>
        ))}
      </div>
    </div>
  )
}

function Pause({ flow }: { flow: GameFlow }) {
  const [muted, setMuted] = useState(flow.isMuted())
  const [slot, setSlot] = useState(timeSlot(flow.hour()))
  return (
    <div className="screen pause">
      <div className="card">
        <h2>Pausa</h2>
        <QualityPicker flow={flow} />
        <div className="row">
          <span className="lbl">Hora</span>
          <div className="seg" role="group" aria-label="Hora del día">
            {TIMES.map((t) => (
              <button
                key={t.hour}
                aria-pressed={slot === t.hour}
                onClick={() => {
                  flow.setHour(t.hour)
                  setSlot(t.hour)
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="row">
          <span className="lbl">Sonido</span>
          <button
            className="ghost"
            onClick={() => {
              flow.toggleMute()
              setMuted(flow.isMuted())
            }}
          >
            {muted ? 'Silenciado' : 'Activado'}
          </button>
        </div>
        <button className="primary" onClick={flow.resume}>
          Continuar
        </button>
      </div>
    </div>
  )
}

function TouchHelp() {
  return (
    <div className="ctl">
      <span>Joystick</span>
      <span>Moverse (botón Correr para ir rápido)</span>
      <span>Arrastrar</span>
      <span>Mirar alrededor</span>
      <span>Botones</span>
      <span>Disparar, saltar, recargar y arrestar</span>
    </div>
  )
}

function Controls() {
  return (
    <div className="ctl">
      <span>
        <kbd>W</kbd>
        <kbd>A</kbd>
        <kbd>S</kbd>
        <kbd>D</kbd>
      </span>
      <span>
        Moverse · <kbd>Shift</kbd> correr · <kbd>Espacio</kbd> saltar
      </span>
      <span>Ratón</span>
      <span>Mirar · clic izq. disparar · clic der. apuntar</span>
      <span>
        <kbd>R</kbd> <kbd>E</kbd>
      </span>
      <span>Recargar · arrestar bandido aturdido</span>
      <span>
        <kbd>V</kbd> <kbd>M</kbd> <kbd>Esc</kbd>
      </span>
      <span>Cámara 1.ª/3.ª persona · sonido · pausa</span>
    </div>
  )
}
