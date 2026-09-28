import * as THREE from 'three'

let maxAnisotropy = 1

/** Called once by the renderer so procedural textures stay sharp at grazing angles. */
export function setMaxAnisotropy(value: number) {
  maxAnisotropy = Math.min(8, value)
}

/** A texture drawn procedurally on a 2D canvas (no image files needed). */
export function canvasTex(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  { repeat = true, srgb = true } = {},
) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!, w, h)
  const t = new THREE.CanvasTexture(c)
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = maxAnisotropy
  return t
}

/** Soft round puff for smoke and debris particles. */
export const puffTexture = lazy(() =>
  canvasTex(
    64,
    64,
    (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
      gr.addColorStop(0, 'rgba(255,255,255,1)')
      gr.addColorStop(0.45, 'rgba(255,255,255,0.55)')
      gr.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = gr
      g.fillRect(0, 0, 64, 64)
    },
    { repeat: false },
  ),
)

/** Eight-pointed star for the muzzle flash. */
export const flashTexture = lazy(() =>
  canvasTex(
    64,
    64,
    (g) => {
      g.translate(32, 32)
      for (let i = 0; i < 8; i++) {
        g.rotate(Math.PI / 4)
        const gr = g.createLinearGradient(0, 0, 30, 0)
        gr.addColorStop(0, 'rgba(255,240,200,1)')
        gr.addColorStop(1, 'rgba(255,160,40,0)')
        g.fillStyle = gr
        g.beginPath()
        g.moveTo(0, -3)
        g.lineTo(30, 0)
        g.lineTo(0, 3)
        g.fill()
      }
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 14)
      gr.addColorStop(0, 'rgba(255,255,230,1)')
      gr.addColorStop(1, 'rgba(255,190,80,0)')
      g.fillStyle = gr
      g.fillRect(-14, -14, 28, 28)
    },
    { repeat: false },
  ),
)

/** Creates a value on first use (textures need a DOM, so they can't be module-level constants). */
export function lazy<T>(make: () => T) {
  let value: T | undefined
  return () => (value ??= make())
}
