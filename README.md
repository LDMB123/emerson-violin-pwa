# Emerson Violin Studio (PWA)

Offline-first Rust/WASM + web shell for violin practice workflows.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Requirements

- Node.js `>=20`
- Rust toolchain
- `wasm32-unknown-unknown` target: `rustup target add wasm32-unknown-unknown`
- Trunk: `cargo install trunk`

## Common Commands

```bash
# development
npm run dev
npm run dev:threads

# production build + post-build optimizations
npm run build
npm run build:wasm-opt
npm run build:budgets

# quality gates
npm run lint
npm test
npm run token:budget
```

## Repository Map

- `rust/` core application logic compiled to WASM
- `src/` shell styles/assets and web-facing source
- `public/` static runtime assets and manifest/service-worker inputs
- `tests/` unit and e2e coverage
- `scripts/` build/dev/maintenance/qa tooling
- `docs/` architecture, plans, QA reports, and handoff docs
- `native/ios/` iOS shell bundle and mirrored PWA assets

## Handoff Docs

- `docs/HANDOFF.md` current takeover guide
- `docs/README.md` complete documentation index
- `scripts/README.md` script catalog
