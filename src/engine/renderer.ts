import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { prefersTouch } from './input'
import { setMaxAnisotropy } from './textures'

export type Quality = 'high' | 'low'

/**
 * Bloom runs on the HDR image before tone mapping, where the daylit sky and sunlit walls are
 * already brighter than 1.0. A fixed low threshold made a third of the screen glow white by
 * day. Measured: by day it must be ~6 to add no haze; at night ~1 keeps the lamp/neon glow.
 */
const bloomThreshold = (night: number) => 6 + (1 - 6) * night
export type Render = ReturnType<typeof createRenderer>

export function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.8
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap // (PCFSoftShadowMap was removed in r180+)
  setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy())

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.08, 3000)
  scene.add(camera)

  let composer: EffectComposer | null = null
  let bloom: UnrealBloomPass | null = null
  // Phones default to the light preset, as in the legacy build.
  const state = {
    quality: (location.hash === '#rendimiento' || prefersTouch() ? 'low' : 'high') as Quality,
    /** 0 = full day, 1 = full night (set by the day cycle). */
    night: 0,
  }

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false)
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
    composer?.setSize(innerWidth, innerHeight)
  }

  /** High: ambient occlusion + bloom at up to 1.5× pixel ratio. Low: plain render. */
  function setQuality(q: Quality) {
    state.quality = q
    const hi = q === 'high'
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, hi ? 1.5 : 1.25))
    if (composer) {
      composer.renderTarget1.dispose()
      composer.renderTarget2.dispose()
      composer = null
      bloom = null
    }
    if (hi) {
      const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 })
      composer = new EffectComposer(renderer, rt)
      composer.addPass(new RenderPass(scene, camera))
      try {
        const gtao = new GTAOPass(scene, camera, 4, 4)
        gtao.output = GTAOPass.OUTPUT.Default
        gtao.blendIntensity = 0.9
        gtao.updateGtaoMaterial({ radius: 0.7, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12 })
        gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 12 })
        composer.addPass(gtao)
      } catch (e) {
        console.warn('GTAO disabled', e)
      }
      bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.5, bloomThreshold(state.night))
      composer.addPass(bloom)
      composer.addPass(new OutputPass())
    }
    resize()
  }

  addEventListener('resize', resize)
  setQuality(state.quality)

  return {
    renderer,
    scene,
    camera,
    get quality() {
      return state.quality
    },
    /** Post-processing chain on "high" (null on "low"). Exposed for debugging. */
    get composer() {
      return composer
    },
    /** Sun shadow map resolution for the current quality. */
    get shadowMapSize() {
      return state.quality === 'high' ? 2048 : 1024
    },
    setQuality,
    /** Called by the day cycle so bloom only picks up lamps and neon after dark. */
    setBloomNight(night: number) {
      state.night = night
      if (bloom) bloom.threshold = bloomThreshold(night)
    },
    render: () => (composer ? composer.render() : renderer.render(scene, camera)),
  }
}
