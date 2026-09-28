/**
 * Synthesized sound effects (no audio files), ported from the legacy build. Positional sounds
 * fade with distance from the listener, which the audio listener system keeps on the player.
 */
import { clamp } from '../core/math'

type Point = { x: number; z: number }
type NoiseOpts = { freq?: number; q?: number; type?: BiquadFilterType; gain?: number; when?: number }
type ToneOpts = { type?: OscillatorType; gain?: number; when?: number }

export type Audio = ReturnType<typeof createAudio>

export function createAudio() {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let noiseBuf: AudioBuffer | null = null
  let muted = false
  const listener = { x: 0, z: 0 }

  /** Must be called from a user gesture (browsers block audio until then). */
  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume()
      return
    }
    if (typeof AudioContext === 'undefined') return
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.55
    master.connect(ctx.destination)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    // Low city rumble.
    const s = ctx.createBufferSource()
    s.buffer = noiseBuf
    s.loop = true
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 360
    const g = ctx.createGain()
    g.gain.value = 0.045
    s.connect(f).connect(g).connect(master)
    s.start()
  }

  const vol = (p?: Point) => (p ? Math.pow(clamp(1 - Math.hypot(p.x - listener.x, p.z - listener.z) / 45, 0, 1), 1.5) : 1)

  function noise(dur: number, { freq = 1000, q = 1, type = 'bandpass', gain = 0.4, when = 0 }: NoiseOpts = {}) {
    if (!ctx || !master || !noiseBuf || gain < 0.002) return
    const t = ctx.currentTime + when
    const s = ctx.createBufferSource()
    s.buffer = noiseBuf
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + 0.003)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(f).connect(g).connect(master)
    s.start(t, Math.random() * 0.5)
    s.stop(t + dur + 0.05)
  }

  function tone(f0: number, f1: number, dur: number, { type = 'sine', gain = 0.3, when = 0 }: ToneOpts = {}) {
    if (!ctx || !master || gain < 0.002) return
    const t = ctx.currentTime + when
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(master)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  return {
    init,
    listener,
    get muted() {
      return muted
    },
    setMuted(m: boolean) {
      muted = m
      if (master) master.gain.value = m ? 0 : 0.55
    },
    shot() {
      noise(0.12, { freq: 1400, q: 0.7, gain: 0.5 })
      tone(190, 55, 0.14, { gain: 0.55 })
      noise(0.05, { freq: 4200, q: 1.5, gain: 0.22 })
    },
    dry: () => noise(0.03, { freq: 3500, q: 3, gain: 0.3, type: 'highpass' }),
    reload() {
      noise(0.04, { freq: 2600, q: 3, gain: 0.35, when: 0.05 })
      noise(0.05, { freq: 1800, q: 3, gain: 0.35, when: 0.55 })
      noise(0.05, { freq: 3000, q: 3, gain: 0.4, when: 1.05 })
    },
    bonk: (p: Point) => tone(520, 170, 0.15, { type: 'triangle', gain: 0.4 * vol(p) }),
    boing(p: Point) {
      const v = vol(p)
      tone(170, 720, 0.28, { gain: 0.32 * v })
      tone(700, 260, 0.2, { type: 'triangle', gain: 0.12 * v, when: 0.2 })
    },
    tick: (p: Point) => noise(0.04, { freq: 2400, q: 2, gain: 0.18 * vol(p) }),
    clank(p: Point) {
      const v = vol(p)
      tone(900, 600, 0.12, { type: 'square', gain: 0.05 * v })
      noise(0.06, { freq: 3000, q: 4, gain: 0.2 * v })
    },
    alert: (p: Point) => tone(660, 880, 0.12, { type: 'square', gain: 0.05 * vol(p) }),
    siren() {
      for (let i = 0; i < 3; i++) {
        tone(700, 700, 0.2, { type: 'sawtooth', gain: 0.06, when: i * 0.4 })
        tone(950, 950, 0.2, { type: 'sawtooth', gain: 0.06, when: i * 0.4 + 0.2 })
      }
      tone(523, 523, 0.15, { type: 'triangle', gain: 0.25, when: 1.25 })
      tone(784, 784, 0.3, { type: 'triangle', gain: 0.25, when: 1.4 })
    },
    honk(p: Point) {
      const v = vol(p)
      tone(392, 392, 0.32, { type: 'square', gain: 0.07 * v })
      tone(494, 494, 0.32, { type: 'square', gain: 0.05 * v })
    },
    flap(p: Point) {
      const v = vol(p)
      for (let i = 0; i < 6; i++) noise(0.06, { freq: 900, q: 0.8, gain: 0.1 * v, when: i * 0.07 })
    },
    jump: () => noise(0.08, { freq: 600, q: 0.8, gain: 0.1 }),
    land: () => noise(0.1, { freq: 300, q: 0.7, gain: 0.18 }),
    step: () => noise(0.05, { freq: 500 + Math.random() * 200, q: 1, gain: 0.045 }),
  }
}
