# Architecture Overview

Last updated: 2026-02-15

## Frontend Shell
- Single-page shell in `index.html` with hash-based views.
- Anchor navigation + CSS `:target`/`:has` for routing (no JS router).
- Trunk loads Rust/WASM and bundles CSS; no hand-written JS entrypoint.

## Core Modules
- `rust/` modules:
  - `dom.rs` DOM helpers + selector contract
  - `storage.rs` IndexedDB + localStorage helpers
  - `session.rs`, `flow.rs` practice flow + summaries
  - `tuner.rs`, `metronome.rs`, `recorder.rs` studio tools
  - `ml.rs` heuristic coach + targets
  - `ml_capture.rs`, `audio_worklet.rs` local capture + tracing
  - `pwa.rs` install + SW updates + offline status + reminders
  - `exports.rs`, `teacher_exports.rs` JSON + teacher exports
  - `capabilities.rs`, `reflection.rs`, `share_inbox.rs`, `tools.rs`, `tone.rs`
  - `games.rs`, `game_scores.rs`, `score_following.rs`, `pose_capture.rs`, `telemetry.rs`
- `src/styles/tokens.css`: color/type/spacing tokens.
- `src/styles/app.css`: shell layout, cards, popover, dialog.
- `Cargo.toml` + `Trunk.toml`: build configuration.

## Data Persistence
- localStorage keys:
  - `shell:preferences`: accessibility toggles.
  - `shell:install-dismissed`: install banner state.
  - `shell:reminder`: reminder schedule.
  - `shell:update-channel`, `shell:update-last-check`: update channel + last check.
  - `flow-state`: daily checklist state.
  - `session-reflection:*`: daily reflection text.
  - `ml-state`, `ml-thresholds`: ML heuristic state.
  - `launch:game-type`: protocol handler context.
- IndexedDB (v4):
  - `sessions`, `recordings`, `syncQueue`, `shareInbox`
  - `mlTraces`, `gameScores`, `scoreLibrary`, `assignments`, `profiles`
  - `telemetryQueue`, `errorQueue`, `scoreScans`

## Offline
- Service worker: `public/sw.js`.
- Cache manifest: `public/sw-assets.js` (dev), `dist/sw-assets.js` (build).
- Cache-first for shell assets, allowlisted network for API endpoints.

## Native APIs & Modern CSS
- Chromium 143+ features: `:has`, `color-mix`, `@layer`, `dialog`, `popover`.
- Optional: View Transitions + anchor positioning when needed.

## Future Extensions
- Rust/WASM guidance engine core.
- ML inference pipeline (Core ML → WebGPU → WASM) as documented in `docs/rebuild/ml-stack.md`.
- Reintroduce practice tools once the new stack ships.

## Performance Budgets
- Gzip budgets enforced in `scripts/build/budgets.json`.
