# 2026-02-18 QA + Effectiveness Deeper Pass (Phase 21)

## Objective

Harden shared game-shell lifecycle behavior so active game sessions also deactivation-report on real page unload (`pagehide`), while remaining bfcache-safe.

## Changes

### 1) Game Shell Pagehide Handling

Updated:
- `src/games/game-shell.js`

Improvement:
- added `pagehide` listener lifecycle management to `createGame`
- on non-persisted `pagehide`, if the game view is currently active:
  - run `gameState._onDeactivate` when present
  - run `reportSession()`
- ignore persisted (`bfcache`) `pagehide` events to avoid destructive snapshot side effects

### 2) Regression Coverage for Pagehide Paths

Updated:
- `tests/games/game-shell.test.js`

Improvement:
- added test that verifies deactivate hook + reporting run on non-persisted `pagehide`
- added test that verifies persisted `pagehide` is ignored

## Verification

Passing commands:

```bash
npx vitest run tests/games/game-shell.test.js
npm run handoff:verify
```

## Result

- shell-managed games now report/deactivate correctly on non-bfcache page unload, not only hash transitions
- bfcache behavior remains protected (persisted pagehide ignored)
- full lint/audit/coverage/build/e2e gates remain green
