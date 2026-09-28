import type { World } from 'koota'
import { Flag, IsPlayer, TrafficLight, Transform } from '../ecs/traits'
import { DayCycle, GameMode, Scenery, Time } from '../ecs/world'
import type { GameContext } from '../engine/context'
import { LAMP_MAX, lampUniforms } from '../world/materials'

let lampTimer = 0
const sorted: { d: number; i: number }[] = []

/**
 * The living city: the clock advances one game hour per real minute while playing, and sky,
 * sun, shadows and night glow follow it.
 */
export function scenerySystem(world: World, { render }: GameContext) {
  const { environment, lamps } = world.get(Scenery)!
  if (!environment) return
  const { mode } = world.get(GameMode)!
  const { frameDelta: dt, elapsed } = world.get(Time)!
  const cycle = world.get(DayCycle)!

  if (mode === 'play') {
    cycle.hour += dt / 60
    if (cycle.hour >= 24) {
      cycle.hour -= 24
      cycle.day = (cycle.day + 1) % 7
    }
  }
  if (mode !== 'pause') {
    environment.update(elapsed, dt)
    environment.applyDaylight(cycle.hour)
  }

  const player = world.queryFirst(IsPlayer, Transform)?.get(Transform)
  environment.followShadow(mode === 'title' || !player ? { x: 6, z: 0 } : player, render.shadowMapSize)

  // Only the lamps nearest the camera glow (the shader loops over at most LAMP_MAX).
  lampTimer -= dt
  if (lampTimer <= 0) {
    lampTimer = 0.4
    const cam = render.camera.position
    sorted.length = 0
    lamps.forEach((l, i) => sorted.push({ d: (l.x - cam.x) ** 2 + (l.z - cam.z) ** 2, i }))
    sorted.sort((a, b) => a.d - b.d)
    const n = Math.min(LAMP_MAX, sorted.length)
    for (let k = 0; k < n; k++) lampUniforms.lampPos.value[k].copy(lamps[sorted[k].i])
    lampUniforms.lampCount.value = n
  }
}

/** Waves flag cloth with travelling sine waves. */
export function flagSystem(world: World) {
  if (world.get(GameMode)!.mode === 'pause') return
  const time = world.get(Time)!.elapsed
  world.query(Flag).readEach(([flag]) => {
    const pos = flag.cloth.geometry.attributes.position
    const rest = flag.rest
    for (let i = 0; i < pos.count; i++) {
      const x = rest[i * 3]
      const y = rest[i * 3 + 1]
      const k = x / 2.4
      pos.setZ(i, Math.sin(x * 2.3 - time * 5.2 + flag.phase + y * 0.6) * 0.2 * k)
      pos.setY(i, y - k * k * 0.12 + Math.sin(x * 1.7 - time * 4 + flag.phase) * 0.04 * k)
    }
    pos.needsUpdate = true
    flag.cloth.geometry.computeVertexNormals()
  })
}

/** Cycles traffic lights: green 44%, amber 8%, red 48% of a 12 s cycle. */
export function trafficLightSystem(world: World) {
  const time = world.get(Time)!.elapsed
  world.query(TrafficLight).readEach(([light]) => {
    const c = (time / 12 + light.phase) % 1
    const lit = c < 0.44 ? 2 : c < 0.52 ? 1 : 0
    light.lamps.forEach((m, i) => (m.material = i === lit ? m.userData.on : m.userData.off))
  })
}
