# Core Audio Tests + Performance Polish — Design

## Goal

Add unit test coverage for the core audio path (tone player, tuner, sound-state), then apply remaining low-severity performance optimizations from the QA audit.

## Architecture

**Approach A: Pure-function extraction + unit tests**

Extract testable pure logic out of DOM-heavy modules into separate utility files, unit test those, and mock only AudioContext for the tone player factory. Leave full integration tests (startTuner/stopTuner) for a future phase.

## Phase 1 — Test Coverage

### Test targets

**`src/utils/sound-state.js`** (1 line, pure)
- Test `isSoundEnabled()` returns true/false based on `document.documentElement.dataset.sounds`
- No mocks needed

**`src/audio/tone-player.js`** (152 lines)
- Pure functions: `normalizeNote()`, `NOTE_FREQUENCIES`, `DEFAULT_MAP`
- Factory: `createTonePlayer()` with minimal AudioContext stub
- Test: playNote resolves, stopAll clears oscillators, sound-disabled returns false, sequence cancellation

**`src/tuner/tuner.js`** (264 lines)
- Extract into `src/tuner/tuner-utils.js`:
  - `clamp(value, min, max)`
  - `formatDifficulty(value)`
  - `processTunerMessage(data, tolerance)` — returns `{ note, cents, freq, offset, inTune, status }`
- Test extracted utils — no DOM, no AudioContext

### New files

```
src/tuner/tuner-utils.js           # Extracted pure functions
tests/sound-state.test.js          # isSoundEnabled toggle
tests/tone-player.test.js          # normalizeNote + createTonePlayer factory
tests/tuner-utils.test.js          # clamp, formatDifficulty, processTunerMessage
```

## Phase 2 — Performance Polish

Remaining low-severity perf items from QA audit:

| Item | File | Change |
|------|------|--------|
| DOM query caching | game-enhancements.js | Cache querySelector in update loops |
| Progress bar batching | progress.js | Batch DOM writes with rAF |
| DOM read/write separation | Per-game modules | Separate reads from writes |
| Font-display | app.css | `font-display: swap` on @font-face |
| Content-visibility | app.css | `content-visibility: auto` on off-screen views |
| Will-change hints | app.css | `will-change: transform` on tuner needle |
| Idle timeout tuning | native-apis.js | Reduce from 60s to 30s |
| Audio cleanup | tone-player.js | Close AudioContext on visibility hidden |

## Out of Scope

- Full integration tests for startTuner/stopTuner
- E2E audio tests with Playwright
- Game logic tests, data layer tests
- Architectural refactors

## Success Criteria

- `npm test` passes with 15+ new unit tests (up from 4)
- `npm run lint` clean
- `npm run build` succeeds
- No behavioral changes — pure refactoring + tests + CSS tweaks
- Lighthouse perf score stable or improved

## Commit Strategy

- One commit per logical unit (test file, extraction, perf batch)
- SW cache bump at the end
