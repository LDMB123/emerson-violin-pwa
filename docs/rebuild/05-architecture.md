# Architecture Overview

## Frontend Shell
- Single-page shell in `index.html` with hash-based views.
- Bottom nav anchors + CSS `:target`/`:has` for routing (no JS router).
- Trunk loads Rust/WASM and bundles CSS; no hand-written JS entrypoint.

## Core Modules
- `rust/` modules:
  - `dom.rs` DOM helpers + selector contract
  - `storage.rs` IndexedDB + localStorage helpers
  - `session.rs`, `flow.rs` practice flow + summaries
  - `tuner.rs`, `metronome.rs`, `recorder.rs` studio tools
  - `ml.rs` heuristic coach + targets
  - `pwa.rs` install + SW updates + offline status
  - `exports.rs` JSON exports
  - `capabilities.rs`, `reflection.rs`, `share_inbox.rs`, `tools.rs`, `tone.rs`
- `src/styles/tokens.css`: color/type/spacing tokens.
- `src/styles/app.css`: shell layout, cards, popover, dialog.
- `Cargo.toml` + `Trunk.toml`: build configuration.

## Data Persistence
- localStorage keys:
  - `shell:preferences`: accessibility toggles.
  - `shell:install-dismissed`: install banner state.
- IndexedDB (v3):
  - `sessions`, `recordings`, `syncQueue`, `shareInbox`

## Offline
- Service worker: `public/sw.js`.
- Cache manifest: `public/sw-assets.js` (dev), `dist/sw-assets.js` (build).

## Future Extensions
- Rust/WASM guidance engine core.
- ML inference pipeline (Core ML → WebGPU → WASM) as documented in `docs/rebuild/ml-stack.md`.
- Reintroduce practice tools once the new stack ships.
