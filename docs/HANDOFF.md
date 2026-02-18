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
- Completed runtime resilience + dedupe pass (2026-02-18, phase 6):
  - Hardened IndexedDB lifecycle in `src/persistence/storage.js`:
    - retries DB open after transient `open` failure/block instead of permanently caching `null`
    - clears cached DB handle on `onversionchange`
    - added stronger transaction/request error handling in `idbOp`
  - Eliminated duplicate recommendation recompute/write work in `src/ml/recommendations.js`:
    - concurrent `refreshRecommendationsCache()` calls now share one in-flight promise
  - Added/expanded tests:
    - `tests/persistence/storage.test.js` now covers IndexedDB success-path + transient-open retry behavior
    - `tests/recommendations.test.js` now verifies concurrent refresh deduplication
- Completed navigation race-condition simplification pass (2026-02-18, phase 7):
  - Added lightweight async render gate:
    - `src/app/async-gate.js`
  - Updated `src/app.js` view rendering flow:
    - each `showView()` call gets a gate token
    - stale async loads are ignored instead of overwriting newer navigation state
    - stale load errors no longer surface spurious error UI
  - Added unit coverage:
    - `tests/app/async-gate.test.js`
  - Regenerated service worker asset manifest:
    - `public/sw-assets.js`
- Completed game replay reset simplification pass (2026-02-18, phase 8):
  - Removed timing-based history navigation hack from game completion flow:
    - `src/games/game-complete.js`
  - Added deterministic custom event for replay reset:
    - `src/utils/event-names.js` (`GAME_PLAY_AGAIN`)
  - Wired game engines to handle replay reset directly (no hash/history trick needed):
    - `src/games/game-shell.js`
    - `src/games/sequence-game.js`
    - `src/games/rhythm-dash.js`
  - Added focused unit coverage:
    - `tests/games/game-complete.test.js`
    - `tests/games/game-shell.test.js`
- Completed tuning-listener lifecycle hardening pass (2026-02-18, phase 9):
  - Added explicit disposal for tuning subscriptions:
    - `src/games/shared.js` (`attachTuning().dispose()`)
  - Prevented stale ML-reset listeners across potential rebind paths:
    - `src/games/game-shell.js`
    - `src/games/sequence-game.js`
    - `src/games/rhythm-dash.js`
  - Added regression coverage:
    - `tests/games/shared.test.js`
    - `tests/games/game-shell.test.js` (rebind disposal assertion)
- Completed audio URL lifecycle hardening pass (2026-02-18, phase 10):
  - Eliminated superseded blob URL leak risk in audio playback controller:
    - `src/utils/audio-utils.js`
  - `setUrl()` now revokes prior blob URLs when replaced, and `stop()` only revokes blob URLs.
  - Expanded coverage for overwrite and non-blob behavior:
    - `tests/audio-utils.test.js`
- Completed bfcache-aware trainer lifecycle guard pass (2026-02-18, phase 11):
  - Added reusable bfcache pagehide helper:
    - `src/trainer/trainer-utils.js` (`isBfcachePagehide`)
  - Prevented destructive posture cleanup/reporting on persisted pagehide snapshots:
    - `src/trainer/tools.js`
  - Expanded utility coverage:
    - `tests/trainer-utils.test.js`
- Completed bfcache-safe metronome lifecycle pass (2026-02-18, phase 12):
  - Prevented metronome reporting/stop side effects on persisted pagehide snapshots:
    - `src/trainer/tools.js`
  - Reused existing bfcache helper:
    - `src/trainer/trainer-utils.js` (`isBfcachePagehide`)
- Completed focus timer hidden-state lifecycle fix (2026-02-18, phase 13):
  - Added explicit decision helper for timer stop rules:
    - `src/coach/focus-timer-utils.js` (`shouldStopFocusTimer`)
  - Forced stop path on hidden/pagehide lifecycle events:
    - `src/coach/focus-timer.js`
  - Added focused utility coverage:
    - `tests/focus-timer-utils.test.js`
- Completed game deactivation lifecycle hook pass (2026-02-18, phase 14):
  - Added generic per-game deactivation hook support in shell:
    - `src/games/game-shell.js` (`gameState._onDeactivate`)
  - Paused active timers on hash-navigation deactivation for:
    - `src/games/note-memory.js`
    - `src/games/bow-hero.js`
  - Added regression coverage for deactivation hook execution:
    - `tests/games/game-shell.test.js`
- Completed story-song deactivation lifecycle pass (2026-02-18, phase 15):
  - Wired play-along stop behavior into the shell deactivation hook:
    - `src/games/story-song.js`
  - Ensures hash-navigation away pauses play-along before leave reporting.
- Completed melody-maker deactivation lifecycle pass (2026-02-18, phase 16):
  - Wired melody playback stop behavior into the shell deactivation hook:
    - `src/games/melody-maker.js`
  - Ensures hash-navigation away stops active melody playback before leave reporting.
- Completed duet-challenge deactivation lifecycle pass (2026-02-18, phase 17):
  - Wired partner playback stop behavior into the shell deactivation hook:
    - `src/games/duet-challenge.js`
  - Ensures hash-navigation away stops partner audio and deactivates round controls.
- Completed sample-audio deactivation lifecycle pass (2026-02-18, phase 18):
  - Wired sample audio cleanup into shell deactivation hook for:
    - `src/games/ear-trainer.js`
    - `src/games/tuning-time.js`
  - Ensures hash-navigation away pauses active sample playback in these games.
- Completed tone-player deactivation lifecycle pass (2026-02-18, phase 19):
  - Wired synthesized tone cleanup into shell deactivation hook for:
    - `src/games/scale-practice.js`
    - `src/games/pitch-quest.js`
    - `src/games/rhythm-painter.js`
    - `src/games/duet-challenge.js`
  - Ensures hash-navigation away stops active tone-player output in these games.
- Completed sequence/timer tone deactivation lifecycle pass (2026-02-18, phase 20):
  - Added synthesized tone stop-on-deactivate for sequence factory games:
    - `src/games/sequence-game.js` (covers `pizzicato` and `string-quest`)
  - Extended existing deactivation hooks to stop active tones for:
    - `src/games/note-memory.js`
    - `src/games/bow-hero.js`
  - Ensures hash-navigation away and session reset paths stop active synthesized tone output.
- Completed shell pagehide lifecycle reporting pass (2026-02-18, phase 21):
  - Added non-bfcache `pagehide` handling in:
    - `src/games/game-shell.js`
  - Deactivation hooks and reporting now trigger when the active game view is hidden via real page unload, not just hash navigation.
  - Added regression coverage for persisted/non-persisted pagehide behavior:
    - `tests/games/game-shell.test.js`
- Completed non-shell pagehide lifecycle pass (2026-02-18, phase 22):
  - Added non-bfcache `pagehide` handling to sequence factory flow:
    - `src/games/sequence-game.js` (covers `pizzicato` + `string-quest`)
  - Added non-bfcache `pagehide` handling and listener rebind cleanup for:
    - `src/games/rhythm-dash.js`
  - Ensures non-shell games now align with shell lifecycle reporting/deactivation behavior on real page unload.
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
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-3.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-4.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-5.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-6.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-7.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-8.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-9.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-10.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-11.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-12.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-13.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-14.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-15.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-16.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-17.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-18.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-19.md`

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
