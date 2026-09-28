import type { TraitRecord, World } from 'koota'
import { Device, Input } from '../ecs/world'

const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
/** A press-and-release shorter than this (px) counts as a click in drag-to-look mode. */
const CLICK_SLOP = 6
/** Touch-drag look is faster than mouse look (fingers move less), as in the legacy build. */
const TOUCH_LOOK_SCALE = 2.4

type InputState = TraitRecord<typeof Input>

/** Registers a one-shot press ("KeyR", "Space", "Click"…) for both gameplay and frame systems. */
export function press(input: InputState, code: string) {
  input.pressed.add(code)
  input.pressedThisFrame.add(code)
}

/** Phones and tablets: a coarse primary pointer, or the first real touch. */
export const prefersTouch = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches

/**
 * Translates DOM events into the Input world trait. Systems read Input; nothing else in the
 * game touches the DOM. Mouse: pointer lock (look, left fires, right aims), or drag-to-look
 * with click-to-fire if the lock is refused. Touch: drag anywhere on the view to look; the
 * on-screen controls (ui/TouchControls) write the rest of Input.
 */
export function attachInput(world: World, canvas: HTMLCanvasElement, opts: { onPauseRequest: () => void }) {
  const input = world.get(Input)!
  const isTouch = () => world.get(Device)!.touch
  let drag: { x: number; y: number; moved: number } | null = null
  const lookTouches = new Map<number, { x: number; y: number }>()

  if (prefersTouch()) world.set(Device, { touch: true })
  const onFirstTouch = () => {
    if (!isTouch()) world.set(Device, { touch: true })
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (PREVENT.has(e.code)) e.preventDefault()
    if (e.code === 'Escape' && !input.pointerLocked) opts.onPauseRequest()
    if (!e.repeat) press(input, e.code)
    input.keys.add(e.code)
  }
  const onKeyUp = (e: KeyboardEvent) => input.keys.delete(e.code)
  const onBlur = () => {
    input.keys.clear()
    input.fireHeld = input.aimHeld = false
    input.stickX = input.stickY = 0
    drag = null
    lookTouches.clear()
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') {
      // Touch on the 3D view (not on a control): look around.
      lookTouches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      try {
        canvas.setPointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
      return
    }
    if (input.pointerLocked) {
      if (e.button === 0) input.fireHeld = true
      if (e.button === 2) input.aimHeld = true
    } else if (e.button === 0) {
      drag = { x: e.clientX, y: e.clientY, moved: 0 }
    } else if (e.button === 2) {
      input.aimHeld = true
    }
  }
  const onPointerMove = (e: PointerEvent) => {
    const t = lookTouches.get(e.pointerId)
    if (!t) return
    input.lookX += (e.clientX - t.x) * TOUCH_LOOK_SCALE
    input.lookY += (e.clientY - t.y) * TOUCH_LOOK_SCALE
    t.x = e.clientX
    t.y = e.clientY
  }
  const onPointerUp = (e: PointerEvent) => {
    if (lookTouches.delete(e.pointerId) || e.pointerType !== 'mouse') return
    if (e.button === 0) {
      input.fireHeld = false
      if (drag && drag.moved < CLICK_SLOP) press(input, 'Click')
      drag = null
    }
    if (e.button === 2) input.aimHeld = false
  }
  const onMouseMove = (e: MouseEvent) => {
    if (isTouch() && !input.pointerLocked) return // touch look is handled by pointer events
    if (drag) drag.moved += Math.abs(e.movementX) + Math.abs(e.movementY)
    if (!input.pointerLocked && !drag) return
    input.lookX += e.movementX
    input.lookY += e.movementY
  }
  const onLockChange = () => {
    const wasLocked = input.pointerLocked
    input.pointerLocked = document.pointerLockElement === canvas
    if (wasLocked && !input.pointerLocked) {
      input.fireHeld = input.aimHeld = false
      opts.onPauseRequest()
    }
  }
  const onContextMenu = (e: Event) => e.preventDefault()

  addEventListener('keydown', onKeyDown)
  addEventListener('keyup', onKeyUp)
  addEventListener('blur', onBlur)
  addEventListener('touchstart', onFirstTouch, { passive: true })
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  addEventListener('pointerup', onPointerUp)
  addEventListener('pointercancel', onPointerUp)
  addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('contextmenu', onContextMenu)
  document.addEventListener('pointerlockchange', onLockChange)

  return () => {
    removeEventListener('keydown', onKeyDown)
    removeEventListener('keyup', onKeyUp)
    removeEventListener('blur', onBlur)
    removeEventListener('touchstart', onFirstTouch)
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    removeEventListener('pointerup', onPointerUp)
    removeEventListener('pointercancel', onPointerUp)
    removeEventListener('mousemove', onMouseMove)
    canvas.removeEventListener('contextmenu', onContextMenu)
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
