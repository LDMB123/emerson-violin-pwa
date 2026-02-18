# Debug + Optimization + Cleanup Handoff (2026-02-18)

## Scope

- Runtime debugging and performance stabilization for current app state
- Dead code sweep across `src`, `scripts`, and `tests`
- Duplicate dependency analysis and guardrails
- CI and documentation updates for clean handoff

## High-Impact Fixes Implemented

1. View activation and lazy-view reliability
- Added JS-controlled view activation (`.view.is-active`) in app routing flow
- Ensured lazy-loaded views render visible state consistently after hash changes

2. Post-render asset normalization
- Audio source format rewriting now occurs after each view render
- Avoids stale/incorrect audio references for lazy-injected HTML

3. Persistence hardening
- IndexedDB-first persistence now falls back to `localStorage` for JSON paths
- Prevents silent state loss when IDB is blocked/unavailable

4. E2E test stabilization
- Updated onboarding-aware navigation in E2E setup
- Reworked assertions to target active, user-visible view content
- Removed dead bindings in test files

5. Duplicate logic consolidation
- Introduced reusable file-sharing helper `tryShareFile()` in `src/utils/recording-export.js`
- Reused in:
  - `src/backup/export.js`
  - `src/notifications/reminders.js`
- Removed repeated `navigator.share`/download fallback branches

6. Dead code cleanup
- Removed unused export surface and dead locals in app utilities/scripts/tests
- Added baseline dead-code config to reduce false positives from generated WASM files

## Dependency + Duplication Findings

Current duplicate versions are transitive-only and constrained by upstream packages:

- `entities`: `4.5.0`, `6.0.1`, `7.0.1`
- `fsevents`: `2.3.2`, `2.3.3` (optional platform package)
- `whatwg-mimetype`: `3.0.0`, `4.0.0`

No direct dependency conflicts or vulnerable packages were found.

Notes:

- `depcheck` reports `@vitest/coverage-v8` as unused, but this is a static-analysis false positive for CLI-driven coverage (`vitest --coverage`).

## New Quality Guardrails

1. Scripts in `package.json`
- `lint:all`
- `audit:deadcode`
- `audit:deps`
- `audit:full`

2. Dead-code baseline
- `knip.json` added to ignore generated artifacts and keep audits actionable

3. Duplicate dependency guard
- `scripts/audit-dependency-duplicates.mjs` added
- Fails on unexpected duplicates, allows known transitive constraints

4. CI workflow
- `.github/workflows/quality.yml` added
- Runs on PRs and `main` pushes:
  - install
  - lint all code paths
  - dead code audit
  - dependency duplicate audit
  - unit tests
  - build

## Validation Snapshot

All executed successfully on this worktree:

- `npm run lint:all`
- `npm run audit:deadcode`
- `npm run audit:deps`
- `npm test` (23 files, 405 tests)
- `npm run build`
- `npx playwright test` (18/18)
- `npm run audit:full`
- `npm audit` (0 vulnerabilities)

## Handoff Notes for Next Engineer

1. Start with the one-command gate:
- `npm run audit:full`

2. If duplicate dependency audit fails:
- Run `npm explain <package>` to inspect why versions diverged
- Update allowlist only when duplication is proven transitive/unavoidable

3. If dead-code audit fails:
- Check `knip.json` before changing app code; generated WASM/build outputs are intentionally ignored

4. Pages deploy pipeline and quality pipeline are now separate workflows
- Keep `quality.yml` green before merging

