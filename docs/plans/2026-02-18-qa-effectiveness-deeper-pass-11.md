# 2026-02-18 QA + Effectiveness Deeper Pass (Phase 14)

## Objective

Ensure game modules can pause or clean up active runtime state when users navigate away via hash changes.

## Changes

### 1) Generic Deactivation Hook in Game Shell

Updated:
- `src/games/game-shell.js`

Improvement:
- `hashchange` leave-path now invokes optional `gameState._onDeactivate()` before reporting
- allows each game to stop timers/audio or release transient state prior to leave-report

### 2) Timer Pause Wiring for Active Games

Updated:
- `src/games/note-memory.js`
- `src/games/bow-hero.js`

Improvement:
- both games register `_onDeactivate` callbacks that pause active timers
- prevents timers from continuing in the background after hash navigation away from game views

### 3) Regression Coverage

Updated:
- `tests/games/game-shell.test.js`

Coverage additions:
- verifies `_onDeactivate` hook executes when leaving a game hash

## Verification

Passing commands:

```bash
npx vitest run tests/games/game-shell.test.js
npm run handoff:verify
```

## Result

- game lifecycle now supports explicit per-game leave cleanup
- active game timers no longer run unchecked after hash-based navigation away
- full lint/audit/coverage/build/e2e gates remain green
