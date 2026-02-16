# Extract + Test Pure Logic — Design

## Goal

Extract testable pure functions from the three largest modules (progress.js, game-enhancements.js, native-apis.js), add unit tests, and deduplicate shared utilities. Improve maintainability without changing behavior.

## Architecture

**Approach A: Pure-function extraction + unit tests**

Extract pure logic into separate utility files, unit test those, and leave DOM orchestration in the original modules. Same pattern used successfully for tuner-utils and tone-player in Phase 1.

## Scope

### progress.js (590 lines)

**Extract `src/utils/math.js`:**
- `clamp(value, min, max)` — shared utility (currently duplicated in tuner-utils.js and progress.js)

**Extract `src/progress/progress-utils.js`:**
- `todayDay()` — day counter (pure math)
- `minutesForInput(input)` — minutes from input id/dataset patterns
- `toTrackerTimestamp(value)` — timestamp conversion
- `formatRecentScore(event)` — score formatting
- `coachMessageFor(skill)` — coaching message lookup
- `buildRadarPoints(skills, config)` — radar chart geometry

**Extract `src/progress/progress-calculator.js`:**
- `buildProgress(events, deps)` — 160-line core calculation with injectable WASM loader

**progress.js stays as orchestrator** — DOM refs, applyUI, event listeners, init wiring.

### game-enhancements.js (547 lines)

**Extract `src/games/game-config.js`:**
- `GAME_META` constant (145 lines, pure data)

**Extract `src/games/session-timer.js`:**
- `formatTime(ms)` — pure formatter
- `formatMinutes(value)` — pure formatter
- `createSessionTimer(view, elements, targetMinutes)` — timer state machine

**game-enhancements.js stays as orchestrator** — DOM builders, lifecycle binding.

### native-apis.js (623 lines)

**No extraction.** Well-organized side-effect/init module with zero exports. Splitting adds orchestration overhead for no testability gain.

## New Files

```
src/utils/math.js                    # clamp() shared utility
src/progress/progress-utils.js       # todayDay, minutesForInput, toTrackerTimestamp,
                                     # formatRecentScore, coachMessageFor, buildRadarPoints
src/progress/progress-calculator.js  # buildProgress() with injectable deps
src/games/game-config.js             # GAME_META constant
src/games/session-timer.js           # formatTime, formatMinutes, createSessionTimer
tests/progress-utils.test.js         # ~20 tests
tests/progress-calculator.test.js    # ~10 tests
tests/game-utils.test.js             # ~14 tests
```

## Modified Files

- `src/progress/progress.js` — import from new modules, remove extracted code
- `src/games/game-enhancements.js` — import from new modules, remove extracted code
- `src/tuner/tuner-utils.js` — import clamp from utils/math.js instead of local copy

## Out of Scope

- native-apis.js refactoring
- DOM builder extraction (coach panel, header controls)
- Integration tests
- E2E tests
- Game logic tests
- Architectural changes beyond extraction

## Success Criteria

- `npm test` passes with ~90 total tests (up from 46)
- `npm run lint` clean
- `npm run build` succeeds
- No behavioral changes — pure refactoring + tests
- One commit per logical extraction

## Commit Strategy

- One commit per logical unit (extraction, test file, dedup)
- SW cache bump at the end
