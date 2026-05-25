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

Demo + docs polish (no API changes):

- **Demo: every prop editable** — full `GameConfig` surface exposed via the right-side controls panel. Sliders for width/height/speed, colour pickers for theme, text inputs for all 7 `labels` keys (i18n preview live), toggles for `returnButton` + `skipButton`, text input for `skipLabel`, select for `skipPosition`.
- **Demo: collapsible sections** — `Loading Simulator`, `Canvas / Gameplay`, `Theme`, `Labels`, `Behavior`, `Skip Button` each in a native `<details>` block.
- **Demo: deep-link via `?game=<id>`** — URL stays in sync with the active tab. Every per-package README's "Try it live" link uses this query so users land on the right game.
- **SEO**: `apps/demo/index.html` now has `<title>` + meta description, Open Graph tags, Twitter card, theme-color, canonical URL, JSON-LD `SoftwareApplication` schema, inline SVG favicon. OG image at `og-image.svg` (1200×630) ships in the deployed Pages build.
- **Per-package preview SVGs** — each of the 6 games has a hand-crafted `preview.svg` in its package folder, embedded in its README via the GitHub raw URL so the image renders both on GitHub and npmjs.com. Root README also shows a 6-tile gallery linking to the demo.
- **Root README** — top-of-page live demo + npm + license links; gallery of game previews each linking to the demo with the matching `?game=` query.
