# Contributing to load-games

Thanks for wanting to help. This guide covers the local workflow, the commit / PR conventions, and the release flow.

## Prerequisites

- Node `>=20` (CI runs against 20 and 22)
- `pnpm` `10.x` (managed by Corepack — `corepack enable` once)

## Setup

```bash
git clone https://github.com/viren-vii/load-games.git
cd load-games
pnpm install
pnpm build
pnpm test
```

Run the demo:

```bash
pnpm --filter @load-games/demo dev
# open http://localhost:5173
```

Test on a phone over LAN:

```bash
pnpm --filter @load-games/demo dev -- --host
# scan the LAN URL Vite prints with the QR button in the demo
```

## Repo layout

```
packages/
  core/            # BaseEngine, GameLoop, InputManager, shared types
  react/           # <GameCanvas/> and <LoadingGame/> wrappers
  snake/ flappy/ breakout/ pong/ runner/ space-invaders/
                   # one engine per package; each depends only on @load-games/core
apps/
  demo/            # Vite + React playground deployed to GitHub Pages
.changeset/        # pending version bumps (one .md per change)
.github/workflows/ # CI, release, Pages
```

No cross-game imports. Games depend on `@load-games/core` only.

## Adding a new game

1. Copy an existing game directory: `cp -r packages/snake packages/<name>`
2. Edit `package.json`: `name`, `description`, `keywords`, `repository.directory`, `homepage`.
3. Extend `BaseEngine`. Implement `gameName`, `controlHints`, `update(dt)`, `render()`, `getScore()`.
4. Wire input via `InputManager`. Call `beginGame()` on first input, `tryGameOverRestart(...)` on retry.
5. Add the game to `pnpm-workspace.yaml` is automatic (`packages/*`).
6. Wire a tab into `apps/demo/src/App.tsx` so it shows up in the playground.
7. Add a `preview.svg` (320×320) in the package root and reference it in the per-package `README.md`.
8. Add a changeset: `pnpm changeset` — pick all affected packages.
9. Open the PR.

## Code style

- TypeScript strict mode is enforced via `tsconfig.base.json` (`strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`).
- Format and lint with [Biome](https://biomejs.dev):
  ```bash
  pnpm lint        # check
  pnpm lint:fix    # apply formatting + safe fixes
  ```
- Default to no comments. Add one only when *why* is non-obvious.
- Engines must avoid per-frame allocations in `update()` (no `.filter()` / `.map()`). Use single-pass scans.

## Tests

```bash
pnpm test                              # all packages
pnpm --filter @load-games/core test    # one package
```

- `core` has unit tests for the state machine, input mapping, and loop.
- Game engines are mostly behaviourally verified via the demo. Pure logic (collision, scoring) can be extracted into a function and unit-tested (see `packages/snake/src/snake.test.ts`).
- Coverage target before 1.0: 60%+.

## Commits

Conventional Commits are encouraged but not enforced:

```
feat(snake): add wall-wrap toggle
fix(core): clear pointer capture on cancel
docs(react): document onPause / onResume order
chore(release): version packages
```

Keep the subject under ~70 chars. Use the body for *why*.

## Pull requests

Before opening a PR:

1. `pnpm build && pnpm typecheck && pnpm test && pnpm lint`
2. `pnpm changeset` — describe the change, pick the bump level, list affected packages. The release workflow won't publish without a changeset for each touched package.
3. Push to a feature branch. Fill out the PR template.

CI will run build / typecheck / test on Node 20 and 22.

## Releasing

Handled by maintainers via the [Changesets](https://github.com/changesets/changesets) flow:

1. Changesets aggregate on `main` as PRs land.
2. The release workflow opens a "Version packages" PR that bumps versions and rewrites `CHANGELOG.md`s.
3. Merging that PR triggers the workflow again, which publishes to npm via OIDC (no long-lived token).

The `@load-games/*` packages are version-locked (`"fixed": [["@load-games/*"]]`) — one minor bump bumps everything. Keeps cross-package compat trivial.

## Reporting bugs / requesting features

Open an issue using the templates under `.github/ISSUE_TEMPLATE/`. For security issues see [SECURITY.md](SECURITY.md).
