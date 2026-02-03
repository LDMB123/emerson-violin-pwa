# File Map (Token-Optimized)

**Start Here**
- `README.md`
- `package.json`
- `src/app.js`
- `index.html`
- `manifest.webmanifest`
- `docs/ai/README.md`
- `docs/ai/FAST_PATH.md`
- `docs/ai/PROJECT_CONTEXT.md`
- `docs/ai/IGNORE.md`
- `docs/README.md`
- `docs/ARCHIVE_POLICY.md`

**Core Modules**
- `src/core/app/feature-registry.js` feature loading registry + prefetch map
- `src/core/platform/` PWA + iPadOS platform helpers, install guide, offline mode, SW updates
- `src/core/persistence/` IndexedDB KV + blob storage
- `src/core/persistence/integrity.js` storage checksums
- `src/core/ml/` recommendations, adaptive tuning, offline scheduler
- `src/core/ml/recommendations-engine.js` pure recommendation engine
- `src/core/ml/recommendations-worker.js` background worker for recommendations
- `src/core/utils/` shared helpers (skill profile, recording export)
- `src/core/audio/` tone playback utilities
- `src/core/audio/audio-budget.js` audio budget monitor
- `src/core/worklets/` AudioWorklet processor
- `src/core/wasm/` generated WASM bindings
- `src/core/wasm/README.md` generated output notes
- `wasm-src/` Rust sources for `panda-core` + `panda-audio`

**Feature Modules**
- `src/features/coach/` coach UX, focus timer, lesson plan
- `src/features/games/` game metrics + enhancements
- `src/features/trainer/` metronome + posture/bowing tools
- `src/features/tuner/` live tuner UI
- `src/features/songs/` song library + search
- `src/features/progress/` progress + achievements
- `src/features/analysis/` session review
- `src/features/parent/` parent zone
- `src/features/backup/` export/import
- `src/features/notifications/` reminders
- `src/features/recordings/` recording capture + history

**Data + Assets**
- `src/data/songs.json` canonical song data
- `public/assets/` images, audio, icons, mockups, badges, illustrations
- `public/sw.js` service worker
- `src/styles/tokens.css` design tokens
- `public/assets/*/README.md` per-asset category notes
- `public/assets/mockups/README.md` mockup usage
- `docs/assets/mockups/` archived mockups
- `docs/assets/README.md` docs assets guide

**Docs & Decisions**
- `docs/adr/README.md` architecture decision log
- `docs/strategy/README.md` planning index
- `docs/strategy/groundbreaking-foundation.md` foundation plan + pillars
- `docs/strategy/architecture-options.md` architecture paths + tradeoffs
- `docs/strategy/device-capability-matrix.md` device tiers + feature gating
- `docs/strategy/modernization-plan.md` modernization phases
- `docs/strategy/modernization-audit.md` audit map + targets
- `docs/strategy/wasm-rust-modernization.md` WASM/Rust roadmap
- `docs/strategy/worktree-plan.md` worktree scopes

**Reports**
- `docs/reports/README.md` reports index
- `docs/reports/qa/README.md` QA reports index
- `docs/reports/qa/ipad-mini-6-capture.md` iPad capture workflow + bundle script

**Configs**
- `vite.config.js` build tooling
- `eslint.config.js` lint rules
- `vitest.config.js` unit test config
- `playwright.config.js` e2e test config

**Scripts**
- `scripts/build/` build helpers (songs HTML, SW assets, WASM, budgets)
- `scripts/build/build-songs-html.js` inject song cards + song views into `index.html`
- `scripts/build/build-sw-assets.js` generate `public/sw-assets.js` (dev) or `dist/sw-assets.js` (build)
- `scripts/build/build-wasm.js` build Rust crates via `wasm-pack`
- `scripts/build/copy-wasm.js` copy WASM artifacts into `src/core/wasm/`
- `scripts/build/check-budgets.js` enforce build size budgets
- `scripts/build/budgets.json` perf budget thresholds
- `scripts/README.md` script index
- `scripts/dev/` local preview helpers
- `scripts/qa/` QA tooling
- `scripts/qa/perf-report.js` perf JSON to markdown report
- `scripts/qa/perf-bundle.js` perf bundle generator
- `scripts/maintenance/` cleanup helpers

**Tests**
- `tests/README.md` test overview
- `tests/e2e/README.md` Playwright notes
- `tests/unit/README.md` Vitest notes
