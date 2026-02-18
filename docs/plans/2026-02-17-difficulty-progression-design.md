# Game Difficulty Progression — Design Doc

**Date:** 2026-02-17
**Status:** Approved

## Goal

Add Easy / Medium / Hard difficulty selection to all 13 games. Player chooses difficulty directly on each game card in the games grid. Medium always matches current gameplay — zero regression to existing behavior.

## User Experience

Each game card in the games grid shows three pill buttons below the game title: `Easy`, `Med`, `Hard`. The selected difficulty is highlighted. Tapping a pill saves the choice immediately (no extra screen). Opening the game uses the saved difficulty. Default is Medium.

```
┌─────────────────────────────┐
│  🎵 Pitch Quest             │
│  Pitch                      │
│  [Easy] [Med] [Hard]        │
│                           › │
└─────────────────────────────┘
```

---

## Architecture

**New files:**
- `src/games/difficulty.js` — service: `getDifficulty(gameId)`, `setDifficulty(gameId, level)`, `getCurrentLevel(gameId)`
- `src/games/difficulty-picker.js` — injects picker UI into each `.game-card`, wires click handlers

**Modified files:**
- `src/games/game-config.js` — add `difficulty` block to all 13 game entries
- `src/games/game-enhancements.js` — call `renderDifficultyPickers()` when games grid loads
- `src/games/game-metrics.js` — read difficulty and pass to `bind(difficulty)`
- `src/games/*.js` (13 files) — accept `difficulty` param in `bind()`, apply speed/complexity
- `src/styles/app.css` — picker styles inside `@layer games`

**Data flow:**
1. Games grid loads → `game-enhancements.js` calls `renderDifficultyPickers()` → injects picker into each card
2. Tap Easy/Med/Hard → `setDifficulty(gameId, level)` → `localStorage` → card updates visually
3. Open game → `game-metrics.js` calls `getDifficulty(gameId)` → passes `{ speed, complexity }` to `bind()`
4. Game uses multipliers at init time only

---

## Section 1: Difficulty Config (`game-config.js`)

Each game entry gains a `difficulty` block:

```js
difficulty: {
    easy:   { speed: 0.8, complexity: 0 },
    medium: { speed: 1.0, complexity: 1 },
    hard:   { speed: 1.3, complexity: 2 },
}
```

**Multiplier semantics:**
- `speed` — multiplied against base tempo/timing. 1.0 = current behavior.
- `complexity` — integer 0/1/2. Each game interprets for its mechanic.

**Complexity interpretation by game group:**

| Group | Games | complexity=0 | complexity=1 | complexity=2 |
|-------|-------|-------------|-------------|-------------|
| Pitch | Pitch Quest, Ear Trainer, Tuning Time, Scale Practice | Open strings / narrow intervals | First position (current) | Wider intervals / higher positions |
| Rhythm | Rhythm Dash, Rhythm Painter, Pizzicato, Duet Challenge | Simple patterns | Medium patterns (current) | Dense/syncopated patterns |
| Reading/Bowing | Note Memory, Story Song, Melody Maker, Bow Hero, String Quest | Short sequences / large bow zones | Medium (current) | Long sequences / narrow bow zones |

Medium tier always reproduces exact current gameplay.

---

## Section 2: `difficulty.js` Service

```js
// Storage key pattern
const key = (id) => `panda:difficulty:${id}`;
const LEVELS = ['easy', 'medium', 'hard'];
const DEFAULT = 'medium';

getCurrentLevel(gameId)   // → 'easy' | 'medium' | 'hard'
getDifficulty(gameId)     // → { speed, complexity } from game-config
setDifficulty(gameId, level)  // → saves to localStorage
```

**Edge cases:**
- Unknown game ID → returns `{ speed: 1.0, complexity: 1 }` (medium)
- Corrupt localStorage → falls back to `'medium'`
- Missing difficulty block in config → returns medium default

---

## Section 3: Picker UI (`difficulty-picker.js`)

- Queries all `.game-card` elements on games grid load
- Injects `<div class="difficulty-picker" role="group" aria-label="Difficulty for {name}">` into each card
- Three `<button class="difficulty-btn" aria-pressed="true|false" data-game-id data-level>` elements
- Click: calls `setDifficulty()`, toggles `.is-selected`, updates `aria-pressed`
- Tapping a pill does NOT navigate — card link still handles navigation
- Reads `getCurrentLevel()` on init to restore saved state

**CSS (inside `@layer games`):**
- `.difficulty-picker` — flex row, gap, centered
- `.difficulty-btn` — pill shape, `--radius-full`, ghost/outline default
- `.difficulty-btn.is-selected` — filled with `--color-primary` (or card accent color)
- Uses only CSS custom properties from tokens layer

---

## Section 4: Game Integration (`game-metrics.js` + game files)

**`game-metrics.js`:**
```js
import { getDifficulty } from './difficulty.js';

// In loadGame(viewId):
const gameId = viewId.replace('view-game-', '');
const difficulty = getDifficulty(gameId);
module.bind(difficulty);
```

**Each game's `bind()`:**
```js
// Before (no args)
export function bind() { ... }

// After (default = medium, backward compatible)
export function bind(difficulty = { speed: 1.0, complexity: 1 }) {
    const beatInterval = BASE_BEAT_MS / difficulty.speed;
    const pool = CONTENT_POOLS[difficulty.complexity];
    // ...
}
```

**What doesn't change:**
- `recordGameEvent()` — no difficulty field stored
- `game-complete.js` — modal unchanged
- `update()` functions — difficulty only affects initialization
- Achievements — fully difficulty-agnostic (stars count regardless of level)
- Existing tests — default param ensures `bind()` with no args still works

---

## Section 5: Persistence + Scope

**Storage:** `localStorage` key `panda:difficulty:{gameId}` per game. Value: `'easy' | 'medium' | 'hard'`.

**Explicitly out of scope:**
- No per-difficulty star tracking
- No "unlock hard after 3 stars" gating
- No difficulty shown in game-complete modal or progress view
- No coach advice changes based on difficulty

---

## Files Modified

| File | Change |
|------|--------|
| `src/games/difficulty.js` | New — service |
| `src/games/difficulty-picker.js` | New — UI injector |
| `src/games/game-config.js` | Add `difficulty` block to all 13 entries |
| `src/games/game-enhancements.js` | Call `renderDifficultyPickers()` on games grid load |
| `src/games/game-metrics.js` | Pass difficulty to `bind()` |
| `src/games/*.js` (13 files) | Add `difficulty` param to `bind()`, apply multipliers |
| `src/styles/app.css` | Picker CSS in `@layer games` |

---

## Verification

1. **Default behavior:** Open any game without touching picker → plays at current difficulty (medium)
2. **Easy:** Select Easy on Rhythm Dash → tempo noticeably slower, simpler patterns
3. **Hard:** Select Hard on Pitch Quest → wider interval challenges, faster response window
4. **Persistence:** Select Hard, reload page → Hard still selected on game card
5. **Achievement parity:** Earn stars on Easy → badge unlock logic fires identically
6. **Lint:** `npm run lint` — 0 errors
7. **Tests:** `npm test` — all 499 pass
