import * as THREE from 'three'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import type { AnimState, CharacterRig, Pose } from './rig'

/** Which animation clip in the file plays for each state (clip names as authored). */
export type ClipMap = {
  idle: string
  walk: string
  run?: string
  jump?: string
  stun?: string
  cuffed?: string
  handsup?: string
}

export type ModelSpec = {
  /** Path under public/, e.g. "models/civilian.glb". */
  url: string
  clips: ClipMap
  /** Uniform scale so the model is ~1.9 m tall. */
  scale?: number
  /** Bone names (defaults match Mixamo-style rigs). */
  headBone?: string
  hipsBone?: string
  /** Speeds (m/s) at which the walk/run clips look right at 1× playback. */
  walkSpeed?: number
  runSpeed?: number
}

/** Anything with a scene and clips — a loaded GLTF, or a synthetic one in tests. */
export type ModelSource = { scene: THREE.Object3D; animations: THREE.AnimationClip[] }

const FADE = 0.2
/** Above this speed the run clip replaces the walk clip (matches the Humanoid's run blend). */
const RUN_FROM = 3.6

/**
 * Plays a skinned GLTF model's clips from the same AnimState the procedural Humanoid uses.
 * Each instance clones the skeleton, so many characters can share one loaded file.
 */
export class GltfRig implements CharacterRig {
  readonly root = new THREE.Group()
  readonly head: THREE.Object3D
  readonly hips: THREE.Object3D
  private readonly mixer: THREE.AnimationMixer
  private readonly actions = new Map<keyof ClipMap, THREE.AnimationAction>()
  private current: keyof ClipMap | null = null

  constructor(source: ModelSource, private readonly spec: ModelSpec) {
    const model = SkeletonUtils.clone(source.scene)
    model.scale.setScalar(spec.scale ?? 1)
    model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true
    })
    this.root.add(model)
    this.head = model.getObjectByName(spec.headBone ?? 'Head') ?? model
    this.hips = model.getObjectByName(spec.hipsBone ?? 'Hips') ?? model
    this.mixer = new THREE.AnimationMixer(model)
    for (const [key, name] of Object.entries(spec.clips) as [keyof ClipMap, string][]) {
      const clip = THREE.AnimationClip.findByName(source.animations, name)
      if (clip) this.actions.set(key, this.mixer.clipAction(clip))
      else console.warn(`GltfRig: clip "${name}" not found in ${spec.url}`)
    }
  }

  /** The clip currently playing (for debugging and tests). */
  get playing() {
    return this.current
  }

  update(dt: number, st: AnimState) {
    const poseClip: Partial<Record<Pose, keyof ClipMap>> = { air: 'jump', stun: 'stun', cuffed: 'cuffed', handsup: 'handsup' }
    const special = poseClip[st.pose]
    if (special && this.actions.has(special)) this.play(special, 1)
    else if (st.speed < 0.2) this.play('idle', 1)
    else if (st.speed >= RUN_FROM && this.actions.has('run')) this.play('run', st.speed / (this.spec.runSpeed ?? 5.5))
    else this.play('walk', st.speed / (this.spec.walkSpeed ?? 1.5))
    this.mixer.update(dt)
  }

  /** GLTF faces are part of the model; expressions would be morph targets (not wired yet). */
  setFace() {}

  private play(key: keyof ClipMap, timeScale: number) {
    const action = this.actions.get(key) ?? this.actions.get('idle')
    if (!action) return
    action.timeScale = timeScale
    if (key === this.current) return
    const previous = this.current ? this.actions.get(this.current) : undefined
    action.reset().setEffectiveWeight(1).fadeIn(FADE).play()
    previous?.fadeOut(FADE)
    this.current = key
  }
}
