# 2026-02-18 QA + Effectiveness Deeper Pass (Phase 9)

## Objective

Harden game tuning lifecycle management so repeated bind/reload paths do not accumulate stale `ML_RESET` listeners.

## Changes

### 1) Disposable Tuning Subscription

Updated:
- `src/games/shared.js`

Improvements:
- `attachTuning()` now registers a named reset handler and returns `report.dispose()`
- `dispose()` safely unregisters the `ML_RESET` listener (idempotent)

### 2) Rebind-safe Cleanup in Game Binders

Updated:
- `src/games/game-shell.js`
- `src/games/sequence-game.js`
- `src/games/rhythm-dash.js`

Improvements:
- each binder disposes the prior tuning report before creating a new one
- prevents leaked/duplicated tuning refresh listeners in edge rebind scenarios

### 3) Unit Coverage

Added:
- `tests/games/shared.test.js`

Updated:
- `tests/games/game-shell.test.js`

Coverage:
- disposed tuning subscriptions no longer respond to `ML_RESET`
- reporting applies returned tuning updates
- shell rebind path disposes previous tuning subscription exactly once

## Verification

Passing commands:

```bash
npx vitest run tests/games/game-shell.test.js tests/games/shared.test.js tests/games/game-complete.test.js
npm run lint:all
npm run qa:effectiveness
```

## Result

- tuning lifecycle is explicit and rebind-safe
- listener accumulation risk is removed from core game bind paths
- lint and coverage gates remain green
