import * as THREE from 'three'

const materials = new Map<number, THREE.MeshStandardMaterial>()
const geometries = new Map<string, THREE.BufferGeometry>()

/** Shared material per colour, so a hundred civilians don't mean a hundred materials. */
export function material(color: number, roughness = 0.85) {
  let m = materials.get(color)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness })
    materials.set(color, m)
  }
  return m
}

/** Shared geometry by key. */
export function geometry<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geometries.get(key)
  if (!g) {
    g = make()
    geometries.set(key, g)
  }
  return g as T
}

export function shadowMesh(geo: THREE.BufferGeometry, mat: THREE.Material) {
  const m = new THREE.Mesh(geo, mat)
  m.castShadow = true
  m.receiveShadow = true
  return m
}
