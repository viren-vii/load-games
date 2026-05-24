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

Mobile rendering & control hardening.

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
