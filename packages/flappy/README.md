# @load-games/flappy

Flappy-style tap-to-flap for [load-games](https://github.com/viren-vii/load-games).

<!-- preview-block -->
<p>
  <a href="https://viren-vii.github.io/load-games/?game=flappy"><img src="https://raw.githubusercontent.com/viren-vii/load-games/main/packages/flappy/preview.svg" alt="flappy game preview" width="320" /></a><br/>
  <a href="https://viren-vii.github.io/load-games/?game=flappy"><b>▶ Try it live</b></a>
</p>

## Install

```bash
pnpm add @load-games/flappy @load-games/core
```

## Usage

```tsx
import { GameCanvas } from '@load-games/react'
import { FlappyEngine } from '@load-games/flappy'

<GameCanvas engine={FlappyEngine} width={320} height={320} />
```

## Controls

| Input | Action |
|---|---|
| Space / Up / Tap / Click | Flap |

Touch ground or ceiling, or collide with a pipe = game over.

## License

MIT
