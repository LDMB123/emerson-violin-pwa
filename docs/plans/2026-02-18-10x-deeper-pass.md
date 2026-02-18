# 2026-02-18 10x Deeper Pass (Phase 3)

## Goal

Push simplification/optimization deeper than phase 2 by removing cross-file drift and hardening dynamic loading flows while keeping all verification gates green.

## What Changed

### 1) Shared Module Registry (single source of truth)

Added:
- `src/app/module-registry.js`

Centralized:
- `MODULE_LOADERS`
- `EAGER_MODULES`
- `IDLE_MODULE_PLAN`
- `PREFETCH_VIEW_IDS`
- `resolveModulesForView(viewId)` with memoized, frozen output

Consumers updated:
- `src/app.js` now imports loader/scheduling constants from registry.
- `src/utils/app-utils.js` now delegates `getModulesForView()` to registry.

Impact:
- Prevents mismatch between route module rules and actual loader keys.
- Reduces maintenance surface for future route/module additions.

### 2) Game Metrics Loader Hardening

Updated:
- `src/games/game-metrics.js`

Changes:
- Loader cache stores promises for in-flight game module imports.
- Failed game load now removes cache entry and logs warning, allowing later retry.
- Update callbacks now stored in `Set` to avoid duplicate registrations.
- Checkbox refresh trigger simplified:
  - old: hardcoded regex of ID prefixes
  - new: any checkbox inside a `view-game-*` container triggers batched update

Important compatibility decision:
- Kept static per-game dynamic imports in `game-metrics`.
- A trial move to `import.meta.glob` broke `knip` reachability analysis and produced false dead-code failures.
- Static references are currently required for reliable `npm run audit:deadcode`.

### 3) New Test Coverage

Added:
- `tests/app/module-registry.test.js`

Covers:
- eager/idle module keys all have loaders
- prefetch view IDs uniqueness
- coach module resolution contract
- memoization + frozen return behavior
- invalid-view guard path

## Verification

All gates passed locally via:

```bash
npm run handoff:verify
```

Includes:
- lint
- dead-code/dependency audits
- unit tests
- production build
- Playwright E2E

## Net Effect

- Deeper structural simplification with stronger invariants.
- Better failure recovery in lazy game module loading.
- No functional regressions in verified paths.
- Handoff is clearer because module-routing behavior now has one authoritative definition.
