# Handoff Guide

Last updated: 2026-02-15

## Project Snapshot

- Stack: Rust/WASM app + web shell + optional iOS wrapper bundle.
- Runtime focus: offline-first PWA workflows for violin practice.
- Build pipeline: Trunk + Node scripts for asset staging, SW assets, WASM optimization, and budget checks.

## First 15 Minutes

1. Read `README.md`.
2. Read `docs/rebuild/05-architecture.md`.
3. Run:

```bash
npm install
npm run lint
npm test
npm run token:budget
```

4. Start app:

```bash
npm run dev
```

## Critical Paths

- Rust source of truth: `rust/`
- Web shell and static app files: `src/`, `public/`
- Tests: `tests/`
- Build/maintenance automation: `scripts/`
- iOS mirrored bundle: `native/ios/EmersonViolinShell/Resources/pwa/`

## Release Checklist (Local)

```bash
npm run build
npm run build:wasm-opt
npm run build:budgets
npm run ios:bundle
```

Optional QA:

```bash
node scripts/qa/qa-screenshots.mjs
node scripts/qa/perf-report.js --input <perf.json> --output docs/reports/qa/perf-audit.md
```

## Documentation Rules

- Keep canonical architecture in `docs/rebuild/05-architecture.md`.
- Add new plans to `docs/plans/` with `YYYY-MM-DD-*.md`.
- Keep historical material in `docs/_archived/legacy-docs/`.
- Keep AI context docs in `docs/ai/` concise and update summaries when entry points change.

## Operational Notes

- `prune-legacy.js` runs in `predev`, `prebuild`, `prepreview`, and `prelint`. Expect file pruning before most commands.
- `token-budget.js` uses `docs/ai/IGNORE.md` as the exclusion list for token-efficiency reporting.
- iOS shell resources mirror build output; do not hand-edit files under `native/ios/EmersonViolinShell/Resources/pwa/` unless intentionally patching mirrored output behavior.
