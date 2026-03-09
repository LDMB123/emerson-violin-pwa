# Handoff Runbook

## Start Here

1. Install dependencies if `node_modules/` is absent:
   ```bash
   nvm install
   nvm use
   npm install -g npm@11.11.0
   npm run runtime:check
   npm install
   ```
2. Confirm repo state:
   ```bash
   npm run handoff:status
   ```
3. Run the full verification gate:
   ```bash
   npm run handoff:verify
   ```

Treat command output as the source of truth. Do not rely on dated pass/fail counts in docs.

Runtime source of truth:

- Node: [.nvmrc](/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/.nvmrc)
- npm: [package.json](/Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/package.json) `packageManager`
- Fail-fast check: `npm run runtime:check`

## Current Repo Shape

- App shell and navigation now live in `src/AppShell.jsx` and `src/routes.jsx`, orchestrated entirely by React Router 7.
- Most UI is built natively in React. Legacy WASM games & songs are dynamically hosted within React via `src/views/Games/GameRunnerView.jsx` and `src/views/Songs/SongRunnerView.jsx`.
- Persistence remains IndexedDB-first via `src/persistence/` with simple React hook synchronization.
- Service worker and offline logic remain pure Vanilla JS in `public/` and `src/platform/`.
- Installed app metadata, shortcuts, and icon definitions live in `manifest.webmanifest`.
- Optional Rust/WASM modules live under `src/wasm/` and `wasm/`.
- Legacy shipped game and song views still live under `public/views/games/` and `public/views/songs/`.
- Architectural decisions are logged in `docs/architecture/reboot-feature-matrix.md` and `docs/architecture/next-reboot-target-state.md`.

## Verification Gates

- `npm run audit:docs`
- `npm run audit:static`
- `npm run audit:dep-backed`
- `npm run test:e2e`

`npm run audit:full` runs `audit:static` plus `audit:dep-backed`.
`npm run handoff:verify` runs the full handoff sequence plus Playwright E2E.

## Playwright Worker Profiles

Playwright defaults:

- CI: `workers=1`
- Local development: `workers=2`

Override with `PW_WORKERS` when needed:

```bash
PW_WORKERS=2 npm run test:e2e
PW_WORKERS=3 npx playwright test
```

| Machine profile | Recommended `PW_WORKERS` | Notes |
| --- | --- | --- |
| CI/shared runner | `1` | Most stable for WebKit and constrained environments. |
| Typical dev machine | `2` | Default and preferred for `npm run handoff:verify`. |
| High-end local workstation | `3` | Use only after local calibration. |

Calibration flow:

```bash
PW_WORKERS=3 npx playwright test tests/e2e/games-all-functional.spec.js --grep "group C: string/painter/story/pizzicato" --repeat-each=5
PW_WORKERS=3 npm run test:e2e
```

If either run hangs or intermittently flakes, reduce `PW_WORKERS` by one.

## Intentional Caveats

- `audit:perf` enforces LCP via native LCP entries when available and falls back to Chromium `FirstMeaningfulPaint` delta when unavailable.
- `audit:perf` supports `PERF_BUDGET_REPORT_ONLY` (`false` blocks, `true` reports only).
- Realtime E2E hooks are localhost-only and inert unless both `window.__PANDA_E2E_HOOKS__` and `window.__PANDA_E2E_RT_SIMULATE_START__` are set to `true`.
- Duplicate dependency audit allowlists known transitive duplicates: `entities`, `fsevents`, `whatwg-mimetype`.
- `depcheck` may report `@vitest/coverage-v8` unused; coverage is invoked by CLI config, so this is expected.

## Files To Read Before Editing

1. `docs/README.md`
2. `CLAUDE.md`
3. `README.md`
4. `CONTRIBUTING.md`

## Recommended Next Work

1. Consider expanding the catalog with additional Suzuki Book 2+ songs.
2. Monitor PR noise for 1-2 weeks after recent performance threshold updates.
3. Enhance ML test coverage around the `sync-offline-engine.js` data pipelines if further modifications to the Adaptive Engine are made.

## Definition Of Ready To Hand Off

- `npm run handoff:verify` passes with no manual patching.
- CI quality workflow passes on PR and `main`.
- This runbook still matches the current repo behavior.
