# @load-games/flappy

Flappy-style tap-to-flap for [load-games](https://github.com/viren-vii/load-games).

## Install

```bash
pnpm add @load-games/flappy @load-games/core
```

## Usage

```tsx
import { GameCanvas } from '@load-games/react'
import { FlappyEngine } from '@load-games/flappy'

<GameCanvas createEngine={(c, cfg) => new FlappyEngine(c, cfg)} width={320} height={320} />
```

## Controls

| Input | Action |
|---|---|
| Space / Up / Tap / Click | Flap |

Touch ground or ceiling, or collide with a pipe = game over.

## License

MIT
