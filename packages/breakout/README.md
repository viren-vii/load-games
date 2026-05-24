# @load-games/breakout

Breakout / Arkanoid for [load-games](https://github.com/viren-vii/load-games).

## Install

```bash
pnpm add @load-games/breakout @load-games/core
```

## Usage

```tsx
import { GameCanvas } from '@load-games/react'
import { BreakoutEngine } from '@load-games/breakout'

<GameCanvas engine={BreakoutEngine} width={320} height={320} />
```

## Controls

| Input | Action |
|---|---|
| Mouse / pointer | Move paddle |
| Arrow Left / Right | Move paddle |
| Tap | Start / restart |

3 lives. Clear all bricks to advance level (speed +).

## License

MIT
