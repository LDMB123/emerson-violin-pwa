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

## Known-Good Baseline (2026-02-28)

- Branch: `main`
- Latest commit: `5bffce7` (build(wasm): rebuild with LTO + dead export removal; panda-audio -17%)
- Unit tests: 570 passing
- E2E tests: 45 passing
- All audits: passing
