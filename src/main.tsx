import { WorldProvider } from 'koota/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { preloadCharacterModels } from './characters/models'
import { createGameWorld } from './ecs/world'
import { createAudio } from './engine/audio'
import type { GameContext } from './engine/context'
import { createEffects } from './engine/effects'
import { attachInput } from './engine/input'
import { startLoop } from './engine/loop'
import { createPhysics } from './engine/physics'
import { createRenderer } from './engine/renderer'
import { createGameFlow } from './game/flow'
import { pipeline } from './game/pipeline'
import { setupGame } from './game/setup'
import { App } from './ui/App'
import './ui/styles.css'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function boot() {
  const canvas = document.getElementById('game') as HTMLCanvasElement
  const world = createGameWorld()

  const render = createRenderer(canvas)
  const ctx: GameContext = {
    physics: await createPhysics(),
    render,
    audio: createAudio(),
    effects: createEffects(render.scene),
  }

  // Shop signs and faces are drawn with the Barlow fonts: give them a moment to load.
  await Promise.race([document.fonts.ready, sleep(2500)])
  await preloadCharacterModels()
  setupGame(world, ctx, { level: location.hash === '#proving-ground' ? 'proving-ground' : 'city' })

  const flow = createGameFlow(world, canvas, ctx.audio, render)
  attachInput(world, canvas, { onPauseRequest: flow.pause })
  startLoop(world, ctx, pipeline)
  // Dev only (stripped from production builds): inspect the game from the browser console.
  if (import.meta.env.DEV) Object.assign(window, { __game: { world, ctx, flow } })

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
