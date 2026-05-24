# @load-games/pong

Single-player pong vs CPU for [load-games](https://github.com/viren-vii/load-games).

## Install

```bash
pnpm add @load-games/pong @load-games/core
```

## Usage

```tsx
import { GameCanvas } from '@load-games/react'
import { PongEngine } from '@load-games/pong'

<GameCanvas createEngine={(c, cfg) => new PongEngine(c, cfg)} width={400} height={240} />
```

## Controls

| Input | Action |
|---|---|
| Mouse / pointer Y | Move your paddle |
| Arrow Up / Down | Move your paddle |

You play the left paddle. No win condition — endless rally with growing ball speed.

## License

MIT
