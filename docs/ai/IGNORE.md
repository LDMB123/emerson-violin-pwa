# Ignore List (Token-Optimized)

- `node_modules/` generated dependencies
- `.worktrees/` local worktree checkouts
- `dist/`, `test-results/`, `playwright-report/`, `coverage/` build/test artifacts
- `public/assets/mockups/` PWA screenshots referenced by manifest
- `docs/assets/mockups/` archived UI mockups
- `docs/reports/qa/screenshots/` generated QA images
- `public/assets/audio/` audio assets unless debugging playback
- `public/assets/icons/` icon binaries unless manifest work
- `public/assets/illustrations/` large illustrations unless UI asset work needed
- `public/assets/badges/` large images unless badge UI work needed
- `src/core/wasm/` generated bindings unless WASM debugging needed
- `wasm-src/` Rust sources unless WASM core changes needed
