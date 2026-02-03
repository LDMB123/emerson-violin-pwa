# Fast Path (60s)

## Open These First
- `README.md` project overview + commands
- `docs/ai/PROJECT_CONTEXT.md` product + architecture summary
- `docs/ai/FILE_MAP.md` file map
- `index.html` app shell + views
- `src/app.js` boot + routing + view wiring

## Then, Based on Task
- UI behavior: `src/features/*`
- Platform/offline: `src/core/platform/*`, `scripts/build/build-sw-assets.js`
- Data/storage: `src/core/persistence/*`
- Audio/tuner: `src/core/worklets/*`, `src/features/tuner/*`
- Feature loading: `src/core/app/feature-registry.js`
- WASM: `src/core/wasm/*` (generated) and `wasm-src/*` (sources)
- QA/perf: `docs/reports/qa/README.md`, `scripts/build/check-budgets.js`
- Planning/strategy: `docs/strategy/README.md`

## Avoid Until Needed
- `docs/assets/mockups/` (archived UI shots)
- `docs/reports/qa/screenshots/` (generated images)
- `public/assets/badges/` (large images)
- `node_modules/`, `dist/`, `test-results/`, `playwright-report/`
