import * as THREE from 'three'
import { canvasTex } from '../engine/textures'

/** Maximum street lamps whose glow is computed per pixel (nearest to the camera). */
export const LAMP_MAX = 48

/** Shared uniforms for the lamp-glow shader patch; the lamp system updates them. */
export const lampUniforms = {
  lampPos: { value: Array.from({ length: LAMP_MAX }, () => new THREE.Vector3(0, -999, 0)) },
  lampCount: { value: 0 },
  lampNight: { value: 0 },
}

/**
 * Patches a standard material so that at night, surfaces under street lamps glow warm.
 * Cheaper than dozens of real lights: one loop over lamp positions in the fragment shader.
 */
export function withLampGlow<T extends THREE.MeshStandardMaterial>(m: T) {
  m.envMapIntensity = 0.5
  m.onBeforeCompile = (sh) => {
    sh.uniforms.lampPos = lampUniforms.lampPos
    sh.uniforms.lampCount = lampUniforms.lampCount
    sh.uniforms.lampNight = lampUniforms.lampNight
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLampW;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n{ vec4 lw = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n lw = instanceMatrix * lw;\n#endif\n vLampW = (modelMatrix * lw).xyz; }',
      )
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nvarying vec3 vLampW;\nuniform vec3 lampPos[${LAMP_MAX}];\nuniform int lampCount;\nuniform float lampNight;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
if (lampNight > 0.01) {
  float lg = 0.0;
  for (int i = 0; i < ${LAMP_MAX}; i++) {
    if (i >= lampCount) break;
    vec3 d = vLampW - lampPos[i];
    float below = smoothstep(-0.3, 1.2, -d.y);
    lg += exp(-dot(d.xz, d.xz) * 0.055) * below;
  }
  totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.72, 0.42) * lg * lampNight * 1.3;
}`,
      )
  }
  m.customProgramCacheKey = () => 'lampglow'
  return m
}

export const std = (p: THREE.MeshStandardMaterialParameters) => withLampGlow(new THREE.MeshStandardMaterial(p))

function speckle(g: CanvasRenderingContext2D, w: number, h: number, n: number, colors: string[], a: number) {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = Math.random() * a
    g.fillStyle = colors[i % colors.length]
    const s = Math.random() * 1.8 + 0.6
    g.fillRect(Math.random() * w, Math.random() * h, s, s)
  }
  g.globalAlpha = 1
}

function blobsWrapped(g: CanvasRenderingContext2D, w: number, h: number, n: number, colA: string, colB: string) {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const r = 24 + Math.random() * 80
    const dark = Math.random() < 0.55
    for (const ox of [-w, 0, w]) {
      for (const oy of [-h, 0, h]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r)
        gr.addColorStop(0, dark ? colA : colB)
        gr.addColorStop(1, 'rgba(0,0,0,0)')
        g.fillStyle = gr
        g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2)
      }
    }
  }
}

export type CityMaterials = ReturnType<typeof createCityMaterials>

/** Every material the city uses. Created once textures can be drawn (needs a DOM). */
export function createCityMaterials() {
  const road = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#46494e'
    g.fillRect(0, 0, w, h)
    blobsWrapped(g, w, h, 20, 'rgba(18,20,24,0.28)', 'rgba(130,130,130,0.12)')
    speckle(g, w, h, 16000, ['#5e6166', '#303337', '#74767a', '#3b3e42'], 0.75)
    g.strokeStyle = 'rgba(22,22,26,0.55)'
    g.lineWidth = 1.3
    for (let i = 0; i < 5; i++) {
      let x = 40 + Math.random() * (w - 80)
      let y = 40 + Math.random() * (h - 80)
      g.beginPath()
      g.moveTo(x, y)
      for (let k = 0; k < 7; k++) {
        x += (Math.random() - 0.5) * 36
        y += (Math.random() - 0.5) * 36
        g.lineTo(x, y)
      }
      g.stroke()
    }
  })
  const walk = canvasTex(512, 512, (g, w, h) => {
    const n = 8
    const s = w / n
    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        const v = 176 + Math.random() * 20
        g.fillStyle = `rgb(${v | 0},${(v - 3) | 0},${(v - 9) | 0})`
        g.fillRect(x * s, y * s, s, s)
      }
    }
    speckle(g, w, h, 9000, ['#9d9a93', '#cfccc4', '#8a877f'], 0.5)
    g.strokeStyle = '#8a877f'
    g.lineWidth = 3
    for (let i = 0; i <= n; i++) {
      g.beginPath()
      g.moveTo(i * s, 0)
      g.lineTo(i * s, h)
      g.stroke()
      g.beginPath()
      g.moveTo(0, i * s)
      g.lineTo(w, i * s)
      g.stroke()
    }
  })
  const plaza = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#857d70'
    g.fillRect(0, 0, w, h)
    const rows = 4
    const rh = h / rows
    for (let r = 0; r < rows; r++) {
      let x = -Math.random() * 120
      while (x < w) {
        const sw = 90 + Math.random() * 70
        const v = 160 + Math.random() * 26
        for (const ox of [0, w]) {
          g.fillStyle = `rgb(${v | 0},${(v - 6) | 0},${(v - 16) | 0})`
          g.fillRect(x + 3 - ox, r * rh + 3, sw - 6, rh - 6)
          g.fillRect(x + 3 + ox, r * rh + 3, sw - 6, rh - 6)
        }
        x += sw
      }
    }
    speckle(g, w, h, 12000, ['#6f675b', '#c7beae', '#9a917f'], 0.45)
  })
  const grass = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#557f36'
    g.fillRect(0, 0, w, h)
    blobsWrapped(g, w, h, 16, 'rgba(40,70,25,0.35)', 'rgba(150,180,80,0.18)')
    const cols = ['#6a9444', '#4a7230', '#7aa650', '#3f6629', '#88b25a']
    g.lineWidth = 1.6
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      g.strokeStyle = cols[i % cols.length]
      g.globalAlpha = 0.55
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + (Math.random() - 0.5) * 3, y - 3 - Math.random() * 4)
      g.stroke()
    }
    g.globalAlpha = 1
    for (let i = 0; i < 60; i++) {
      g.fillStyle = Math.random() < 0.5 ? '#f5f0d8' : '#f2cf4a'
      g.fillRect(Math.random() * w, Math.random() * h, 2.5, 2.5)
    }
  })

  return {
    solid: std({ vertexColors: true, flatShading: true, roughness: 0.86, metalness: 0 }),
    far: std({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 }),
    glassLit: std({ color: 0x2e4254, roughness: 0.1, metalness: 0.65, emissive: 0xffc27a, emissiveIntensity: 0 }),
    glassDark: std({ color: 0x26374a, roughness: 0.1, metalness: 0.65 }),
    glow: new THREE.MeshStandardMaterial({ color: 0xfff3d6, emissive: 0xffd9a0, emissiveIntensity: 0.4 }),
    mark: std({ vertexColors: true, roughness: 0.72, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }),
    neon: new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff3aa0, emissiveIntensity: 0.5 }),
    road: std({ map: road, vertexColors: true, roughness: 0.93 }),
    walk: std({ map: walk, vertexColors: true, roughness: 0.9 }),
    plaza: std({ map: plaza, vertexColors: true, roughness: 0.88 }),
    grass: std({ map: grass, vertexColors: true, roughness: 0.97 }),
    water: std({ color: 0x4d8fb5, roughness: 0.04, metalness: 0.15, transparent: true, opacity: 0.92 }),
    carGlass: std({ color: 0x1d2a36, roughness: 0.08, metalness: 0.7 }),
    carLights: new THREE.MeshBasicMaterial({ vertexColors: true }),
    /** Shop signs; the day cycle raises their glow at night. */
    signs: [] as THREE.MeshStandardMaterial[],
  }
}
