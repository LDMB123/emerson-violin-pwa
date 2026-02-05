# File Map (Token-Optimized)

**Start Here**
- `README.md`
- `Cargo.toml`
- `Trunk.toml`
- `package.json`
- `index.html`
- `docs/ai/INDEX_SUMMARY.md`
- `docs/ai/RUST_MODULE_SUMMARY.md`
- `docs/ai/SW_SUMMARY.md`
- `docs/ai/STYLES_SUMMARY.md`
- `docs/ai/FEATURE_INVENTORY_SUMMARY.md`
- `docs/ai/REBUILD_UX_SUMMARY.md`
- `docs/ai/API_DOC_SUMMARY.md`
- `docs/ai/NATIVE_IOS_SUMMARY.md`
- `docs/ai/REBUILD_ARCHITECTURE_SUMMARY.md`
- `docs/ai/CLAUDE_OPTIMIZATION_SUMMARY.md`
- `docs/ai/CLAUDE_COMPRESSION_SCHEDULE_SUMMARY.md`
- `docs/ai/LEGACY_STRATEGY_SUMMARY.md`
- `docs/ai/QA_REPORTS_SUMMARY.md`
- `rust/lib.rs`
- `src/styles/app.css`
- `src/styles/tokens.css`
- `docs/rebuild/05-architecture.md`

**Runtime**
- `index.html` command center UI
- `rust/` Rust/WASM runtime modules
- `public/offline.html` offline fallback
- `public/sw.js` service worker
- `public/sw-assets.js` SW cache manifest (dev)

**AI Summaries**
- `docs/ai/INDEX_SUMMARY.md` section map
- `docs/ai/RUST_MODULE_SUMMARY.md` module map
- `docs/ai/SW_SUMMARY.md` service worker map
- `docs/ai/STYLES_SUMMARY.md` style map
- `docs/ai/FEATURE_INVENTORY_SUMMARY.md` legacy feature map
- `docs/ai/REBUILD_UX_SUMMARY.md` UX audit summary
- `docs/ai/API_DOC_SUMMARY.md` API + export docs
- `docs/ai/NATIVE_IOS_SUMMARY.md` iOS shell summary
- `docs/ai/REBUILD_ARCHITECTURE_SUMMARY.md` architecture summary
- `docs/ai/CLAUDE_OPTIMIZATION_SUMMARY.md` Claude optimization summary
- `docs/ai/CLAUDE_COMPRESSION_SCHEDULE_SUMMARY.md` Claude schedule summary
- `docs/ai/LEGACY_STRATEGY_SUMMARY.md` archived strategy summary
- `docs/ai/QA_REPORTS_SUMMARY.md` QA reports summary

**Docs**
- `docs/rebuild/` IA + UX + design system docs
- `docs/feature-inventory.md` legacy feature inventory
- `docs/_archived/` legacy docs (avoid unless historical)

**Configs**
- `Trunk.toml`
- `Cargo.toml`
- `eslint.config.js`
- `vitest.config.js`
- `playwright.config.js`

**Scripts**
- `scripts/build/build-sw-assets.js`
- `scripts/build/check-budgets.js`
- `scripts/maintenance/prune-legacy.js`
- `scripts/maintenance/token-budget.js`

**Tests**
- `tests/rebuild/*.test.js`
- `tests/e2e/app.spec.js`
