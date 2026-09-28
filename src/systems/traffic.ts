import type { World } from 'koota'
import { CharacterBody, IsPlayer, Transform, Vehicle, VehicleBody } from '../ecs/traits'
import { Lanes, Time } from '../ecs/world'
import type { GameContext } from '../engine/context'
import { clamp } from '../core/math'
import { pathPoint } from '../world/lanes'

type Obstacle = { x: number; z: number; player: boolean }
type Car = { x: number; z: number; fx: number; fz: number; length: number; halfWidth: number; priority: number }

const people: Obstacle[] = []
const cars: Car[] = []
const at = { x: 0, z: 0 }
const ahead = { x: 0, z: 0 }
const next = { x: 0, y: 0, z: 0 }
const rot = { x: 0, y: 0, z: 0, w: 1 }

/**
 * Drives cars along their lanes. Each car looks ahead and slows (or stops) for people and
 * other cars in front of it, then honks if the player blocks it for too long.
 */
export function trafficSystem(world: World, { audio }: GameContext) {
  const dt = world.get(Time)!.delta
  const { paths } = world.get(Lanes)!
  if (!paths.length) return

  people.length = 0
  world.query(Transform, CharacterBody).readEach(([t], e) => people.push({ x: t.x, z: t.z, player: e.has(IsPlayer) }))
  cars.length = 0
  world.query(Vehicle, Transform).readEach(([v, t]) =>
    cars.push({ x: t.x, z: t.z, fx: Math.sin(t.yaw), fz: Math.cos(t.yaw), length: v.length, halfWidth: v.halfWidth, priority: v.priority }),
  )

  world.query(Vehicle, VehicleBody, Transform).updateEach(([v, vb, t]) => {
    const fx = Math.sin(t.yaw)
    const fz = Math.cos(t.yaw)
    const reach = v.length / 2 + 7
    let target = v.maxSpeed
    let blockedByPlayer = false

    for (const p of people) {
      const rx = p.x - t.x
      const rz = p.z - t.z
      const along = rx * fx + rz * fz
      if (along <= 0 || along > reach) continue
      if (Math.abs(rx * fz - rz * fx) > v.halfWidth + 0.7) continue
      const free = along - v.length / 2 - 1.6
      const speed = clamp(free / 4, 0, 1) * v.maxSpeed
      target = Math.min(target, speed)
      if (p.player && speed < 0.5) blockedByPlayer = true
    }
    for (const o of cars) {
      if (o.priority === v.priority) continue
      const rx = o.x - t.x
      const rz = o.z - t.z
      const along = rx * fx + rz * fz
      if (along <= 0 || along > reach + o.length / 2) continue
      const same = fx * o.fx + fz * o.fz
      if (same < -0.5) continue // oncoming traffic, other lane
      if (same < 0.5 && v.priority < o.priority) continue // crossing: lower priority has right of way
      if (Math.abs(rx * fz - rz * fx) > v.halfWidth + o.halfWidth - 0.2) continue
      const free = along - v.length / 2 - o.length / 2 - 1.5
      target = Math.min(target, clamp(free / 4, 0, 1) * v.maxSpeed)
    }

    const accel = target > v.speed ? 4 : 14
    v.speed += clamp(target - v.speed, -accel * dt, accel * dt)
    const path = paths[v.lane]
    v.s = (v.s + v.speed * dt) % path.length

    pathPoint(path, v.s, at)
    pathPoint(path, v.s + 2.5, ahead)
    t.x = at.x
    t.z = at.z
    t.yaw = Math.atan2(ahead.x - at.x, ahead.z - at.z)
    next.x = t.x
    next.y = v.height / 2
    next.z = t.z
    rot.y = Math.sin(t.yaw / 2)
    rot.w = Math.cos(t.yaw / 2)
    vb.body.setNextKinematicTranslation(next)
    vb.body.setNextKinematicRotation(rot)

    if (blockedByPlayer) {
      v.blocked += dt
      if (v.blocked > 2) {
        v.blocked = -2.5
        audio.honk(t)
      }
    } else v.blocked = Math.max(0, v.blocked - dt)
  })
}
