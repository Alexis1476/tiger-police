import type { World } from 'koota'
import * as THREE from 'three'
import { BanditBrain, BanditState, IsBandit, Rig, Speech, View } from '../ecs/traits'
import { GameMode, Time } from '../ecs/world'
import { alertTexture, bubbleTexture, starsTexture } from '../engine/sprites'
import { lazy } from '../engine/textures'

const starsMaterial = lazy(() => new THREE.SpriteMaterial({ map: starsTexture(), transparent: true, depthWrite: false }))
const alertMaterial = lazy(
  () => new THREE.SpriteMaterial({ map: alertTexture(), transparent: true, depthWrite: false, fog: false }),
)

/** Gets (creating on first use) a sprite attached to a character's view, stored by name. */
function sprite(view: THREE.Object3D, name: string, make: () => THREE.Sprite) {
  let s = view.getObjectByName(name) as THREE.Sprite | undefined
  if (!s) {
    s = make()
    s.name = name
    s.visible = false
    view.add(s)
  }
  return s
}

/** Speech bubbles and status icons above heads. Visual only: derived from ECS state each frame. */
export function overheadSystem(world: World) {
  if (world.get(GameMode)!.mode === 'pause') return
  const dt = world.get(Time)!.frameDelta

  world.query(View, Speech).updateEach(([view, speech]) => {
    const bubble = sprite(view, 'bubble', () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false }))
      s.position.y = 2.4
      s.scale.set(2.0, 0.625, 1)
      s.renderOrder = 10
      return s
    })
    if (speech.timer > 0) {
      speech.timer -= dt
      if (bubble.userData.text !== speech.text) {
        bubble.material.map = bubbleTexture(speech.text)
        bubble.material.needsUpdate = true
        bubble.userData.text = speech.text
      }
    }
    bubble.visible = speech.timer > 0
  })

  starsMaterial().rotation += dt * 3
  world.query(IsBandit, BanditBrain, View).readEach(([brain, view], e) => {
    const alert = sprite(view, 'alert', () => {
      const s = new THREE.Sprite(alertMaterial())
      s.scale.setScalar(0.42)
      s.position.y = 2.2
      return s
    })
    // Stars circle the head, which drops to the ground when the bandit is knocked down.
    const head = e.get(Rig)?.head
    const stars = sprite(head ?? view, 'stars', () => {
      const s = new THREE.Sprite(starsMaterial())
      s.scale.set(0.62, 0.31, 1)
      s.position.y = head ? 0.34 : 2.0
      return s
    })
    alert.visible = brain.state === BanditState.Flee
    stars.visible = brain.state === BanditState.Stunned
  })
}
