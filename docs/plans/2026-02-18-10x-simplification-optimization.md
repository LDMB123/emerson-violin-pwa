# 2026-02-18 10x Simplification + Optimization (Phase 2)

## Objective

Apply behavior-safe simplification and runtime optimization focused on:
- startup/module orchestration clarity
- lazy-route responsiveness
- dead-listener prevention
- predictable module-resolution logic

## Files Changed

1. `src/app.js`
- Introduced declarative startup plans: `EAGER_MODULES`, `IDLE_MODULE_PLAN`.
- Removed duplicate one-off eager load call for `persist` and included it in the eager plan.
- Made dynamic import caching retry-safe:
  - on failed module import, clear cached promise so later retries are possible.
- Added `prefetchLikelyViews()` idle strategy to prefetch high-probability next view HTML.

2. `src/views/view-loader.js`
- Simplified loading cleanup using `.finally()` to always clear `loading` state.
- Added `prefetch(viewPath)` helper that warms cache and treats failures as non-blocking.

3. `src/utils/app-utils.js`
- Replaced branch-heavy `getModulesForView()` logic with declarative rule table.
- Added deduped and memoized module resolution per view.
- Returned frozen arrays to prevent accidental mutation side effects.

4. `src/games/sequence-game.js`
- Added safe hash listener lifecycle:
  - remove prior `hashchange` listener before rebind
  - register a fresh listener for current session

5. Tests
- `tests/views/view-loader.test.js`
  - added prefetch cache warm test
  - added prefetch failure non-throw test
- `tests/app-utils.test.js`
  - added dedupe assertion
  - added frozen result assertion
  - added invalid-view guard assertion

## Verification Run (Completed)

All passed locally:

```bash
npm run handoff:verify
```

This includes:
- `npm run lint:all`
- `npm run audit:deadcode`
- `npm run audit:deps`
- `npm test`
- `npm run build`
- `npm run test:e2e`

## Notes for Next Engineer

- Known duplicate dependencies remain expected transitive constraints:
  - `entities`
  - `fsevents`
  - `whatwg-mimetype`
- Main JS entry bundle grew slightly due prefetch planning logic; this was an intentional tradeoff for faster subsequent view transitions.
