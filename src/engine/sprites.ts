import * as THREE from 'three'
import { canvasTex, lazy } from './textures'

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

const bubbles = new Map<string, THREE.Texture>()

/** Comic speech bubble with `text`, cached per string. */
export function bubbleTexture(text: string) {
  let t = bubbles.get(text)
  if (t) return t
  t = canvasTex(
    512,
    160,
    (g, w) => {
      g.font = '700 50px "Barlow", sans-serif'
      const tw = Math.min(w - 24, g.measureText(text).width + 60)
      const x0 = (w - tw) / 2
      g.fillStyle = 'rgba(255,255,255,0.97)'
      g.strokeStyle = 'rgba(20,20,20,0.85)'
      g.lineWidth = 5
      roundRect(g, x0, 12, tw, 98, 30)
      g.fill()
      g.stroke()
      g.beginPath()
      g.moveTo(w / 2 - 16, 108)
      g.lineTo(w / 2, 146)
      g.lineTo(w / 2 + 14, 108)
      g.closePath()
      g.fill()
      g.stroke()
      g.fillRect(w / 2 - 14, 96, 28, 14)
      g.fillStyle = '#16181b'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(text, w / 2, 62, w - 50)
    },
    { repeat: false },
  )
  bubbles.set(text, t)
  return t
}

export const starsTexture = lazy(() =>
  canvasTex(
    128,
    64,
    (g) => {
      const star = (x: number, y: number, r: number) => {
        g.beginPath()
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 5
          const rr = i % 2 ? r * 0.45 : r
          g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
        }
        g.closePath()
        g.fill()
        g.stroke()
      }
      g.fillStyle = '#ffd23f'
      g.strokeStyle = '#7a5a00'
      g.lineWidth = 2.5
      star(22, 34, 14)
      star(64, 20, 16)
      star(106, 36, 13)
    },
    { repeat: false },
  ),
)

export const alertTexture = lazy(() =>
  canvasTex(
    64,
    64,
    (g) => {
      g.fillStyle = '#e8322a'
      g.beginPath()
      g.arc(32, 32, 28, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = '#fff'
      g.lineWidth = 4
      g.stroke()
      g.fillStyle = '#fff'
      g.font = '900 40px "Barlow Condensed", sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText('!', 32, 34)
    },
    { repeat: false },
  ),
)
