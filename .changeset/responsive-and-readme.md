---
"@load-games/core": patch
"@load-games/react": patch
"@load-games/snake": patch
"@load-games/flappy": patch
"@load-games/breakout": patch
"@load-games/pong": patch
"@load-games/runner": patch
"@load-games/space-invaders": patch
---

Playability fixes at small canvas dimensions + demo polish + comprehensive prop docs.

**Flappy:** all physics now scale by `min(w,h) / 320`. Velocities, gravity, gap height, pipe width, bird size, pipe speed are all proportional to canvas dimensions. At 160×160 the game now feels identical to 320×320 instead of being unplayable. Bird also no longer dies on ceiling-touch — it clamps. Restart applies the same extra-tall first flap as the initial start (was missing).

**Space Invaders:** invader spacing adapts to canvas width so all 8 columns always fit on narrow canvases (squeezes padding down to 2px minimum). No more invader overflow.

**Runner:** obstacle speed now scales with canvas width. 100px/s at 160 wide, 200px/s at 320 wide — player reaction window stays consistent.

**Demo improvements:**
- Width / height / speed sliders no longer flicker the canvas while dragging. The applied config is debounced 250ms before re-keying `<LoadingGame/>`.
- Skip button no longer touches the canvas border. Border now sits on the canvas itself (not a wrapping div), so the button has clean space below.

**Docs:** README now has a complete prop reference table covering every `GameCanvas`, `LoadingGame`, `GameConfig`, `GameLabels`, and `GameHandle` field — including the `returnButton` config, all `DismissReason` values, and all `GameLabels` defaults.
