import { useTrait, useWorld } from 'koota/react'
import { useEffect, useState } from 'react'
import { Feed, Hud as HudTrait, Score, type Toast } from '../ecs/world'
import { formatCOP } from '../game/feedback'
import { Minimap } from './Minimap'

/** In-game overlay. Everything here is read from world traits; nothing is computed. */
export function Hud() {
  const world = useWorld()
  const hud = useTrait(world, HudTrait)!
  const score = useTrait(world, Score)!
  const feed = useTrait(world, Feed)!

  return (
    <div className="hud">
      <div className="tl">
        <div className="clock">
          <span className="clock-time">{hud.clock}</span>
          <span className="clock-day">{hud.day} · Bogotá</span>
        </div>
        <div className="panel-obj">
          Aturde a los bandidos con balas de goma y arréstalos con <kbd>E</kbd>. <b>{hud.looseBandits}</b> sueltos.
        </div>
      </div>

      <div className="tr">
        <div className={'money' + (score.money < 0 ? ' neg' : '')}>{formatCOP(score.money)}</div>
        <div className="score">
          <span>
            Arrestos<b>{score.arrests}</b>
          </span>
          <span>
            Multas<b>{score.fines}</b>
          </span>
        </div>
        <div className="toasts">
          {feed.toasts.map((t) => (
            <ToastItem key={t.id} toast={t} />
          ))}
        </div>
      </div>

      <div className="br">
        <div className={'ammo' + (hud.ammo <= 2 && !hud.reloading ? ' low' : '')}>
          {hud.reloading ? '··' : hud.ammo}
          <small>/ {hud.magazine}</small>
        </div>
        <div className="ammo-label">
          {hud.reloading ? 'Recargando…' : hud.ammo === 0 ? 'Pulsa R' : 'Balas de goma'}
        </div>
        <div className="reload-bar">
          <i style={{ width: `${Math.round(hud.reloadProgress * 100)}%` }} />
        </div>
      </div>

      <Minimap />
      <Crosshair gap={hud.spread} />
      <HitMarker hits={feed.hits} />
      <BigMessage message={feed.big} />
      {hud.canArrest && (
        <div className="prompt">
          <kbd>E</kbd>
          <span>Arrestar</span>
        </div>
      )}
    </div>
  )
}

function ToastItem({ toast }: { toast: Toast }) {
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)
  useEffect(() => {
    const a = setTimeout(() => setLeaving(true), 2800)
    const b = setTimeout(() => setGone(true), 3300)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [])
  if (gone) return null
  return <div className={`toast ${toast.kind}${leaving ? ' out' : ''}`}>{toast.text}</div>
}

function Crosshair({ gap }: { gap: number }) {
  return (
    <div className="xhair" style={{ '--g': `${gap.toFixed(1)}px` } as React.CSSProperties}>
      <i />
      <i />
      <i />
      <i />
    </div>
  )
}

function HitMarker({ hits }: { hits: number }) {
  const on = useFlash(hits, 220)
  return <div className={'hitmark' + (on ? ' on' : '')} />
}

function BigMessage({ message }: { message: { id: number; text: string; bad: boolean } | null }) {
  const on = useFlash(message?.id ?? 0, 1500)
  return <div className={'bigmsg' + (on ? ' on' : '') + (message?.bad ? ' bad' : '')}>{message?.text}</div>
}

/** True for `ms` after `signal` changes (ignores the initial value). */
function useFlash(signal: number, ms: number) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!signal) return
    setOn(true)
    const t = setTimeout(() => setOn(false), ms)
    return () => clearTimeout(t)
  }, [signal, ms])
  return on
}
