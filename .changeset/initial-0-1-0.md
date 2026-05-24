---
"@load-games/core": minor
"@load-games/react": minor
"@load-games/snake": minor
"@load-games/flappy": minor
"@load-games/breakout": minor
"@load-games/pong": minor
"@load-games/runner": minor
"@load-games/space-invaders": minor
---

Initial 0.1.0 release.

- `@load-games/core` — `BaseEngine`, `GameLoop`, `InputManager`, `GameConfig`, `GameTheme`.
- `@load-games/react` — `<GameCanvas/>` wrapper with idle/running/paused/gameover state.
- Six game engines (snake, flappy, breakout, pong, runner, space-invaders), each consuming `@load-games/core` and driven by `GameCanvas`.

Engines respect `width`/`height`/`speed`/`theme` and emit `onScore` / `onGameOver` callbacks. All games handle keyboard, mouse, and touch input.
