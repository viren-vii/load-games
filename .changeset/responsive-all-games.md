---
"@load-games/core": patch
"@load-games/breakout": patch
"@load-games/pong": patch
"@load-games/runner": patch
"@load-games/space-invaders": patch
---

Full responsive sizing across all remaining games + base engine UI.

**Core (`BaseEngine`).** Every engine-managed overlay now scales by `min(w,h)/320`. Affects `renderIdle` (title font, hint spacing, prompt position — block centered vertically so nothing clips on short canvases), `renderGameOver` (banner + prompt fonts and offsets), and `renderReadyBadge` (font, padding, height, margin). The in-canvas return button hit-test uses the same scaled dims. Badge text width re-measured when the scale changes (e.g. after a remount at a new size).

**Breakout.** Paddle, ball radius, brick height, brick padding, brick top-margin, paddle bottom-margin all scale by `min(w,h)/320`. Paddle and ball speeds scale by `width/320`. HUD + tap-serve font scale too. Bricks no longer dominate small canvases; the paddle is reachable from the edges at 160×160.

**Pong.** Paddles, ball, side margin scale by `min(w,h)/320`. Player + AI vertical speed scale by `height/320`. Ball horizontal speed scales by `width/320`. Centre-dash, scoreboard, "YOU/AI" labels, and tap-serve prompt all scale.

**Runner.** Player, ground, jump arc all scale by canvas size. Gravity + jump velocity scale by `height/320` so the jump reaches the same proportion of canvas height regardless of size. Obstacle dimensions and the player-eye detail scale together. HUD font scales.

**Space Invaders.** Invader cell, padding, top-margin, step distance, player ship, bullets, and HUD all scale by `min(w,h)/320`. The existing 8-column squeeze logic now operates on scaled invader widths so the formation fits on narrow canvases without losing the row.

Net result: snake/flappy were already responsive — now breakout, pong, runner, space-invaders match. At 160×160 every game's HUD, UI, and gameplay surface stays inside the canvas without clipping.
