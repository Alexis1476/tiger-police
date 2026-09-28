import * as THREE from 'three'

export type Render = ReturnType<typeof createRenderer>

const SKY = 0xa9cbe8

export function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(SKY)
  scene.fog = new THREE.Fog(SKY, 70, 170)

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400)

  scene.add(new THREE.HemisphereLight(0xdfeaff, 0x6b5a45, 1.3))

  const sun = new THREE.DirectionalLight(0xfff1dc, 2.4)
  sun.position.set(-40, 70, 30)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  const s = sun.shadow.camera
  s.left = s.bottom = -60
  s.right = s.top = 60
  s.near = 1
  s.far = 200
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.03
  scene.add(sun)

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false)
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
  }
  addEventListener('resize', resize)
  resize()

  return {
    renderer,
    scene,
    camera,
    render: () => renderer.render(scene, camera),
  }
}
