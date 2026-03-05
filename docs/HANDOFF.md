# Handoff Runbook

## Start Here

1. Install dependencies if `node_modules/` is absent:
   ```bash
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

## Current Repo Shape

- App shell and navigation live in `index.html`; routed content renders into `#main-content`.
- View HTML is loaded from `public/views/**` by `src/views/view-loader.js`.
- Feature/module loading is orchestrated by `src/app/module-registry.js`.
- Persistence is IndexedDB-first with localStorage fallback under `src/persistence/`.
- Service worker and install/offline logic live under `public/` and `src/platform/`.
- Optional Rust/WASM modules live under `src/wasm/` and `wasm/`.
- Shipped game views live under `public/views/games/`.
- `src/games/sequence-game.js` is a shared runtime used by sequence-style games; it is not a standalone shipped view.
- Song sheets live under `public/views/songs/`.
- Historical implementation notes live in git history and `_archived/plans/README.md`.

## Verification Gates

- `npm run lint:all`
- `npm run audit:deadcode`
- `npm run audit:deps`
- `npm run audit:secrets`
- `npm run audit:perf:config`
- `npm run audit:view-sync`
- `npm run qa:effectiveness`
- `npm run audit:modules`
- `npm run build`
- `npm run test:e2e`

`npm run handoff:verify` runs the complete handoff sequence.

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

1. `docs/HANDOFF.md`
2. `CLAUDE.md`
3. `README.md`

## Recommended Next Work

1. Calibrate CI LCP/FCP thresholds from downloaded workflow artifacts:
   ```bash
   PERF_BUDGET_RECOMMENDATION_WINDOW_DAYS=30 npm run audit:perf:recommend -- <artifact-folder>
   ```
2. Apply calibrated values:
   ```bash
   npm run audit:perf:apply -- artifacts/perf-budget-recommendation.json .github/workflows/quality.yml
   ```
3. Monitor PR noise for 1-2 weeks after threshold updates.
4. Consider replacing the guarded realtime E2E start-simulation seam with a dedicated test harness.
5. Add more song content to the library.

## Definition Of Ready To Hand Off

- `npm run handoff:verify` passes with no manual patching.
- CI quality workflow passes on PR and `main`.
- This runbook still matches the current repo behavior.
