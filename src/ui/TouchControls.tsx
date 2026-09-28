import { useTrait, useWorld } from 'koota/react'
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Hud, Input } from '../ecs/world'
import { press } from '../engine/input'
import type { GameFlow } from '../game/flow'

/**
 * Virtual joystick and action buttons for phones and tablets. Like the keyboard listeners,
 * they only write the Input trait; gameplay can't tell the difference.
 */
export function TouchControls({ flow }: { flow: GameFlow }) {
  const world = useWorld()
  const input = world.get(Input)!
  const canArrest = useTrait(world, Hud)?.canArrest
  const [running, setRunning] = useState(input.runToggle)

  /** Press-and-hold button: `down` on touch, `up` on release. */
  const hold = (down: () => void, up?: () => void) => ({
    onPointerDown: (e: ReactPointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      down()
    },
    onPointerUp: up,
    onPointerCancel: up,
  })

  return (
    <div className="touch">
      <Joystick
        onMove={(x, y) => {
          input.stickX = x
          input.stickY = y
        }}
      />
      <div className="tbtns">
        {canArrest && (
          <button className="tb tb-arrest" {...hold(() => press(input, 'KeyE'))}>
            Arrestar
          </button>
        )}
        <button className="tb tb-reload" aria-label="Recargar" {...hold(() => press(input, 'KeyR'))}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 12a8 8 0 1 1-2.34-5.66" />
            <path d="M20 4v5h-5" />
          </svg>
        </button>
        <button
          className={'tb tb-run' + (running ? ' on' : '')}
          {...hold(() => {
            input.runToggle = !input.runToggle
            setRunning(input.runToggle)
          })}
        >
          Correr
        </button>
        <button className="tb tb-jump" aria-label="Saltar" {...hold(() => press(input, 'Space'))}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
        </button>
        <button
          className="tb tb-fire"
          aria-label="Disparar"
          {...hold(
            () => (input.fireHeld = true),
            () => (input.fireHeld = false),
          )}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <circle cx="12" cy="12" r="7" />
            <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
          </svg>
        </button>
      </div>
      <button className="pause-btn" aria-label="Pausa" onClick={flow.pause}>
        II
      </button>
    </div>
  )
}

/** Drag inside the ring; the knob follows the finger, clamped to the ring's edge. */
function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const ring = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const active = useRef<number | null>(null)

  const move = (e: ReactPointerEvent) => {
    const r = ring.current!.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2)
    let dy = e.clientY - (r.top + r.height / 2)
    const max = r.width * 0.36
    const len = Math.hypot(dx, dy)
    if (len > max) {
      dx = (dx / len) * max
      dy = (dy / len) * max
    }
    setKnob({ x: dx, y: dy })
    onMove(dx / max, -dy / max)
  }
  const end = (e: ReactPointerEvent) => {
    if (e.pointerId !== active.current) return
    active.current = null
    setKnob({ x: 0, y: 0 })
    onMove(0, 0)
  }

  return (
    <div
      ref={ring}
      className="joy"
      onPointerDown={(e) => {
        e.preventDefault()
        active.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        move(e)
      }}
      onPointerMove={(e) => e.pointerId === active.current && move(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="joy-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  )
}
