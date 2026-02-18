# 2026-02-18 QA + Effectiveness Deeper Pass (Phase 8)

## Objective

Remove timing-sensitive replay behavior in game completion and replace it with a deterministic, event-driven reset path.

## Changes

### 1) Event-driven Play Again

Updated:
- `src/games/game-complete.js`
- `src/utils/event-names.js`

Improvements:
- replaced `history.back()` + delayed `history.forward()` replay hack
- introduced `GAME_PLAY_AGAIN` event
- `Play Again` now dispatches a replay reset request for the active `view-game-*` route

### 2) Direct Game Engine Reset Handling

Updated:
- `src/games/game-shell.js`
- `src/games/sequence-game.js`
- `src/games/rhythm-dash.js`

Improvements:
- each game engine now listens for `GAME_PLAY_AGAIN`
- reset runs only when event view matches the active game view
- avoids synthetic navigation churn and hash/history timing dependence

### 3) Unit Coverage

Added:
- `tests/games/game-complete.test.js`
- `tests/games/game-shell.test.js`

Coverage:
- replay event is emitted with the active game view id
- legacy history navigation calls are no longer used
- shell-based games reset only for matching replay targets

## Verification

Passing commands:

```bash
npx vitest run tests/games/game-complete.test.js tests/games/game-shell.test.js
npm run lint:all
npm run qa:effectiveness
npm run handoff:verify
```

## Result

- replay reset behavior is deterministic and easier to reason about
- implementation is simpler and removes timing-sensitive history manipulation
- full lint, coverage, build, dead-code/dependency audits, and E2E gates remain green
