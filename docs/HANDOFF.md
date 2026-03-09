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
- Song playback and song recording intentionally diverge at the route level: normal play should not require microphone permission, record intent should.
- Recording storage is blob-first; consumers should resolve playback through `resolveRecordingSource()` / recording playback helpers rather than reading `dataUrl` directly.
- Service worker and offline logic remain pure Vanilla JS in `public/` and `src/platform/`.
- Installed app metadata, shortcuts, and icon definitions live in `public/manifest.webmanifest`.
- GitHub Pages SPA fallback is generated in `postbuild` by `scripts/build-spa-fallback.mjs`, which copies `dist/index.html` to `dist/404.html`.
- Optional Rust/WASM modules live under `src/wasm/` and `wasm/`.
- Legacy shipped game and song views still live under `public/views/games/` and `public/views/songs/`.
- Current architecture source of truth lives in `docs/architecture/system-overview.md`, `docs/architecture/feature-surface.md`, `docs/architecture/offline-and-persistence.md`, and `docs/architecture/audio-and-realtime.md`.
- Historical reboot planning artifacts remain in `docs/architecture/reboot-feature-matrix.md`, `docs/architecture/next-reboot-target-state.md`, and `docs/ViolinPLANV2.md`; do not use them as the current routing or runtime truth.

## Verification Gates

- `npm run audit:docs`
- `npm run audit:static`
- `npm run audit:dep-backed`
- `npm audit --omit=dev --audit-level=high`
- `npm run test:e2e`
- `PW_BASE_URL="<live-url>" PW_SKIP_WEBSERVER=true npm run test:e2e:live`

`npm run audit:full` runs `audit:static` plus `audit:dep-backed`.
`npm run handoff:verify` runs the full handoff sequence plus Playwright E2E.

Feature-completeness gates:

- `npm run audit:feature-parity`
- `npm run audit:release-tests`
- all 40 catalog songs detail/play/record pass
- all 17 games initialize and return to hub
- all 5 practice tools plus coach runner pass
- audio spot checks pass: song play route ungated, song record route mic-gated, blob-backed recording playback works, metronome/drone recover after backgrounding

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
- `npm audit --omit=dev --audit-level=high` passes or has explicit written risk acceptance.
- `npm run test:e2e:live` passes against the deployed Pages URL.
- CI quality workflow passes on PR and `main`.
- Post-deploy Pages smoke passes.
- Engineering, QA, and installed-iPad owner signoff are recorded.
- Installed-iPad audio pass confirms:
  - song play works without mic permission
  - song record prompts before entry
  - saved recording replays from song detail
  - metronome and drone recover after background/foreground
- This runbook still matches the current repo behavior.

## Rollback And Signoff

- Branch protection should require the `quality` workflow on `main`.
- Release records should include:
  - release commit SHA
  - deploy URL
  - verification timestamp
  - accepted risks
  - rollback target SHA
- Rollback path:
  1. Identify the last known-good `main` commit.
  2. Redeploy that commit through `.github/workflows/pages.yml`.
  3. Rerun live smoke and confirm the deployed URL.
