import { WorldProvider } from 'koota/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { mulberry32, range } from './core/math'
import { world } from './ecs/world'
import { spawnCivilian } from './entities/civilian'
import { buildLevel, isClear } from './entities/level'
import { spawnPlayer } from './entities/player'
import type { GameContext } from './engine/context'
import { attachInput } from './engine/input'
import { registerLifecycle } from './engine/lifecycle'
import { startLoop } from './engine/loop'
import { createPhysics } from './engine/physics'
import { createRenderer } from './engine/renderer'
import { CIVILIAN, PLAYER, WORLD_HALF } from './game/config'
import { createGameFlow } from './game/flow'
import { pipeline } from './game/pipeline'
import { App } from './ui/App'
import './ui/styles.css'

async function boot() {
  const canvas = document.getElementById('game') as HTMLCanvasElement

  const ctx: GameContext = {
    physics: await createPhysics(),
    render: createRenderer(canvas),
  }
  registerLifecycle(world, ctx)

  const rng = mulberry32(1538)
  const { blockers } = buildLevel(world, ctx, rng)
  spawnPlayer(world, ctx)

  const area = WORLD_HALF - 10
  let spawned = 0
  for (let tries = 0; spawned < CIVILIAN.count && tries < CIVILIAN.count * 20; tries++) {
    const x = range(rng, -area, area)
    const z = range(rng, -area, area)
    const nearPlayer = Math.hypot(x - PLAYER.spawn.x, z - PLAYER.spawn.z) < 3
    if (nearPlayer || !isClear(blockers, x, z, 1)) continue
    spawnCivilian(world, ctx, x, z, rng)
    spawned++
  }

  const flow = createGameFlow(world, canvas)
  attachInput(world, canvas, { onPauseRequest: flow.pause })
  startLoop(world, ctx, pipeline)

  createRoot(document.getElementById('ui')!).render(
    <StrictMode>
      <WorldProvider world={world}>
        <App flow={flow} />
      </WorldProvider>
    </StrictMode>,
  )
}

boot().catch((err) => {
  console.error(err)
  const el = document.createElement('div')
  el.className = 'boot-error'
  el.textContent = `No se pudo iniciar el juego: ${err instanceof Error ? err.message : err}`
  document.body.append(el)
})
