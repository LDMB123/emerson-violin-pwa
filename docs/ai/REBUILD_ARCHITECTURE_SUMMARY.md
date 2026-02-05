# Rebuild Architecture Summary (Token-Optimized)

- Source: `docs/rebuild/05-architecture.md`

## Frontend Shell
- Single-page shell in `index.html` with hash navigation
- Routing via CSS `:target`/`:has`
- Trunk loads Rust/WASM + CSS (no hand-written JS entrypoint)

## Core Modules (high-level)
- DOM helpers, storage, session/flow, tuner/metronome/recorder
- ML heuristic coach + capture/worklet, PWA install/SW/offline/reminders
- Exports + teacher exports, games + score following, telemetry
- Capabilities, reflection, share inbox, tools, tone

## Styling + Build
- `src/styles/tokens.css` tokens
- `src/styles/app.css` layout + components
- `Cargo.toml`, `Trunk.toml` build config

## Persistence (source doc)
- localStorage: `shell:preferences`, `shell:install-dismissed`, `shell:reminder`, `shell:update-channel`, `shell:update-last-check`, `flow-state`, `session-reflection:*`, `ml-state`, `ml-thresholds`, `launch:game-type`
- IndexedDB v4: `sessions`, `recordings`, `syncQueue`, `shareInbox`, `mlTraces`, `gameScores`, `scoreLibrary`, `assignments`, `profiles`, `telemetryQueue`, `errorQueue`, `scoreScans`

## Offline
- `public/sw.js` service worker
- `public/sw-assets.js` dev cache manifest, `dist/sw-assets.js` build
- Cache-first shell assets; allowlisted network for API endpoints

## Native APIs & Modern CSS
- Chromium 143+ features: `:has`, `color-mix`, `@layer`, `dialog`, `popover`
- Optional: View Transitions + anchor positioning

## Future Extensions (source doc)
- WASM guidance engine core
- ML inference pipeline (Core ML → WebGPU → WASM)
- Reintroduce practice tools after new stack ships

## Performance Budgets
- `scripts/build/budgets.json` enforces gzip budgets
