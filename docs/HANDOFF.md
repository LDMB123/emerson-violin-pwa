# Handoff Runbook

## Start Here

1. Confirm repo state:
```bash
npm run handoff:status
```
2. Run full verification:
```bash
npm run handoff:verify
```

If both pass, you are at a known-good baseline.

## What This Phase Completed

- Stabilized lazy-view routing and onboarding-aware E2E behavior.
- Added IndexedDB fallback to localStorage for JSON persistence paths.
- Consolidated duplicated file share/download logic via `tryShareFile()` in `src/utils/recording-export.js`.
- Completed 10x simplification/optimization pass (2026-02-18, phase 2):
  - Refactored app bootstrap module scheduling to declarative plans (`EAGER_MODULES`, `IDLE_MODULE_PLAN`) in `src/app.js`.
  - Added retry-safe dynamic import handling (`loadModule` now clears failed cache entries so later attempts can recover).
  - Added idle HTML prefetch for likely next views via `ViewLoader.prefetch()` to reduce route switch latency.
  - Replaced branch-heavy `getModulesForView` with declarative rules + deduped/memoized output in `src/utils/app-utils.js`.
  - Hardened sequence game lifecycle by removing stale `hashchange` listeners before rebind in `src/games/sequence-game.js`.
  - Expanded tests for module rule behavior and view prefetch error handling.
- Completed deeper architecture pass (2026-02-18, phase 3):
  - Added shared module registry: `src/app/module-registry.js` now owns loader map, eager/idle plans, prefetch view IDs, and view→module resolution.
  - `src/app.js` and `src/utils/app-utils.js` now consume the same registry source (eliminates drift between module keys and routing rules).
  - Hardened `src/games/game-metrics.js` loading pipeline:
    - promise-based game load cache
    - retry on loader failure (failed load is removed from cache)
    - deduped update handlers via `Set`
    - generic game-view checkbox detection (removed brittle hardcoded ID-prefix regex)
  - Added registry test coverage in `tests/app/module-registry.test.js`.
  - Preserved static per-game import map in `game-metrics` intentionally so `knip` dead-code audit remains accurate (current toolchain does not reliably resolve `import.meta.glob` for this case).
- Completed QA + effectiveness deep pass (2026-02-18, phase 4):
  - Added critical coverage gate script: `scripts/assert-critical-coverage.mjs`.
  - Added `qa:effectiveness` script (`npm run test:coverage` + critical threshold assertions).
  - `audit:full` now enforces QA effectiveness gate before build.
  - Expanded recommendations tests from a single smoke case to branch-heavy cache/refresh/fallback coverage:
    - `tests/recommendations.test.js`
  - Added onboarding coverage:
    - `tests/onboarding/onboarding-check.test.js`
    - `tests/onboarding/onboarding.test.js`
  - Coverage reporters now include `json-summary` to support machine-validated thresholds.
- Completed QA + effectiveness deeper pass (2026-02-18, phase 5):
  - Added persistence edge-case coverage:
    - `tests/persistence/storage.test.js`
    - `tests/persistence/loaders.test.js`
  - Added runtime health E2E guard for critical views:
    - `tests/e2e/runtime-health.spec.js`
  - Tightened critical coverage thresholds for:
    - `src/ml/recommendations.js`
    - `src/onboarding/onboarding.js`
    - `src/persistence/loaders.js`
    - `src/persistence/storage.js`
    - `src/app/module-registry.js`
  - Optimized runtime-health navigation checks to use in-app hash routing (faster and less reload churn than full `page.goto` per view).
- Added dead code and duplicate dependency audits:
  - `knip.json`
  - `scripts/audit-dependency-duplicates.mjs`
- Added CI quality workflow:
  - `.github/workflows/quality.yml`
  - Includes lint/audit/unit/build plus Playwright E2E (`iPad Safari`)
- Added phase report:
  - `docs/plans/2026-02-18-debug-optimization-report.md`
  - `docs/plans/2026-02-18-10x-simplification-optimization.md`
  - `docs/plans/2026-02-18-10x-deeper-pass.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deep-pass.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-2.md`

## Verification Gates

- `npm run lint:all`
- `npm run audit:deadcode`
- `npm run audit:deps`
- `npm run qa:effectiveness`
- `npm run build`
- `npm run test:e2e`

`npm run handoff:verify` runs all of the above in sequence.

## Intentional/Expected Caveats

- `scripts/extract-views.js` currently extracts `0` views because canonical view HTML is maintained in `public/views/`.
- Duplicate dependency audit allowlists known transitive duplicates:
  - `entities`
  - `fsevents`
  - `whatwg-mimetype`
- `depcheck` may report `@vitest/coverage-v8` unused; coverage is invoked by CLI config (`vitest --coverage`), so this is expected.

## Files to Read Before Editing

1. `docs/HANDOFF.md` (this file)
2. `docs/plans/2026-02-18-qa-effectiveness-deep-pass.md`
3. `docs/plans/2026-02-18-10x-deeper-pass.md`
4. `docs/plans/2026-02-18-10x-simplification-optimization.md`
5. `docs/plans/2026-02-18-debug-optimization-report.md`
6. `CLAUDE.md`
7. `README.md`

## Recommended Next Work (Ordered)

1. Investigate and resolve bfcache restore blockers reported during prior optimization pass.
2. Decide whether to retire `scripts/extract-views.js` or restore extractor-driven view source flow.
3. Add performance budget checks (LCP/FCP thresholds) to CI once target values are finalized.

## Definition of “Ready to Hand Off”

- `npm run handoff:verify` passes with no manual patching.
- CI quality workflow passes on PR/main.
- This runbook and phase report match current repo behavior.
