import type { World } from 'koota'
import { Input } from '../ecs/world'

const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

/**
 * Translates DOM events into the Input world trait. Systems read Input; nothing else in the
 * game touches the DOM. Mouse look works with pointer lock, or by dragging if the lock fails.
 */
export function attachInput(world: World, canvas: HTMLCanvasElement, opts: { onPauseRequest: () => void }) {
  const input = world.get(Input)!
  let dragging = false

  const onKeyDown = (e: KeyboardEvent) => {
    if (PREVENT.has(e.code)) e.preventDefault()
    if (e.code === 'Space' && !e.repeat) input.jumpPressed = true
    if (e.code === 'Escape' && !input.pointerLocked) opts.onPauseRequest()
    input.keys.add(e.code)
  }
  const onKeyUp = (e: KeyboardEvent) => input.keys.delete(e.code)
  const onBlur = () => {
    input.keys.clear()
    dragging = false
  }
  const onMouseDown = (e: MouseEvent) => {
    if (e.button === 0 && !input.pointerLocked) dragging = true
  }
  const onMouseUp = () => (dragging = false)
  const onMouseMove = (e: MouseEvent) => {
    if (!input.pointerLocked && !dragging) return
    input.lookX += e.movementX
    input.lookY += e.movementY
  }
  const onLockChange = () => {
    const wasLocked = input.pointerLocked
    input.pointerLocked = document.pointerLockElement === canvas
    if (wasLocked && !input.pointerLocked) opts.onPauseRequest()
  }

  addEventListener('keydown', onKeyDown)
  addEventListener('keyup', onKeyUp)
  addEventListener('blur', onBlur)
  canvas.addEventListener('mousedown', onMouseDown)
  addEventListener('mouseup', onMouseUp)
  addEventListener('mousemove', onMouseMove)
  document.addEventListener('pointerlockchange', onLockChange)

  return () => {
    removeEventListener('keydown', onKeyDown)
    removeEventListener('keyup', onKeyUp)
    removeEventListener('blur', onBlur)
    canvas.removeEventListener('mousedown', onMouseDown)
    removeEventListener('mouseup', onMouseUp)
    removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('pointerlockchange', onLockChange)
  }
}

export function requestPointerLock(canvas: HTMLCanvasElement) {
  try {
    // Can reject (e.g. re-locking too soon after Esc); drag-to-look is the fallback.
    Promise.resolve(canvas.requestPointerLock()).catch(() => {})
  } catch {
    /* unsupported: drag-to-look */
  }
  canvas.focus()
}
