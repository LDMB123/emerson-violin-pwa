# Ignore List (Token-Optimized)

- `node_modules/` generated dependencies
- `dist/`, `test-results/`, `playwright-report/`, `coverage/` build/test artifacts
- `_archived/` legacy assets
- `public/assets/mockups/` PWA screenshots referenced by manifest
- `docs/assets/mockups/` archived UI mockups
- `docs/reports/qa/screenshots/` generated QA images
- `_archived/build-artifacts/` old build/test outputs
- `_archived/legacy/` deprecated snapshots
- `public/assets/badges/` large images unless badge UI work needed
- `src/core/wasm/` generated bindings unless WASM debugging needed
- `wasm-src/` Rust sources unless WASM core changes needed
