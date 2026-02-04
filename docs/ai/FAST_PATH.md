# Fast Path (60s)

## Open These First
- `README.md` project overview + commands
- `docs/ai/PROJECT_CONTEXT.md` product + architecture summary
- `docs/ai/FILE_MAP.md` file map
- `index.html` shell UI
- `rust/lib.rs` WASM runtime entry
- `src/styles/app.css`

## Then, Based on Task
- UI behavior: `index.html`, `rust/`, `src/styles/*`
- Offline: `scripts/build/build-sw-assets.js`, `public/sw.js`, `public/offline.html`
- Planning/strategy: `docs/rebuild/`

## Avoid Until Needed
- `docs/assets/` (archived assets)
- `node_modules/`, `dist/`, `test-results/`, `playwright-report/`
