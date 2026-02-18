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
- Added dead code and duplicate dependency audits:
  - `knip.json`
  - `scripts/audit-dependency-duplicates.mjs`
- Added CI quality workflow:
  - `.github/workflows/quality.yml`
  - Includes lint/audit/unit/build plus Playwright E2E (`iPad Safari`)
- Added phase report:
  - `docs/plans/2026-02-18-debug-optimization-report.md`

## Verification Gates

- `npm run lint:all`
- `npm run audit:deadcode`
- `npm run audit:deps`
- `npm test`
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
2. `docs/plans/2026-02-18-debug-optimization-report.md`
3. `CLAUDE.md`
4. `README.md`

## Recommended Next Work (Ordered)

1. Investigate and resolve bfcache restore blockers reported during prior optimization pass.
2. Decide whether to retire `scripts/extract-views.js` or restore extractor-driven view source flow.
3. Add performance budget checks (LCP/FCP thresholds) to CI once target values are finalized.

## Definition of “Ready to Hand Off”

- `npm run handoff:verify` passes with no manual patching.
- CI quality workflow passes on PR/main.
- This runbook and phase report match current repo behavior.
