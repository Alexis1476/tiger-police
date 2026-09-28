/**
 * Node has no DOM. Procedural textures draw on a <canvas>, so give them a do-nothing 2D
 * context: the game logic under test never reads pixels.
 */
const noop = () => {}
const gradient = { addColorStop: noop }
const context2d = new Proxy(
  {},
  {
    get: (_t, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient
      if (prop === 'measureText') return () => ({ width: 0 })
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) })
      return noop
    },
    set: () => true,
  },
)

if (typeof document === 'undefined') {
  ;(globalThis as Record<string, unknown>).document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => context2d, style: {} }),
  }
}
