# @load-games/snake

Classic snake for [load-games](https://github.com/viren-vii/load-games).

<!-- preview-block -->
<p>
  <a href="https://viren-vii.github.io/load-games/?game=snake"><img src="https://raw.githubusercontent.com/viren-vii/load-games/main/packages/snake/preview.svg" alt="snake game preview" width="320" /></a><br/>
  <a href="https://viren-vii.github.io/load-games/?game=snake"><b>▶ Try it live</b></a>
</p>

## Install

```bash
pnpm add @load-games/snake @load-games/core
# optional: pnpm add @load-games/react
```

## Usage (React)

```tsx
import { GameCanvas } from '@load-games/react'
import { SnakeEngine } from '@load-games/snake'

<GameCanvas
  engine={SnakeEngine}
  width={320} height={320} speed={5}
  onScore={n => console.log(n)}
/>
```

## Usage (vanilla)

```ts
import { SnakeEngine } from '@load-games/snake'

const canvas = document.querySelector('canvas')!
const engine = new SnakeEngine(canvas, { width: 320, height: 320, speed: 5 })
engine.start()
// later: engine.destroy()
```

## Controls

| Input | Action |
|---|---|
| Arrow keys / WASD | Change direction |
| Touch swipe | Change direction (mobile) |
| Tap / click | Start or restart |

## Config

Accepts `GameConfig` from `@load-games/core`. `speed` is 1–10. Wraps at canvas edges. Self-collision = game over.

## License

MIT
