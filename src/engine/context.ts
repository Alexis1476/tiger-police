import type { World } from 'koota'
import type { Audio } from './audio'
import type { Effects } from './effects'
import type { Physics } from './physics'
import type { Render } from './renderer'

/** Engine services every system can reach. Game data lives in the ECS world, not here. */
export type GameContext = {
  physics: Physics
  render: Render
  audio: Audio
  effects: Effects
}

/** A system is a plain function run once per fixed step or once per frame. */
export type System = (world: World, ctx: GameContext) => void
