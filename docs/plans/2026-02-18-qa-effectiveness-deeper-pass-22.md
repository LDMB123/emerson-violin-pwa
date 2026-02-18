# 2026-02-18 QA + Effectiveness Deeper Pass (Phase 25)

## Objective

Add targeted regression coverage for `rhythm-dash` non-shell `pagehide` lifecycle behavior to lock in bfcache-safe handling introduced in the lifecycle hardening passes.

## Changes

### 1) New Rhythm Dash Lifecycle Tests

Added:
- `tests/games/rhythm-dash-lifecycle.test.js`

Coverage added for:
- non-persisted `pagehide` while run is active:
  - active run is stopped (run toggle transitions to off)
- persisted (`bfcache`) `pagehide` snapshot:
  - active run state is preserved

## Verification

Passing commands:

```bash
npx vitest run tests/games/rhythm-dash-lifecycle.test.js
npm run handoff:verify
```

## Result

- rhythm-dash pagehide lifecycle behavior is now protected by focused regression tests
- bfcache-safe/non-bfcache behavior remains explicit and validated
- full lint/audit/coverage/build/e2e gates remain green
