# File Map (Token-Optimized)

**Start Here**
- `src/app.js`
- `index.html`
- `docs/ai/PROJECT_CONTEXT.md`
- `docs/ai/IGNORE.md`
- `docs/README.md`
- `docs/ARCHIVE_POLICY.md`

**Core Modules**
- `src/core/platform/` PWA + iPadOS platform helpers, install guide, offline mode, SW updates
- `src/core/persistence/` IndexedDB KV + blob storage
- `src/core/ml/` recommendations, adaptive tuning, offline scheduler
- `src/core/utils/` shared helpers (skill profile, recording export)
- `src/core/audio/` tone playback utilities
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
- `src/styles/tokens.css` design tokens
- `public/assets/mockups/README.md` mockup usage
- `docs/assets/mockups/` archived mockups
- `docs/assets/README.md` docs assets guide

**Scripts**
- `scripts/build/` build helpers (songs HTML, SW assets)
- `scripts/README.md` script index
- `scripts/qa/` QA tooling
- `scripts/maintenance/` cleanup helpers

**Tests**
- `tests/README.md` test overview
- `tests/e2e/README.md` Playwright notes
