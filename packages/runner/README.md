# @load-games/runner

Endless dino-style runner for [load-games](https://github.com/viren-vii/load-games).

## Install

```bash
pnpm add @load-games/runner @load-games/core
```

## Usage

```tsx
import { GameCanvas } from '@load-games/react'
import { RunnerEngine } from '@load-games/runner'

<GameCanvas engine={RunnerEngine} width={400} height={200} />
```

## Controls

| Input | Action |
|---|---|
| Space / Up / Tap / Click | Jump |

Speed and obstacle frequency increase over time. Score = meters run.

## License

MIT
