import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { clamp, lerp } from '../core/math'
import { canvasTex, lazy } from '../engine/textures'
import { shade } from '../world/palette'
import { std } from '../world/materials'
import type { AnimState, CharacterRig, FaceMode } from './rig'

/** Face features painted on the head texture. */
export type FaceStyle = {
  mouth?: 'smile' | 'grin' | 'frown' | 'flat'
  blush?: boolean
  stubble?: boolean
  lashes?: boolean
  lipstick?: boolean
  worried?: boolean
  angry?: boolean
  brow?: string
  browW?: number
  eyeGap?: number
  eyeW?: number
  eyeH?: number
  iris?: string
  bandana?: string
}

/** Everything that makes one character look different from another. */
export type Look = {
  skin: string
  top: number
  pants: number
  shoes?: number
  sleeve?: number
  topRough?: number
  skirt?: number
  legs?: string
  shortSleeve?: boolean
  hair?: 'none' | 'short' | 'buzz' | 'long' | 'bun' | 'quiff'
  hairColor?: number
  hat?: 'cap' | 'hood' | 'sombrero'
  hatColor?: number
  face?: FaceStyle
  nose?: number
  headScale?: number
  scale?: number
  extras?: keyof typeof EXTRAS
  ruana?: string[]
}

const materialCache = new Map<string, THREE.MeshStandardMaterial>()
function M(color: THREE.ColorRepresentation, rough = 0.8) {
  const hex = new THREE.Color(color).getHex()
  const key = hex + '|' + rough
  let m = materialCache.get(key)
  if (!m) {
    m = std({ color: hex, roughness: rough, metalness: 0 })
    materialCache.set(key, m)
  }
  return m
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  parent.add(m)
  return m
}

/** Shared body-part geometry (created on first use). */
const G = lazy(() => ({
  pelvis: new RoundedBoxGeometry(0.36, 0.2, 0.23, 2, 0.07),
  torso: new RoundedBoxGeometry(0.43, 0.56, 0.25, 3, 0.085),
  thigh: new THREE.CapsuleGeometry(0.088, 0.28, 4, 10),
  shin: new THREE.CapsuleGeometry(0.074, 0.3, 4, 10),
  shoe: new RoundedBoxGeometry(0.13, 0.09, 0.27, 2, 0.035),
  upper: new THREE.CapsuleGeometry(0.064, 0.2, 4, 10),
  fore: new THREE.CapsuleGeometry(0.056, 0.19, 4, 10),
  hand: new THREE.SphereGeometry(0.062, 12, 10),
  neck: new THREE.CylinderGeometry(0.06, 0.066, 0.14, 12),
  head: new THREE.SphereGeometry(0.17, 32, 22),
  nose: new THREE.SphereGeometry(0.034, 12, 10),
  ear: new THREE.SphereGeometry(0.038, 10, 8),
}))

function speckle(g: CanvasRenderingContext2D, w: number, h: number, n: number, colors: string[], a: number) {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = Math.random() * a
    g.fillStyle = colors[i % colors.length]
    const s = Math.random() * 1.8 + 0.6
    g.fillRect(Math.random() * w, Math.random() * h, s, s)
  }
  g.globalAlpha = 1
}

/** Open, closed (blink) and dizzy versions of a painted face. */
function makeFaceSet(skin: string, f: FaceStyle): Record<FaceMode, THREE.Texture> {
  const paint = (mode: FaceMode) =>
    canvasTex(
      512,
      256,
      (g, W, H) => {
        g.fillStyle = skin
        g.fillRect(0, 0, W, H)
        const cx = 128
        const ey = 118
        const gr = g.createLinearGradient(0, H * 0.72, 0, H)
        gr.addColorStop(0, 'rgba(0,0,0,0)')
        gr.addColorStop(1, 'rgba(60,30,20,0.18)')
        g.fillStyle = gr
        g.fillRect(0, H * 0.72, W, H * 0.28)
        if (f.stubble) {
          g.fillStyle = 'rgba(45,32,24,0.2)'
          g.beginPath()
          g.ellipse(cx, ey + 66, 74, 38, 0, 0, Math.PI * 2)
          g.fill()
        }
        if (f.blush) {
          g.fillStyle = 'rgba(225,95,85,0.22)'
          for (const s of [-1, 1]) {
            g.beginPath()
            g.ellipse(cx + s * 46, ey + 28, 16, 9, 0, 0, Math.PI * 2)
            g.fill()
          }
        }
        const gap = f.eyeGap ?? 30
        const ew = f.eyeW ?? 10.5
        const eh = f.eyeH ?? 13
        g.lineCap = 'round'
        for (const s of [-1, 1]) {
          const x = cx + s * gap
          if (mode === 'closed') {
            g.strokeStyle = '#2b1d16'
            g.lineWidth = 4
            g.beginPath()
            g.moveTo(x - ew, ey + 2)
            g.quadraticCurveTo(x, ey + 8, x + ew, ey + 2)
            g.stroke()
          } else if (mode === 'dizzy') {
            g.strokeStyle = '#2b1d16'
            g.lineWidth = 3.2
            g.beginPath()
            for (let a = 0; a < Math.PI * 4.5; a += 0.25) {
              const r = a * 1.25
              const px = x + Math.cos(a * s) * r
              const py = ey + Math.sin(a * s) * r
              if (a === 0) g.moveTo(px, py)
              else g.lineTo(px, py)
            }
            g.stroke()
          } else {
            g.fillStyle = '#fbf8f2'
            g.beginPath()
            g.ellipse(x, ey, ew, eh, 0, 0, Math.PI * 2)
            g.fill()
            g.fillStyle = f.iris ?? '#4a2f1f'
            g.beginPath()
            g.ellipse(x + s * 0.6, ey + 1.5, ew * 0.64, eh * 0.68, 0, 0, Math.PI * 2)
            g.fill()
            g.fillStyle = '#110b08'
            g.beginPath()
            g.ellipse(x + s * 0.6, ey + 1.5, ew * 0.3, eh * 0.34, 0, 0, Math.PI * 2)
            g.fill()
            g.fillStyle = 'rgba(255,255,255,0.95)'
            g.beginPath()
            g.arc(x - 2.5, ey - 3.5, 2.6, 0, Math.PI * 2)
            g.fill()
            g.strokeStyle = 'rgba(35,22,16,0.75)'
            g.lineWidth = f.lashes ? 3.4 : 2.4
            g.beginPath()
            g.ellipse(x, ey, ew + 0.5, eh + 0.5, 0, Math.PI * 1.08, Math.PI * 1.92)
            g.stroke()
            if (f.lashes) {
              g.beginPath()
              g.moveTo(x + s * (ew - 1), ey - eh * 0.45)
              g.lineTo(x + s * (ew + 5), ey - eh * 0.85)
              g.stroke()
            }
          }
        }
        g.strokeStyle = f.brow ?? '#2a1a12'
        g.lineWidth = f.browW ?? 6
        for (const s of [-1, 1]) {
          const xi = cx + s * (gap - ew + 1)
          const xo = cx + s * (gap + ew + 4)
          const yi = ey - eh - 9 + (f.angry ? 6 : 0) + (f.worried ? -5 : 0) + (mode === 'dizzy' ? -4 : 0)
          const yo = ey - eh - 11 + (f.angry ? -2 : 0) + (f.worried ? 4 : 0)
          g.beginPath()
          g.moveTo(xi, yi)
          g.quadraticCurveTo((xi + xo) / 2, Math.min(yi, yo) - 4, xo, yo)
          g.stroke()
        }
        const my = ey + 52
        const mouth = mode === 'dizzy' ? 'wobble' : (f.mouth ?? 'smile')
        if (mouth === 'smile') {
          g.strokeStyle = '#6b2f25'
          g.lineWidth = 4.5
          g.beginPath()
          g.moveTo(cx - 17, my - 2)
          g.quadraticCurveTo(cx, my + 10, cx + 17, my - 2)
          g.stroke()
        } else if (mouth === 'grin') {
          g.fillStyle = '#5a1f1a'
          g.beginPath()
          g.moveTo(cx - 24, my - 5)
          g.quadraticCurveTo(cx, my + 22, cx + 24, my - 5)
          g.closePath()
          g.fill()
          g.fillStyle = '#fbf7ee'
          g.beginPath()
          g.moveTo(cx - 20, my - 3)
          g.quadraticCurveTo(cx, my + 2, cx + 20, my - 3)
          g.lineTo(cx + 19, my + 1)
          g.quadraticCurveTo(cx, my + 6, cx - 19, my + 1)
          g.closePath()
          g.fill()
        } else if (mouth === 'frown') {
          g.strokeStyle = '#5a2a22'
          g.lineWidth = 4.5
          g.beginPath()
          g.moveTo(cx - 15, my + 4)
          g.quadraticCurveTo(cx, my - 6, cx + 15, my + 4)
          g.stroke()
        } else if (mouth === 'wobble') {
          g.strokeStyle = '#5a2a22'
          g.lineWidth = 4
          g.beginPath()
          g.moveTo(cx - 16, my)
          for (let i = 1; i <= 8; i++) g.lineTo(cx - 16 + i * 4, my + (i % 2 ? 4 : -2))
          g.stroke()
        } else {
          g.strokeStyle = '#5a2a22'
          g.lineWidth = 4.2
          g.beginPath()
          g.moveTo(cx - 13, my)
          g.lineTo(cx + 13, my)
          g.stroke()
        }
        if (f.lipstick) {
          g.strokeStyle = 'rgba(170,40,60,0.8)'
          g.lineWidth = 5.5
          g.beginPath()
          g.moveTo(cx - 15, my - 2)
          g.quadraticCurveTo(cx, my + 8, cx + 15, my - 2)
          g.stroke()
        }
        if (f.bandana) {
          g.fillStyle = f.bandana
          g.fillRect(0, ey + 14, W * 0.52, H - (ey + 14))
          g.fillStyle = 'rgba(255,255,255,0.5)'
          for (let i = 0; i < 80; i++) {
            g.beginPath()
            g.arc(Math.random() * W * 0.5, ey + 20 + Math.random() * (H - ey - 20), 1.6 + Math.random() * 1.8, 0, Math.PI * 2)
            g.fill()
          }
          g.strokeStyle = 'rgba(0,0,0,0.3)'
          g.lineWidth = 3
          g.beginPath()
          g.moveTo(0, ey + 15)
          g.lineTo(W * 0.52, ey + 15)
          g.stroke()
        }
      },
      { repeat: false },
    )
  return { open: paint('open'), closed: paint('closed'), dizzy: paint('dizzy') }
}

const textures = lazy(() => ({
  vest: canvasTex(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = '#cde53a'
      g.fillRect(0, 0, w, h)
      speckle(g, w, h, 5000, ['#b9d030', '#dbf05a'], 0.5)
      g.fillStyle = '#c3c8cb'
      g.fillRect(0, h * 0.3, w, h * 0.1)
      g.fillRect(0, h * 0.62, w, h * 0.1)
      g.fillStyle = 'rgba(255,255,255,0.45)'
      g.fillRect(0, h * 0.32, w, h * 0.02)
      g.fillRect(0, h * 0.64, w, h * 0.02)
    },
    { repeat: false },
  ),
  police: canvasTex(
    512,
    128,
    (g, w, h) => {
      g.fillStyle = '#cde53a'
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#10233f'
      g.font = '800 88px "Barlow Condensed", "Arial Narrow", sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText('POLICÍA', w / 2, h / 2 + 4)
    },
    { repeat: false },
  ),
  bag: canvasTex(
    256,
    128,
    (g, w, h) => {
      g.fillStyle = '#a88a58'
      g.fillRect(0, 0, w, h)
      speckle(g, w, h, 3000, ['#8a6f45', '#c2a370'], 0.6)
      g.fillStyle = '#3a2a18'
      g.font = '800 70px "Barlow Condensed", sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText('$', w * 0.25, h * 0.52)
      g.fillText('$', w * 0.75, h * 0.52)
    },
    { repeat: false },
  ),
}))

function ruanaTexture(cols: string[]) {
  return canvasTex(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = cols[0]
      g.fillRect(0, 0, w, h)
      speckle(g, w, h, 4000, ['rgba(0,0,0,0.6)', 'rgba(255,255,255,0.4)'], 0.3)
      for (let x = 0; x < w; x += 32) {
        g.fillStyle = cols[1]
        g.fillRect(x + 4, 0, 5, h)
        g.fillStyle = cols[2]
        g.fillRect(x + 14, 0, 2, h)
      }
      g.fillStyle = cols[3]
      g.fillRect(0, h - 22, w, 10)
    },
    { repeat: false },
  )
}

function makeGun() {
  const g = new THREE.Group()
  const dark = M(0x1d1f23, 0.5)
  const orange = M(0xff7a1a, 0.5)
  mesh(new RoundedBoxGeometry(0.05, 0.085, 0.24, 2, 0.015), dark, g, 0, 0.02, 0.07)
  mesh(new RoundedBoxGeometry(0.045, 0.13, 0.06, 2, 0.012), dark, g, 0, -0.06, -0.01).rotation.x = 0.25
  const tip = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), orange, g, 0, 0.025, 0.205)
  tip.rotation.x = Math.PI / 2
  mesh(new THREE.BoxGeometry(0.052, 0.02, 0.1), orange, g, 0, 0.068, 0.04)
  return g
}

function makeCuffs() {
  const g = new THREE.Group()
  const m = std({ color: 0xcfd3d6, roughness: 0.25, metalness: 0.9 })
  for (const s of [-1, 1]) mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 16), m, g, s * 0.06, 0, 0).rotation.y = Math.PI / 2
  mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 6), m, g, 0, 0, 0).rotation.z = Math.PI / 2
  g.position.set(0, 0.02, -0.24)
  g.name = 'cuffs'
  g.visible = false
  return g
}

function addHair(h: Humanoid, o: Look) {
  const style = o.hair ?? 'short'
  if (style === 'none') return
  const hm = M(o.hairColor ?? 0x2a1c14, 0.92)
  const cap = mesh(new THREE.SphereGeometry(0.184, 22, 12, 0, Math.PI * 2, 0, Math.PI * (style === 'buzz' ? 0.38 : 0.43)), hm, h.head, 0, 0.004, -0.006)
  cap.scale.set(0.97, 1.07, 1.0)
  cap.rotation.x = -0.3
  const back = mesh(new THREE.SphereGeometry(0.182, 22, 10, Math.PI, Math.PI, Math.PI * 0.3, Math.PI * (style === 'long' ? 0.42 : 0.3)), hm, h.head, 0, 0, -0.004)
  back.scale.set(0.97, 1.07, 1.0)
  if (style === 'long') mesh(new THREE.CapsuleGeometry(0.13, 0.2, 4, 12), hm, h.head, 0, -0.17, -0.075).scale.set(1.25, 1, 0.62)
  if (style === 'bun') mesh(new THREE.SphereGeometry(0.075, 12, 10), hm, h.head, 0, 0.1, -0.17)
  if (style === 'quiff') {
    const q = mesh(new THREE.SphereGeometry(0.1, 14, 10), hm, h.head, 0.03, 0.158, 0.07)
    q.scale.set(1.45, 0.55, 1.25)
    q.rotation.z = -0.2
    const grey = M(0x9a9690, 0.9)
    for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.05, 10, 8), grey, h.head, s * 0.166, 0.035, -0.02).scale.set(0.35, 1, 1.1)
  }
}

function addHat(h: Humanoid, o: Look) {
  if (!o.hat) return
  const col = M(o.hatColor ?? 0x222222, 0.85)
  if (o.hat === 'cap') {
    const c = mesh(new THREE.SphereGeometry(0.193, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.46), col, h.head, 0, 0.012, -0.005)
    c.scale.set(0.98, 1.0, 1.04)
    c.rotation.x = -0.12
    const br = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.018, 20), col, h.head, 0, 0.07, 0.17)
    br.scale.set(1, 1, 1.3)
    br.rotation.x = 0.18
  }
  if (o.hat === 'hood') {
    const hm = std({ color: o.hatColor ?? 0x333333, roughness: 0.92, side: THREE.DoubleSide })
    mesh(new THREE.SphereGeometry(0.228, 22, 14, Math.PI * 0.84, Math.PI * 1.32, 0, Math.PI * 0.74), hm, h.head, 0, 0, -0.035).scale.set(1, 1.05, 1.02)
  }
  if (o.hat === 'sombrero') {
    mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.02, 26), col, h.head, 0, 0.12, 0)
    mesh(new THREE.CylinderGeometry(0.135, 0.16, 0.14, 20), col, h.head, 0, 0.2, 0)
    mesh(new THREE.CylinderGeometry(0.162, 0.162, 0.035, 20), M(0x1a1a1a, 0.8), h.head, 0, 0.145, 0)
  }
}

/** Outfit pieces that define a character type. */
const EXTRAS = {
  president(h: Humanoid) {
    const tx = textures()
    mesh(new RoundedBoxGeometry(0.475, 0.44, 0.3, 2, 0.075), std({ map: tx.vest, roughness: 0.75 }), h.spine, 0, 0.33, 0)
    const plate = std({ map: tx.police, roughness: 0.7 })
    mesh(new THREE.PlaneGeometry(0.36, 0.09), plate, h.spine, 0, 0.43, -0.153).rotation.y = Math.PI
    mesh(new THREE.PlaneGeometry(0.15, 0.0375), plate, h.spine, 0.1, 0.47, 0.153)
    const sash = new THREE.Group()
    sash.position.set(0, 0.3, 0)
    sash.rotation.z = 0.72
    h.spine.add(sash)
    const sg = new THREE.BoxGeometry(1, 1, 1)
    for (const [c, x, w] of [[0xfcd116, -0.03, 0.07], [0x003893, 0.02, 0.035], [0xce1126, 0.055, 0.035]]) {
      mesh(sg, M(c, 0.6), sash, x, 0, 0).scale.set(w, 0.8, 0.325)
    }
    mesh(new RoundedBoxGeometry(0.2, 0.06, 0.16, 2, 0.02), M(0xf5f5f2, 0.8), h.spine, 0, 0.58, 0.03)
    mesh(new RoundedBoxGeometry(0.13, 0.036, 0.045, 2, 0.016), M(0x3a2618, 0.9), h.head, 0, -0.058, 0.157).rotation.x = -0.1
    mesh(new RoundedBoxGeometry(0.05, 0.1, 0.04, 2, 0.01), M(0x1a1a1a, 0.5), h.spine, 0.14, 0.5, 0.16)
    const gun = makeGun()
    gun.position.set(0, -0.02, 0.03)
    gun.rotation.x = Math.PI / 2
    h.handR.add(gun)
  },
  bandido(h: Humanoid) {
    mesh(new RoundedBoxGeometry(0.26, 0.12, 0.04, 2, 0.02), M(shade(h.look.top, -0.07)), h.spine, 0, 0.12, 0.13)
    mesh(new THREE.SphereGeometry(0.17, 14, 12), std({ map: textures().bag, roughness: 0.95 }), h.handL, 0, -0.19, 0).scale.set(1, 1.2, 0.9)
    mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.06, 8), M(0x6b4a2a, 0.9), h.handL, 0, -0.02, 0)
    h.hips.add(makeCuffs())
  },
  ruana(h: Humanoid) {
    const g = new THREE.CylinderGeometry(0.2, 0.46, 0.52, 4, 1)
    g.rotateY(Math.PI / 4)
    const m = mesh(g, std({ map: ruanaTexture(h.look.ruana ?? ['#6b4a32', '#d8c7a4', '#3d2a1d', '#a0522d']), roughness: 0.95, flatShading: true }), h.spine, 0, 0.33, 0)
    m.scale.set(1.08, 1, 0.8)
  },
  tie(h: Humanoid) {
    mesh(new RoundedBoxGeometry(0.2, 0.06, 0.16, 2, 0.02), M(0xfafafa, 0.8), h.spine, 0, 0.575, 0.03)
    mesh(new THREE.BoxGeometry(0.055, 0.3, 0.015), M(0x1f4f8a, 0.6), h.spine, 0, 0.4, 0.128)
    mesh(new THREE.BoxGeometry(0.06, 0.05, 0.02), M(0x1f4f8a, 0.6), h.spine, 0, 0.54, 0.126)
  },
  backpack(h: Humanoid) {
    mesh(new RoundedBoxGeometry(0.32, 0.38, 0.15, 2, 0.05), M(0x2d5b8a, 0.8), h.spine, 0, 0.3, -0.2)
    for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.04, 0.42, 0.03), M(0x1c1c1c, 0.8), h.spine, s * 0.12, 0.33, 0.128)
  },
  apron(h: Humanoid) {
    mesh(new THREE.BoxGeometry(0.4, 0.55, 0.02), M(0xf3efe6, 0.9), h.spine, 0, 0.1, 0.133)
  },
  handbag(h: Humanoid) {
    mesh(new RoundedBoxGeometry(0.22, 0.16, 0.08, 2, 0.03), M(0x6b3a2a, 0.6), h.handL, 0, -0.12, 0)
  },
}

/** Joint angles; the rig eases the current pose toward a target pose every frame. */
const REST = {
  hipsY: 0.95, hipsRX: 0, hipsRY: 0, spineRX: 0.03, spineRY: 0, spineRZ: 0, headRX: 0, headRY: 0, headRZ: 0,
  lShX: 0, lShZ: 0.1, rShX: 0, rShZ: -0.1, lElX: -0.15, rElX: -0.15, lThX: 0, lThZ: 0, rThX: 0, rThZ: 0, lKnX: 0.02, rKnX: 0.02,
}
type Joints = typeof REST

/**
 * Procedural cartoon character: a hierarchy of rounded primitives animated by blending joint
 * angles toward per-pose targets (walk/run cycle, jump, dizzy, cuffed, hands up, aiming).
 */
export class Humanoid implements CharacterRig {
  readonly root = new THREE.Group()
  readonly hips = new THREE.Group()
  readonly spine = new THREE.Group()
  readonly head = new THREE.Group()
  readonly handL: THREE.Group
  readonly handR: THREE.Group
  private readonly thL: THREE.Group
  private readonly knL: THREE.Group
  private readonly thR: THREE.Group
  private readonly knR: THREE.Group
  private readonly shL: THREE.Group
  private readonly elL: THREE.Group
  private readonly shR: THREE.Group
  private readonly elR: THREE.Group
  private readonly faces: Record<FaceMode, THREE.Texture>
  private readonly headMat: THREE.MeshStandardMaterial
  private readonly pose: Joints = { ...REST }
  private readonly target: Joints = { ...REST }
  private phase = Math.random() * 6
  private blinkTimer = 1 + Math.random() * 3
  private blinkLeft = 0
  private faceMode: FaceMode = 'open'

  constructor(readonly look: Look) {
    const g = G()
    const o = look
    const inner = new THREE.Group()
    inner.scale.setScalar(o.scale ?? 1)
    this.root.add(inner)
    this.hips.position.y = 0.95
    inner.add(this.hips)

    const skin = M(o.skin, 0.72)
    const top = M(o.top, o.topRough ?? 0.85)
    const pants = M(o.pants, 0.9)
    const shoes = M(o.shoes ?? 0x1b1b1d, 0.55)
    const sleeve = M(o.sleeve ?? o.top, 0.85)
    mesh(g.pelvis, o.skirt ? M(o.skirt, 0.9) : pants, this.hips)
    if (o.skirt) mesh(new THREE.CylinderGeometry(0.2, 0.29, 0.46, 14), M(o.skirt, 0.9), this.hips, 0, -0.2, 0)
    const legMat = o.skirt ? M(o.legs ?? o.skin, 0.8) : pants
    const leg = (side: number) => {
      const th = new THREE.Group()
      th.position.set(side * 0.102, -0.04, 0)
      this.hips.add(th)
      mesh(g.thigh, legMat, th, 0, -0.215, 0)
      const kn = new THREE.Group()
      kn.position.y = -0.43
      th.add(kn)
      mesh(g.shin, legMat, kn, 0, -0.2, 0)
      mesh(g.shoe, shoes, kn, 0, -0.43, 0.045)
      return [th, kn] as const
    }
    ;[this.thL, this.knL] = leg(1)
    ;[this.thR, this.knR] = leg(-1)

    this.spine.position.y = 0.08
    this.hips.add(this.spine)
    mesh(g.torso, top, this.spine, 0, 0.28, 0)
    mesh(g.neck, skin, this.spine, 0, 0.6, 0)
    this.head.position.y = 0.77
    this.spine.add(this.head)
    this.faces = makeFaceSet(o.skin, o.face ?? {})
    this.headMat = std({ map: this.faces.open, roughness: 0.72 })
    mesh(g.head, this.headMat, this.head).scale.set(0.95, 1.06, 0.96)
    if (o.headScale) this.head.scale.setScalar(o.headScale)
    if (!o.face?.bandana) {
      const ns = o.nose ?? 1
      mesh(g.nose, skin, this.head, 0, -0.012, 0.158).scale.set(ns, ns * 0.95, ns * 1.15)
    }
    for (const s of [-1, 1]) mesh(g.ear, skin, this.head, s * 0.162, 0, -0.005).scale.set(0.45, 1, 0.8)

    const arm = (side: number) => {
      const sh = new THREE.Group()
      sh.position.set(side * 0.278, 0.5, 0)
      this.spine.add(sh)
      mesh(g.upper, sleeve, sh, 0, -0.15, 0)
      const el = new THREE.Group()
      el.position.y = -0.3
      sh.add(el)
      mesh(g.fore, o.shortSleeve ? skin : sleeve, el, 0, -0.13, 0)
      const hd = new THREE.Group()
      hd.position.y = -0.3
      el.add(hd)
      mesh(g.hand, skin, hd)
      return [sh, el, hd] as const
    }
    ;[this.shL, this.elL, this.handL] = arm(1)
    ;[this.shR, this.elR, this.handR] = arm(-1)
    addHair(this, o)
    addHat(this, o)
    if (o.extras) EXTRAS[o.extras](this)
  }

  setFace(mode: FaceMode) {
    if (this.faceMode === mode) return
    this.faceMode = mode
    this.headMat.map = this.faces[mode]
  }

  update(dt: number, st: AnimState, time: number) {
    const T = this.target
    Object.assign(T, REST)
    const sp = st.speed
    const moving = sp > 0.2
    const run = clamp((sp - 3.6) / 2.6, 0, 1)
    let s = 0
    let A = 0

    if (st.pose === 'loco' || st.pose === 'air') {
      if (moving) this.phase += dt * sp * lerp(2.3, 1.75, run)
      A = clamp(sp / 3.0, 0, 1) * lerp(0.52, 0.92, run)
      s = Math.sin(this.phase)
      const c = Math.cos(this.phase)
      if (moving) {
        T.lThX = -s * A
        T.rThX = s * A
        T.lKnX = Math.max(0, c) * A * 1.55 + 0.05 + run * 0.2
        T.rKnX = Math.max(0, -c) * A * 1.55 + 0.05 + run * 0.2
        T.lShX = s * A * 0.9
        T.rShX = -s * A * 0.9
        T.lElX = -0.2 - run * 1.15
        T.rElX = -0.2 - run * 1.15
        T.hipsY = 0.95 - run * 0.06 + Math.abs(c) * 0.045 * A - 0.02 * A
        T.hipsRY = s * 0.13 * A
        T.spineRY = -s * 0.2 * A
        T.spineRX = 0.05 + run * 0.26
        T.headRX = -run * 0.14
      } else {
        const b = Math.sin(time * 1.8 + this.phase)
        T.spineRX = 0.03 + b * 0.012
        T.hipsY = 0.95 + b * 0.003
        T.headRY = Math.sin(time * 0.4 + this.phase) * 0.12
      }
      if (st.pose === 'air') {
        Object.assign(T, { lThX: -0.75, rThX: 0.25, lKnX: 1.2, rKnX: 0.55, lShX: -0.6, rShX: -0.4, lShZ: 0.55, rShZ: -0.55, lElX: -0.7, rElX: -0.7, hipsY: 0.95, spineRX: 0.08 })
      }
      if (st.carry) T.lElX = Math.min(T.lElX, -0.35)
    } else if (st.pose === 'stun') {
      Object.assign(T, { hipsY: 0.17, hipsRX: -0.12, lThX: -1.45, rThX: -1.3, lThZ: 0.18, rThZ: -0.18, lKnX: 0.3, rKnX: 0.45, lShX: 0.35, lShZ: 0.55, rShX: 0.35, rShZ: -0.55, lElX: -0.1, rElX: -0.1, spineRX: -0.14 })
      T.headRZ = Math.sin(time * 4.2) * 0.28
      T.headRX = Math.cos(time * 4.2) * 0.18
    } else if (st.pose === 'cuffed') {
      Object.assign(T, { hipsY: 0.56, lThX: 0.05, rThX: 0.05, lKnX: 1.55, rKnX: 1.55, spineRX: 0.18, lShX: 0.55, lShZ: -0.28, rShX: 0.55, rShZ: 0.28, lElX: -0.35, rElX: -0.35, headRX: 0.4 })
    } else if (st.pose === 'handsup') {
      Object.assign(T, { lShX: -2.85, rShX: -2.85, lShZ: 0.3, rShZ: -0.3, lElX: -0.45, rElX: -0.45, spineRX: -0.08, headRX: -0.1 })
      T.hipsY = 0.95 + Math.abs(Math.sin(time * 9)) * 0.02
    }

    if (st.gun) {
      if ((st.reload ?? 0) > 0) {
        Object.assign(T, { rShX: -0.6, rShZ: 0.12, rElX: -1.3, lShX: -0.8, lShZ: -0.5, lElX: -1.35, headRX: 0.3, spineRY: 0 })
      } else if (st.aim) {
        const p = st.pitch ?? 0
        Object.assign(T, { rShX: -Math.PI / 2 - p, rShZ: 0.05, rElX: 0, lShX: -Math.PI / 2 - p + 0.1, lShZ: -0.62, lElX: -0.5, spineRY: 0.12, headRX: -p * 0.75, spineRX: 0.02 - p * 0.2, headRY: 0 })
      } else {
        T.rShX = moving ? -0.25 - 0.25 * run + s * A * 0.2 : -0.32
        T.rShZ = -0.12
        T.rElX = -1.05
      }
    }

    const k = 1 - Math.exp(-dt * (st.aim ? 24 : 13))
    const P = this.pose
    for (const key in T) P[key as keyof Joints] += (T[key as keyof Joints] - P[key as keyof Joints]) * k
    this.hips.position.y = P.hipsY
    this.hips.rotation.set(P.hipsRX, P.hipsRY, 0)
    this.spine.rotation.set(P.spineRX, P.spineRY, P.spineRZ)
    this.head.rotation.set(P.headRX, P.headRY, P.headRZ)
    this.shL.rotation.set(P.lShX, 0, P.lShZ)
    this.shR.rotation.set(P.rShX, 0, P.rShZ)
    this.elL.rotation.x = P.lElX
    this.elR.rotation.x = P.rElX
    this.thL.rotation.set(P.lThX, 0, P.lThZ)
    this.thR.rotation.set(P.rThX, 0, P.rThZ)
    this.knL.rotation.x = P.lKnX
    this.knR.rotation.x = P.rKnX

    const cuffs = this.hips.getObjectByName('cuffs')
    if (cuffs) cuffs.visible = st.pose === 'cuffed'

    if (this.faceMode !== 'dizzy') {
      this.blinkTimer -= dt
      if (this.blinkTimer <= 0) {
        this.blinkLeft = 0.12
        this.blinkTimer = 2 + Math.random() * 4
        this.headMat.map = this.faces.closed
      }
      if (this.blinkLeft > 0) {
        this.blinkLeft -= dt
        if (this.blinkLeft <= 0) this.headMat.map = this.faces[this.faceMode]
      }
    }
  }
}
