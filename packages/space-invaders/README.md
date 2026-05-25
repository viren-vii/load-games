# @load-games/space-invaders

Space Invaders for [load-games](https://github.com/viren-vii/load-games).

<!-- preview-block -->
<p>
  <a href="https://viren-vii.github.io/load-games/?game=space-invaders"><img src="https://raw.githubusercontent.com/viren-vii/load-games/main/packages/space-invaders/preview.svg" alt="space-invaders game preview" width="320" /></a><br/>
  <a href="https://viren-vii.github.io/load-games/?game=space-invaders"><b>▶ Try it live</b></a>
</p>

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
