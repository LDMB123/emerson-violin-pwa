# Game Completion + Context-Aware Coach Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a celebratory game-over modal when any game ends, and inject a game-specific message into the coach queue.

**Architecture:** A new `game-complete.js` module listens for the existing `panda:game-recorded` event (already fired by all 13 games via `recordGameEvent()` in `src/games/shared.js`). No per-game changes needed. Coach personalization uses a `GAME_MESSAGES` map in `coach-actions.js` that stores a `pendingGameMessage` on the same event, injected at the front of the message queue on next coach load.

**Tech Stack:** Vanilla JS ES modules, native `<dialog>` element, CSS keyframes, Vitest for tests.

---

## Context

- **`panda:game-recorded` event**: emitted at `src/games/shared.js:142` after every game. Detail: `{ type, id, day, timestamp, score?, accuracy?, stars? }`
- **`GAME_RECORDED` constant**: exported from `src/utils/event-names.js`
- **Module registration**: `moduleLoaders` in `src/app.js:14-51`; loaded by `getModulesForView()` in `src/utils/app-utils.js`
- **`shouldLoadGames`**: `(viewId) => viewId === 'view-games' || viewId.startsWith('view-game-')` — this is the predicate to hook into
- **`buildMessages(recs)`** in `src/coach/coach-actions.js:57-70`: uses `recs.coachCue` → `recs.coachMessage` → baseMessages priority order
- **`setMessage(message)`** in `src/coach/coach-actions.js:26-36`: 600ms typing animation
- **`index.html`** is at repo root (not `public/`); injection point: after the closing `</div>` of `id="app"` at line ~84
- **No existing `<dialog>` elements** — only `<div popover="auto">` is used
- **CSS variables in use**: `--color-primary: #E95639`, `--color-gold: #F9A93F`, `--ease-bounce`, `--ease-out`, `--radius-xl`, `--glass-bg`, `--glass-border`
- **Test pattern**: `import { describe, it, expect } from 'vitest'` — pure function unit tests only (DOM modules not unit-tested)
- **Run tests**: `npm test` (runs all 21 test files, 497 assertions)

---

## Task 1: CSS — Game-Over Modal Styles + Confetti

**Files:**
- Modify: `src/styles/app.css` (append to end)

**Step 1: Append the styles**

Add the following to the very end of `src/styles/app.css`:

```css
/* ============================================================
   GAME-COMPLETE MODAL
   ============================================================ */
.game-complete-dialog {
    border: none;
    background: transparent;
    padding: 0;
    max-width: 100vw;
    max-height: 100vh;
    overflow: visible;
}

.game-complete-dialog::backdrop {
    background: rgba(53, 32, 25, 0.6);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
}

.game-complete-inner {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    padding: var(--space-8) var(--space-6);
    max-width: 360px;
    width: calc(100vw - var(--space-8));
    text-align: center;
    position: relative;
    overflow: hidden;
}

.game-complete-mascot {
    width: 100px;
    height: 100px;
    object-fit: contain;
    display: block;
    margin: 0 auto var(--space-4);
    animation: mascot-bounce 0.6s var(--ease-bounce) both;
}

@keyframes mascot-bounce {
    from { transform: scale(0.5) translateY(20px); opacity: 0; }
    to   { transform: scale(1) translateY(0); opacity: 1; }
}

.game-complete-heading {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    color: var(--color-primary);
    margin: 0 0 var(--space-4);
}

.game-complete-stars {
    display: flex;
    justify-content: center;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
    font-size: 2rem;
    line-height: 1;
}

.game-complete-star {
    display: inline-block;
    opacity: 0;
    transform: scale(0.3) rotate(-30deg);
    transition: opacity 0.3s ease, transform 0.4s var(--ease-bounce);
}

.game-complete-star.revealed {
    opacity: 1;
    transform: scale(1) rotate(0deg);
}

.game-complete-star.filled {
    color: var(--color-gold);
}

.game-complete-star.empty {
    color: rgba(53, 32, 25, 0.2);
}

.game-complete-stats {
    display: flex;
    justify-content: center;
    gap: var(--space-6);
    margin-bottom: var(--space-6);
}

.game-complete-stat {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}

.game-complete-stat-value {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: 700;
    color: var(--color-text);
}

.game-complete-stat-label {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.game-complete-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
}

/* CSS-only confetti */
.game-complete-confetti {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
    border-radius: var(--radius-xl);
}

.confetti-piece {
    position: absolute;
    top: -10px;
    width: 8px;
    height: 8px;
    border-radius: 2px;
    opacity: 0;
    animation: confetti-fall var(--fall-dur, 1.8s) var(--fall-delay, 0s) ease-in both;
}

@keyframes confetti-fall {
    0%   { opacity: 1; transform: translateY(0) rotate(0deg) translateX(0); }
    100% { opacity: 0; transform: translateY(320px) rotate(720deg) translateX(var(--fall-drift, 0px)); }
}

@media (prefers-reduced-motion: reduce) {
    .game-complete-mascot { animation: none; opacity: 1; }
    .confetti-piece { animation: none; opacity: 0; }
    .game-complete-star { opacity: 1; transform: none; transition: none; }
}

:root:has(#setting-reduce-motion:checked) .game-complete-mascot { animation: none; opacity: 1; }
:root:has(#setting-reduce-motion:checked) .confetti-piece { animation: none; opacity: 0; }
:root:has(#setting-reduce-motion:checked) .game-complete-star { opacity: 1; transform: none; transition: none; }
```

**Step 2: Verify no lint errors**

Run: `npm run lint`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/styles/app.css
git commit -m "feat: add game-complete modal CSS styles and confetti keyframes"
```

---

## Task 2: HTML — Add `<dialog>` to index.html

**Files:**
- Modify: `index.html` (root, not `public/`)

**Step 1: Read the area around line 84 to find exact insertion point**

The `</div>` closing the `id="app"` div is around line 84 (after the `</nav>` and popover `</div>`). Insert the `<dialog>` immediately after the closing `</div>` for `id="app"`.

**Step 2: Add the dialog markup**

Find the line `</div>` that closes the `id="app"` div and insert after it:

```html
  <!-- Game Complete Modal -->
  <dialog id="game-complete-modal" class="game-complete-dialog" aria-labelledby="game-complete-heading" aria-modal="true">
    <div class="game-complete-inner">
      <div class="game-complete-confetti" aria-hidden="true">
        <span class="confetti-piece" style="left:10%;--fall-delay:0s;--fall-dur:1.6s;--fall-drift:20px;background:#E95639"></span>
        <span class="confetti-piece" style="left:20%;--fall-delay:0.1s;--fall-dur:1.9s;--fall-drift:-15px;background:#F9A93F"></span>
        <span class="confetti-piece" style="left:30%;--fall-delay:0.2s;--fall-dur:1.7s;--fall-drift:30px;background:#4FB69E"></span>
        <span class="confetti-piece" style="left:40%;--fall-delay:0.05s;--fall-dur:2.0s;--fall-drift:-25px;background:#E95639"></span>
        <span class="confetti-piece" style="left:50%;--fall-delay:0.15s;--fall-dur:1.5s;--fall-drift:10px;background:#F9A93F"></span>
        <span class="confetti-piece" style="left:60%;--fall-delay:0.3s;--fall-dur:1.8s;--fall-drift:-20px;background:#4FB69E"></span>
        <span class="confetti-piece" style="left:70%;--fall-delay:0.0s;--fall-dur:2.1s;--fall-drift:25px;background:#E95639"></span>
        <span class="confetti-piece" style="left:80%;--fall-delay:0.25s;--fall-dur:1.6s;--fall-drift:-10px;background:#F9A93F"></span>
        <span class="confetti-piece" style="left:90%;--fall-delay:0.1s;--fall-dur:1.9s;--fall-drift:15px;background:#4FB69E"></span>
        <span class="confetti-piece" style="left:15%;--fall-delay:0.4s;--fall-dur:1.7s;--fall-drift:-30px;background:#E95639"></span>
        <span class="confetti-piece" style="left:55%;--fall-delay:0.35s;--fall-dur:2.0s;--fall-drift:20px;background:#F9A93F"></span>
        <span class="confetti-piece" style="left:75%;--fall-delay:0.2s;--fall-dur:1.5s;--fall-drift:-15px;background:#4FB69E"></span>
      </div>
      <picture>
        <source srcset="./assets/illustrations/mascot-celebrate.webp" type="image/webp">
        <img src="./assets/illustrations/mascot-celebrate.png" alt="" class="game-complete-mascot" width="100" height="100" decoding="async">
      </picture>
      <h2 id="game-complete-heading" class="game-complete-heading">Great job, Emerson!</h2>
      <div class="game-complete-stars" aria-label="Stars earned" id="game-complete-stars">
        <span class="game-complete-star filled" aria-hidden="true">★</span>
        <span class="game-complete-star filled" aria-hidden="true">★</span>
        <span class="game-complete-star filled" aria-hidden="true">★</span>
      </div>
      <div class="game-complete-stats">
        <div class="game-complete-stat">
          <span class="game-complete-stat-value" id="game-complete-score">—</span>
          <span class="game-complete-stat-label">Score</span>
        </div>
        <div class="game-complete-stat">
          <span class="game-complete-stat-value" id="game-complete-accuracy">—</span>
          <span class="game-complete-stat-label">Accuracy</span>
        </div>
      </div>
      <div class="game-complete-actions">
        <button type="button" id="game-complete-play-again" class="btn btn-primary">Play Again</button>
        <a href="#view-games" id="game-complete-back" class="btn btn-secondary">Back to Games</a>
      </div>
    </div>
  </dialog>
```

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add game-complete dialog markup to index.html"
```

---

## Task 3: JS — game-complete.js module

**Files:**
- Create: `src/games/game-complete.js`

**Step 1: Write the module**

```js
import { GAME_RECORDED } from '../utils/event-names.js';

const dialog = document.getElementById('game-complete-modal');
const scoreEl = document.getElementById('game-complete-score');
const accuracyEl = document.getElementById('game-complete-accuracy');
const starsEl = document.getElementById('game-complete-stars');
const playAgainBtn = document.getElementById('game-complete-play-again');
const backBtn = document.getElementById('game-complete-back');

if (!dialog) throw new Error('[game-complete] dialog element not found');

const STAR_COUNT = 3;

const renderStars = (stars) => {
    if (!starsEl) return;
    const filled = Number.isFinite(stars) ? Math.max(0, Math.min(STAR_COUNT, Math.round(stars))) : STAR_COUNT;
    const starEls = starsEl.querySelectorAll('.game-complete-star');
    starEls.forEach((el, i) => {
        el.classList.remove('filled', 'empty', 'revealed');
        el.classList.add(i < filled ? 'filled' : 'empty');
        el.textContent = i < filled ? '★' : '☆';
    });
};

const revealStars = () => {
    if (!starsEl) return;
    const starEls = starsEl.querySelectorAll('.game-complete-star');
    starEls.forEach((el, i) => {
        setTimeout(() => el.classList.add('revealed'), i * 180);
    });
};

const populate = (detail) => {
    const { score, accuracy, stars } = detail;
    if (scoreEl) scoreEl.textContent = Number.isFinite(score) ? String(score) : '—';
    if (accuracyEl) accuracyEl.textContent = Number.isFinite(accuracy) ? `${accuracy}%` : '—';
    renderStars(stars);
};

const open = (detail) => {
    if (!dialog) return;
    populate(detail);
    dialog.showModal();
    // Stagger star reveal after modal opens
    requestAnimationFrame(() => revealStars());
};

const close = () => {
    if (!dialog) return;
    dialog.close();
};

// Play Again: go back then forward to re-trigger hashchange reset
if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
        close();
        history.back();
        setTimeout(() => history.forward(), 80);
    });
}

// Back to Games: close then navigate
if (backBtn) {
    backBtn.addEventListener('click', () => close());
}

// Close on backdrop click
dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
});

// Listen for game recorded
document.addEventListener(GAME_RECORDED, (e) => {
    const detail = e.detail || {};
    const { score, accuracy } = detail;
    // Guard: only show if there's something to celebrate
    if (!Number.isFinite(score) && !Number.isFinite(accuracy)) return;
    if (score === 0 && accuracy === 0) return;
    open(detail);
});
```

**Step 2: Verify no lint errors**

Run: `npm run lint`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/games/game-complete.js
git commit -m "feat: add game-complete.js modal module"
```

---

## Task 4: Wire game-complete module into app.js and app-utils.js

**Files:**
- Modify: `src/app.js` (line ~40, after `gameEnhancements`)
- Modify: `src/utils/app-utils.js` (line ~70, inside `shouldLoadGames` block)

**Step 1: Write the failing test for getModulesForView (game-complete)**

In `tests/app-utils.test.js`, find the existing `getModulesForView` describe block and add:

```js
it('loads gameComplete for view-game-pitch-quest', () => {
    const modules = getModulesForView('view-game-pitch-quest');
    expect(modules).toContain('gameComplete');
});

it('loads gameComplete for view-games', () => {
    const modules = getModulesForView('view-games');
    expect(modules).toContain('gameComplete');
});
```

**Step 2: Run the failing test**

Run: `npm test -- --reporter=verbose tests/app-utils.test.js`
Expected: FAIL — `gameComplete` not in modules array

**Step 3: Register gameComplete in app.js**

In `src/app.js`, in the `moduleLoaders` object after `gameEnhancements` entry (line ~40):

```js
    gameEnhancements: () => import('./games/game-enhancements.js'),
    gameComplete: () => import('./games/game-complete.js'),
```

**Step 4: Add gameComplete to getModulesForView in app-utils.js**

In `src/utils/app-utils.js`, the `shouldLoadGames` block currently at lines 69-71:

```js
    if (shouldLoadGames(viewId)) {
        modules.push('gameMetrics', 'gameEnhancements');
    }
```

Change to:

```js
    if (shouldLoadGames(viewId)) {
        modules.push('gameMetrics', 'gameEnhancements', 'gameComplete');
    }
```

**Step 5: Run tests to verify they pass**

Run: `npm test -- --reporter=verbose tests/app-utils.test.js`
Expected: PASS — both new tests pass, all existing tests still pass

**Step 6: Run full test suite**

Run: `npm test`
Expected: All tests pass (497+)

**Step 7: Commit**

```bash
git add src/app.js src/utils/app-utils.js tests/app-utils.test.js
git commit -m "feat: register gameComplete module in app.js and app-utils.js"
```

---

## Task 5: Context-aware coach messages in coach-actions.js

**Files:**
- Modify: `src/coach/coach-actions.js`

**Step 1: Add GAME_RECORDED import and GAME_MESSAGES constant**

In `src/coach/coach-actions.js`, change the import at line 2 from:

```js
import { ML_UPDATE, LESSON_STEP, LESSON_COMPLETE } from '../utils/event-names.js';
```

To:

```js
import { ML_UPDATE, LESSON_STEP, LESSON_COMPLETE, GAME_RECORDED } from '../utils/event-names.js';
```

**Step 2: Add GAME_MESSAGES constant after the imports**

After the imports block (before `const bubble = ...`), add:

```js
const GAME_MESSAGES = {
    'pitch-quest':    'Nice pitch work! Try using less pressure on the bow next.',
    'rhythm-dash':    'Great rhythm! See if you can keep that tempo in a real song.',
    'bow-hero':       'Smooth bowing! Remember to keep your elbow relaxed.',
    'ear-trainer':    'Sharp ears! That listening skill helps everything.',
    'note-memory':    'Good note memory! Try naming them out loud next time.',
    'tuning-time':    'Perfect — staying in tune is a superpower.',
    'scale-practice': 'Scales are the foundation. That work pays off.',
    'melody-maker':   'You made music! How did it feel?',
    'rhythm-painter': 'Rhythm painter sharpens your inner beat.',
    'string-quest':   'Nice string work! Feel how each string vibrates differently.',
    'pizzicato':      'Pizzicato builds finger strength. Great session.',
    'duet-challenge': 'Playing together takes real listening. Well done.',
    'story-song':     'Stories make music come alive. Lovely session.',
};

let pendingGameMessage = null;
```

**Step 3: Modify buildMessages to inject pendingGameMessage**

In `buildMessages(recs)` at line 57-70, the function currently starts with:

```js
const buildMessages = (recs) => {
    const next = [...baseMessages];
    if (recs?.coachMessage) next.unshift(recs.coachMessage);
    if (recs?.coachCue) next.unshift(recs.coachCue);
```

Change to inject `pendingGameMessage` at the front (highest priority after coachCue), and clear it after use:

```js
const buildMessages = (recs) => {
    const next = [...baseMessages];
    if (recs?.coachMessage) next.unshift(recs.coachMessage);
    if (pendingGameMessage) {
        next.unshift(pendingGameMessage);
        pendingGameMessage = null;
    }
    if (recs?.coachCue) next.unshift(recs.coachCue);
```

**Step 4: Add GAME_RECORDED listener at end of file**

After line 142 (`document.addEventListener(LESSON_COMPLETE, handleLessonComplete);`), add:

```js
document.addEventListener(GAME_RECORDED, (e) => {
    const id = e.detail?.id;
    if (id && GAME_MESSAGES[id]) {
        pendingGameMessage = GAME_MESSAGES[id];
    }
});
```

**Step 5: Verify no lint errors**

Run: `npm run lint`
Expected: 0 errors

**Step 6: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 7: Commit**

```bash
git add src/coach/coach-actions.js
git commit -m "feat: add context-aware coach messages on game completion"
```

---

## Task 6: Final verification

**Step 1: Full lint check**

Run: `npm run lint`
Expected: 0 errors

**Step 2: Full test suite**

Run: `npm test`
Expected: All tests pass

**Step 3: Manual smoke test checklist**

1. `npm run dev` — open in browser at localhost
2. Navigate to `#view-game-pitch-quest`
3. Play a round (or inspect JS console to manually fire event):
   ```js
   document.dispatchEvent(new CustomEvent('panda:game-recorded', { detail: { type: 'game', id: 'pitch-quest', score: 120, accuracy: 85, stars: 3 } }))
   ```
4. Verify modal opens with: mascot, "Great job, Emerson!" heading, 3 stars (stagger reveal), score 120, accuracy 85%
5. Click "Play Again" — modal closes, game resets
6. Manually fire again with `stars: 1, score: 10, accuracy: 20` — verify 1 filled + 2 empty stars
7. Manually fire with `score: 0, accuracy: 0` — verify modal does NOT open
8. Navigate to `#view-coach` — verify first coach message is game-specific ("Nice pitch work! Try using less pressure…")
9. Click "Next tip" — message advances to generic tips
10. Enable "Reduce Motion" in settings (or via DevTools) — verify stars show instantly, no confetti, mascot visible

**Step 4: Final commit if any tweaks were needed**

```bash
git add -p
git commit -m "fix: smoke test corrections for game-complete modal"
```
