# Build Scripts

- `build-songs-html.js` injects song cards + song views into `index.html`.
- `build-sw-assets.js` generates `public/sw-assets.js` (dev) or `dist/sw-assets.js` (build).
- `build-wasm.js` builds Rust crates via `wasm-pack`.
- `copy-wasm.js` copies WASM artifacts into `src/core/wasm/`.
- `check-budgets.js` validates build size budgets.
- `budgets.json` perf budget thresholds.
