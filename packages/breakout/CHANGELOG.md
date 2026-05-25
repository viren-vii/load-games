# @load-games/breakout

## 0.2.0

### Minor Changes

- 5b7687c: Playability + handoff UX overhaul. Addresses every edge case in the player and dev flows.

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
    skipButton // default true
    skipLabel="Skip" // default
    skipPosition="bottom" // 'top' | 'bottom' | 'right'
  />
  ```

  For composition control, keep using `<GameCanvas/>` directly.

  ### Tests

  - 32 passing (was 24): adds dismiss-reason routing, pause/resume callbacks, label merging.

  ### Docs

  - README "Edge cases playbook" section: documents the patterns for long load, fast load, player-wants-out, mid-play exit, accidental start, paused-during-ready.
  - React package README: full `LoadingGame` prop reference + custom-label example.

### Patch Changes

- Updated dependencies [5b7687c]
  - @load-games/core@0.2.0

## 0.1.0

### Minor Changes

- e785742: Add graceful loading-handoff API.

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

- da06c59: Initial 0.1.0 release.

  - `@load-games/core` — `BaseEngine`, `GameLoop`, `InputManager`, `GameConfig`, `GameTheme`.
  - `@load-games/react` — `<GameCanvas/>` wrapper with idle/running/paused/gameover state.
  - Six game engines (snake, flappy, breakout, pong, runner, space-invaders), each consuming `@load-games/core` and driven by `GameCanvas`.

  Engines respect `width`/`height`/`speed`/`theme` and emit `onScore` / `onGameOver` callbacks. All games handle keyboard, mouse, and touch input.

- 8c43499: Mobile rendering & control hardening.

  **InputManager** — replaced `touchstart`/`touchend`/`click` with unified `pointerdown`/`pointerup`. Eliminates iOS double-tap-fire (touchend + click both emitting `tap`). Adds `setPointerCapture` so a swipe that drags off-canvas still completes correctly. Pointer-id tracked to ignore multi-touch second fingers.

  **GameCanvas CSS** — hardened defaults for mobile/iOS:

  - `touch-action: none` so swipes never scroll/zoom the page (fixes snake unplayable on mobile)
  - `user-select: none` + `-webkit-touch-callout: none` blocks long-press context menu
  - `-webkit-tap-highlight-color: transparent` removes blue iOS tap flash
  - `outline: none` no focus ring on keyboard focus
  - `max-width: 100%` so canvas shrinks to fit narrow viewports

  **Space Invaders** — was unplayable on mobile (arrow-key-only movement, swipe = one-shot). Now supports drag-to-position ship via `pointermove`, matching breakout/pong. Tap still shoots.

  **Pong** — added first-to-5 win condition. Previously had no game-over so the `ready` → "tap to continue" flow was unreachable. Match now ends naturally, giving the player a clean exit.

  All games verified to render and accept touch on mobile (snake swipe, flappy/runner tap, breakout/pong/space-invaders drag).

- b4fa1e8: Production-readiness pass: API simplification, performance fixes, consumer DX.

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

### Patch Changes

- Updated dependencies [e785742]
- Updated dependencies [da06c59]
- Updated dependencies [8c43499]
- Updated dependencies [b4fa1e8]
  - @load-games/core@0.1.0
