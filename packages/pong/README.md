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

<GameCanvas engine={PongEngine} width={400} height={240} />
```

## Controls

| Input | Action |
|---|---|
| Mouse / drag (touch) | Move your paddle |
| Arrow Up / Down | Move your paddle |
| Tap | Restart after match end |

You play the left paddle. **First to 5 wins.** Ball speed grows after each paddle hit.

## License

MIT
