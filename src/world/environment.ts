import * as THREE from 'three'
import { Sky } from 'three/addons/objects/Sky.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { lerp, smooth, type Rng } from '../core/math'
import type { Render } from '../engine/renderer'
import { GeometryBatcher } from './batcher'
import { lampUniforms, type CityMaterials } from './materials'

export type Environment = ReturnType<typeof createEnvironment>

const C = {
  dayFog: new THREE.Color(0xbfd3e4),
  goldFog: new THREE.Color(0xe4bf9c),
  nightFog: new THREE.Color(0x0d1420),
  hemiDay: new THREE.Color(0xcfe3ff),
  hemiNight: new THREE.Color(0x34466e),
  groundDay: new THREE.Color(0x5f6147),
  groundNight: new THREE.Color(0x141720),
}
/** Half-size of the sun's shadow frustum, in metres (it follows the player). */
const SHADOW_SPAN = 42

/**
 * Sky, sun, moon, fog, stars and clouds, and the day/night cycle that drives them and the
 * city materials (lit windows, lamp glow, neon). Ported from the legacy build.
 */
export function createEnvironment(render: Render, materials: CityMaterials, rng: Rng) {
  const { scene } = render

  const sky = new Sky()
  sky.scale.setScalar(5000)
  scene.add(sky)
  const su = sky.material.uniforms
  su.turbidity.value = 6
  su.rayleigh.value = 1.25
  su.mieCoefficient.value = 0.004
  su.mieDirectionalG.value = 0.8

  // A second sky rendered into an environment map, for reflections and ambient light.
  const envScene = new THREE.Scene()
  const envSky = new Sky()
  envSky.scale.setScalar(900)
  // No sun disc here: the directional light already carries the sun. PMREM would otherwise
  // blur the disc's huge HDR value over the whole map and wash every surface out by day.
  envSky.material.uniforms.showSunDisc.value = 0
  envScene.add(envSky)
  const pmrem = render.renderer ? new THREE.PMREMGenerator(render.renderer) : null
  let envTarget: THREE.WebGLRenderTarget | null = null

  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x5b5f45, 0.5)
  const sun = new THREE.DirectionalLight(0xfff1dc, 3.0)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -SHADOW_SPAN, right: SHADOW_SPAN, top: SHADOW_SPAN, bottom: -SHADOW_SPAN, near: 1, far: 360 })
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.035
  scene.add(hemi, sun, sun.target)
  scene.fog = new THREE.FogExp2(0xbfd3e4, 0.0052)
  const fog = scene.fog

  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.7,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  })
  const starPositions: number[] = []
  for (let i = 0; i < 1000; i++) {
    const y = rng() * 0.95 + 0.05
    const r = Math.sqrt(1 - y * y)
    const a = rng() * Math.PI * 2
    starPositions.push(Math.cos(a) * r * 1400, y * 1400, Math.sin(a) * r * 1400)
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3))
  scene.add(new THREE.Points(starGeo, starMaterial))

  const cloudMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 1,
    emissive: 0xffffff,
    emissiveIntensity: 0.3,
    fog: false,
  })
  const puffs = new GeometryBatcher(rng)
  for (let i = 0; i < 18; i++) {
    const a = puffs.range(0, Math.PI * 2)
    const r = puffs.range(170, 560)
    const cx = Math.cos(a) * r
    const cz = Math.sin(a) * r
    const cy = puffs.range(100, 160)
    const n = 4 + Math.floor(rng() * 4)
    for (let k = 0; k < n; k++) {
      puffs.ico(puffs.range(10, 22), 1, cx + puffs.range(-24, 24), cy + puffs.range(-4, 5), cz + puffs.range(-14, 14), 0xffffff, 1.6, 0.55, 1.1, 'c')
    }
  }
  const clouds = new THREE.Group()
  clouds.add(new THREE.Mesh(mergeGeometries(puffs.buckets.c, false)!, cloudMaterial))
  scene.add(clouds)

  const sunDir = new THREE.Vector3()
  const moonDir = new THREE.Vector3(-0.35, 0.85, 0.4).normalize()
  let keyDir = sunDir
  let lastEnvHour = -99
  const tmp = new THREE.Color()

  function updateEnvironmentMap() {
    if (!pmrem) return
    const eu = envSky.material.uniforms
    for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) eu[k].value = su[k].value
    eu.sunPosition.value.copy(su.sunPosition.value)
    const rt = pmrem.fromScene(envScene, 0, 1, 3000)
    envTarget?.dispose()
    envTarget = rt
    scene.environment = rt.texture
  }

  return {
    /** Per-frame drift: clouds turn slowly, the tower's neon cycles through colours. */
    update(elapsed: number, dt: number) {
      clouds.rotation.y += dt * 0.002
      materials.neon.emissive.setHSL((elapsed * 0.05) % 1, 0.9, 0.55)
    },
    /** Sets sun, sky, fog and material glow for `hour` (0–24). */
    applyDaylight(hour: number, force = false) {
      const t = ((hour - 6) / 12) * Math.PI
      const s = Math.sin(t)
      sunDir.set(Math.cos(t), s, 0.3).normalize()
      su.sunPosition.value.copy(sunDir)
      const dayF = smooth(-0.1, 0.22, s)
      const nightF = 1 - dayF
      const gold = smooth(0.42, 0.04, s) * dayF
      const sunUp = smooth(-0.02, 0.25, s)
      keyDir = sunUp > 0.02 ? sunDir : moonDir
      sun.intensity = 3.1 * sunUp + 0.45 * (1 - sunUp)
      if (sunUp > 0.02) sun.color.setRGB(1, lerp(0.96, 0.68, gold), lerp(0.9, 0.46, gold))
      else sun.color.set(0x9db4e0)
      hemi.intensity = lerp(0.2, 0.5, dayF)
      hemi.color.copy(C.hemiNight).lerp(C.hemiDay, dayF)
      hemi.groundColor.copy(C.groundNight).lerp(C.groundDay, dayF)
      fog.color.copy(tmp.copy(C.nightFog).lerp(C.dayFog, dayF).lerp(C.goldFog, gold * 0.65))
      if (render.renderer) render.renderer.toneMappingExposure = lerp(1.1, 0.74, dayF)
      // The daylit sky map is far brighter than the lights (three's Sky lost its built-in
      // compression after r160). At full strength it flattened the city to white and drowned
      // the sun's shadows. It follows the sun's height: a low sun leaves the sky dim, so dusk and
      // night keep more of it.
      scene.environmentIntensity = lerp(1, 0.3, smooth(0.1, 0.6, s))
      render.setBloomNight(nightF)
      materials.glassLit.emissiveIntensity = nightF * 2.4 + 0.02
      materials.glow.emissiveIntensity = 0.35 + nightF * 5
      materials.neon.emissiveIntensity = 0.3 + nightF * 3.5
      lampUniforms.lampNight.value = smooth(0.25, 0.8, nightF)
      starMaterial.opacity = smooth(0.55, 1, nightF)
      for (const m of materials.signs) m.emissiveIntensity = nightF * 0.45
      cloudMaterial.emissiveIntensity = lerp(0.03, 0.3, dayF)
      cloudMaterial.color.setScalar(lerp(0.22, 1, dayF))
      if (force || Math.abs(hour - lastEnvHour) > 0.12) {
        updateEnvironmentMap()
        lastEnvHour = hour
      }
    },
    /** Keeps the sun's shadow frustum centred on `focus`, snapped to texels to avoid shimmer. */
    followShadow(focus: { x: number; z: number }, mapSize: number) {
      if (sun.shadow.mapSize.x !== mapSize) {
        sun.shadow.mapSize.set(mapSize, mapSize)
        sun.shadow.map?.dispose()
        sun.shadow.map = null
      }
      const texel = (2 * SHADOW_SPAN) / mapSize
      const sx = Math.round(focus.x / texel) * texel
      const sz = Math.round(focus.z / texel) * texel
      sun.target.position.set(sx, 0, sz)
      sun.position.set(sx + keyDir.x * 170, Math.max(20, keyDir.y * 170), sz + keyDir.z * 170)
      sun.target.updateMatrixWorld()
    },
  }
}
