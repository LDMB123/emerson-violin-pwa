# Scripts Index

## Build (`scripts/build/`)

- `build-sw-assets.js` build service-worker asset manifest for `public/` or `dist/`
- `copy-sqlite-wasm.js` stage SQLite WASM runtime
- `optimize-wasm.js` run `wasm-opt -Oz` when Binaryen is available
- `check-budgets.js` enforce bundle/build budgets from `budgets.json`
- `copy-pwa-to-ios.js` copy `dist/` into iOS shell resources
- `update-ios-plist.js` update iOS content-version metadata

## Dev (`scripts/dev/`)

- `start-preview.sh` run static preview server for built output

## QA (`scripts/qa/`)

- `qa-screenshots.mjs` capture QA screenshots to `docs/reports/qa/screenshots/`
- `perf-report.js` convert perf JSON into Markdown
- `perf-bundle.js` package perf JSON, report, metadata, and screenshots

## Maintenance (`scripts/maintenance/`)

- `prune-legacy.js` remove legacy code paths/assets before build/lint/dev
- `token-budget.js` report token footprint and ignored paths
- `stash-audit.js` inspect worktree diff and summarize changes
- `install-hooks.sh` install local git hooks
- `cleanup-organization.sh` repository cleanup/archive helper
