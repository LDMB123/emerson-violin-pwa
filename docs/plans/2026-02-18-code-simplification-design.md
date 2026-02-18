# Code Simplification Design

**Date:** 2026-02-18
**Scope:** Full repo (src/ + tests/ + config + build files)
**Risk tolerance:** Aggressive
**Goal:** Reduce LOC, file count, and cognitive load equally

---

## Analysis Sources

Three agent passes:
1. Haiku broad scan (initial dead code identification)
2. Opus deep game audit (all 13 game files, full per-file analysis)
3. Opus deep utils/app audit (app.js, utils, config, tests)

Opus passes corrected several false positives from the initial scan.

---

## Section 1: What Gets Deleted (No Behavior Change)

### Dead exports in session-review-utils.js

`computeTotalMinutes`, `computeAverageAccuracy`, `extractAccuracyValues` — exported, never imported in src/. Test-only artifacts. Delete the exports; delete the corresponding test cases from `tests/session-review-utils.test.js`.

### Redundant test files and cases

- **Delete `tests/game-utils.test.js`** (30 lines) — fully covered by `session-timer.test.js`
- **Delete `clamp` test cases from `tests/tuner-utils.test.js`** (~25 lines) — already tested in `math.test.js`
- **Consolidate `todayDay` tests** — deduplicate between `progress-utils.test.js` and `session-review-utils.test.js`, keep one

### Dead Vite config

Remove all four aliases from `vite.config.js` (zero usages across entire codebase):
```js
// Delete these:
'@': resolve(__dirname, 'src'),
'@modules': resolve(__dirname, 'src/modules'),
'@styles': resolve(__dirname, 'src/styles'),
'@ml': resolve(__dirname, 'src/ml'),
```

### Unexport average() in recommendations-utils.js

`average()` is used internally at line 123 but never imported externally. Change `export function average` → `function average`. Update test to use a named internal (or delete the direct test — the behavior is exercised through `computeSongLevel` tests).

### Inline filterEventsByType and cacheFresh into recommendations.js

Both used exactly once in `recommendations.js`. Both are trivial:
- `filterEventsByType(events, type)` → `events.filter((e) => e.type === type)`
- `cacheFresh(cache, ttl)` → `cache && (Date.now() - cache.ts < ttl)`

Remove from `recommendations-utils.js`, update imports in `recommendations.js`, delete from test file (or keep as inline behavior tested through the caller).

---

## Section 2: Correctness Guardrails (What NOT to Touch)

Findings from Opus that override initial Haiku scan:

| Item | Initial verdict | Corrected verdict |
|------|----------------|-------------------|
| `getRecentEvents()` | Dead export | Used in `session-review.js:14,99` — keep |
| `average()` | Never used | Used internally at `recommendations-utils.js:123` — unexport only |
| `coachMessageFor()` in two files | Duplicate — merge | Different messages (retrospective vs prospective) — intentional |
| `prebuild`/`postbuild` build-sw-assets.js runs | Duplicate — remove | Different `--dist` flag, intentional |
| `stash:audit` script | Unused lifecycle | Manual housekeeping script — keep |
| `sound-state.js` | Single-export, delete | 13 importers, single source of truth — keep |

---

## Section 3: Structural Refactors

### 3a. Refactor app.js boot() — High Priority

**Current:** 270-line monolith handling 5+ concerns.
**Target:** ~18-line orchestrator calling 7 extracted functions.

Extracted functions:
1. `rewriteAudioSources()` — rewrites `<audio>` src attributes
2. `loadEagerModules()` — initial module loading
3. `loadIdleModules()` — idle/deferred module loading
4. `resolveInitialView()` — onboarding check + redirect
5. `setupHashRouter(UIContext)` — hashchange listener + toggle labels
6. `setupNavigation(UIContext)` — navigateTo, updateNavState, link delegation
7. `setupPopoverSystem(UIContext)` — all popover logic (native + fallback, 114 lines)

Shared state object:
```js
const UIContext = {
  navItems,
  popoverBackdrop,
  supportsPopover,
  prefersReducedMotion,
  reduceMotionToggle,
  lastPopoverTrigger: null,
};
```

`lastPopoverTrigger` becomes a property on `UIContext` instead of a `let` in boot() closure, allowing the popover system to be a standalone module without shared closure state.

### 3b. Merge pizzicato.js + string-quest.js — Medium Priority

Both games: sequence-following with string buttons, combo tracking, `buildNoteSequence`, `seqIndex` wrap, completion flourish. Only differences:
- Data attribute prefix (`data-pizzicato-*` vs `data-string-*`)
- Scoring constants (18 + combo*2 vs 20 + combo*3)
- `hitNotes` Set in pizzicato (tracks unique notes for checklist)

**Approach:** Parameterize into one file `sequence-game.js` with a config argument to `bind()`:

```js
// string-quest.js becomes:
import { bind as bindSequenceGame, update } from './sequence-game.js';
export { update };
export const bind = (difficulty) => bindSequenceGame(difficulty, {
  id: 'string-quest',
  prefix: 'data-string',
  baseScore: 20,
  comboMultiplier: 3,
  trackUniqueNotes: false,
});
```

Net savings: ~145 lines (one file eliminated, ~140 lines shared logic consolidated).

### 3c. Extract game-shell.js — Medium Priority

**Current:** ~29% boilerplate per game (avg ~58 lines of identical code per game file x 13 = ~750 lines).
**Target:** Single `game-shell.js` file (~120 lines) that handles all universal patterns.

Patterns extracted:
1. `update()` function generator (query inputs, count checked, read dataset, write fallback)
2. `bind()` scaffolding (stage query + early bail)
3. `attachTuning` + `setDifficultyBadge` wiring
4. `reportSession` pattern (`reported` flag + accuracy calc + `recordGameEvent`)
5. `resetSession` call from hashchange
6. `hashchange` listener (navigate-to-game → reset, navigate-away → report)
7. Export alias normalization (`{ update, bind }`)
8. `bind(difficulty)` default param `{ speed: 1.0, complexity: 1 }`

**API:**
```js
// game-shell.js
export function createGame({ id, viewId, inputPrefix, computeAccuracy, onReset, onBind }) {
  function update() { /* universal update pattern */ }
  function bind(difficulty = { speed: 1.0, complexity: 1 }) {
    const stage = document.querySelector(viewId);
    if (!stage) return;
    // Universal scaffolding...
    onBind(stage, difficulty, { attachTuning, reportSession, resetSession });
  }
  return { update, bind };
}
```

Each game becomes: unique logic only (~80-150 lines for medium games, ~20-40 lines for simple games).

**Net savings:** ~595 lines saved - ~120 line framework file = **~475 net lines** across 13 games.

---

## Implementation Phases

### Phase 1: Dead code + test cleanup (safest, no behavior change)

1. Delete `computeTotalMinutes`, `computeAverageAccuracy`, `extractAccuracyValues` exports from `session-review-utils.js`
2. Delete corresponding test cases from `session-review-utils.test.js`
3. Delete `tests/game-utils.test.js`
4. Delete duplicate `clamp` tests from `tuner-utils.test.js`
5. Consolidate `todayDay` tests (keep in `session-review-utils.test.js`, remove from `progress-utils.test.js`)
6. Remove four Vite aliases from `vite.config.js`
7. Unexport `average()` in `recommendations-utils.js`
8. Inline `filterEventsByType` and `cacheFresh` into `recommendations.js`

Run: `npm test && npm run lint` — must be green before Phase 2.

### Phase 2: Refactor boot() in app.js

1. Extract `rewriteAudioSources()` and `loadEagerModules()` and `loadIdleModules()` as module-level functions
2. Extract `resolveInitialView()`
3. Create `UIContext` object
4. Extract `setupHashRouter(UIContext)`, `setupNavigation(UIContext)`, `setupPopoverSystem(UIContext)`
5. Reduce `boot()` to ~18 lines

Run: `npm test && npx playwright test tests/e2e` — must be green.

### Phase 3: Merge pizzicato + string-quest

1. Create `src/games/sequence-game.js` with parameterized bind
2. Rewrite `pizzicato.js` as thin wrapper (~20 lines)
3. Rewrite `string-quest.js` as thin wrapper (~20 lines)
4. Verify both games still work via manual testing (no unit tests for game UIs)

### Phase 4: Extract game-shell.js

1. Create `src/games/game-shell.js` with `createGame()` factory
2. Start with simplest games first: `tuning-time.js`, `scale-practice.js`, `rhythm-painter.js`
3. Work up to medium: `ear-trainer.js`, `bow-hero.js`, `pitch-quest.js`, etc.
4. Leave `rhythm-dash.js` for last (most complex, most unique logic)
5. Run full test suite after each game migration

### Phase 5: Inline single-use utils (recommendations.js)

If Phase 1 didn't cover all inlining opportunities, final pass to inline any remaining single-use helpers.

---

## Expected Outcomes

| Metric | Estimate |
|--------|----------|
| Lines deleted (dead code + tests) | ~100-130 |
| Lines saved (boot() refactor) | ~250 (same logic, better structure) |
| Lines saved (pizzicato+string-quest merge) | ~145 net |
| Lines saved (game-shell extraction) | ~475 net |
| **Total net reduction** | **~600-800 lines** |
| Files deleted | 2-3 (game-utils.test.js + sequence-game consolidation) |
| New files created | 2 (game-shell.js, sequence-game.js) |

---

## Rollback Strategy

Each phase ends with a passing test suite. Any phase can be reverted independently via git. Phases 3-4 have no automated tests for the game UIs — rely on manual smoke-test of each affected game before committing.
