import type { World } from 'koota'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { Rng } from '../core/math'
import { Flag, IsStatic, TrafficLight, VehicleKind, View } from '../ecs/traits'
import { Lanes, LevelInfo, NavGraph, Scenery, type Rect } from '../ecs/world'
import { spawnCar } from '../entities/car'
import { spawnPigeons } from '../entities/pigeons'
import { lanePath } from './lanes'
import type { GameContext } from '../engine/context'
import { addStaticBox } from '../engine/physics'
import { canvasTex } from '../engine/textures'
import { CityBuilder, type SignSpec } from './cityBuilder'
import { createEnvironment } from './environment'
import { faceYaw, fpoint } from './facades'
import { LIMIT, LOT, SLAB, layoutCity } from './layout'
import { createCityMaterials, std, type CityMaterials } from './materials'
import { CURB } from './palette'

export type LevelResult = { spawn: { x: number; z: number; yaw: number } }

/** Builds downtown Bogotá: meshes, colliders, pedestrian graph, props and environment. */
export function buildCity(world: World, ctx: GameContext, rng: Rng): LevelResult {
  const b = new CityBuilder(rng)
  layoutCity(b)
  const materials = createCityMaterials()

  // Animated props first: traffic lights also add street-name signs to the builder.
  spawnFlags(world, b)
  spawnTrafficLights(world, b)

  // Static geometry: ~11 merged meshes for the whole city.
  const group = new THREE.Group()
  const bake = (name: string, mat: THREE.Material, cast: boolean, receive: boolean) => {
    const m = b.bake(name, mat, cast, receive)
    if (m) group.add(m)
  }
  bake('road', materials.road, false, true)
  bake('walk', materials.walk, false, true)
  bake('plaza', materials.plaza, false, true)
  bake('grass', materials.grass, false, true)
  bake('mark', materials.mark, false, true)
  bake('solid', materials.solid, true, true)
  bake('glassLit', materials.glassLit, true, true)
  bake('glassDark', materials.glassDark, true, true)
  bake('glow', materials.glow, false, false)
  bake('neon', materials.neon, false, false)
  bake('far', materials.far, false, true)
  for (const w of b.water) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(w.r, 32), materials.water)
    m.rotation.x = -Math.PI / 2
    m.position.set(w.x, w.y, w.z)
    m.receiveShadow = true
    group.add(m)
  }
  for (const s of b.signs) group.add(...signMeshes(s, materials))
  for (const m of b.murals) group.add(muralMesh(m))
  world.spawn(IsStatic, View(group))

  // Physics: the road, raised sidewalks/steps, and every solid obstacle.
  const { physics } = ctx
  addStaticBox(physics, -80, 80, -1, 0, -80, 80)
  for (const s of b.slabs) addStaticBox(physics, s.x0, s.x1, 0, s.h, s.z0, s.z1)
  for (const c of b.colliders) addStaticBox(physics, c.x0, c.x1, c.y0, c.y1, c.z0, c.z1)
  // Invisible walls at the limit (the outer ring of buildings already closes the map).
  const L = LIMIT + 0.5
  addStaticBox(physics, -L - 1, L + 1, 0, 30, -L - 1, -L)
  addStaticBox(physics, -L - 1, L + 1, 0, 30, L, L + 1)
  addStaticBox(physics, -L - 1, -L, 0, 30, -L, L)
  addStaticBox(physics, L, L + 1, 0, 30, -L, L)

  // Traffic: three loops (outer ring, around the plaza, the southern blocks).
  world.set(Lanes, {
    paths: [
      lanePath([[-54, -54], [54, -54], [54, 54], [-54, 54]]),
      lanePath([[-18, -18], [-18, 18], [18, 18], [18, -18]]),
      lanePath([[54, 18], [-54, 18], [-54, 54], [54, 54]]),
    ],
  })
  const lanes = world.get(Lanes)!.paths
  const { Sedan, Taxi, Bus } = VehicleKind
  const fleet: [number, number, number, number][] = [
    [Bus, 0, 0, 7],
    [Taxi, 0, 0.36, 9],
    [Sedan, 0, 0.68, 8.5],
    [Taxi, 1, 0, 8],
    [Sedan, 1, 0.5, 7.5],
    [Taxi, 2, 0.1, 8.5],
    [Sedan, 2, 0.6, 8],
  ]
  for (const [kind, lane, f, speed] of fleet) {
    spawnCar(world, ctx, kind as 0 | 1 | 2, lane, f * lanes[lane].length, speed, rng, materials)
  }
  spawnPigeons(world, 34, rng)

  const environment = createEnvironment(ctx.render, materials, rng)
  world.set(Scenery, { environment, lamps: b.lamps })
  world.set(NavGraph, { nodes: b.nav.nodes })
  world.set(LevelInfo, {
    name: 'Bogotá',
    limit: LIMIT,
    minimap: {
      half: 68,
      walks: b.slabs.filter((s) => s.h <= CURB + 0.01),
      buildings: b.colliders.filter((c) => c.y1 > 3 && (c.x1 - c.x0) * (c.z1 - c.z0) > 6) as Rect[],
      plaza: { x0: -SLAB, x1: SLAB, z0: -SLAB, z1: SLAB },
      park: { x0: -36 - LOT, x1: -36 + LOT, z0: 36 - LOT, z1: 36 + LOT },
    },
  })

  return { spawn: { x: -9, z: 3, yaw: Math.PI / 2 } }
}

function signTexture(text: string, bg: string, fg: string) {
  return canvasTex(
    512,
    128,
    (g, w, h) => {
      g.fillStyle = bg
      g.fillRect(0, 0, w, h)
      g.strokeStyle = 'rgba(0,0,0,0.28)'
      g.lineWidth = 8
      g.strokeRect(4, 4, w - 8, h - 8)
      g.fillStyle = fg
      let fs = 80
      const font = (s: number) => `800 ${s}px "Barlow Condensed", "Arial Narrow", sans-serif`
      g.font = font(fs)
      while (g.measureText(text).width > w - 44 && fs > 28) {
        fs -= 4
        g.font = font(fs)
      }
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(text, w / 2, h / 2 + 4)
    },
    { repeat: false },
  )
}

function signMeshes(s: SignSpec, materials: CityMaterials) {
  const tex = signTexture(s.text, s.bg, s.fg)
  const mat = std({ map: tex, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0 })
  materials.signs.push(mat)
  const geo = new THREE.PlaneGeometry(s.w, s.h)
  const m = new THREE.Mesh(geo, mat)
  if (s.raw) {
    m.position.set(s.x, s.y, s.z)
    m.rotation.y = s.ry
    if (!s.double) return [m]
    const back = new THREE.Mesh(geo, mat)
    back.position.copy(m.position)
    back.rotation.y = s.ry + Math.PI
    return [m, back]
  }
  const [x, z] = fpoint(s.f, s.u, s.o)
  m.position.set(x, s.y, z)
  m.rotation.y = faceYaw(s.f)
  return [m]
}

function muralMesh(m: CityBuilder['murals'][number]) {
  const W = m.f.len - 1.2
  const H = m.h
  const tex = canvasTex(
    512,
    Math.round((512 * H) / W),
    (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h)
      gr.addColorStop(0, '#ff7a59')
      gr.addColorStop(0.55, '#ffcf5c')
      gr.addColorStop(1, '#ffe9a8')
      g.fillStyle = gr
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#fff3c4'
      g.beginPath()
      g.arc(w * 0.72, h * 0.42, h * 0.2, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#2f6b4f'
      g.beginPath()
      g.moveTo(0, h)
      for (const [px, py] of [[0, 0.62], [0.18, 0.5], [0.34, 0.36], [0.46, 0.52], [0.62, 0.46], [0.8, 0.6], [1, 0.52], [1, 1]]) {
        g.lineTo(w * px, h * py)
      }
      g.fill()
      g.fillStyle = '#ffffff'
      g.fillRect(w * 0.33, h * 0.31, w * 0.03, h * 0.05)
      g.save()
      g.translate(w / 2, h * 0.78)
      g.rotate(-0.06)
      g.font = `800 italic ${Math.round(h * 0.3)}px "Barlow Condensed", sans-serif`
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.lineJoin = 'round'
      g.lineWidth = h * 0.05
      g.strokeStyle = '#1b1b2f'
      g.strokeText('BOGOTÁ', 0, 0)
      g.fillStyle = '#2ec4b6'
      g.fillText('BOGOTÁ', 0, 0)
      g.restore()
      g.fillStyle = 'rgba(27,27,47,0.85)'
      for (let i = 0; i < 9; i++) g.fillRect(w * 0.2 + Math.random() * w * 0.6, h * 0.86, 4, 10 + Math.random() * 30)
    },
    { repeat: false },
  )
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), std({ map: tex, roughness: 0.9 }))
  const [x, z] = fpoint(m.f, m.f.len / 2, 0.03)
  mesh.position.set(x, m.y + H / 2, z)
  mesh.rotation.y = faceYaw(m.f)
  mesh.receiveShadow = true
  return mesh
}

/** Colombian flags on the Capitol and city hall. */
function spawnFlags(world: World, b: CityBuilder) {
  const tex = canvasTex(
    256,
    170,
    (g, w, h) => {
      g.fillStyle = '#FCD116'
      g.fillRect(0, 0, w, h / 2)
      g.fillStyle = '#003893'
      g.fillRect(0, h / 2, w, h / 4)
      g.fillStyle = '#CE1126'
      g.fillRect(0, h * 0.75, w, h / 4)
    },
    { repeat: false },
  )
  const poleMat = std({ color: 0xdedede, roughness: 0.4, metalness: 0.6 })
  const clothMat = std({ map: tex, side: THREE.DoubleSide, roughness: 0.85 })
  for (const f of b.flags) {
    const group = new THREE.Group()
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, f.h, 8), poleMat)
    pole.position.set(f.x, f.y + f.h / 2, f.z)
    pole.castShadow = true
    const geo = new THREE.PlaneGeometry(2.4, 1.6, 16, 8)
    geo.translate(1.2, 0, 0)
    const cloth = new THREE.Mesh(geo, clothMat)
    cloth.position.set(f.x + 0.05, f.y + f.h - 0.85, f.z)
    cloth.castShadow = true
    group.add(pole, cloth)
    world.spawn(
      IsStatic,
      View(group),
      Flag({ cloth, rest: Float32Array.from(geo.attributes.position.array), phase: Math.random() * 6 }),
    )
  }
}

/** Traffic lights at the plaza corners, with street-name plates. */
function spawnTrafficLights(world: World, b: CityBuilder) {
  const on = [0xff3b30, 0xffb300, 0x39d353].map((c) => {
    const m = new THREE.MeshBasicMaterial({ color: c })
    m.toneMapped = false
    return m
  })
  const off = [0x3a1512, 0x3a2c0c, 0x0f3317].map((c) => new THREE.MeshBasicMaterial({ color: c }))
  const boxGeo = new RoundedBoxGeometry(0.3, 0.85, 0.26, 2, 0.05)
  const lampGeo = new THREE.CircleGeometry(0.09, 16)
  const boxMat = std({ color: 0x23272b, roughness: 0.6 })
  for (const t of b.trafficLights) {
    const head = new THREE.Group()
    head.position.set(t.x, CURB + 3.0, t.z)
    head.rotation.y = Math.atan2(t.sx, t.sz)
    const box = new THREE.Mesh(boxGeo, boxMat)
    box.castShadow = true
    head.add(box)
    const lamps: THREE.Mesh[] = []
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(lampGeo, off[i])
      m.position.set(0, 0.26 - i * 0.26, 0.132)
      m.userData.on = on[i]
      m.userData.off = off[i]
      head.add(m)
      lamps.push(m)
    }
    world.spawn(IsStatic, View(head), TrafficLight({ lamps, phase: t.sx * t.sz > 0 ? 0 : 0.5 }))
    const calle = t.sz > 0 ? 'CALLE 10' : 'CALLE 11'
    const carrera = t.sx > 0 ? 'CARRERA 7' : 'CARRERA 8'
    b.signs.push({ raw: true, double: true, x: t.x - t.sx * 0.6, y: CURB + 2.55, z: t.z, ry: 0, w: 1.1, h: 0.26, text: calle, bg: '#1d5c3a', fg: '#ffffff' })
    b.signs.push({ raw: true, double: true, x: t.x, y: CURB + 2.25, z: t.z - t.sz * 0.6, ry: Math.PI / 2, w: 1.1, h: 0.26, text: carrera, bg: '#1d5c3a', fg: '#ffffff' })
  }
}
