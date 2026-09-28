import { useWorld } from 'koota/react'
import { useEffect, useRef } from 'react'
import { BanditBrain, BanditState, IsBandit, IsCivilian, IsPlayer, Transform, Vehicle, VehicleKind } from '../ecs/traits'
import { CameraRig, LevelInfo } from '../ecs/world'

const SIZE = 304 // canvas pixels (drawn at 152 CSS px for crispness)

/**
 * Top-down map, north up. The static layer is drawn once from LevelInfo; dots are redrawn
 * ~15 times a second by reading entity positions straight from the world (read-only).
 */
export function Minimap() {
  const world = useWorld()
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const g = canvas.current?.getContext('2d')
    if (!g) return
    const { minimap } = world.get(LevelInfo)!
    const scale = SIZE / (minimap.half * 2)
    const P = (x: number, z: number) => [(x + minimap.half) * scale, (z + minimap.half) * scale] as const
    const rect = (c: CanvasRenderingContext2D, r: { x0: number; x1: number; z0: number; z1: number }, color: string) => {
      const [x, y] = P(r.x0, r.z0)
      c.fillStyle = color
      c.fillRect(x, y, (r.x1 - r.x0) * scale, (r.z1 - r.z0) * scale)
    }

    const base = document.createElement('canvas')
    base.width = base.height = SIZE
    const b = base.getContext('2d')!
    b.fillStyle = '#2b2f35'
    b.fillRect(0, 0, SIZE, SIZE)
    for (const w of minimap.walks) rect(b, w, '#63615c')
    if (minimap.plaza) rect(b, minimap.plaza, '#94897a')
    if (minimap.park) rect(b, minimap.park, '#4f7639')
    for (const r of minimap.buildings) rect(b, r, '#3a3e45')
    b.fillStyle = 'rgba(255,255,255,0.8)'
    b.font = '700 22px Barlow, sans-serif'
    b.textAlign = 'center'
    b.fillText('N', SIZE / 2, 24)

    let raf = 0
    let last = 0
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      if (now - last < 66) return
      last = now
      g.clearRect(0, 0, SIZE, SIZE)
      g.drawImage(base, 0, 0)
      world.query(Vehicle, Transform).readEach(([v, t]) => {
        const [x, y] = P(t.x, t.z)
        g.fillStyle = v.kind === VehicleKind.Bus ? '#e0584f' : v.kind === VehicleKind.Taxi ? '#f4c21c' : '#c9ced3'
        g.fillRect(x - 4, y - 4, 8, 8)
      })
      world.query(IsCivilian, Transform).readEach(([t]) => {
        const [x, y] = P(t.x, t.z)
        g.fillStyle = 'rgba(235,240,245,0.65)'
        g.beginPath()
        g.arc(x, y, 3.5, 0, Math.PI * 2)
        g.fill()
      })
      world.query(IsBandit, BanditBrain, Transform).readEach(([brain, t]) => {
        if (brain.state === BanditState.Cuffed) return
        const [x, y] = P(t.x, t.z)
        g.fillStyle = brain.state === BanditState.Stunned ? '#ffc54d' : '#ff4b3e'
        g.beginPath()
        g.arc(x, y, 7, 0, Math.PI * 2)
        g.fill()
        g.strokeStyle = '#111'
        g.lineWidth = 2.5
        g.stroke()
      })
      const player = world.queryFirst(IsPlayer, Transform)?.get(Transform)
      if (player) {
        const yaw = world.get(CameraRig)!.yaw
        const [x, y] = P(player.x, player.z)
        g.save()
        g.translate(x, y)
        g.rotate(Math.atan2(Math.cos(yaw), Math.sin(yaw)))
        g.fillStyle = '#d4ef3a'
        g.strokeStyle = '#111'
        g.lineWidth = 3
        g.beginPath()
        g.moveTo(15, 0)
        g.lineTo(-9, 9)
        g.lineTo(-4, 0)
        g.lineTo(-9, -9)
        g.closePath()
        g.fill()
        g.stroke()
        g.restore()
      }
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [world])

  return <canvas ref={canvas} className="minimap" width={SIZE} height={SIZE} />
}
