# Achievement Celebration Overlay — Design Doc

**Date:** 2026-02-17
**Status:** Approved

## Goal

Surface achievement unlocks as a full-screen celebration overlay visible from any view, and complete the three badge slots that have no unlock logic (`streak_7`, `level_5`, `practice_100`). Also add the missing `all_games` badge slot to the progress view HTML.

## User Experience

When Emerson earns a badge — from any view, mid-game or otherwise — a `<dialog>` overlay appears with:
- Confetti animation
- Badge art (or emoji fallback)
- "New Badge!" heading
- Badge name
- "You earned it, Emerson! 🎉"
- A single "Yay!" button to dismiss

If two badges unlock in the same session, the second queues and shows immediately after the first is dismissed.

## Architecture

Event-driven. `progress.js` dispatches `panda:achievement-unlocked` when a badge transitions from locked → unlocked. A new globally-loaded module `achievement-celebrate.js` owns the dialog and listens for that event. No per-game or per-view code changes needed.

---

## Section 1: Event Name + Unlock Logic

**`src/utils/event-names.js`**
- Add: `export const ACHIEVEMENT_UNLOCKED = 'panda:achievement-unlocked';`
- Detail shape: `{ id: string, name: string, artSrc?: string }`

**`src/progress/progress.js`**

Three new unlock conditions in `buildProgress()`, after existing unlocks (~line 186):
- `streak_7`: `if (streak >= 7) tracker.unlock('streak_7', now)`
  - `streak` is already computed by `calculate_streak()` at this point
- `level_5`: `if (progress.level >= 5) tracker.unlock('level_5', now)`
  - `progress.level` available after all `log_practice()` calls
- `practice_100`: accumulate `totalMinutes` in the practice event loop (alongside `weekMinutes`); `if (totalMinutes >= 100) tracker.unlock('practice_100', now)`

Dispatch logic in `applyUI()`:
- Build a `lockedBefore` snapshot (Set of badge IDs where `el.classList.contains('locked')` is true) before toggling classes
- After toggling, for each badge that was locked and is now unlocked, dispatch `ACHIEVEMENT_UNLOCKED` with the badge's id, name, and art src (read from the badge element's img src or data attribute)
- Fires at most once per badge per page load

**Badge metadata map** (inline in `progress.js` or a small const at top):
```js
const BADGE_META = {
    first_note:    { name: 'First Note',    artSrc: null },
    streak_7:      { name: 'Week Warrior',   artSrc: './assets/badges/badge_practice_streak_1769390952199.webp' },
    level_5:       { name: 'Rising Star',    artSrc: null },
    practice_100:  { name: 'Dedicated',      artSrc: null },
    pitch_perfect: { name: 'Pitch Perfect',  artSrc: './assets/badges/badge_pitch_master_1769390924763.webp' },
    rhythm_master: { name: 'Rhythm Master',  artSrc: './assets/badges/badge_rhythm_star_1769390938421.webp' },
    bow_hero:      { name: 'Bow Hero',       artSrc: './assets/badges/badge_bow_hero_1769390964607.webp' },
    ear_training:  { name: 'Golden Ear',     artSrc: './assets/badges/badge_ear_training_1769391019017.webp' },
    all_games:     { name: 'Game Master',    artSrc: null },
};
```

---

## Section 2: Dialog HTML (`index.html`)

Insert after `#game-complete-modal`, before script tags:

```html
<dialog id="achievement-modal" aria-modal="true" aria-labelledby="achievement-heading">
  <div class="achievement-inner">
    <div class="achievement-confetti" aria-hidden="true">
      <!-- 12 × .confetti-piece with inline --fall-delay / --fall-dur / --fall-drift -->
    </div>
    <div class="achievement-badge-art" id="achievement-badge-art" role="img" aria-label="">
      <img id="achievement-badge-img" src="" alt="" width="120" height="120" loading="eager">
      <span class="achievement-badge-fallback" id="achievement-badge-fallback" aria-hidden="true"></span>
    </div>
    <h2 id="achievement-heading" class="achievement-heading">New Badge!</h2>
    <p class="achievement-badge-name" id="achievement-badge-name"></p>
    <p class="achievement-cheer">You earned it, Emerson!</p>
    <button id="achievement-yay" class="btn btn-primary achievement-yay">Yay!</button>
  </div>
</dialog>
```

Confetti pieces: 12 `<span class="confetti-piece">` with inline `style="--fall-delay:Xs; --fall-dur:Xs; --fall-drift:Xpx"` — reuses existing `confetti-fall` keyframe from `@layer games`.

---

## Section 3: CSS (`src/styles/app.css`, inside `@layer games`)

New block appended after the game-complete section. Reuses existing keyframes (`confetti-fall`, `mascot-bounce`). No new keyframes needed.

Classes:
- `.achievement-inner` — centered column, glassmorphism (`.glass` pattern), `max-width: 360px`, `gap: var(--space-4)`, `padding: var(--space-8) var(--space-6)`, `text-align: center`
- `#achievement-modal::backdrop` — same `backdrop-filter: blur(8px)` + semi-opaque dim as game-complete
- `.achievement-badge-art` — `width: 120px; height: 120px; border-radius: 50%; border: 3px solid var(--color-primary); overflow: hidden; margin: 0 auto; animation: mascot-bounce 0.6s var(--ease-bounce)`
- `.achievement-badge-img` — `width: 100%; height: 100%; object-fit: cover`
- `.achievement-badge-fallback` — `font-size: 3rem; line-height: 120px` (shown when no art)
- `.achievement-heading` — `font-family: var(--font-display); font-size: var(--text-2xl); color: var(--color-secondary)` (gold)
- `.achievement-badge-name` — `font-weight: 700; font-size: var(--text-lg); color: var(--color-text)`
- `.achievement-cheer` — `font-size: var(--text-sm); color: var(--color-text-muted)`
- `.achievement-yay` — inherits `.btn .btn-primary`, `min-width: 140px`

Reduced-motion (both `@media` and `:root:has(#setting-reduce-motion:checked)`):
- `.confetti-piece`: `animation: none`
- `.achievement-badge-art`: `animation: none`

---

## Section 4: `src/progress/achievement-celebrate.js`

New module. Loaded globally via direct import in `src/app.js` (not view-scoped, since achievements can unlock from any view).

```
Responsibilities:
- Grab: dialog, badge-img, badge-fallback, badge-name el, yay button, badge-art wrapper
- State: queue (array of { name, artSrc }), isOpen (bool)
- On ACHIEVEMENT_UNLOCKED: push to queue; if not open, showNext()
- showNext(): pop from queue, populate DOM, dialog.showModal(), set isOpen = true
- populate(name, artSrc):
    - badge-name.textContent = name
    - badge-art aria-label = name
    - if artSrc: show img (src = artSrc), hide fallback
    - else: hide img, show fallback (emoji per id map, default '★')
- close(): dialog.close(), isOpen = false; if queue.length, showNext()
- Yay btn click → close()
- dialog click (backdrop) → if e.target === dialog, close()
- dialog 'close' event: drain queue if items waiting
- Voice: if canSpeak(), speak `"New badge! ${name}!"`
```

`canSpeak()` reads `#setting-voice` checkbox — same pattern as `coach-actions.js`.

---

## Section 5: `all_games` Badge Slot (`public/views/progress.html`)

Add 9th badge item after `ear_training`:

```html
<div class="badge-item locked" data-achievement="all_games">
  <div class="badge-art">
    <span class="badge-fallback">🎮</span>
    <span class="badge-lock">🔒</span>
  </div>
  <span class="badge-name">Game Master</span>
</div>
```

---

## Section 6: Global Module Loading (`src/app.js`)

Add a direct top-level import (not lazy, since it must be ready before any event fires):

```js
import './progress/achievement-celebrate.js';
```

No changes to `app-utils.js` or `getModulesForView()` — this module is always-on.

---

## Files Modified

| File | Change |
|------|--------|
| `src/utils/event-names.js` | Add `ACHIEVEMENT_UNLOCKED` |
| `src/progress/progress.js` | Add `streak_7`/`level_5`/`practice_100` unlock logic + `BADGE_META` + dispatch |
| `index.html` | Add `#achievement-modal` dialog |
| `src/styles/app.css` | New achievement overlay CSS block in `@layer games` |
| `src/progress/achievement-celebrate.js` | New file — dialog controller |
| `src/app.js` | Direct import of `achievement-celebrate.js` |
| `public/views/progress.html` | Add `all_games` badge slot |

---

## Verification

1. **streak_7**: Set 7 consecutive practice days in localStorage → load app → overlay appears
2. **level_5**: Accumulate enough XP for level 5 → overlay appears from any view
3. **practice_100**: Accumulate 100+ minutes total → overlay appears
4. **Queue**: Trigger two badges simultaneously → second overlay appears after first dismissed
5. **Reduced motion**: Toggle "Reduce motion" in settings → no confetti, no badge bounce
6. **Voice**: Enable voice → "New badge! Week Warrior!" spoken on unlock
7. **Lint**: `npm run lint` — 0 errors
8. **Tests**: `npm test` — all pass
