# Achievement Celebration Overlay — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Surface achievement unlocks as a full-screen celebration dialog visible from any view, and add unlock logic for the three badge slots that can never currently be earned (`streak_7`, `level_5`, `practice_100`).

**Architecture:** Event-driven. `progress.js` dispatches `panda:achievement-unlocked` when a badge transitions locked→unlocked. A new globally-loaded module `src/progress/achievement-celebrate.js` owns the `<dialog>` overlay and listens for that event. No per-game changes needed. Pattern mirrors how `game-complete.js` was built.

**Tech Stack:** Vanilla JS ES modules, Vite 6, native `<dialog>`, CSS Layers (`@layer games`), CSS custom properties, existing `confetti-fall` + `mascot-bounce` keyframes.

---

## Task 1: Add `ACHIEVEMENT_UNLOCKED` event name

**Files:**
- Modify: `src/utils/event-names.js`

### Step 1: Add the export

Open `src/utils/event-names.js`. Append after the last existing export (currently `WEEKLY_GOAL_CHANGE` or `OFFLINE_MODE_CHANGE`):

```js
// Achievements
export const ACHIEVEMENT_UNLOCKED = 'panda:achievement-unlocked';
```

Detail shape when dispatched: `{ id: string, name: string, artSrc: string | null }`

### Step 2: Verify lint

```bash
npm run lint
```
Expected: 0 errors.

### Step 3: Commit

```bash
git add src/utils/event-names.js
git commit -m "feat: add ACHIEVEMENT_UNLOCKED event name"
```

---

## Task 2: Complete missing unlock logic + dispatch event (progress.js)

**Files:**
- Modify: `src/progress/progress.js:1-8` (imports)
- Modify: `src/progress/progress.js` (~line 95-125, practice loop)
- Modify: `src/progress/progress.js` (~line 186, after `all_games` unlock)
- Modify: `src/progress/progress.js` (~line 336, `achievementEls.forEach` block)

### Step 1: Add import for new event + BADGE_META constant

At the top of `src/progress/progress.js`, change line 6 from:
```js
import { PRACTICE_RECORDED, GAME_RECORDED, GOAL_TARGET_CHANGE } from '../utils/event-names.js';
```
to:
```js
import { PRACTICE_RECORDED, GAME_RECORDED, GOAL_TARGET_CHANGE, ACHIEVEMENT_UNLOCKED } from '../utils/event-names.js';
```

Then add this constant after the imports (after line 8, before `let wasmModule`):

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

### Step 2: Track `totalMinutes` in the practice event loop

In `buildProgress()`, the practice loop currently starts with:
```js
    let weekMinutes = 0;
    const dailyMinutes = Array.from({ length: 7 }, () => 0);
```

Change it to:
```js
    let weekMinutes = 0;
    let totalMinutes = 0;
    const dailyMinutes = Array.from({ length: 7 }, () => 0);
```

Inside the practice loop (`for (const event of practiceEvents)`), after `progress.log_practice(event.minutes, streak)`, add:
```js
        totalMinutes += event.minutes;
```

The loop block should now look like:
```js
    for (const event of practiceEvents) {
        if (!seenDay.has(event.day)) {
            seenDay.add(event.day);
            uniqueDays.push(event.day);
        }
        const streak = calculate_streak(new Uint32Array(uniqueDays));
        progress.log_practice(event.minutes, streak);
        totalMinutes += event.minutes;
        updateSkillProfile(skillProfile, event.id, event.minutes);
        if (event.day >= currentDay - 6) {
            weekMinutes += event.minutes;
            addToDaily(event.day, event.minutes);
        }
    }
```

### Step 3: Add the three missing unlock conditions

After the existing line:
```js
    if (playedGames.size >= practiceGameRules.length) tracker.unlock('all_games', now);
```

Add:
```js
    const finalStreak = calculate_streak(new Uint32Array(uniqueDays));
    if (finalStreak >= 7) tracker.unlock('streak_7', now);
    if (progress.level >= 5) tracker.unlock('level_5', now);
    if (totalMinutes >= 100) tracker.unlock('practice_100', now);
```

Note: `calculate_streak` is already imported from the WASM module earlier in `buildProgress`. `progress.level` is available because all `log_practice` calls have been made. `totalMinutes` was added in Step 2.

### Step 4: Dispatch `ACHIEVEMENT_UNLOCKED` from `applyUI`

In the `achievementEls.forEach` block (around line 336), the existing code reads:

```js
    achievementEls.forEach((el) => {
        const id = el.dataset.achievement;
        if (!id) return;
        const wasLocked = el.classList.contains('locked');
        const unlocked = tracker.is_unlocked(id);
        el.classList.toggle('unlocked', unlocked);
        el.classList.toggle('locked', !unlocked);

        // Celebrate newly unlocked badges
        if (unlocked && wasLocked) {
            el.classList.add('just-unlocked');
            // ... existing animation code
        }
    });
```

Inside the `if (unlocked && wasLocked)` block, after the existing mascot animation code, add:

```js
            // Dispatch global achievement event for overlay
            const meta = BADGE_META[id];
            if (meta) {
                document.dispatchEvent(new CustomEvent(ACHIEVEMENT_UNLOCKED, {
                    detail: { id, name: meta.name, artSrc: meta.artSrc },
                }));
            }
```

The full `if (unlocked && wasLocked)` block should end up as:
```js
        if (unlocked && wasLocked) {
            el.classList.add('just-unlocked');
            const art = el.querySelector('.badge-art');
            if (art) {
                art.addEventListener('animationend', () => {
                    el.classList.remove('just-unlocked');
                }, { once: true });
            }
            // Trigger mascot celebrate animation
            const mascot = document.querySelector('.progress-mascot');
            if (mascot && !mascot.classList.contains('is-celebrating')) {
                mascot.classList.add('is-celebrating');
                mascot.addEventListener('animationend', () => {
                    mascot.classList.remove('is-celebrating');
                }, { once: true });
            }
            // Dispatch global achievement event for overlay
            const meta = BADGE_META[id];
            if (meta) {
                document.dispatchEvent(new CustomEvent(ACHIEVEMENT_UNLOCKED, {
                    detail: { id, name: meta.name, artSrc: meta.artSrc },
                }));
            }
        }
```

### Step 5: Verify lint and tests

```bash
npm run lint && npm test
```
Expected: 0 lint errors, all existing tests pass (no behaviour changes to tested code paths).

### Step 6: Commit

```bash
git add src/utils/event-names.js src/progress/progress.js
git commit -m "feat: add streak_7/level_5/practice_100 unlock logic and dispatch ACHIEVEMENT_UNLOCKED"
```

---

## Task 3: Add `all_games` badge slot to progress.html

**Files:**
- Modify: `public/views/progress.html`

### Step 1: Find the last badge item

Open `public/views/progress.html`. Locate the `ear_training` badge (around line 138):

```html
              <div class="badge-item locked" data-achievement="ear_training">
                <div class="badge-art">
                    <source srcset="./assets/badges/badge_ear_training_1769391019017.webp" type="image/webp">
                    <img src="./assets/badges/badge_ear_training_1769391019017.png" alt="" width="200" height="200" loading="lazy" decoding="async">
                  <span class="badge-lock">🔒</span>
                </div>
                <span class="badge-name">Golden Ear</span>
              </div>
```

### Step 2: Insert the `all_games` badge immediately after

```html
              <div class="badge-item locked" data-achievement="all_games">
                <div class="badge-art">
                  <span class="badge-fallback">🎮</span>
                  <span class="badge-lock">🔒</span>
                </div>
                <span class="badge-name">Game Master</span>
              </div>
```

### Step 3: Commit

```bash
git add public/views/progress.html
git commit -m "feat: add Game Master badge slot for all_games achievement"
```

---

## Task 4: Add achievement dialog HTML to index.html

**Files:**
- Modify: `index.html` (root, not `public/`)

### Step 1: Find insertion point

Open `index.html`. Locate the `#game-complete-modal` dialog (inserted in the prior game-complete feature). The new dialog goes immediately after it, before any `<script>` tags.

### Step 2: Insert the achievement dialog

The 12 confetti pieces use the same `--fall-delay`, `--fall-dur`, `--fall-drift` inline CSS variables as `#game-complete-modal`'s confetti — they reuse the existing `confetti-fall` keyframe. Use these exact values:

```html
    <dialog id="achievement-modal" aria-modal="true" aria-labelledby="achievement-heading">
      <div class="achievement-inner">
        <div class="achievement-confetti" aria-hidden="true">
          <span class="confetti-piece" style="--fall-delay:0s;--fall-dur:1.1s;--fall-drift:-30px"></span>
          <span class="confetti-piece" style="--fall-delay:0.1s;--fall-dur:1.3s;--fall-drift:20px"></span>
          <span class="confetti-piece" style="--fall-delay:0.2s;--fall-dur:1.0s;--fall-drift:40px"></span>
          <span class="confetti-piece" style="--fall-delay:0.05s;--fall-dur:1.4s;--fall-drift:-50px"></span>
          <span class="confetti-piece" style="--fall-delay:0.3s;--fall-dur:1.2s;--fall-drift:10px"></span>
          <span class="confetti-piece" style="--fall-delay:0.15s;--fall-dur:0.9s;--fall-drift:-20px"></span>
          <span class="confetti-piece" style="--fall-delay:0.25s;--fall-dur:1.5s;--fall-drift:60px"></span>
          <span class="confetti-piece" style="--fall-delay:0.4s;--fall-dur:1.1s;--fall-drift:-40px"></span>
          <span class="confetti-piece" style="--fall-delay:0.35s;--fall-dur:1.3s;--fall-drift:30px"></span>
          <span class="confetti-piece" style="--fall-delay:0.45s;--fall-dur:1.0s;--fall-drift:-10px"></span>
          <span class="confetti-piece" style="--fall-delay:0.5s;--fall-dur:1.2s;--fall-drift:50px"></span>
          <span class="confetti-piece" style="--fall-delay:0.55s;--fall-dur:1.4s;--fall-drift:-60px"></span>
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

### Step 3: Commit

```bash
git add index.html
git commit -m "feat: add achievement celebration dialog markup to index.html"
```

---

## Task 5: Add achievement overlay CSS (`src/styles/app.css`)

**Files:**
- Modify: `src/styles/app.css` — append inside `@layer games { }` block

### Step 1: Locate the insertion point

The file uses `@layer reset, tokens, base, components, games, utilities` at the top. The `@layer games` block ends near the bottom. Find the closing `}` of the game-complete section (the last CSS block inside `@layer games`) and append after it, still inside `@layer games`.

The banner style used in this codebase is a 75-char `=` line in a block comment. Match that style exactly.

### Step 2: Append the following CSS inside `@layer games`

```css
    /* ===========================================================================
       Achievement Celebration Overlay
       =========================================================================== */

    #achievement-modal {
        border: none;
        background: transparent;
        padding: 0;
        max-width: 100vw;
        max-height: 100vh;
        overflow: visible;
    }

    #achievement-modal::backdrop {
        background: rgba(53, 32, 25, 0.55);
        backdrop-filter: blur(8px) saturate(120%);
    }

    .achievement-inner {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-4);
        padding: var(--space-8) var(--space-6);
        max-width: 360px;
        width: calc(100vw - var(--space-8));
        text-align: center;
        background: var(--color-surface);
        border: 1px solid rgba(255, 249, 243, 0.18);
        border-radius: var(--radius-2xl);
        box-shadow: var(--shadow-lg);
        position: relative;
        overflow: hidden;
    }

    .achievement-confetti {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
    }

    .achievement-badge-art {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        border: 3px solid var(--color-primary);
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-bg-alt);
        animation: mascot-bounce 0.6s var(--ease-bounce) both;
        flex-shrink: 0;
    }

    #achievement-badge-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    #achievement-badge-img[src=""] {
        display: none;
    }

    .achievement-badge-fallback {
        font-size: 3rem;
        line-height: 1;
    }

    .achievement-heading {
        font-family: var(--font-display);
        font-size: var(--text-2xl);
        font-weight: 700;
        color: var(--color-secondary);
        margin: 0;
    }

    .achievement-badge-name {
        font-weight: 700;
        font-size: var(--text-lg);
        color: var(--color-text);
        margin: 0;
    }

    .achievement-cheer {
        font-size: var(--text-sm);
        color: var(--color-text-muted);
        margin: 0;
    }

    .achievement-yay {
        min-width: 140px;
        margin-top: var(--space-2);
    }

    /* Reduced motion — @media query */
    @media (prefers-reduced-motion: reduce) {
        .achievement-badge-art {
            animation: none;
        }

        #achievement-modal .confetti-piece {
            animation: none;
        }
    }

    /* Reduced motion — in-app toggle */
    :root:has(#setting-reduce-motion:checked) .achievement-badge-art {
        animation: none;
    }

    :root:has(#setting-reduce-motion:checked) #achievement-modal .confetti-piece {
        animation: none;
    }
```

### Step 3: Verify lint

```bash
npm run lint
```
Expected: 0 errors.

### Step 4: Commit

```bash
git add src/styles/app.css
git commit -m "feat: add achievement celebration overlay CSS in @layer games"
```

---

## Task 6: Create `src/progress/achievement-celebrate.js`

**Files:**
- Create: `src/progress/achievement-celebrate.js`

### Step 1: Create the file

```js
import { ACHIEVEMENT_UNLOCKED } from '../utils/event-names.js';

const dialog = document.getElementById('achievement-modal');
const badgeImg = document.getElementById('achievement-badge-img');
const badgeFallback = document.getElementById('achievement-badge-fallback');
const badgeName = document.getElementById('achievement-badge-name');
const badgeArt = document.getElementById('achievement-badge-art');
const yayBtn = document.getElementById('achievement-yay');

if (!dialog) throw new Error('[achievement-celebrate] dialog element not found');

const FALLBACK_EMOJI = {
    first_note:    '♪',
    streak_7:      '🔥',
    level_5:       '★',
    practice_100:  '⏱',
    pitch_perfect: '🎵',
    rhythm_master: '🥁',
    bow_hero:      '🎻',
    ear_training:  '👂',
    all_games:     '🎮',
};

const voiceToggle = document.querySelector('#setting-voice');

const canSpeak = () =>
    Boolean(voiceToggle?.checked)
    && 'speechSynthesis' in window
    && 'SpeechSynthesisUtterance' in window;

const speakBadge = (name) => {
    if (!canSpeak() || document.hidden) return;
    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(`New badge! ${name}!`);
        utterance.lang = 'en-US';
        utterance.rate = 0.95;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
    } catch {
        // Ignore speech failures
    }
};

/** Queue of { id, name, artSrc } waiting to be shown. */
const queue = [];
let isOpen = false;

const populate = ({ id, name, artSrc }) => {
    if (badgeName) badgeName.textContent = name;
    if (badgeArt) badgeArt.setAttribute('aria-label', name);

    const emoji = FALLBACK_EMOJI[id] || '★';
    if (artSrc && badgeImg) {
        badgeImg.src = artSrc;
        badgeImg.alt = name;
        if (badgeFallback) badgeFallback.textContent = '';
        if (badgeFallback) badgeFallback.hidden = true;
    } else {
        if (badgeImg) badgeImg.src = '';
        if (badgeFallback) {
            badgeFallback.textContent = emoji;
            badgeFallback.hidden = false;
        }
    }
};

const showNext = () => {
    if (!queue.length || !dialog) return;
    const item = queue.shift();
    populate(item);
    dialog.showModal();
    isOpen = true;
    speakBadge(item.name);
};

const close = () => {
    if (!dialog) return;
    dialog.close();
};

if (yayBtn) {
    yayBtn.addEventListener('click', () => close());
}

dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
});

dialog.addEventListener('close', () => {
    isOpen = false;
    if (queue.length) showNext();
});

document.addEventListener(ACHIEVEMENT_UNLOCKED, (e) => {
    const { id, name, artSrc } = e.detail || {};
    if (!id || !name) return;
    queue.push({ id, name, artSrc: artSrc || null });
    if (!isOpen) showNext();
});
```

### Step 2: Verify lint

```bash
npm run lint
```
Expected: 0 errors.

### Step 3: Commit

```bash
git add src/progress/achievement-celebrate.js
git commit -m "feat: add achievement-celebrate.js dialog controller"
```

---

## Task 7: Wire globally into `src/app.js`

**Files:**
- Modify: `src/app.js`

### Step 1: Add direct import

Open `src/app.js`. After the existing `import` statements at the top (lines 1-10), add:

```js
import './progress/achievement-celebrate.js';
```

This must be a top-level static import (not lazy-loaded) so the event listener is registered before any `ACHIEVEMENT_UNLOCKED` event can fire.

### Step 2: Verify lint and tests

```bash
npm run lint && npm test
```
Expected: 0 lint errors, all tests pass.

### Step 3: Commit

```bash
git add src/app.js
git commit -m "feat: globally import achievement-celebrate module in app.js"
```

---

## Task 8: Final verification

### Step 1: Lint

```bash
npm run lint
```
Expected: 0 errors.

### Step 2: Full test suite

```bash
npm test
```
Expected: all tests pass.

### Step 3: Manual smoke test (browser)

1. Open the app in browser (`npm run dev`)
2. Open DevTools Console
3. Paste to simulate an achievement unlock:
   ```js
   document.dispatchEvent(new CustomEvent('panda:achievement-unlocked', {
     detail: { id: 'streak_7', name: 'Week Warrior', artSrc: './assets/badges/badge_practice_streak_1769390952199.webp' }
   }));
   ```
4. Verify: overlay appears with badge art, "Week Warrior", "You earned it, Emerson!", confetti
5. Tap "Yay!" — overlay closes
6. Simulate two in quick succession — verify second appears after first dismissed
7. Enable "Reduce motion" in Settings → repeat step 3 → verify no confetti or bounce animation

### Step 4: Git log sanity check

```bash
git log --oneline -8
```
Expected: 7 clean commits (Tasks 1–7).
