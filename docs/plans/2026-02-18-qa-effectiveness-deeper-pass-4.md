# 2026-02-18 QA + Effectiveness Deeper Pass (Phase 7)

## Objective

Debug and simplify view navigation behavior by preventing stale async view loads from clobbering newer route transitions.

## Changes

### 1) Async Render Gate

Added:
- `src/app/async-gate.js`

Behavior:
- creates monotonically increasing render tokens
- allows the app to determine whether an async operation is still the latest in-flight request

### 2) Race-Safe View Rendering

Updated:
- `src/app.js`

Improvements:
- each `showView()` starts with a fresh render token
- after `await viewLoader.load(...)`, stale tokens exit early
- stale request failures are ignored (no incorrect error state shown for superseded navigation)

Outcome:
- reduces route flicker/race bugs when users navigate rapidly across views
- keeps UI aligned with the most recent navigation intent

### 3) Test Coverage

Added:
- `tests/app/async-gate.test.js`

Coverage:
- only latest token remains active
- first token behavior sanity check

### 4) Service Worker Asset Manifest

Updated:
- `public/sw-assets.js`

Reason:
- includes new module `src/app/async-gate.js` in offline asset manifest.

## Verification

Passing commands:

```bash
npx vitest run tests/app/async-gate.test.js tests/views/view-loader.test.js
npm run qa:effectiveness
npm run handoff:verify
```

## Result

- navigation is more robust under rapid hash changes
- implementation is simpler than introducing cancellation plumbing through all view-loading call sites
- full project QA + E2E gates remain green
