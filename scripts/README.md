# Scripts

- `build/build-songs-html.js` inject song cards + song views into `index.html`
- `build/build-sw-assets.js` generate `public/sw-assets.js` (dev) or `dist/sw-assets.js` (build)
- `build/build-wasm.js` build Rust crates via `wasm-pack`
- `build/copy-wasm.js` copy WASM artifacts into `src/core/wasm/`
- `build/check-budgets.js` validate build size budgets
- `build/budgets.json` perf budget thresholds
- `dev/start-preview.sh` start simple HTTP preview server
- `qa/qa-screenshots.mjs` capture QA screenshots into `docs/reports/qa/screenshots/`
- `maintenance/cleanup-organization.sh` repo cleanup + archive helpers
