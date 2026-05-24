# @load-games/react

React `<GameCanvas/>` wrapper for [load-games](https://github.com/viren-vii/load-games) engines.

## Install

```bash
pnpm add @load-games/react @load-games/core @load-games/snake
```

`react` and `react-dom` `>=18` are peer dependencies.

## Usage

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
      theme={{ bg: '#0a0a0a', primary: '#fff', accent: '#22c55e', text: '#fff' }}
      onScore={(n) => console.log('score', n)}
      onGameOver={(n) => console.log('over', n)}
    />
  )
}
```

`createEngine` is the only required prop. Everything else is passed through as `GameConfig`. The engine is created on mount and destroyed on unmount.

The engine owns its state after mount — changing config props does NOT reinitialise the engine. Force a remount with `key` if you need to.

## License

MIT
