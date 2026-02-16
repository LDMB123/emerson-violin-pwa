# App-Wide Pure Function Extraction Design

**Date**: 2026-02-15
**Status**: Approved
**Scope**: Extract testable pure logic from 8 large modules (>280 lines)

## Overview

Extend the pure-function extraction pattern proven in progress.js and game-enhancements.js to 8 additional large modules across the app. Goal: maximize testability by separating pure logic from DOM/side effects.

## Target Modules

1. `platform/native-apis.js` (623 lines) → `platform/platform-utils.js`
2. `trainer/tools.js` (427 lines) → `trainer/trainer-utils.js`
3. `games/rhythm-dash.js` (372 lines) → `games/rhythm-dash-utils.js`
4. `app.js` (372 lines) → `utils/app-utils.js`
5. `ml/recommendations.js` (370 lines) → `ml/recommendations-utils.js`
6. `analysis/session-review.js` (356 lines) → `analysis/session-review-utils.js`
7. `recordings/recordings.js` (318 lines) → `recordings/recordings-utils.js`
8. `coach/lesson-plan.js` (288 lines) → `coach/lesson-plan-utils.js`

## Architecture

### Extraction Strategy

**Phase 1: Consolidate Shared Utilities**
- Deduplicate `clamp()` from trainer/tools.js, recommendations.js, parent/goals.js → all use math.js
- Deduplicate `formatDifficulty()` from trainer/tools.js → extend tuner-utils.js export
- Deduplicate `formatTime()` from lesson-plan.js → use existing session-timer.js

**Phase 2: Extract Per-Module Pure Functions**

**platform-utils.js** - Storage & formatting utilities
- `shouldRetryPersist(state)` - Retry logic for persistent storage
- `formatBytes(bytes)` - Byte formatting with units
- `isStandalone()` - PWA standalone mode detection
- Validation/parsing helpers

**trainer-utils.js** - Training calculations
- `isPracticeView()` - View type detection
- `formatDifficulty()` → reuse from tuner-utils
- Metronome BPM calculations
- Posture/bowing scoring logic

**rhythm-dash-utils.js** - Game scoring
- Pattern matching logic
- Score calculations
- Timing validation functions

**app-utils.js** - App-level utilities
- View detection helpers
- Navigation utilities
- State normalization functions

**recommendations-utils.js** - ML scoring & filtering
- Skill mapping constants (SKILL_BY_GAME, GAME_BY_SKILL, COACH_MESSAGES, etc.)
- Recommendation scoring algorithms
- Filtering logic
- Message selection functions

**session-review-utils.js** - Analysis calculations
- Statistics computations
- Performance metrics
- Trend analysis functions

**recordings-utils.js** - Data transformation
- Recording metadata parsing
- Export formatting
- Validation logic

**lesson-plan-utils.js** - Lesson timing & formatting
- `formatTime()` → use session-timer.js
- `toLessonLink(id)` - Link generation
- Step progression logic
- Timer calculations

### Pattern

Each module follows the same structure:

**Before**:
```javascript
// Large module with mixed pure/impure code
const someCalc = (x) => x * 2;
const domUpdate = () => element.textContent = someCalc(5);
```

**After**:
```javascript
// module-utils.js - Pure functions only
export const someCalc = (x) => x * 2;

// module.js - Side effects only
import { someCalc } from './module-utils.js';
const domUpdate = () => element.textContent = someCalc(5);
```

## Testing Strategy

**Coverage Targets**:
- 200+ new unit tests across 8 modules
- Target total: ~300 tests (currently 103)
- Coverage goal: 80%+ for all extracted utilities

**Test Structure**:
```javascript
// tests/platform-utils.test.js
describe('shouldRetryPersist', () => { /* ... */ });
describe('formatBytes', () => { /* ... */ });

// tests/trainer-utils.test.js
describe('isPracticeView', () => { /* ... */ });
describe('metronome calculations', () => { /* ... */ });

// ... similar for other 6 modules
```

**Testing Patterns**:
- Pure function tests with multiple inputs/outputs
- Edge cases (null, undefined, boundary values)
- WASM-dependent functions use dependency injection
- Timer-based logic uses `vi.useFakeTimers()`
- Constants validated for correctness

## Implementation Workflow

**Execution**: Subagent-Driven Development
- Git worktrees for isolation (feature/extract-app-wide branch)
- 8 parallel subagents, one per module
- TDD approach: extract → test → verify

**Task Batching**:
- **Batch 1**: Consolidate shared utilities (clamp, formatDifficulty, formatTime)
- **Batch 2**: Extract from 4 modules (native-apis, trainer/tools, rhythm-dash, app)
- **Batch 3**: Extract from 4 modules (recommendations, session-review, recordings, lesson-plan)
- **Batch 4**: Integration verification (all tests pass, no regressions)

**Per-Module Tasks**:
1. Read source module, identify pure functions
2. Create utils file with extracted functions
3. Write comprehensive unit tests (25-30 tests per module)
4. Update source to import from utils
5. Verify existing functionality unchanged
6. Run full test suite

**Quality Gates**:
- All 300+ tests pass
- No console errors in dev build
- Service Worker cache bumped (v112 → v113)
- Lint passes (`npm run lint`)

## Success Criteria

- [x] 8 new utils files created
- [x] 200+ new unit tests written
- [x] All existing functionality preserved
- [x] All tests passing
- [x] No regressions in dev/prod builds
- [x] Design doc committed
- [x] Implementation plan created
