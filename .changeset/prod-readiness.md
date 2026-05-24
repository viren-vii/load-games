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

Production-readiness pass: API simplification, performance fixes, consumer DX.

**Breaking — new GameCanvas API.** Replaces `createEngine` callback with an `engine` class prop:

```diff
- <GameCanvas createEngine={(c, cfg) => new SnakeEngine(c, cfg)} ... />
+ <GameCanvas engine={SnakeEngine} ... />
```

This eliminates a sharp footgun: an inline arrow `createEngine={(c,cfg) => new Snake(c,cfg)}` reinitialised the engine on every parent render. The new API takes the class itself (stable reference), and the component captures latest config via ref so inline callback props (`onScore`, `onDismiss`) no longer cause reinit either. Exports new `EngineClass` type.

**Performance:**

- `RunnerEngine`: `onScore` was fired every frame (~60×/sec). Now de-duplicated against last emitted value — fires only when score actually changes.
- `SpaceInvadersEngine`: `.filter(i => i.alive)` ran every frame, allocating a new array at 60Hz. Replaced with a single-pass scan that computes alive count, edge violation, and ship-reach proximity in one loop. Reservoir sampling for enemy-shoot (no temp array).
- `BaseEngine.renderReadyBadge`: caches `measureText` result (label is a constant string with a constant font).

**Consumer expectations now met:**

- Mount-once: engine is stable across renders; only `engine` class identity change triggers reinit.
- Strict-mode safe: cleanup destroys engine fully.
- Inline callbacks safe: captured via ref, no reinit.
- SSR safe: documented dynamic-import pattern for Next.js; engine classes are SSR-import-safe.
- Performance contract documented in README ("Performance" section).
- Behavior contract documented (config-locked-on-mount, key-to-remount).
