# @load-games/runner

Endless dino-style runner for [load-games](https://github.com/viren-vii/load-games).

<!-- preview-block -->
<p>
  <a href="https://viren-vii.github.io/load-games/?game=runner"><img src="https://raw.githubusercontent.com/viren-vii/load-games/main/packages/runner/preview.svg" alt="runner game preview" width="320" /></a><br/>
  <a href="https://viren-vii.github.io/load-games/?game=runner"><b>▶ Try it live</b></a>
</p>

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
