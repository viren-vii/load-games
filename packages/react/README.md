# @load-games/react

React components for [load-games](https://github.com/viren-vii/load-games) engines. Exports `<GameCanvas/>` (raw) and `<LoadingGame/>` (bundled UX with optional Skip button).

## Install

```bash
pnpm add @load-games/react @load-games/core @load-games/snake
```

`react` and `react-dom` `>=18` are peer dependencies. React 19 also supported.

## Quick start (bundled UX)

```tsx
import { LoadingGame } from '@load-games/react'
import { SnakeEngine } from '@load-games/snake'

export function Loader({ done }: { done: boolean }) {
  return (
    <LoadingGame
      engine={SnakeEngine}
      width={320}
      height={320}
      ready={done}
      onDismiss={(score, reason) => console.log('exit', score, reason)}
    />
  )
}
```

Renders the canvas with an external "Skip" button below. Player can:
- Play through to game-over and tap "continue" (when `ready={true}`)
- Tap the in-canvas "● READY" badge in the top-right (when `ready={true}` and mid-play)
- Press `Esc` (when `ready={true}`)
- Click the external "Skip" button (always)
- Hit any of these → `onDismiss(score, reason)` fires once

### `LoadingGame` props (in addition to all `GameCanvas` props)

| Prop | Default | Effect |
|---|---|---|
| `skipButton` | `true` | Show the external skip button |
| `skipLabel` | `"Skip"` | Button text |
| `skipPosition` | `'bottom'` | `'top'`, `'bottom'`, or `'right'` |
| `skipButtonStyle` | `{}` | Inline style override for the button |
| `wrapperStyle` | `{}` | Inline style override for the wrapping flex div |

## Raw canvas (compose your own UI)

```tsx
import { GameCanvas } from '@load-games/react'
import { SnakeEngine } from '@load-games/snake'

export function Loader() {
  return (
    <GameCanvas
      engine={SnakeEngine}
      width={320}
      height={320}
      speed={5}
      theme={{ bg: '#0a0a0a', primary: '#fff', accent: '#22c55e', text: '#fff' }}
      onScore={(n) => console.log('score', n)}
      onGameOver={(n) => console.log('over', n)}
    />
  )
}
```

Pass the engine **class** (not an instance) via the `engine` prop. The component instantiates it on mount and calls `destroy()` on unmount.

## Imperative control + ready/dismiss

```tsx
import { useRef, useState } from 'react'
import { GameCanvas, type GameHandle } from '@load-games/react'
import { SnakeEngine } from '@load-games/snake'

function Loader({ contentReady }: { contentReady: boolean }) {
  const ref = useRef<GameHandle>(null)
  const [done, setDone] = useState(false)
  if (done) return <YourContent />
  return (
    <GameCanvas
      ref={ref}
      engine={SnakeEngine}
      ready={contentReady}                  // declarative: shows READY badge, swaps gameover prompt
      onDismiss={() => setDone(true)}
    />
  )
}
```

`GameHandle`: `pause()`, `resume()`, `signalReady()`, `dismiss()`, `getScore()`, `getState()`, `isReady()`.

## Behavior contract

- **Engine config is captured on mount.** Changing `width` / `height` / `speed` / `theme` props after mount does **not** reinitialise the running game (would interrupt play). To apply new config, force a remount via React `key`.
- **Inline callback props are safe.** The component captures the latest callbacks via ref — passing `onScore={n => setScore(n)}` does not recreate the engine each render.
- **Only `engine` prop change remounts.** Swap from `engine={SnakeEngine}` to `engine={FlappyEngine}` and the component reinitialises.

## Mobile

The canvas comes with `touch-action: none`, `user-select: none`, `-webkit-tap-highlight-color: transparent`, `-webkit-touch-callout: none`, `outline: none`, and `max-width: 100%`. Swipes never scroll the page, no iOS context menu on long-press, no blue tap-highlight flash, and the canvas shrinks on narrow viewports.

## SSR (Next.js / Remix)

`<GameCanvas/>` is client-only (`'use client'`). In Next.js App Router import it directly from a client component. If you import from a server component, mark the importer with `'use client'` or use a dynamic import:

```tsx
import dynamic from 'next/dynamic'
const Loader = dynamic(() => import('./Loader'), { ssr: false })
```

## License

MIT
