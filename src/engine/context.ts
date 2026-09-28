import type { World } from 'koota'
import type { Physics } from './physics'
import type { Render } from './renderer'

/** Engine services every system can reach. Game data lives in the ECS world, not here. */
export type GameContext = {
  physics: Physics
  render: Render
}

/** A system is a plain function run once per fixed step or once per frame. */
export type System = (world: World, ctx: GameContext) => void
