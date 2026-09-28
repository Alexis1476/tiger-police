import type { Entity, World } from 'koota'
import { CharacterBody, Hit, Projectile, Transform, Velocity } from '../ecs/traits'
import { Time } from '../ecs/world'
import type { GameContext } from '../engine/context'
import { PROJECTILE } from '../game/config'

const seg = { x: 0, y: 0, z: 0 }
const dead: Entity[] = []
const hits: { target: Entity; x: number; y: number; z: number }[] = []

/**
 * Moves rubber bullets by ray-casting the path they cover each step, so nothing tunnels.
 * Hitting a character raises a Hit event on it; hitting anything else bounces.
 */
export function projectileSystem(world: World, { physics, audio, effects }: GameContext) {
  const dt = world.get(Time)!.delta
  const { rapier, world: pw, owners } = physics
  dead.length = 0
  hits.length = 0

  world.query(Projectile, Transform, Velocity).updateEach(([p, t, v], e) => {
    v.y -= PROJECTILE.gravity * dt
    seg.x = v.x * dt
    seg.y = v.y * dt
    seg.z = v.z * dt

    // Ray direction = this step's displacement, so time-of-impact 1 = end of the step.
    const hit = pw.castRayAndGetNormal(
      new rapier.Ray(t, seg),
      1,
      true,
      undefined,
      undefined,
      p.ownerCollider >= 0 ? pw.getCollider(p.ownerCollider) : undefined,
    )

    if (!hit) {
      t.x += seg.x
      t.y += seg.y
      t.z += seg.z
    } else {
      const toi = hit.timeOfImpact
      const px = t.x + seg.x * toi
      const py = t.y + seg.y * toi
      const pz = t.z + seg.z * toi
      const target = owners.get(hit.collider.handle)

      if (target?.has(CharacterBody)) {
        hits.push({ target, x: px, y: py, z: pz })
        effects.emit({ x: px, y: py, z: pz }, { n: 6, color: 0xffd49a, speed: 1.6, size: 0.18, life: 0.35 })
        dead.push(e)
        return
      }

      // Bounce: reflect the normal component with restitution, then damp.
      const n = hit.normal
      const vn = v.x * n.x + v.y * n.y + v.z * n.z
      if (vn < 0) {
        const k = (1 + PROJECTILE.restitution) * vn
        v.x -= k * n.x
        v.y -= k * n.y
        v.z -= k * n.z
      }
      v.x *= PROJECTILE.friction
      v.y *= PROJECTILE.friction
      v.z *= PROJECTILE.friction
      t.x = px + n.x * 0.02
      t.y = py + n.y * 0.02
      t.z = pz + n.z * 0.02
      p.bounces++
      if (target) audio.clank(t)
      else audio.tick(t)
      if (p.bounces < 4) effects.emit(t, { n: 3, color: 0xd9d2c4, speed: 1, size: 0.14, life: 0.3, up: 0.3 })
    }

    p.life -= dt
    const speedSq = v.x * v.x + v.y * v.y + v.z * v.z
    const spent = p.bounces > 0 && speedSq < PROJECTILE.minSpeed * PROJECTILE.minSpeed
    if (p.life <= 0 || p.bounces > PROJECTILE.maxBounces || spent) dead.push(e)
  })

  for (const h of hits) {
    if (!world.has(h.target)) continue
    const at = { x: h.x, y: h.y, z: h.z }
    if (h.target.has(Hit)) h.target.set(Hit, at)
    else h.target.add(Hit(at))
  }
  for (const e of dead) if (world.has(e)) e.destroy()
}
