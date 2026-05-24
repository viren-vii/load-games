# @load-games/core

Shared primitives for [load-games](https://github.com/viren-vii/load-games) — tiny canvas games that fill loading screens.

You don't usually install this directly. Game packages (`@load-games/snake`, `@load-games/flappy`, etc.) depend on it as a peer.

## Install

```bash
pnpm add @load-games/core
```

## API

### `BaseEngine`

Abstract base class. Extend it to build a game.

```ts
import { BaseEngine, InputManager } from '@load-games/core'

class MyGame extends BaseEngine {
  protected readonly gameName = 'My Game'
  protected readonly controlHints = ['Space — jump']

  protected update(dt: number) { /* dt in ms */ }
  protected render() { /* draw to this.ctx */ }
}
```

Lifecycle: `start()` → idle screen → first input calls `beginGame()` → `running` → `update`/`render` per frame → `pause()` / `resume()` / `destroy()`.

Auto-pauses on `visibilitychange` (tab hidden) and `IntersectionObserver` (canvas off-screen).

### `GameLoop`

`requestAnimationFrame`-driven loop. Caps `dt` at 100ms to survive tab resume.

```ts
const loop = new GameLoop(dt => doStuff(dt))
loop.start(); loop.stop()
```

### `InputManager`

Unified keyboard / mouse / touch input. Maps arrows + WASD to direction events, Space/Enter/click/tap to `'tap'`. Detects swipes.

```ts
const input = new InputManager(canvas)
input.on('tap', () => jump())
input.on('arrowLeft', () => moveLeft())
if (input.isDown('arrowRight')) moveRight()
input.shouldPreventScroll = true  // suppress page scroll while game runs
```

### Types

`GameConfig`, `GameTheme`, `GameState`, `Point`, `Rect`, `InputEvent` — plus `DEFAULT_THEME`, `DEFAULT_CONFIG`.

## License

MIT
