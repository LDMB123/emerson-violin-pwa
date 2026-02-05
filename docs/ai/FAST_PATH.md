# Fast Path (60s)

## Open These First
- `README.md` project overview + commands
- `docs/ai/PROJECT_CONTEXT.md` product + architecture summary
- `docs/ai/FILE_MAP.md` file map
- `docs/ai/INDEX_SUMMARY.md` `index.html` section map
- `docs/ai/RUST_MODULE_SUMMARY.md` Rust/WASM module map
- `docs/ai/SW_SUMMARY.md` service worker summary
- `docs/ai/STYLES_SUMMARY.md` CSS summary
- `docs/ai/FEATURE_INVENTORY_SUMMARY.md` legacy feature map
- `docs/ai/REBUILD_UX_SUMMARY.md` UX audit summary
- `docs/ai/API_DOC_SUMMARY.md` API + export docs
- `docs/ai/NATIVE_IOS_SUMMARY.md` iOS shell summary
- `docs/ai/REBUILD_ARCHITECTURE_SUMMARY.md` architecture summary
- `docs/ai/CLAUDE_OPTIMIZATION_SUMMARY.md` Claude optimization summary
- `docs/ai/CLAUDE_COMPRESSION_SCHEDULE_SUMMARY.md` Claude schedule summary
- `docs/ai/LEGACY_STRATEGY_SUMMARY.md` archived strategy summary
- `docs/ai/QA_REPORTS_SUMMARY.md` QA reports summary
- `index.html` shell UI
- `rust/lib.rs` WASM runtime entry
- `src/styles/app.css`

## Then, Based on Task
- UI behavior: `index.html`, `rust/`, `src/styles/*`
- Offline: `scripts/build/build-sw-assets.js`, `public/sw.js`, `public/offline.html`
- Token budget: `npm run token:budget`
- Planning/strategy: `docs/rebuild/`

## Avoid Until Needed
- `docs/assets/` (archived assets)
- `docs/_archived/`, `docs/reports/qa/` legacy + QA docs
- `native/ios/EmersonViolinShell/Resources/pwa/` iOS shell PWA mirror
- `package-lock.json`, `Cargo.lock` lockfiles
- `node_modules/`, `.worktrees/`, `dist/`, `target/`, `coverage/`, `test-results/`, `playwright-report/`
