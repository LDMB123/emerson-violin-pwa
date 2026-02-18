# Game Difficulty Progression — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Easy / Medium / Hard difficulty selection to all 13 games, selectable directly from each game card in the games grid.

**Architecture:** A `difficulty.js` service reads/writes `localStorage`. A `difficulty-picker.js` module injects three pill buttons onto each game card. `game-config.js` gains a `difficulty` block per game. `game-metrics.js` reads difficulty and passes it to `bind(difficulty)`. Each game's `bind()` accepts a difficulty param and applies speed/complexity multipliers at initialization. Medium always reproduces current behavior.

**Tech Stack:** Vanilla JS ES modules, Vite 6, localStorage, Vitest, CSS custom properties inside `@layer games`.

---

## Task 1: Create `src/games/difficulty.js` service

**Files:**
- Create: `src/games/difficulty.js`
- Create: `tests/difficulty.test.js`

The `GAME_META` export from `game-config.js` has an object key per game. We'll add a `difficulty` block to each game in Task 2. For now, the service reads that block.

### Step 1: Write the failing tests

Create `tests/difficulty.test.js`:

```js
import { describe, expect, it, beforeEach } from 'vitest';

// We'll import after the module exists
// Mock localStorage
const store = {};
const localStorageMock = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// Minimal GAME_META mock matching the structure game-config.js will have after Task 2
vi.mock('../src/games/game-config.js', () => ({
    GAME_META: {
        'pitch-quest': {
            skill: 'Pitch',
            difficulty: {
                easy:   { speed: 0.8, complexity: 0 },
                medium: { speed: 1.0, complexity: 1 },
                hard:   { speed: 1.3, complexity: 2 },
            },
        },
        'unknown-game': {
            skill: 'Rhythm',
            // no difficulty block
        },
    },
}));

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getDifficulty, setDifficulty, getCurrentLevel } from '../src/games/difficulty.js';

describe('difficulty service', () => {
    beforeEach(() => {
        Object.keys(store).forEach((k) => delete store[k]);
    });

    it('returns medium defaults when no localStorage entry', () => {
        const d = getDifficulty('pitch-quest');
        expect(d).toEqual({ speed: 1.0, complexity: 1 });
    });

    it('getCurrentLevel returns medium when no entry', () => {
        expect(getCurrentLevel('pitch-quest')).toBe('medium');
    });

    it('setDifficulty persists to localStorage', () => {
        setDifficulty('pitch-quest', 'hard');
        expect(getCurrentLevel('pitch-quest')).toBe('hard');
    });

    it('getDifficulty returns hard config after setDifficulty', () => {
        setDifficulty('pitch-quest', 'hard');
        expect(getDifficulty('pitch-quest')).toEqual({ speed: 1.3, complexity: 2 });
    });

    it('getDifficulty returns easy config', () => {
        setDifficulty('pitch-quest', 'easy');
        expect(getDifficulty('pitch-quest')).toEqual({ speed: 0.8, complexity: 0 });
    });

    it('falls back to medium on corrupt localStorage value', () => {
        store['panda:difficulty:pitch-quest'] = 'bogus';
        expect(getCurrentLevel('pitch-quest')).toBe('medium');
        expect(getDifficulty('pitch-quest')).toEqual({ speed: 1.0, complexity: 1 });
    });

    it('falls back to medium for unknown game with no difficulty block', () => {
        expect(getDifficulty('unknown-game')).toEqual({ speed: 1.0, complexity: 1 });
    });

    it('falls back to medium for completely unknown game ID', () => {
        expect(getDifficulty('nonexistent')).toEqual({ speed: 1.0, complexity: 1 });
    });
});
```

### Step 2: Run to verify tests fail

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && npm test -- tests/difficulty.test.js
```
Expected: FAIL — module not found.

### Step 3: Create `src/games/difficulty.js`

```js
import { GAME_META } from './game-config.js';

const STORAGE_PREFIX = 'panda:difficulty:';
const VALID_LEVELS = ['easy', 'medium', 'hard'];
const MEDIUM_DEFAULT = { speed: 1.0, complexity: 1 };

/**
 * Returns the current difficulty level string for a game.
 * Falls back to 'medium' if not set or corrupt.
 * @param {string} gameId
 * @returns {'easy'|'medium'|'hard'}
 */
export const getCurrentLevel = (gameId) => {
    const raw = localStorage.getItem(STORAGE_PREFIX + gameId);
    return VALID_LEVELS.includes(raw) ? raw : 'medium';
};

/**
 * Returns the resolved difficulty config { speed, complexity } for a game.
 * Falls back to medium defaults if game has no difficulty block or level is unknown.
 * @param {string} gameId
 * @returns {{ speed: number, complexity: number }}
 */
export const getDifficulty = (gameId) => {
    const level = getCurrentLevel(gameId);
    const meta = GAME_META[gameId];
    const config = meta?.difficulty?.[level];
    return config ?? MEDIUM_DEFAULT;
};

/**
 * Saves the chosen difficulty level for a game to localStorage.
 * @param {string} gameId
 * @param {'easy'|'medium'|'hard'} level
 */
export const setDifficulty = (gameId, level) => {
    if (!VALID_LEVELS.includes(level)) return;
    localStorage.setItem(STORAGE_PREFIX + gameId, level);
};
```

### Step 4: Run tests to verify they pass

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && npm test -- tests/difficulty.test.js
```
Expected: All tests pass (the vi.mock will handle the missing difficulty blocks in GAME_META until Task 2 adds them).

### Step 5: Lint

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && npm run lint
```
Expected: 0 errors.

### Step 6: Commit

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && git add src/games/difficulty.js tests/difficulty.test.js && git commit -m "feat: add difficulty service with localStorage persistence"
```

---

## Task 2: Add `difficulty` blocks to `game-config.js`

**Files:**
- Modify: `src/games/game-config.js`

`GAME_META` has 13 game entries. Each gains a `difficulty` key. The medium tier always reproduces current behavior exactly.

### Step 1: Read game-config.js

Open `src/games/game-config.js`. The current structure for each entry is:
```js
'pitch-quest': {
    skill: 'Pitch',
    goal: '...',
    targetMinutes: 6,
    steps: [...],
    tip: '...',
},
```

### Step 2: Add `difficulty` to all 13 entries

Add the `difficulty` block to each entry. Use the table below for values. Insert after `tip:` in each entry.

**Pitch games** (complexity controls note range / interval width):
```js
// pitch-quest
difficulty: {
    easy:   { speed: 0.8, complexity: 0 },
    medium: { speed: 1.0, complexity: 1 },
    hard:   { speed: 1.3, complexity: 2 },
},

// ear-trainer
difficulty: {
    easy:   { speed: 0.8, complexity: 0 },
    medium: { speed: 1.0, complexity: 1 },
    hard:   { speed: 1.3, complexity: 2 },
},

// tuning-time
difficulty: {
    easy:   { speed: 0.85, complexity: 0 },
    medium: { speed: 1.0,  complexity: 1 },
    hard:   { speed: 1.2,  complexity: 2 },
},

// scale-practice
difficulty: {
    easy:   { speed: 0.75, complexity: 0 },
    medium: { speed: 1.0,  complexity: 1 },
    hard:   { speed: 1.3,  complexity: 2 },
},
```

**Rhythm games** (complexity controls pattern density):
```js
// rhythm-dash
difficulty: {
    easy:   { speed: 0.75, complexity: 0 },
    medium: { speed: 1.0,  complexity: 1 },
    hard:   { speed: 1.35, complexity: 2 },
},

// rhythm-painter
difficulty: {
    easy:   { speed: 0.8, complexity: 0 },
    medium: { speed: 1.0, complexity: 1 },
    hard:   { speed: 1.3, complexity: 2 },
},

// pizzicato
difficulty: {
    easy:   { speed: 0.8, complexity: 0 },
    medium: { speed: 1.0, complexity: 1 },
    hard:   { speed: 1.25, complexity: 2 },
},

// duet-challenge
difficulty: {
    easy:   { speed: 0.8, complexity: 0 },
    medium: { speed: 1.0, complexity: 1 },
    hard:   { speed: 1.3, complexity: 2 },
},
```

**Reading/Bowing games** (complexity controls sequence length / precision):
```js
// note-memory
difficulty: {
    easy:   { speed: 0.8, complexity: 0 },
    medium: { speed: 1.0, complexity: 1 },
    hard:   { speed: 1.2, complexity: 2 },
},

// story-song
difficulty: {
    easy:   { speed: 0.85, complexity: 0 },
    medium: { speed: 1.0,  complexity: 1 },
    hard:   { speed: 1.2,  complexity: 2 },
},

// melody-maker
difficulty: {
    easy:   { speed: 0.8, complexity: 0 },
    medium: { speed: 1.0, complexity: 1 },
    hard:   { speed: 1.2, complexity: 2 },
},

// bow-hero
difficulty: {
    easy:   { speed: 0.8, complexity: 0 },
    medium: { speed: 1.0, complexity: 1 },
    hard:   { speed: 1.3, complexity: 2 },
},

// string-quest
difficulty: {
    easy:   { speed: 0.8, complexity: 0 },
    medium: { speed: 1.0, complexity: 1 },
    hard:   { speed: 1.25, complexity: 2 },
},
```

### Step 3: Run the full test suite

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && npm test
```
Expected: All 499+ tests pass. The existing `GAME_META` test (`contains 13 games`, `has required fields`) must still pass — `difficulty` is an additive key.

### Step 4: Lint

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && npm run lint
```
Expected: 0 errors.

### Step 5: Commit

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && git add src/games/game-config.js && git commit -m "feat: add difficulty config blocks to all 13 game configs"
```

---

## Task 3: Create `src/games/difficulty-picker.js` UI injector

**Files:**
- Create: `src/games/difficulty-picker.js`

This module queries all `.game-card` elements and injects three pill buttons into each. It reads `getCurrentLevel()` to restore saved state on init.

### Step 1: Create `src/games/difficulty-picker.js`

```js
import { getCurrentLevel, setDifficulty } from './difficulty.js';

const LEVELS = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Med' },
    { value: 'hard', label: 'Hard' },
];

/**
 * Returns the game ID from a game card element's href.
 * e.g. href="#view-game-pitch-quest" → "pitch-quest"
 * @param {HTMLAnchorElement} card
 * @returns {string|null}
 */
const gameIdFromCard = (card) => {
    const href = card.getAttribute('href') || '';
    const match = href.match(/^#view-game-(.+)$/);
    return match ? match[1] : null;
};

/**
 * Returns the game's display name from the card title element.
 * @param {HTMLElement} card
 * @returns {string}
 */
const gameNameFromCard = (card) => {
    return card.querySelector('.game-title')?.textContent?.trim() ?? 'this game';
};

/**
 * Updates all buttons in a picker to reflect the currently selected level.
 * @param {HTMLElement} picker
 * @param {string} selectedLevel
 */
const syncPickerState = (picker, selectedLevel) => {
    picker.querySelectorAll('.difficulty-btn').forEach((btn) => {
        const active = btn.dataset.level === selectedLevel;
        btn.classList.toggle('is-selected', active);
        btn.setAttribute('aria-pressed', String(active));
    });
};

/**
 * Injects difficulty picker buttons into all .game-card elements on the page.
 * Safe to call multiple times — skips cards that already have a picker.
 */
export const renderDifficultyPickers = () => {
    const cards = document.querySelectorAll('.game-card');
    cards.forEach((card) => {
        // Skip if already injected
        if (card.querySelector('.difficulty-picker')) return;

        const gameId = gameIdFromCard(card);
        if (!gameId) return;

        const gameName = gameNameFromCard(card);
        const currentLevel = getCurrentLevel(gameId);

        const picker = document.createElement('div');
        picker.className = 'difficulty-picker';
        picker.setAttribute('role', 'group');
        picker.setAttribute('aria-label', `Difficulty for ${gameName}`);

        LEVELS.forEach(({ value, label }) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'difficulty-btn';
            btn.dataset.level = value;
            btn.dataset.gameId = gameId;
            btn.textContent = label;
            btn.setAttribute('aria-pressed', String(value === currentLevel));
            if (value === currentLevel) btn.classList.add('is-selected');

            btn.addEventListener('click', (e) => {
                // Prevent the click from bubbling to the card link
                e.preventDefault();
                e.stopPropagation();
                setDifficulty(gameId, value);
                syncPickerState(picker, value);
            });

            picker.appendChild(btn);
        });

        card.appendChild(picker);
    });
};
```

### Step 2: Lint

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && npm run lint
```
Expected: 0 errors.

### Step 3: Commit

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && git add src/games/difficulty-picker.js && git commit -m "feat: add difficulty-picker UI injector for game cards"
```

---

## Task 4: Add CSS for difficulty picker (`src/styles/app.css`)

**Files:**
- Modify: `src/styles/app.css` — append inside `@layer games { }`

### Step 1: Find the insertion point

Open `src/styles/app.css`. The achievement overlay block (added in the previous feature) is the last block inside `@layer games`. Find the `/* Achievement Celebration Overlay */` banner. Append the new CSS block AFTER the achievement block, still inside the `@layer games { }` closing brace.

### Step 2: Append the CSS inside `@layer games`

```css
    /* ===========================================================================
       Difficulty Picker
       =========================================================================== */

    .difficulty-picker {
        display: flex;
        gap: var(--space-1);
        justify-content: center;
        margin-top: var(--space-2);
        pointer-events: auto;
    }

    .difficulty-btn {
        font-family: var(--font-body);
        font-size: var(--text-xs);
        font-weight: 600;
        line-height: 1;
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-full);
        border: 1.5px solid var(--color-primary);
        background: transparent;
        color: var(--color-primary);
        cursor: pointer;
        transition: background var(--duration-fast) var(--ease-out),
                    color var(--duration-fast) var(--ease-out),
                    transform var(--duration-fast) var(--ease-out);
        touch-action: manipulation;
        min-height: 28px;
        min-width: 40px;
    }

    .difficulty-btn:active {
        transform: scale(0.92);
    }

    .difficulty-btn.is-selected {
        background: var(--color-primary);
        color: #fff;
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
        .difficulty-btn {
            transition: none;
        }
    }

    :root:has(#setting-reduce-motion:checked) .difficulty-btn {
        transition: none;
    }
```

### Step 3: Lint

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && npm run lint
```
Expected: 0 errors.

### Step 4: Commit

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && git add src/styles/app.css && git commit -m "feat: add difficulty picker CSS in @layer games"
```

---

## Task 5: Wire picker into `game-enhancements.js` and `game-metrics.js`

**Files:**
- Modify: `src/games/game-enhancements.js`
- Modify: `src/games/game-metrics.js`

### Step 1: Read `game-enhancements.js`

Read `src/games/game-enhancements.js`. Find where the games view is loaded — look for code that runs when `view-games` is shown, or a function that is called with the games grid context. The file handles game UI setup via `bindGameEnhancements()`.

### Step 2: Add `renderDifficultyPickers` call in `game-enhancements.js`

At the top of `src/games/game-enhancements.js`, add the import:

```js
import { renderDifficultyPickers } from './difficulty-picker.js';
```

Then find where the games view is initialized. Look for a `hashchange` or view-show handler that runs when `#view-games` becomes active. After the games grid becomes visible, call:

```js
renderDifficultyPickers();
```

If the file has a function like `bindGamesView()` or handles the `view-games` case in a switch/if, add the call there. If games are always in the DOM (the games view HTML is in `public/views/games.html` which is lazy-loaded), add it in the handler that fires after the games view HTML is injected.

Read the file carefully to find the right hook point — look for `view-games` string references.

### Step 3: Modify `game-metrics.js` to pass difficulty to `bind()`

Read `src/games/game-metrics.js`. Find `loadGame()` at approximately line 37:

```js
const loadGame = async (viewId) => {
    if (loaded.has(viewId)) return;
    const loader = gameModules[viewId];
    if (!loader) return;
    loaded.set(viewId, null);
    const mod = await loader();
    loaded.set(viewId, mod);
    updates.push(mod.update);
    mod.bind();  // line 45 — change this
    scheduleUpdateAll();
};
```

Add import at the top:

```js
import { getDifficulty } from './difficulty.js';
```

Change line 45 from:
```js
    mod.bind();
```
to:
```js
    const gameId = viewId.replace('view-game-', '');
    mod.bind(getDifficulty(gameId));
```

### Step 4: Run full test suite

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && npm test
```
Expected: All tests pass. `bind()` is called with a difficulty object now, but all games still use the default param `{ speed: 1.0, complexity: 1 }` until Task 6 — so behavior is unchanged.

### Step 5: Lint

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && npm run lint
```
Expected: 0 errors.

### Step 6: Commit

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && git add src/games/game-enhancements.js src/games/game-metrics.js && git commit -m "feat: wire difficulty picker rendering and pass difficulty to bind()"
```

---

## Task 6: Apply difficulty in all 13 game `bind()` functions

**Files:**
- Modify: `src/games/pitch-quest.js`
- Modify: `src/games/ear-trainer.js`
- Modify: `src/games/tuning-time.js`
- Modify: `src/games/scale-practice.js`
- Modify: `src/games/rhythm-dash.js`
- Modify: `src/games/rhythm-painter.js`
- Modify: `src/games/pizzicato.js`
- Modify: `src/games/duet-challenge.js`
- Modify: `src/games/note-memory.js`
- Modify: `src/games/story-song.js`
- Modify: `src/games/melody-maker.js`
- Modify: `src/games/bow-hero.js`
- Modify: `src/games/string-quest.js`

This is the most substantial task. For each game:
1. Change the bind function signature to accept a `difficulty` param with medium default
2. Apply `difficulty.speed` to timing/tempo variables
3. Apply `difficulty.complexity` to content selection (where applicable)

### Pattern for each game

**Signature change:**
```js
// Before
const bindXxx = () => {
// After
const bindXxx = (difficulty = { speed: 1.0, complexity: 1 }) => {
```

### Game-by-game changes

#### `pitch-quest.js`
The game uses `tolerance` (how close the pitch must be). Lower tolerance = harder.

After the variable declarations (around line 56), add:
```js
    // Apply difficulty
    let tolerance = Math.round(6 / difficulty.speed); // easy=7, medium=6, hard=4
```

Remove or adjust any existing `let tolerance = 6;` line — replace it with the computed version above.

If `complexity` is meaningful (open strings vs. first position), read the existing target note selection logic and apply: if `difficulty.complexity === 0`, restrict to open strings only (E, A, D, G); if `complexity === 2`, expand to higher notes.

#### `ear-trainer.js`
Read the file. Find where interval width or note selection happens. Apply:
- `difficulty.speed`: affects how quickly notes play / response window
- `difficulty.complexity`: restricts or expands the set of intervals presented

#### `tuning-time.js`
Read the file. Find timing and tolerance variables. Apply `difficulty.speed` to time limits; apply `difficulty.complexity` to pitch deviation range.

#### `scale-practice.js`
Read the file. Find tempo/BPM variables. Multiply base tempo by `difficulty.speed`. Apply `difficulty.complexity` to scale range (easy = 1 octave, hard = 2 octaves or harder scales).

#### `rhythm-dash.js`
Key state: `let targetBpm = 90` (line 82 per exploration). Apply:
```js
    let targetBpm = Math.round(90 * difficulty.speed); // easy=68, medium=90, hard=122
```

For `complexity`, find the pattern pool or beat pattern selection and use `difficulty.complexity` to pick simpler or more complex patterns.

#### `rhythm-painter.js`
Read the file. Find pattern arrays or BPM. Apply `difficulty.speed` to tempo; `difficulty.complexity` to pattern density.

#### `pizzicato.js`
Read the file. Apply `difficulty.speed` to timing; `difficulty.complexity` to plucking pattern complexity.

#### `duet-challenge.js`
Read the file. Apply `difficulty.speed` to note sequence speed; `difficulty.complexity` to melodic range.

#### `note-memory.js`
Read the file. Find sequence length variable. Apply `difficulty.complexity` to sequence length (easy=shorter, hard=longer). Apply `difficulty.speed` to display/response timing.

#### `story-song.js`
Read the file. Apply `difficulty.speed` to tempo; `difficulty.complexity` to sequence length or melodic range.

#### `melody-maker.js`
Read the file. Apply `difficulty.speed` to tempo; `difficulty.complexity` to available note range or sequence length.

#### `bow-hero.js`
Key state: `let targetTempo = 72` (line 37), `let timeLimit = 105` (line 38). Apply:
```js
    let targetTempo = Math.round(72 * difficulty.speed);  // easy=58, medium=72, hard=94
    let timeLimit = Math.round(105 / difficulty.speed);    // easy=131, medium=105, hard=81
```

For `complexity`, find bow zone width — narrow zones on hard difficulty.

#### `string-quest.js`
Read the file. Apply `difficulty.speed` to timing; `difficulty.complexity` to bow zone precision or sequence complexity.

### Step 1: Read each game file before modifying

For each game, read the file to understand the exact variable names and structure before applying the pattern. Do not guess — read first.

### Step 2: Apply changes systematically

Work through all 13 games. For each:
- Change function signature to accept `difficulty` param
- Apply `difficulty.speed` to the primary timing variable
- Apply `difficulty.complexity` where content selection exists
- Ensure medium values reproduce existing behavior

### Step 3: Run full test suite

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && npm test
```
Expected: All tests pass. The `bind()` default param ensures tests that call `bind()` with no args still work.

### Step 4: Lint

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && npm run lint
```
Expected: 0 errors.

### Step 5: Commit

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && git add src/games/*.js && git commit -m "feat: apply difficulty multipliers to all 13 game bind() functions"
```

---

## Task 7: Final verification

### Step 1: Lint

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && npm run lint
```
Expected: 0 errors.

### Step 2: Full test suite

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && npm test
```
Expected: All tests pass.

### Step 3: Git log sanity check

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && git log --oneline -8
```
Expected: 6 feature commits for this feature (Tasks 1-6).

### Step 4: Manual smoke test (browser)

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa && npm run dev
```

1. Open `http://localhost:5173` → navigate to Games view
2. Verify all 13 game cards show `Easy | Med | Hard` pill buttons
3. Tap `Hard` on Rhythm Dash → refresh → verify `Hard` is still selected
4. Open Rhythm Dash (on Hard) → verify game feels noticeably faster
5. Tap `Easy` on Pitch Quest → open it → verify game is more forgiving
6. Tap `Med` on any game → open it → verify behavior matches existing gameplay
7. Verify tapping a difficulty pill does NOT navigate to the game
