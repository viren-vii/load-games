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

Playability + handoff UX overhaul. Addresses every edge case in the player and dev flows.

### Player playability fixes

- **Flappy**: gravity softened (1800 → 1500), gap widened (120 → 130), first flap is extra tall, first pipe delayed 2.5s. No more "starts so fast you're already dead."
- **Runner**: first obstacle now has a 1.5s grace period after start (was instant). Player has time to orient before dodging.
- **Snake**: adaptive `GRID` size now scales with canvas dims. Previously hardcoded 20px → small canvases (160px wide) had only 8 cells and felt cramped. Now ~16 cells across at any size in `[10, 24]px` per cell.
- **Breakout**: post-death pre-serve state. Ball rests above the paddle until the player taps to launch. No more instant respawn-and-die loop. Renders `tapServe` label below the play area.
- **Pong**: same — post-point pre-serve. Ball rests at center, player taps to serve. Calm pause between rallies.

### Dev API additions (additive — no breaking changes)

- **`labels`** config: override any of `idleStart`, `idleReady`, `gameOver`, `tapRestart`, `tapContinue`, `readyBadge`, `tapServe`. Sensible English defaults; partial overrides merge. Useful for i18n and brand voice.
- **`onDismiss(score, reason)`**: reason is `'user' | 'gameover' | 'idle-ready' | 'forced'`. Lets the host distinguish player-initiated exit from host-forced dismiss for analytics.
- **`onPause()` / `onResume()`** callbacks: fire on tab-hide, off-screen, and programmatic `pause()`/`resume()`. Useful for "user paused while content was ready for 30s" telemetry.
- **`returnButton`** config: `false` to disable the in-canvas return button (top-right "● READY" badge becomes click-through). Default `true`.
- **Esc key**: when `ready` and game is `running` or `idle`, Esc fires `onDismiss(score, 'user')` / `onDismiss(0, 'idle-ready')` — accessibility for keyboard-only users.
- **In-canvas return button**: the existing "● READY" badge is now clickable when `ready + running`. Players bail mid-play without waiting for game-over.
- **Idle + ready prompt swap**: when the host's work finishes before the player even started, the idle screen prompt changes to "content ready · tap to continue" and tap dismisses (reason `'idle-ready'`) instead of starting the game.

### New component: `<LoadingGame/>`

Bundled UX wrapping `<GameCanvas/>` with an external Skip button. Use when you don't want to compose your own button:

```tsx
<LoadingGame
  engine={SnakeEngine}
  ready={done}
  onDismiss={() => unmount()}
  skipButton                 // default true
  skipLabel="Skip"           // default
  skipPosition="bottom"      // 'top' | 'bottom' | 'right'
/>
```

For composition control, keep using `<GameCanvas/>` directly.

### Tests

- 32 passing (was 24): adds dismiss-reason routing, pause/resume callbacks, label merging.

### Docs

- README "Edge cases playbook" section: documents the patterns for long load, fast load, player-wants-out, mid-play exit, accidental start, paused-during-ready.
- React package README: full `LoadingGame` prop reference + custom-label example.
