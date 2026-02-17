# Game Completion + Context-Aware Coach Design

**Date:** 2026-02-17
**Status:** Approved

---

## Problem

1. **Games end silently** — when a game's checklist completes, `reportSession()` fires but nothing visible happens. No fanfare, no summary, no "play again" prompt. Emerson gets no closure or celebration.

2. **Coach messages are generic** — the coach message pool is seeded from ML skill recommendations (pitch/rhythm/bow) but never references the specific game just played. Messages cycle through the same 5 base tips regardless of what Emerson did.

---

## Solution

### Part 1: Game-Over Modal

A shared `<dialog>` element in `index.html` that listens for the existing `panda:game-recorded` event (already emitted by `recordGameEvent()` in `src/games/shared.js:141`). Zero per-game changes needed.

**Visual design:**
- Fullscreen overlay using native `<dialog>` (Chrome/Safari supported)
- Mascot `mascot-celebrate.webp` centered at top
- "Great job, Emerson!" heading (Fraunces display)
- Star rating: 1–3 filled stars animating in with stagger delays
- Score + accuracy stats row
- CSS-only confetti: 12 `<span>` elements, `@keyframes confetti-fall`, randomized via CSS custom properties
- Two CTAs: "Play Again" (re-triggers hashchange reset) and "Back to Games" (navigates to `#view-games`)

**Guard:** Modal only opens if `score > 0 || accuracy > 0` — prevents false trigger when navigating away mid-game.

**Files:**
- `public/index.html` — add `<dialog id="game-complete-modal">` with inner structure
- `src/games/game-complete.js` — new module (~60 lines): event listener, populate dialog, open/close logic
- `src/styles/app.css` — `@keyframes confetti-fall`, `.game-complete-dialog` styles, star reveal animation
- `src/app.js` — lazy-load `game-complete` module alongside game modules

### Part 2: Context-Aware Coach Messages

After `panda:game-recorded` fires, `coach-actions.js` prepends a game-specific message at the front of the coach message queue. Uses the existing `buildMessages()` / `setMessage()` infrastructure — no ML layer changes.

**Game → message map** (new constant in `coach-actions.js`):
```
pitch-quest    → "Nice pitch work! Try using less pressure on the bow next."
rhythm-dash    → "Great rhythm! See if you can keep that tempo in a real song."
bow-hero       → "Smooth bowing! Remember to keep your elbow relaxed."
ear-trainer    → "Sharp ears! That listening skill helps everything."
note-memory    → "Good note memory! Try naming them out loud next time."
tuning-time    → "Perfect — staying in tune is a superpower."
scale-practice → "Scales are the foundation. That work pays off."
melody-maker   → "You made music! How did it feel?"
rhythm-painter → "Rhythm painter sharpens your inner beat."
string-quest   → "Nice string work! Feel how each string vibrates differently."
pizzicato      → "Pizzicato builds finger strength. Great session."
duet-challenge → "Playing together takes real listening. Well done."
story-song     → "Stories make music come alive. Lovely session."
```

**Flow:**
1. `panda:game-recorded` fires with `{ id, score, accuracy }`
2. `coach-actions.js` listener: stores `pendingGameMessage = GAME_MESSAGES[id]`
3. On coach view load (or immediately if coach is already active): `pendingGameMessage` injected at front of message queue via `messages.unshift()`
4. Message clears after display (one-shot)

**Files:**
- `src/coach/coach-actions.js` — add `GAME_MESSAGES` map + `panda:game-recorded` listener (~25 lines)

---

## Key Technical Facts

- **`panda:game-recorded`** event: emitted by `shared.js:141` after every `recordGameEvent()` call. Detail: `{ type, id, day, timestamp, score?, accuracy?, stars? }`
- **`GAME_RECORDED`** constant: exported from `src/utils/event-names.js`
- **`recordGameEvent()` is called by all 13 games** — no per-game changes needed for modal or coach
- **`reportSession()` pattern**: each game guards with `if (reported) return` — prevents double-fire
- **Existing `resetSession()`**: called on hashchange back to the same view — "Play Again" reuses this
- **`buildMessages(recs)`** in coach-actions.js already accepts injected messages via `recs.coachMessage` — the pending message pattern mirrors this existing approach
- **`<dialog>` element**: already used elsewhere in the codebase (check before adding polyfill)
- **Star display**: `formatStars(count, total)` already exported from `shared.js:9`

---

## Out of Scope

- No changes to ML recommendation engine
- No per-game score algorithm changes
- No new persistence layer (existing `recordGameEvent` storage is sufficient)
- No audio changes
- No song library changes
