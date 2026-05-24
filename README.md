# load-games

Tiny canvas games designed to fill loading states, empty states, and idle screens. Framework-agnostic core + optional React wrapper. Each game is its own package — install only what you ship.

> Status: pre-release. First publish targets `0.1.0`.

## Packages

| Package | Purpose | Size goal (gzip) |
|---|---|---|
| [`@load-games/core`](packages/core) | `BaseEngine`, `GameLoop`, `InputManager`, shared types | < 3 KB |
| [`@load-games/react`](packages/react) | `<GameCanvas/>` wrapper | < 1 KB + peer deps |
| [`@load-games/snake`](packages/snake) | Classic snake | < 2 KB |
| [`@load-games/flappy`](packages/flappy) | Flappy clone | < 2 KB |
| [`@load-games/breakout`](packages/breakout) | Breakout / Arkanoid | < 2 KB |
| [`@load-games/pong`](packages/pong) | 1-player vs CPU pong | < 2 KB |
| [`@load-games/runner`](packages/runner) | Endless dino-runner | < 2 KB |
| [`@load-games/space-invaders`](packages/space-invaders) | Space Invaders | < 2 KB |

Each game depends only on `@load-games/core`. No cross-game imports.

## Usage (npm)

```bash
pnpm add @load-games/react @load-games/core @load-games/snake
```

```tsx
import { GameCanvas } from '@load-games/react'
import { SnakeEngine } from '@load-games/snake'

export function Loader() {
  return (
    <GameCanvas
      createEngine={(canvas, cfg) => new SnakeEngine(canvas, cfg)}
      width={320}
      height={320}
      speed={5}
      onScore={(n) => console.log('score', n)}
    />
  )
}
```

Vanilla (no React):

```ts
import { SnakeEngine } from '@load-games/snake'
const canvas = document.querySelector('canvas')!
const engine = new SnakeEngine(canvas, { width: 320, height: 320 })
engine.start()
```

## Structure plan

Two distribution paths supported, **npm is the source of truth**:

### npm (primary)

- Each package published independently under the `@load-games` scope.
- Versioned together via Changesets (`"fixed": [["@load-games/*"]]`) — one minor bump bumps everything. Keeps cross-package compat trivial.
- Targets: ESM + CJS + `.d.ts` via `tsup`. `sideEffects: false` for tree-shaking.
- Peer deps: `@load-games/react` peers on `react@>=18`. Core/game packages have no runtime deps beyond `@load-games/core` itself.

### CDN (secondary, future)

Once npm is stable, ship UMD bundles via jsDelivr/unpkg automatically:

```
https://cdn.jsdelivr.net/npm/@load-games/snake@latest/dist/loadgames-snake.umd.js
```

Plan:

1. Add a second tsup entry per game producing `dist/loadgames-<name>.umd.js` with `globalName: 'LoadGamesSnake'` etc.
2. Mark `@load-games/core` external in UMD build, ship one `loadgames-core.umd.js` separately. End users include both:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@load-games/core/dist/loadgames-core.umd.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/@load-games/snake/dist/loadgames-snake.umd.js"></script>
   <script>const e = new LoadGamesSnake.SnakeEngine(canvas, {}); e.start()</script>
   ```
3. Optional mega-bundle `@load-games/all` package — re-exports every engine. One `<script>`, ~15 KB gzip. Tradeoff: forfeits tree-shaking; only suitable for "load screen with random game" use case.

CDN bundles get added in a follow-up PR after npm publish stabilises. Engine API is the same regardless of distribution.

## Development

```bash
pnpm install
pnpm build        # build all packages (turbo)
pnpm typecheck
pnpm test
pnpm --filter @load-games/demo dev   # local playground at http://localhost:5173
```

### Adding a game

1. `cp -r packages/snake packages/<name>` then edit `package.json` name + description.
2. Extend `BaseEngine`. Implement `gameName`, `controlHints`, `update(dt)`, `render()`.
3. Wire input via `InputManager`. Call `beginGame()` on first input, `restartGame()` on retry.
4. Add a tab to `apps/demo/src/App.tsx`.
5. Add a changeset: `pnpm changeset`.

### Releasing

1. `pnpm changeset` — describe changes, pick bump level.
2. Merge PR. Release workflow opens a "Version packages" PR.
3. Merge that. Workflow publishes to npm.

## Required GitHub secrets

| Secret | For | How to get |
|---|---|---|
| `NPM_TOKEN` | release.yml publish step | npmjs.com → Access Tokens → Automation token, granted to `@load-games` org |

GitHub Pages must be enabled in repo Settings → Pages → Source: GitHub Actions.

## Status by package

All packages build. Snake has 2 unit tests; others rely on demo for behavioural verification. Coverage target: 60%+ before 1.0.

## License

MIT (license file pending).
