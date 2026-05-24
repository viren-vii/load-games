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

Add graceful loading-handoff API.

When you're using a game as a loading state and the underlying work finishes, you no longer have to abruptly rip the game away. Set `ready={true}` (or call `engine.signalReady()`) and the game shows a "READY" badge during play; the next game-over becomes "tap to continue →" instead of a restart prompt. When the player taps, `onDismiss(score)` fires and you unmount.

New `GameConfig` callbacks:

- `onReady?: () => void` — fires once when host signals ready
- `onDismiss?: (score: number) => void` — player chose to exit, or host force-dismissed

New `BaseEngine` API (and via `<GameCanvas/>` ref as `GameHandle`):

- `signalReady()` — host's ready signal (idempotent)
- `dismiss()` — force-exit now (idempotent), fires `onDismiss(getScore())`
- `getScore(): number` — current score, host-readable
- `ready: boolean` — getter

`<GameCanvas/>` is now a `forwardRef` exposing `GameHandle`. Adds `ready?: boolean` prop for declarative use.

All six game engines implement `getScore()` and route their gameover-tap through the new `tryGameOverRestart()` helper so they auto-dismiss instead of restarting once ready.
