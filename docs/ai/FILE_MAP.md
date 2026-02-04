# File Map (Token-Optimized)

**Start Here**
- `README.md`
- `Cargo.toml`
- `Trunk.toml`
- `package.json`
- `index.html`
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

**Docs**
- `docs/rebuild/` IA + UX + design system docs
- `docs/feature-inventory.md` legacy feature inventory

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

**Tests**
- `tests/rebuild/*.test.js`
- `tests/e2e/app.spec.js`
