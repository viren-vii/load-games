# @load-games/space-invaders

Space Invaders for [load-games](https://github.com/viren-vii/load-games).

## Install

```bash
pnpm add @load-games/space-invaders @load-games/core
```

## Usage

```tsx
import { GameCanvas } from '@load-games/react'
import { SpaceInvadersEngine } from '@load-games/space-invaders'

<GameCanvas engine={SpaceInvadersEngine} width={320} height={320} />
```

## Controls

| Input | Action |
|---|---|
| Arrow Left / Right | Move ship |
| Drag (mouse / touch) | Move ship directly |
| Space / Tap | Shoot |

Clear a wave to advance. Invaders reach you OR a bullet hits ship = game over.

## License

MIT
