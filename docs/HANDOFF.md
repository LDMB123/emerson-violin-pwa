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

## What Has Been Done

Major development phases (Feb 17–28, 2026):

- **Architecture** — Declarative module registry (`src/app/module-registry.js`), async render gate, idle prefetch, `requestIdleCallback` staggering
- **Persistence** — IndexedDB-first with localStorage fallback, retry-safe DB open, concurrent refresh dedup
- **Lifecycle hardening** — bfcache-safe `pagehide` guards across all games and non-game surfaces, per-game deactivation hooks in shell, tone/audio/sample cleanup on navigation
- **Games** — 18 games: Bow Hero, Duet Challenge, Dynamic Dojo, Ear Trainer, Echo, Melody Maker, Note Memory, Pitch Quest, Pizzicato, Rhythm Dash, Rhythm Painter, Scale Practice, Sequence Game, Stir Soup, Story Song, String Quest, Tuning Time, Wipers — with shared `canvas-engine-base.js`, full-bleed immersive layouts, mastery progression system
- **Song library** — 21 playable song sheets under `public/views/songs/`
- **QA tooling** — Critical coverage gate, feature module completeness audit, dead code audit (knip), dependency dupe audit, secret scanner, view-sync audit, a11y audit, learning audit
- **CI** — Quality workflow with lint, audits, unit tests, build, perf budgets, Playwright E2E on iPad Safari
- **Performance budgets** — FCP/LCP enforcement with calibration/recommendation/guardrail pipeline
- **UI polish** — Dialog centering, onboarding dot centering, bottom-nav clearance, game empty states, CSS dead code removal
- **CSS polish** — Missing styles for settings/help/about/backup/privacy/progress/parent/tuner/trainer/coach views; shared game CSS classes; orphaned rule cleanup; CSS token/variable consolidation
- **Coach cleanup** — Connected speech bubble to coach-actions.js; removed dead DOM queries and dead functions from focus-timer.js; fixed mission-progress-render.js anchor selectors; consolidated formatCountdown into session-timer.js; added `.is-typing`/`.is-revealed` animation CSS
- **Security** — CSP hardening, referrer/permissions-policy metas, secret leak scanning
- **Safari 26.2 / iPadOS 26.2 hardening** — Fixed WASM export mismatch in `panda_audio.js` (`RhythmResult.rhythm_offset_ms`); added iOS AudioContext `interrupted` state handling in tone-player; replaced deprecated `window.orientationchange` with `screen.orientation.change`; fixed SW `clients.claim()` race and added `'audioworklet'` to `STATIC_DESTINATIONS`; removed `user-scalable=no` WCAG violation; fixed `translateZ(1000px)` compositing layer and `100vh→100dvh` in games.css; added `desynchronized:true` to canvas 2D context; added LCP hero image preload + async Google Fonts; applied `Map.getOrInsertComputed` (Safari 26.2+) to module-registry, view-loader, progress-model-primary
- **Canvas + platform polish** — Fixed RAF lifecycle in `canvas-engine.js` (store rafId, cancelAnimationFrame on stop() — previously chain continued one extra frame after stop); added `{ passive: true }` to `visualViewport` resize/scroll listeners in `viewport-offset-controller.js`
- **WASM optimization** — Removed 4 dead `#[wasm_bindgen]` exports from panda-audio (rhythm analysis reimplemented natively in JS); moved `[profile.release]` from per-crate Cargo.toml (silently ignored) to workspace root; panda-audio binary reduced 36KB→30KB (-17%); fixed O(events) `calculate_streak` hot loop to O(unique_days) in `progress-model-primary.js`; corrected test mock semantics for trailing-streak behavior
- **WASM dead code pass 1** — Removed duplicate `calculate_rms` method (≡ `compute_rms` free fn); deleted 5 dead rhythm functions (`analyze_onset`, `estimate_tempo_bpm`, `compute_rhythm_offset_ms`, `analyze_rhythm_frame`, `median`) already reimplemented in JS; removed dead `XpRewards` struct (never instantiated in any computation) and `Achievement.unlock_date` field (stored but no getter exposed via wasm_bindgen); restricted `VIOLIN_STRINGS` to `pub(crate)`; panda-core binary -161B; 146 lines net removed
- **WASM dead code pass 2** — Deleted `RhythmResult` struct + 5 getters (no constructor fn — JS can never receive an instance after `analyze_rhythm_frame` removed in pass 1); deleted `VIOLIN_STRINGS` const + `PitchDetector::get_nearest_string` (exported but zero callsites in app JS); removed `SkillProfile::sample_count` field (written but no getter, never consumed); removed 5 dead per-category `update_*` wrapper methods (`update_pitch/rhythm/bow_control/posture/reading` — JS calls `update_skill(SkillCategory.X, score)` directly); 206 lines deleted; panda-audio -1404B (-4.7%), panda-core -1262B (-2.7%)
- **WASM dead code pass 3** — Removed `Achievement` `#[wasm_bindgen]` export + 5-getter impl block (JS never receives `Achievement` instances — uses BADGE_META dict + `is_unlocked()` bool); deleted `SkillProfile::overall()` (JS computes average inline); made `PlayerProgress::add_xp()` private (internal-only, called by `log_*` methods); removed 3 dead getters: `total_minutes`, `songs_completed`, `games_played` (zero app JS callsites); deleted `EchoBuffer::get_buffer_ptr()` (raw pointer API, app uses `extract_envelope()` exclusively); 175 lines net deleted; 570/570 tests pass
- **WASM dead code pass 4** — Removed `AchievementTracker::unlocked_count()` + `total_count()` (zero app JS + test callsites; JS uses `is_unlocked()` bool per badge); removed `EchoBuffer::get_size()` (zero app JS + test callsites; worklet never queries buffer size); 40 lines deleted; 570/570 tests pass; all remaining exports fully verified against app JS callsites — no further dead exports remain
- **WASM dead code pass 5** — Removed 3 dead `Achievement` struct fields (`name`, `description`, `icon`): set in `new()` but never read by any method; JS uses `BADGE_META` dict exclusively; `Achievement` struct made private + removed from `pub use` re-export. Removed `Serialize, Deserialize` derives + `serde` imports from `xp.rs`, `skills.rs`, `achievements.rs`; `serde`/`serde-wasm-bindgen` deps removed from all 3 Cargo.toml files (never imported in any source). Simplified `add_xp()` + `check_level_up()` return type `bool → ()` (all callers discarded result). Deduped inline RMS loop in `extract_envelope()` → calls `compute_rms()`. 92 lines net deleted; 570/570 tests pass; **WASM dead code audit COMPLETE** — all exported symbols + struct fields + derives + Cargo deps verified; total ~659 lines removed across passes 1-5
- **JS deduplication pass** — Exhaustive audit of all ~150 JS modules for duplicate/redundant functions (5 parallel agents); confirmed-safe fixes across 3 commits: scheduler cross-browser guard added, dead frustration-state code removed, redundant `pitchCents` key eliminated; `clamp()` inline patterns consolidated across realtime/audio modules; inline `wait()`, `todayDay()`, and `DEFAULT_MASTERY_THRESHOLDS` constant duplicates replaced with canonical imports from `tone-player/shared.js`, `utils/math.js`, and `utils/mastery-utils.js`; `Math.min/max` inline clamp patterns replaced in `dynamic-dojo.js`, `song-player-controls.js`, `song-player-view.js`; E2E timing hardened for rhythm-dash on iPad Safari; 570/570 unit tests + 45/45 E2E pass
- **JS deduplication pass 2** — Second exhaustive duplicate audit (5 parallel agents across all subsystems); exported `clone` (JSON round-trip) + `dayFromTimestamp` from `utils/math.js` as canonical utilities; removed local `clone` from 5 consumers (`song-library.js`, `song-progression.js`, `game-mastery.js`, `curriculum/state.js`, `curriculum/content-loader.js`); removed local `dayFromTimestamp` from `loaders.js` (identical to canonical export); `clampScore` in `loaders.js` uses `clamp()` internally (null-for-non-finite API preserved); added `ensureChildDiv` factory to `song-search-refresh.js` collapsing 3 identical DOM helper functions; skipped: `formatCountdown` (different units/semantics), `average` (3 variants with different null-handling), `weakestSkillFromValues` (architectural concern), `normalizeSongStars` (different algorithm), `createEmptyElements` (different return shapes); 22 insertions / 40 deletions; 570/570 unit tests + 45/45 E2E pass
- **JS deduplication pass 3** — Third exhaustive audit (5 parallel agents); 2 confirmed-safe fixes: (1) `ear-trainer-canvas.js` imports `createAudioContext()` from `audio-context.js` (removed inline `window.AudioContext || window.webkitAudioContext` ctor resolution); also fixed `'suspended'`-only AudioContext state checks → `'suspended' || 'interrupted'` per CLAUDE.md iOS gotcha; (2) `song-search-refresh.js` `applyRecommendedBadges()` uses in-scope `ensureChildDiv` instead of 5-line manual div creation; skipped: `bindElementOnce` (4 platform files but 2 lack `platform-utils.js` import — would need new shared file), `60000/bpm` consolidation (`computeBeatInterval` already in `rhythm-dash-utils.js` but bad architectural dep for audio modules), `median` worklet (self-contained, single callsite), `createOnceGuard()` (more verbose than inline boolean); 6 insertions / 10 deletions; 570/570 unit tests + 45/45 E2E pass
- **JS deduplication pass 4** — Consolidated `ensureChildDiv` to `dom-utils.js`; added `setAriaCurrent`, `setAriaPressed`, `updateProgressAttribute` DOM helpers; added canonical `average(values, fallback=0)` to math.js; removed local `ensureChildDiv` from song-search-refresh.js; added to song-progress-ui.js; removed local `average` from engine-flow.js + progress-model-fallback.js; replaced inline `setAttribute` pairs in metronome-controller-view.js + navigation-controller.js; -37 lines; 570/570 unit tests + 45/45 E2E pass
- **JS deduplication pass 5** — Removed private `formatStars`/star constants from progress-core-render.js (replaced with `starString` from session-review-utils.js); deleted dead `filterSongEvents()` from session-review-utils.js (zero app callsites, duplicate of `buildSongEvents`; 3 associated tests removed); -35 lines; test count corrected 570→567; 567/567 unit tests + 45/45 E2E pass
- **JS deduplication pass 6** — Added `clampRounded(value, min, max)` + `positiveRound(value)` to math.js; added `emitEvent(name, detail)` to event-names.js; added missing `handlePointerDown` to note-memory-canvas.js + string-quest-canvas.js; removed dead `filterSongEvents` import (missed in pass 5); 42 files migrated to `emitEvent` + new math helpers; 567/567 unit tests + 45/45 E2E pass
- **JS deduplication pass 7** — Added `setHidden(el, hidden)` + `setDisabled(el, disabled)` null-safe setters to dom-utils.js; added `durationToMinutes(seconds, roundFn)` + `percentageRounded(num, denom)` to math.js; added `mapPointerToCanvasCoords(event, canvas, w, h)` to canvas-utils.js (replacing 5-line getBoundingClientRect+scale pattern across 4 game canvas files); 567/567 unit tests + 45/45 E2E pass
- **JS deduplication pass 8** — `clampRounded` adopted in 6 files across 9 callsites replacing inline `Math.round(Math.min/Math.max(...))` patterns; 567/567 unit tests + 45/45 E2E pass
- **JS deduplication pass 9** — Consolidated `DAY_MS = 86_400_000` into math.js; moved `reviewIntervalDays` to shared utils; replaced inline `86400000` literals across curriculum, progress, and recommendations modules; removed `SONG_MASTERY_THRESHOLDS` duplicate; 567/567 unit tests + 45/45 E2E pass
- **JS deduplication pass 10** — `DEFAULT_MASTERY_THRESHOLDS` adopted across all remaining hardcoded `60/80/92` sites (6 files replacing inline object literals); JS dedup audit COMPLETE — all viable dedup opportunities applied; 567/567 unit tests + 45/45 E2E pass
- **JS dead code pass 11** — Extracted `finiteOrZero(x)` + `atLeast1(x)` to math.js; added event-name string constants to event-names.js (replacing bare string literals across event emitters/listeners); extracted view hash parsing utilities to view-hash-utils.js; ~44 files migrated; 567/567 unit tests + 45/45 E2E pass
- **JS dead code pass 12** — Extracted `finiteOrNow(x)` to math.js; extracted `eventScore(event)` to event-score.js; fixed game lifecycle defects in tuning-time.js, stir-soup.js, wipers.js: self-removing hashchange listeners + `bound` flag to prevent zombie RT_STATE listeners after navigation; 567/567 unit tests + 45/45 E2E pass
- **JS dead code pass 13** — echo.js: `dispose()` called at start of `init()` removes document listeners on re-entry; dynamic-dojo.js: `active` flag guards `setTimeout`→`checkGameOver` path (prevents zombie RT_STATE listener registration after navigation cleanup); engine-flow.js: removed private `asNumber` helper, adopted `finiteOrZero`; recommendations-mastery.js: removed trivial passthrough alias `masteryScoreForEvent`; recommendations-core.js: removed dead `metronomeTuning: { targetBpm: 90 }` stub; parent-recordings-data.js: replaced wrong `clamp(recordings.length, 1, maxVisible)` → `slice(0, maxVisible)`; 567/567 unit tests + 45/45 E2E pass
- **JS dead code pass 14 (devil's advocate review)** — Click handler stacking fixed in echo.js, stir-soup.js, wipers.js: start-button handlers elevated to module-level `let ref = null`; `removeEventListener` before re-adding on each `init()` call (anonymous arrow functions create new object refs each call — cannot be removed otherwise); engine-flow.js:25: remaining inline `Number.isFinite` ternary migrated to `finiteOrZero`; recommendations-utils.js: private `average` removed, import from math.js; vite.config.js dev SW change reverted (intentional one-shot cleanup SW — `clients.claim()` must precede `registration.unregister()`; reversal caused E2E regression); JS production readiness audit COMPLETE; 567/567 unit tests + 45/45 E2E pass
- **Safari 26.2 API adoption** — `Math.sumPrecise()` adopted in math.js; `scrollend` event adopted in navigation; Navigation API + CSS nesting improvements; `document.activeViewTransition?.skipTransition()` in navigation-controller.js to abort in-flight View Transitions before starting new ones (Safari 26.2+ / Chrome 111+); CSS `sibling-index()` for skeleton-bar stagger in app.css (replaces `:nth-child` selector stacks); `Map.getOrInsertComputed` adopted in recommendations-mastery.js; pre-existing chained ternary in `withMasteryTier` replaced with if/else chain; CLAUDE.md updated with new patterns + Code Style section; 567/567 unit tests + 45/45 E2E pass

Historical phase-by-phase details are available in git history and archived plan docs under `_archived/plans/`.

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

`npm run handoff:verify` runs all of the above in sequence.

## Playwright Worker Profiles

Playwright worker defaults:

- CI: `workers=1`
- local development: `workers=2`

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

## Intentional/Expected Caveats

- `audit:perf` enforces LCP via native LCP entries when available, falls back to Chromium `FirstMeaningfulPaint` delta when unavailable.
- `audit:perf` supports mode toggling via `PERF_BUDGET_REPORT_ONLY` (`false` = blocking, `true` = report-only).
- Realtime E2E hooks are localhost-only and inert unless both `window.__PANDA_E2E_HOOKS__` and `window.__PANDA_E2E_RT_SIMULATE_START__` are set to `true`.
- Duplicate dependency audit allowlists known transitive duplicates: `entities`, `fsevents`, `whatwg-mimetype`.
- `depcheck` may report `@vitest/coverage-v8` unused; coverage is invoked by CLI config, so this is expected.

## Files to Read Before Editing

1. `docs/HANDOFF.md` (this file)
2. `CLAUDE.md`
3. `README.md`

## Recommended Next Work (Ordered)

1. Calibrate CI LCP/FCP thresholds from downloaded workflow artifacts:
   ```bash
   PERF_BUDGET_RECOMMENDATION_WINDOW_DAYS=30 npm run audit:perf:recommend -- <artifact-folder>
   ```
2. Apply calibrated values:
   ```bash
   npm run audit:perf:apply -- artifacts/perf-budget-recommendation.json .github/workflows/quality.yml
   ```
3. Monitor PR noise for 1-2 weeks after threshold update.
4. Consider replacing guarded realtime E2E start-simulation seam with a dedicated test harness.
5. Add more song content to the library.

## Definition of "Ready to Hand Off"

- `npm run handoff:verify` passes with no manual patching.
- CI quality workflow passes on PR/main.
- This runbook matches current repo behavior.

## Known-Good Baseline (2026-03-01)

- Branch: `main`
- Latest commit: `11c974f` (docs(agents): fix WASM module path in web-audio-specialist)
- Unit tests: 567 passing
- E2E tests: 45 passing
- All audits: passing
