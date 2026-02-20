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
- Completed bfcache restore blocker pass (2026-02-20, phase 30):
  - Added shared persisted-pagehide helper in:
    - `src/utils/lifecycle-utils.js`
  - Applied bfcache-safe `pagehide` guards across non-game teardown paths in:
    - `src/analysis/session-review.js`
    - `src/coach/focus-timer.js`
    - `src/parent/recordings.js`
    - `src/platform/media-sound-controller.js`
    - `src/realtime/session-lifecycle.js`
    - `src/recordings/recordings.js`
    - `src/songs/song-progress.js`
    - `src/trainer/trainer-utils.js`
  - Hardened parent adaptive controls listener binding against recycled DOM attributes:
    - `src/ml/adaptive-ui.js`
  - Added regression coverage for lifecycle helper and realtime pagehide behavior:
    - `tests/lifecycle-utils.test.js`
    - `tests/realtime/session-controller.test.js`
- Completed extractor-flow decision pass (2026-02-20, phase 31):
  - Retired `scripts/extract-views.js` from `predev` and `prebuild`.
  - Added explicit home-view parity audit:
    - `scripts/audit-view-sync.mjs`
    - `tests/scripts/audit-view-sync.test.js`
    - `package.json` (`audit:view-sync`)
  - `audit:full` now enforces inline/route home view sync (`index.html#view-home` vs `public/views/home.html`).
- Completed CI performance budget gate pass (2026-02-20, phase 32):
  - Added production-preview performance budget audit:
    - `scripts/audit-performance-budgets.mjs`
    - `package.json` (`audit:perf`)
    - emits run summary JSON: `artifacts/perf-budget-summary.json`
  - Updated CI quality workflow to install Chromium + WebKit and run LCP/FCP budget checks:
    - `.github/workflows/quality.yml`
    - uploads `perf-budget-summary` artifact for threshold calibration history
  - Budgets currently enforced in CI:
    - FCP median <= `2500ms`
    - LCP median <= `3500ms`
  - Stabilized story-song interaction in group-C game E2E flow:
    - `tests/e2e/games-all-functional.spec.js`
- Completed non-game bfcache E2E coverage pass (2026-02-20, phase 33):
  - Added persisted/unload pagehide behavior coverage for non-game recording surfaces:
    - `tests/e2e/non-game-bfcache.spec.js`
      - session review recordings
      - parent recordings
- Completed realtime bfcache WebKit E2E stabilization pass (2026-02-20, phase 34):
  - Added persisted/unload pagehide behavior coverage for realtime session lifecycle:
    - `tests/e2e/realtime-bfcache.spec.js`
  - Added guarded E2E controller hooks (only when `window.__PANDA_E2E_HOOKS__ === true`):
    - `src/realtime/session-ui.js`
  - Added guarded E2E realtime-start simulation flag to bypass audio bootstrap in browser tests:
    - `src/realtime/session-lifecycle.js`
  - Realtime pagehide persisted/non-persisted behavior remains covered by unit tests:
    - `tests/realtime/session-controller.test.js`
- Completed perf-threshold calibration helper pass (2026-02-20, phase 35):
  - Added summary aggregation + budget recommendation utility:
    - `scripts/recommend-performance-budgets.mjs`
    - `package.json` (`audit:perf:recommend`)
  - Added regression coverage:
    - `tests/scripts/recommend-performance-budgets.test.js`
- Completed perf budget mode-toggle pass (2026-02-20, phase 36):
  - Added report-only toggle support to performance budget audit:
    - `scripts/audit-performance-budgets.mjs` (`PERF_BUDGET_REPORT_ONLY`)
  - Set CI budget mode by event type:
    - `.github/workflows/quality.yml`
    - pull_request: `PERF_BUDGET_REPORT_ONLY=true` (non-blocking, baseline collection)
    - push/main: `PERF_BUDGET_REPORT_ONLY=false` (blocking gate)
  - Added helper regression coverage:
    - `tests/scripts/audit-performance-budgets.test.js`
- Completed CI perf recommendation artifact pass (2026-02-20, phase 38):
  - Added per-run recommendation generation in CI:
    - `.github/workflows/quality.yml`
    - `Recommend performance budgets (informational)`
    - outputs `artifacts/perf-budget-recommendation.json`
  - Added artifact upload for recommendation output:
    - artifact name: `perf-budget-recommendation`
- Completed perf recommendation confidence pass (2026-02-20, phase 39):
  - Added recommendation confidence metadata and low-sample warnings:
    - `scripts/recommend-performance-budgets.mjs`
  - Added coverage for confidence behavior:
    - `tests/scripts/recommend-performance-budgets.test.js`
- Completed perf rolling-baseline selection pass (2026-02-20, phase 40):
  - Added recommendation input filtering for recent baseline windows:
    - `scripts/recommend-performance-budgets.mjs`
    - supports `PERF_BUDGET_RECOMMENDATION_WINDOW_DAYS` and `PERF_BUDGET_RECOMMENDATION_MAX_RUNS`
  - Recommendation output now includes selection metadata:
    - loaded runs vs selected runs
    - dropped run counts (out-of-window / missing timestamp)
  - Added regression coverage for selection behavior:
    - `tests/scripts/recommend-performance-budgets.test.js`
- Completed perf threshold-health analytics pass (2026-02-20, phase 41):
  - Added threshold pass/fail rate analysis to recommendation output:
    - `scripts/recommend-performance-budgets.mjs`
    - `thresholdHealth.current` and `thresholdHealth.recommended`
  - Added current-threshold override support:
    - `PERF_BUDGET_CURRENT_FCP_MS`
    - `PERF_BUDGET_CURRENT_LCP_MS`
  - Added fallback inference of current thresholds from summary metadata when overrides are not provided.
  - Added regression coverage for threshold inference + pass/fail rate computation:
    - `tests/scripts/recommend-performance-budgets.test.js`
- Completed realtime E2E flag hardening pass (2026-02-20, phase 37):
  - Centralized realtime E2E flag guards with localhost-only enforcement:
    - `src/realtime/session-test-flags.js`
    - `src/realtime/session-ui.js`
    - `src/realtime/session-lifecycle.js`
  - Added guard regression coverage:
    - `tests/realtime/session-test-flags.test.js`
- Completed feature module completeness + song play-along pass (2026-02-19, phase 27):
  - Added sharp-note support for song playback tones in:
    - `src/audio/tone-player.js`
  - Upgraded song play mode to play real note sequences with lifecycle-safe cleanup and auto-stop behavior in:
    - `src/songs/song-progress.js`
  - Expanded regression coverage for:
    - `tests/tone-player.test.js`
    - `tests/e2e/utility-and-song-details.spec.js`
    - `tests/views/view-loader.test.js`
    - `tests/e2e/runtime-health.spec.js`
  - Added explicit feature module completeness gate:
    - `scripts/audit-feature-modules.mjs`
    - `package.json` (`audit:modules`)
    - `audit:full` now includes `audit:modules`
- Completed feature module completeness deeper pass (2026-02-19, phase 28):
  - Added runtime smoke import coverage across all runtime + game modules:
    - `tests/app/module-smoke-imports.test.js`
  - Deepened feature module audit assertions in:
    - `scripts/audit-feature-modules.mjs`
    - validates real view-template inventory (`public/views/**`)
    - validates runtime module reachability (view rules or eager/idle plan)
    - validates no-`init` module activation contract via explicit allowlist + self-start signal
    - validates game view/module/template consistency
  - Removed prior smoke-test warning noise by providing required modal fixture for game-complete import path:
    - `tests/app/module-smoke-imports.test.js`
- Completed feature module completeness strict pass (2026-02-19, phase 29):
  - Added per-module behavior contract coverage across runtime + game modules:
    - `tests/app/module-behavior-contracts.test.js`
  - Tightened module completeness audit with blocking zero-branch-signal checks:
    - `scripts/audit-feature-modules.mjs`
    - runtime/game modules with branch logic now fail audit if covered branches are `0`
  - Stabilized story-song E2E status assertion against valid status variants:
    - `tests/e2e/games-all-functional.spec.js`
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
- Completed game-enhancements bfcache lifecycle guard pass (2026-02-18, phase 23):
  - Added persisted-pagehide guard for lifecycle stop behavior in:
    - `src/games/game-enhancements.js`
  - Prevents destructive session stop side effects during bfcache snapshot transitions.
- Completed sequence-game pagehide regression coverage pass (2026-02-18, phase 24):
  - Added focused lifecycle tests for:
    - `tests/games/sequence-game.test.js`
  - Covers non-persisted pagehide reporting, persisted-pagehide ignore behavior, and rebind listener cleanup.
- Completed rhythm-dash pagehide regression coverage pass (2026-02-18, phase 25):
  - Added focused lifecycle tests for:
    - `tests/games/rhythm-dash-lifecycle.test.js`
  - Covers non-persisted pagehide active-run stop behavior and persisted-pagehide bfcache preservation behavior.
- Completed service-worker support hardening pass (2026-02-18, phase 26):
  - Added shared service-worker capability helpers:
    - `src/platform/sw-support.js`
  - Guarded registration and SW-dependent runtime paths for unsupported/insecure contexts in:
    - `src/app.js`
    - `src/platform/offline-recovery.js`
    - `src/platform/offline-mode.js`
    - `src/platform/offline-integrity.js`
    - `src/platform/sw-updates.js`
  - Added focused regression coverage for support/registration rules:
    - `tests/sw-support.test.js`
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
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-20.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-21.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-22.md`
  - `docs/plans/2026-02-18-qa-effectiveness-deeper-pass-23.md`
  - `docs/plans/2026-02-19-feature-module-completeness-audit.md`
  - `docs/plans/2026-02-19-feature-module-completeness-deeper-pass.md`
  - `docs/plans/2026-02-19-feature-module-completeness-strict-pass.md`

## Verification Gates

- `npm run lint:all`
- `npm run audit:deadcode`
- `npm run audit:deps`
- `npm run audit:view-sync`
- `npm run qa:effectiveness`
- `npm run audit:modules`
- `npm run build`
- `npm run test:e2e`

`npm run handoff:verify` runs all of the above in sequence.

## Playwright Worker Profiles

Playwright worker defaults are now:

- CI: `workers=1`
- local development: `workers=2`

Override with `PW_WORKERS` when needed:

```bash
PW_WORKERS=2 npm run test:e2e
PW_WORKERS=3 npx playwright test
```

Recommended values by machine profile:

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

Perf budget calibration flow (after downloading prior `perf-budget-summary` artifacts into a local folder):

```bash
npm run audit:perf:recommend -- ./artifacts/perf-history
```

The command writes `artifacts/perf-budget-recommendation.json` and prints suggested `PERF_BUDGET_FCP_MS` / `PERF_BUDGET_LCP_MS` values.
Recommendations include a confidence level (`high` when at least 5 runs are aggregated by default).

If either run hangs or intermittently flakes, reduce `PW_WORKERS` by one.

## Intentional/Expected Caveats

- `audit:perf` enforces LCP via native LCP entries when available, and falls back to Chromium `FirstMeaningfulPaint` delta when LCP entries are unavailable in runtime.
- `audit:perf` supports mode toggling via `PERF_BUDGET_REPORT_ONLY`:
  - `false` (default): blocking on budget threshold violations
  - `true`: report-only (still writes summary artifact, does not fail on budget overages)
- Realtime E2E hooks are inert in production unless both test globals are set:
- Realtime E2E hooks/simulation flags are localhost-only and inert in production unless both test globals are set:
  - `window.__PANDA_E2E_HOOKS__ === true`
  - `window.__PANDA_E2E_RT_SIMULATE_START__ === true`
- Duplicate dependency audit allowlists known transitive duplicates:
  - `entities`
  - `fsevents`
  - `whatwg-mimetype`
- `depcheck` may report `@vitest/coverage-v8` unused; coverage is invoked by CLI config (`vitest --coverage`), so this is expected.

## Files to Read Before Editing

1. `docs/HANDOFF.md` (this file)
2. `docs/plans/2026-02-19-feature-module-completeness-strict-pass.md`
3. `docs/plans/2026-02-19-feature-module-completeness-deeper-pass.md`
4. `docs/plans/2026-02-19-feature-module-completeness-audit.md`
5. `docs/plans/2026-02-18-qa-effectiveness-deep-pass.md`
6. `docs/plans/2026-02-18-10x-deeper-pass.md`
7. `docs/plans/2026-02-18-10x-simplification-optimization.md`
8. `docs/plans/2026-02-18-debug-optimization-report.md`
9. `CLAUDE.md`
10. `README.md`

## Recommended Next Work (Ordered)

1. Calibrate CI LCP/FCP thresholds from downloaded workflow artifacts using a rolling window, e.g.:
   - `PERF_BUDGET_RECOMMENDATION_WINDOW_DAYS=30 PERF_BUDGET_RECOMMENDATION_MAX_RUNS=20 npm run audit:perf:recommend -- <artifact-folder>`
2. Apply calibrated values to `PERF_BUDGET_FCP_MS` and `PERF_BUDGET_LCP_MS` in `.github/workflows/quality.yml`, then monitor PR noise for 1-2 weeks.
3. Revisit whether pull-request runs should stay report-only once calibrated thresholds are stable.
4. Decide whether to retain the guarded realtime E2E start-simulation seam long-term or replace it with a dedicated test harness module.

## Definition of “Ready to Hand Off”

- `npm run handoff:verify` passes with no manual patching.
- CI quality workflow passes on PR/main.
- This runbook and phase report match current repo behavior.
