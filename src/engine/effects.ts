import * as THREE from 'three'
import { flashTexture, puffTexture } from './textures'

type Vec = { x: number; y: number; z: number }
export type EmitOptions = {
  n?: number
  color?: number
  speed?: number
  size?: number
  life?: number
  up?: number
  grow?: number
  additive?: boolean
}

export type Effects = ReturnType<typeof createEffects>

const POOL = 110

/**
 * Pooled visual effects (smoke puffs, debris, muzzle flash). They never affect gameplay, so
 * they live in an engine service rather than as ECS entities.
 */
export function createEffects(scene: THREE.Scene) {
  const parts = Array.from({ length: POOL }, () => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: puffTexture(), transparent: true, depthWrite: false, opacity: 0 }),
    )
    sprite.visible = false
    scene.add(sprite)
    return { sprite, life: 0, max: 1, vel: new THREE.Vector3(), size: 0.3, grow: 2 }
  })
  let next = 0

  const flash = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: flashTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  flash.visible = false
  const flashLight = new THREE.PointLight(0xffb060, 0, 8, 2)
  scene.add(flash, flashLight)
  let flashTimer = 0

  return {
    emit(pos: Vec, { n = 6, color = 0xffffff, speed = 1.5, size = 0.3, life = 0.6, up = 0.5, grow = 2.5, additive = false }: EmitOptions = {}) {
      for (let k = 0; k < n; k++) {
        const p = parts[next++ % POOL]
        p.sprite.visible = true
        p.sprite.position.set(pos.x, pos.y, pos.z)
        p.vel.set((Math.random() - 0.5) * speed, Math.random() * up * speed, (Math.random() - 0.5) * speed)
        p.life = p.max = life * (0.7 + Math.random() * 0.6)
        p.size = size * (0.7 + Math.random() * 0.6)
        p.grow = grow
        const m = p.sprite.material
        m.color.set(color)
        m.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending
        p.sprite.scale.setScalar(p.size)
      }
    },

    muzzleFlash(pos: Vec) {
      flash.position.set(pos.x, pos.y, pos.z)
      flash.scale.setScalar(0.35 + Math.random() * 0.2)
      flash.material.rotation = Math.random() * 6
      flash.visible = true
      flashLight.position.copy(flash.position)
      flashLight.intensity = 25
      flashTimer = 0.05
    },

    update(dt: number) {
      for (const p of parts) {
        if (!p.sprite.visible) continue
        p.life -= dt
        if (p.life <= 0) {
          p.sprite.visible = false
          continue
        }
        const t = 1 - p.life / p.max
        p.sprite.position.addScaledVector(p.vel, dt)
        p.vel.multiplyScalar(Math.exp(-dt * 3))
        p.sprite.scale.setScalar(p.size * (1 + t * p.grow))
        p.sprite.material.opacity = (1 - t) * 0.85
      }
      if (flashTimer > 0) {
        flashTimer -= dt
        if (flashTimer <= 0) {
          flash.visible = false
          flashLight.intensity = 0
        }
      }
    },
  }
}
