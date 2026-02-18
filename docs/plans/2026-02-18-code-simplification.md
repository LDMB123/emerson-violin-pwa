# Code Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove ~600-800 net lines from the emerson-violin-pwa codebase by deleting dead code, collapsing test duplication, removing unused config, and restructuring app.js and game files.

**Architecture:** Five phases ordered by safety — dead code first (zero risk), then structural refactors (medium risk), then game consolidation (requires manual smoke-testing). Each phase ends with a green test suite.

**Tech Stack:** Vite 6, vanilla JavaScript ES modules, Vitest for unit tests, Playwright for E2E.

---

## Phase 1: Dead Code + Test Cleanup

### Task 1: Delete dead exports from session-review-utils.js

**Files:**
- Modify: `src/utils/session-review-utils.js:56-69`
- Modify: `tests/session-review-utils.test.js:3-13,195-271`

**Step 1: Verify nothing in src/ imports the three dead functions**

```bash
grep -r "computeTotalMinutes\|computeAverageAccuracy\|extractAccuracyValues" src/
```

Expected: zero matches (only tests import these).

**Step 2: Delete the three dead exports from session-review-utils.js**

Delete lines 56–69 (the three exported functions):

```js
// DELETE these three functions entirely (lines 56-69):
export const computeTotalMinutes = (events) => { ... };
export const computeAverageAccuracy = (events) => { ... };
export const extractAccuracyValues = (events, maxCount = 7) => { ... };
```

The file should end at line 55 (`getRecentEvents`).

**Step 3: Remove the dead imports and describe blocks from the test file**

In `tests/session-review-utils.test.js`:

Remove from the import list (lines 3–13):
```js
    computeTotalMinutes,
    computeAverageAccuracy,
    extractAccuracyValues,
```

Delete the three `describe` blocks at lines 195–271:
- `describe('computeTotalMinutes', ...)` — lines 195–217
- `describe('computeAverageAccuracy', ...)` — lines 219–241
- `describe('extractAccuracyValues', ...)` — lines 243–270

**Step 4: Run tests**

```bash
npm test -- --reporter=verbose tests/session-review-utils.test.js
```

Expected: all remaining tests pass.

**Step 5: Commit**

```bash
git add src/utils/session-review-utils.js tests/session-review-utils.test.js
git commit -m "refactor: delete dead exports computeTotalMinutes/AverageAccuracy/extractAccuracyValues"
```

---

### Task 2: Delete game-utils.test.js (fully redundant)

**Files:**
- Delete: `tests/game-utils.test.js`

**Step 1: Verify the test file content**

```bash
cat tests/game-utils.test.js
```

Confirm it only tests `formatMinutes` and `formatTime` from `src/games/session-timer.js` — both already covered by `tests/session-timer.test.js`.

**Step 2: Verify session-timer.test.js covers the same ground**

```bash
grep -n "formatMinutes\|formatTime" tests/session-timer.test.js
```

Expected: multiple matches.

**Step 3: Delete the redundant file**

```bash
rm tests/game-utils.test.js
```

**Step 4: Run tests**

```bash
npm test
```

Expected: all tests pass, one fewer test file.

**Step 5: Commit**

```bash
git add -u tests/game-utils.test.js
git commit -m "test: delete game-utils.test.js (fully covered by session-timer.test.js)"
```

---

### Task 3: Remove duplicate clamp tests from tuner-utils.test.js

**Files:**
- Modify: `tests/tuner-utils.test.js:1-25`

**Step 1: View the current file structure**

```bash
cat tests/tuner-utils.test.js
```

Confirm lines 1–2 import `clamp` from `../src/utils/math.js` and lines 5–25 is a full `describe('clamp', ...)` block.

**Step 2: Delete the clamp import and describe block**

Remove from `tests/tuner-utils.test.js`:
- Line 2: `import { clamp } from '../src/utils/math.js';`
- Lines 5–25: the entire `describe('clamp', ...)` block

The file should start with the `describe('formatDifficulty', ...)` block after the remaining import line.

**Step 3: Run tests**

```bash
npm test -- --reporter=verbose tests/tuner-utils.test.js tests/math.test.js
```

Expected: all pass — clamp coverage now only in `math.test.js`.

**Step 4: Commit**

```bash
git add tests/tuner-utils.test.js
git commit -m "test: remove duplicate clamp tests from tuner-utils.test.js"
```

---

### Task 4: Consolidate duplicate todayDay tests

**Files:**
- Modify: `tests/progress-utils.test.js:11-22`

**Step 1: Review both todayDay test blocks**

`tests/session-review-utils.test.js:16-36` — tests todayDay with vi.fn() mock, checks two exact values. **Keep this one** (more thorough mocking).

`tests/progress-utils.test.js:11-22` — tests todayDay with `>0` and `=== Math.floor(Date.now()/86400000)`. **Delete this one.**

**Step 2: Delete the todayDay describe block from progress-utils.test.js**

Remove lines 11–22 (the `describe('todayDay', ...)` block).

Also remove line 2: `import { todayDay } from '../src/utils/math.js';` if no other test in that file uses it.

Check:
```bash
grep "todayDay" tests/progress-utils.test.js
```

If zero remaining usages after the deletion, remove the import too.

**Step 3: Run tests**

```bash
npm test -- tests/progress-utils.test.js tests/session-review-utils.test.js
```

Expected: all pass.

**Step 4: Commit**

```bash
git add tests/progress-utils.test.js
git commit -m "test: consolidate todayDay tests — remove duplicate from progress-utils.test.js"
```

---

### Task 5: Remove unused Vite aliases

**Files:**
- Modify: `vite.config.js:9-16`

**Step 1: Confirm zero usages**

```bash
grep -r "from ['\"]@" src/ --include="*.js"
grep -r "from ['\"]@" src/ --include="*.html"
```

Expected: zero matches.

**Step 2: Delete the resolve.alias block from vite.config.js**

Current file (lines 9–16):
```js
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@modules': resolve(__dirname, 'src/modules'),
            '@styles': resolve(__dirname, 'src/styles'),
            '@ml': resolve(__dirname, 'src/ml'),
        },
    },
```

Delete the entire `resolve: { alias: { ... } }` block. Also delete the `import { resolve } from 'path';` line (line 2) if `resolve` is no longer used anywhere else in the file.

Check remaining usages:
```bash
grep "resolve(" vite.config.js
```

If `resolve(__dirname, 'index.html')` still appears in `rollupOptions.input`, keep the import. Otherwise delete it.

**Step 3: Run build to confirm no breakage**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds.

**Step 4: Run tests**

```bash
npm test
```

Expected: all pass.

**Step 5: Commit**

```bash
git add vite.config.js
git commit -m "refactor: remove unused Vite aliases (@, @modules, @styles, @ml)"
```

---

### Task 6: Unexport average() in recommendations-utils.js

**Files:**
- Modify: `src/utils/recommendations-utils.js:64`
- Modify: `tests/recommendations-utils.test.js:7`

**Step 1: Confirm no external imports of average()**

```bash
grep -r "average" src/ --include="*.js" | grep -v "recommendations-utils"
grep -r "average" src/ --include="*.js" | grep "import"
```

Expected: zero import lines pulling `average` from outside `recommendations-utils.js` itself.

**Step 2: Remove export keyword from average()**

In `src/utils/recommendations-utils.js` line 64, change:
```js
export const average = (values) => {
```
to:
```js
const average = (values) => {
```

**Step 3: Remove average from the test import**

In `tests/recommendations-utils.test.js` line 7, remove `average,` from the import list.

**Step 4: Delete or convert the average test block**

Find the `describe('average', ...)` block in `tests/recommendations-utils.test.js`. Since `average` is internal to `recommendations-utils.js` and exercised through `computeSongLevel` (which is exported and tested), delete the direct test block for `average`.

Check where `average` describe block is:
```bash
grep -n "describe.*average" tests/recommendations-utils.test.js
```

Delete that describe block.

**Step 5: Run tests**

```bash
npm test -- tests/recommendations-utils.test.js
```

Expected: all pass (computeSongLevel tests will still exercise average() internally).

**Step 6: Commit**

```bash
git add src/utils/recommendations-utils.js tests/recommendations-utils.test.js
git commit -m "refactor: unexport average() in recommendations-utils (internal use only)"
```

---

### Task 7: Inline filterEventsByType and cacheFresh into recommendations.js

**Files:**
- Modify: `src/utils/recommendations-utils.js:134-141`
- Modify: `src/ml/recommendations.js:3-13,191,251`
- Modify: `tests/recommendations-utils.test.js` (delete two describe blocks)

**Step 1: Understand the current call sites**

`recommendations.js:191`:
```js
const songEvents = filterEventsByType(events, 'song');
```

`recommendations.js:251`:
```js
if (!cacheFresh(cached, CACHE_TTL)) {
```

`cacheFresh` in `recommendations-utils.js:138-141`:
```js
export const cacheFresh = (cached, ttl = 5 * 60 * 1000) => {
    if (!cached?.updatedAt) return false;
    return (Date.now() - cached.updatedAt) < ttl;
};
```

**Step 2: Inline filterEventsByType at its call site in recommendations.js**

Change line 191 from:
```js
const songEvents = filterEventsByType(events, 'song');
```
to:
```js
const songEvents = events.filter((e) => e.type === 'song');
```

**Step 3: Inline cacheFresh at its call site in recommendations.js**

Change line 251 from:
```js
if (!cacheFresh(cached, CACHE_TTL)) {
```
to:
```js
if (!cached?.updatedAt || (Date.now() - cached.updatedAt) >= CACHE_TTL) {
```

**Step 4: Remove filterEventsByType and cacheFresh from recommendations.js import**

Update the import block at lines 3–13 in `recommendations.js`, removing `filterEventsByType` and `cacheFresh` from the import list.

**Step 5: Delete filterEventsByType and cacheFresh from recommendations-utils.js**

Delete lines 134–141 from `src/utils/recommendations-utils.js`:
```js
export const filterEventsByType = (events, type) => {
    return events.filter((event) => event.type === type);
};

export const cacheFresh = (cached, ttl = 5 * 60 * 1000) => {
    if (!cached?.updatedAt) return false;
    return (Date.now() - cached.updatedAt) < ttl;
};
```

**Step 6: Delete the describe blocks from the test file**

In `tests/recommendations-utils.test.js`, delete:
- `describe('filterEventsByType', ...)` block
- `describe('cacheFresh', ...)` block

Remove `filterEventsByType` and `cacheFresh` from the import line.

**Step 7: Run tests**

```bash
npm test -- tests/recommendations-utils.test.js tests/recommendations.test.js
```

Expected: all pass.

**Step 8: Commit**

```bash
git add src/utils/recommendations-utils.js src/ml/recommendations.js tests/recommendations-utils.test.js
git commit -m "refactor: inline filterEventsByType and cacheFresh into recommendations.js (single-use helpers)"
```

---

### Task 8: Phase 1 final verification

**Step 1: Run full test suite**

```bash
npm test
```

Expected: all tests pass, no errors.

**Step 2: Run lint**

```bash
npm run lint
```

Expected: no lint errors.

**Step 3: Check line count reduction (optional sanity check)**

```bash
wc -l src/utils/session-review-utils.js src/utils/recommendations-utils.js src/ml/recommendations.js vite.config.js
```

---

## Phase 2: Refactor boot() in app.js

**Context:** `boot()` is currently 270 lines (lines 147–416 of `src/app.js`). It handles 5+ distinct concerns. We extract 7 functions to make `boot()` a ~18-line orchestrator.

### Task 9: Extract rewriteAudioSources, loadEagerModules, loadIdleModules

**Files:**
- Modify: `src/app.js:147-178`

**Step 1: Read app.js lines 147-178 in full before editing**

```bash
head -n 180 src/app.js | tail -n 34
```

**Step 2: Extract three functions above boot()**

Add these three functions to `src/app.js` **above** the `const boot = async () => {` line:

```js
const rewriteAudioSources = () => {
    const audioElements = document.querySelectorAll('audio[src*="/assets/audio/"]');
    audioElements.forEach((audio) => {
        const currentSrc = audio.getAttribute('src');
        if (currentSrc) {
            audio.setAttribute('src', getAudioPath(currentSrc));
        }
    });
};

const loadEagerModules = () => {
    loadModule('platform');
    loadModule('dataSaver');
    loadModule('offlineRecovery');
    loadModule('ipadosCapabilities');
    loadModule('inputCapabilities');
    loadModule('progress');
};

const loadIdleModules = () => {
    loadIdle('installToast');
    loadIdle('installGuide');
    loadIdle('installGuideClose');
    loadIdle('mlScheduler');
    loadIdle('mlAccelerator');
    loadIdle('offlineIntegrity');
    loadIdle('offlineMode');
    loadIdle('reminders');
    loadIdle('badging');
    loadIdle('audioPlayer');
};
```

**Step 3: Replace the inline code in boot() with the calls**

Inside `boot()`, replace lines 153–178 with:
```js
    rewriteAudioSources();
    loadEagerModules();
    await loadModule('persist');
    loadIdleModules();
```

**Step 4: Run tests**

```bash
npm test
```

Expected: all pass.

**Step 5: Commit**

```bash
git add src/app.js
git commit -m "refactor: extract rewriteAudioSources, loadEagerModules, loadIdleModules from boot()"
```

---

### Task 10: Extract resolveInitialView and enhanceToggleLabels

**Files:**
- Modify: `src/app.js`

**Step 1: Move enhanceToggleLabels to module scope**

The `enhanceToggleLabels` function defined inside `boot()` (lines 188–204) has no dependencies on `boot()` closure variables. Move it above `boot()` as a module-level function.

Extract this from `boot()` and place above `const boot = async () => {`:

```js
const enhanceToggleLabels = () => {
    const labels = document.querySelectorAll(
        '.toggle-ui label[for], .song-controls label[for], .focus-controls label[for]'
    );
    labels.forEach((label) => {
        if (label.dataset.keybound === 'true') return;
        label.dataset.keybound = 'true';
        label.setAttribute('role', 'button');
        label.setAttribute('tabindex', '0');
        label.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                label.click();
            }
        });
    });
};
```

**Step 2: Extract resolveInitialView as async function**

Extract the onboarding check block (lines 206–221) above `boot()`:

```js
const resolveInitialView = async () => {
    let initialViewId = getCurrentViewId() || 'view-home';
    if (initialViewId === 'view-home') {
        try {
            const { shouldShowOnboarding } = await import('./onboarding/onboarding-check.js');
            if (await shouldShowOnboarding()) {
                initialViewId = 'view-onboarding';
            }
        } catch {
            // Onboarding check failed — proceed to home
        }
    }
    return initialViewId;
};
```

**Step 3: Update boot() to call the two extracted functions**

Replace the inline code in `boot()` with:
```js
    const initialViewId = await resolveInitialView();
    await showView(initialViewId, enhanceToggleLabels);
    if (initialViewId === 'view-onboarding') {
        loadModule('onboarding');
    }
```

**Step 4: Run tests**

```bash
npm test
```

Expected: all pass.

**Step 5: Commit**

```bash
git add src/app.js
git commit -m "refactor: extract resolveInitialView and enhanceToggleLabels from boot()"
```

---

### Task 11: Extract setupNavigation with UIContext

**Files:**
- Modify: `src/app.js`

**Step 1: Create UIContext and extract navigation functions**

The `navigateTo`, `updateNavState`, `scrollToTarget`, `shouldAnimateNav`, and global link click handler are tightly coupled through `navDirection` and `navItems`. Extract them together as `setupNavigation`.

Add above `boot()`:

```js
const setupNavigation = (ctx) => {
    const shouldAnimateNav = () => {
        if (ctx.prefersReducedMotion()) return false;
        if (ctx.reduceMotionToggle?.checked) return false;
        return 'startViewTransition' in document;
    };

    const scrollToTarget = (targetId) => {
        if (!targetId) return;
        const target = document.getElementById(targetId);
        if (!target) return;
        const behavior = shouldAnimateNav() ? 'smooth' : 'auto';
        requestAnimationFrame(() => {
            target.scrollIntoView({ behavior, block: 'start' });
        });
    };

    let navDirection = 'forward';

    const navigateTo = (href, afterNav) => {
        if (!href) return;
        if (href === window.location.hash) {
            if (afterNav) afterNav();
            return;
        }
        if (afterNav) {
            const handle = () => afterNav();
            window.addEventListener('hashchange', handle, { once: true });
        }
        if (shouldAnimateNav()) {
            document.documentElement.dataset.navDirection = navDirection;
            const transition = document.startViewTransition(() => {
                window.location.hash = href;
            });
            transition.finished.then(() => {
                delete document.documentElement.dataset.navDirection;
            }).catch(() => {});
            navDirection = 'forward';
        } else {
            window.location.hash = href;
        }
    };

    ctx.updateNavState = () => {
        const viewId = getCurrentViewId();
        const activeHref = getActiveNavHref(viewId);
        ctx.navItems.forEach((item) => {
            const itemHref = item.getAttribute('href');
            const active = isNavItemActive(itemHref, activeHref);
            item.classList.toggle('is-active', active);
            if (active) {
                item.setAttribute('aria-current', 'page');
            } else {
                item.removeAttribute('aria-current');
            }
        });
    };

    ctx.updateNavState();

    document.addEventListener('click', (event) => {
        const link = event.target.closest('a[href^="#view-"]');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href) return;
        const targetId = link.dataset.scrollTarget;
        const popover = link.closest('[popover]');
        event.preventDefault();
        if (popover) {
            if (typeof popover.hidePopover === 'function') {
                popover.hidePopover();
            } else {
                popover.removeAttribute('open');
                ctx.closePopoverFallback?.(popover);
            }
        }
        if (link.classList.contains('back-btn')) {
            navDirection = 'back';
        }
        navigateTo(href, targetId ? () => scrollToTarget(targetId) : null);
    });
};
```

Note: `ctx.closePopoverFallback` will be set by `setupPopoverSystem` (next task). Use optional chaining to avoid initialization order issues.

**Step 2: Update boot() to build UIContext and call setupNavigation**

In `boot()`, replace the `navItems`, `reduceMotionMedia`, etc. local variables and the navigation code with:

```js
    const ctx = {
        navItems: Array.from(document.querySelectorAll('.bottom-nav .nav-item[href^="#view-"]')),
        popoverBackdrop: document.querySelector('[data-popover-backdrop]'),
        supportsPopover: 'showPopover' in HTMLElement.prototype,
        prefersReducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        reduceMotionToggle: document.querySelector('#setting-reduce-motion'),
        lastPopoverTrigger: null,
        updateNavState: null,
        closePopoverFallback: null,
    };

    setupNavigation(ctx);
```

**Step 3: Update the hashchange listener in boot() to use ctx.updateNavState()**

```js
    window.addEventListener('hashchange', async () => {
        const viewId = getCurrentViewId() || 'view-home';
        await showView(viewId, enhanceToggleLabels);
        ctx.updateNavState();
    }, { passive: true });
```

**Step 4: Run tests**

```bash
npm test
```

Expected: all pass.

**Step 5: Commit**

```bash
git add src/app.js
git commit -m "refactor: extract setupNavigation from boot(), introduce UIContext"
```

---

### Task 12: Extract setupPopoverSystem

**Files:**
- Modify: `src/app.js`

**Step 1: Extract setupPopoverSystem above boot()**

The popover block (lines 231–415 minus navigation code already extracted) handles native popover API + fallback. Extract as:

```js
const setupPopoverSystem = (ctx) => {
    const setPopoverExpanded = (popover, expanded) => {
        if (!popover?.id) return;
        document.querySelectorAll(`[popovertarget="${popover.id}"]`).forEach((button) => {
            button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        });
    };

    const focusFirstPopoverItem = (popover) => {
        if (!popover) return;
        const target = popover.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
        if (target instanceof HTMLElement) {
            target.focus();
        }
    };

    const openPopoverFallback = (popover) => {
        if (!popover) return;
        popover.dataset.fallbackOpen = 'true';
        setPopoverExpanded(popover, true);
        focusFirstPopoverItem(popover);
        document.documentElement.classList.add('popover-open');
        if (ctx.popoverBackdrop) {
            ctx.popoverBackdrop.hidden = false;
            ctx.popoverBackdrop.classList.add('is-open');
        }
    };

    const closePopoverFallback = (popover) => {
        if (popover) {
            delete popover.dataset.fallbackOpen;
            setPopoverExpanded(popover, false);
        }
        if (ctx.popoverBackdrop) {
            ctx.popoverBackdrop.classList.remove('is-open');
            ctx.popoverBackdrop.hidden = true;
        }
        document.documentElement.classList.remove('popover-open');
        if (ctx.lastPopoverTrigger instanceof HTMLElement) {
            ctx.lastPopoverTrigger.focus();
        }
    };

    // Expose on ctx so setupNavigation can call it
    ctx.closePopoverFallback = closePopoverFallback;

    if (ctx.supportsPopover) {
        document.querySelectorAll('[popover]').forEach((popover) => {
            popover.addEventListener('toggle', () => {
                const open = popover.matches(':popover-open');
                setPopoverExpanded(popover, open);
                if (open) {
                    focusFirstPopoverItem(popover);
                } else if (ctx.lastPopoverTrigger instanceof HTMLElement) {
                    ctx.lastPopoverTrigger.focus();
                }
            });
        });
    }

    document.querySelectorAll('[popovertarget]').forEach((button) => {
        button.addEventListener('click', () => {
            ctx.lastPopoverTrigger = button;
        });
    });

    if (!ctx.supportsPopover) {
        document.querySelectorAll('[popovertarget]').forEach((button) => {
            button.addEventListener('click', (event) => {
                const targetId = button.getAttribute('popovertarget');
                const popover = targetId ? document.getElementById(targetId) : null;
                if (!popover) return;
                event.preventDefault();
                if (popover.dataset.fallbackOpen === 'true') {
                    closePopoverFallback(popover);
                } else {
                    openPopoverFallback(popover);
                }
            });
        });

        ctx.popoverBackdrop?.addEventListener('click', () => {
            const openPopover = document.querySelector('[data-fallback-open="true"]');
            if (openPopover) closePopoverFallback(openPopover);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            const openPopover = document.querySelector('[data-fallback-open="true"]');
            if (openPopover) closePopoverFallback(openPopover);
        });

        window.addEventListener('hashchange', () => {
            const openPopover = document.querySelector('[data-fallback-open="true"]');
            if (openPopover) closePopoverFallback(openPopover);
        }, { passive: true });

        document.querySelectorAll('[popovertargetaction="hide"]').forEach((button) => {
            button.addEventListener('click', (event) => {
                const popover = button.closest('[popover]');
                if (!popover) return;
                event.preventDefault();
                closePopoverFallback(popover);
            });
        });
    }
};
```

**Step 2: Update boot() to call setupPopoverSystem**

Replace the remaining 114 lines of popover code in `boot()` with:

```js
    setupPopoverSystem(ctx);
```

**Step 3: Verify boot() is now ~18 lines**

The final `boot()` should look like:

```js
const boot = async () => {
    if (document.prerendering) {
        document.addEventListener('prerenderingchange', boot, { once: true });
        return;
    }

    rewriteAudioSources();
    loadEagerModules();
    await loadModule('persist');
    loadIdleModules();

    const ctx = {
        navItems: Array.from(document.querySelectorAll('.bottom-nav .nav-item[href^="#view-"]')),
        popoverBackdrop: document.querySelector('[data-popover-backdrop]'),
        supportsPopover: 'showPopover' in HTMLElement.prototype,
        prefersReducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        reduceMotionToggle: document.querySelector('#setting-reduce-motion'),
        lastPopoverTrigger: null,
        updateNavState: null,
        closePopoverFallback: null,
    };

    const initialViewId = await resolveInitialView();
    await showView(initialViewId, enhanceToggleLabels);
    if (initialViewId === 'view-onboarding') {
        loadModule('onboarding');
    }

    registerServiceWorker();

    window.addEventListener('hashchange', async () => {
        const viewId = getCurrentViewId() || 'view-home';
        await showView(viewId, enhanceToggleLabels);
        ctx.updateNavState();
    }, { passive: true });

    setupNavigation(ctx);
    setupPopoverSystem(ctx);
};
```

**Step 4: Run full test + E2E suite**

```bash
npm test && npx playwright test tests/e2e
```

Expected: all pass.

**Step 5: Commit**

```bash
git add src/app.js
git commit -m "refactor: extract setupPopoverSystem from boot() — boot() now ~30 lines"
```

---

## Phase 3: Merge pizzicato.js + string-quest.js

**Context:** Both games are sequence-following with identical structure. Only differences: data attribute prefix, scoring constants, and `hitNotes` Set in pizzicato. We create `sequence-game.js` and reduce both files to thin wrappers.

### Task 13: Create sequence-game.js

**Files:**
- Create: `src/games/sequence-game.js`

**Step 1: Create the shared implementation**

The shared logic covers ~110 lines that are identical or nearly identical in both files.

Create `src/games/sequence-game.js`:

```js
import {
    readLiveNumber,
    markChecklist,
    markChecklistIf,
    setDifficultyBadge,
    recordGameEvent,
    attachTuning,
    bindTap,
    playToneNote,
    playToneSequence,
    buildNoteSequence,
    updateScoreCombo,
} from './shared.js';

/**
 * createSequenceGame — factory for sequence-following games (pizzicato, string-quest).
 *
 * @param {object} config
 * @param {string} config.id           - game ID (e.g. 'pizzicato')
 * @param {string} config.prefix       - dataset attribute prefix (e.g. 'pizzicato')
 * @param {string} config.btnClass     - CSS class for note buttons (e.g. 'pizzicato-btn')
 * @param {string} config.btnAttr      - dataset attribute for button note (e.g. 'pizzicatoBtn')
 * @param {string} config.targetAttr   - dataset attribute for target (e.g. 'pizzicatoTarget')
 * @param {number} config.baseScore    - base points per correct hit
 * @param {number} config.comboMult    - score multiplier for combo
 * @param {number} config.missPenalty  - score penalty for miss
 * @param {boolean} config.trackUniqueNotes - whether to track hitNotes Set (for checklist)
 * @param {string[]} config.checklistIds - IDs of checklist steps [allNotesHit, seqComplete, comboGoal]
 * @param {number} config.comboTarget  - default combo goal
 * @param {number[]} config.seqLengths - per-complexity sequence lengths [easy, medium, hard]
 * @param {object} config.toneOptions  - options for playToneNote
 * @param {object} config.flourishOptions - options for playToneSequence on completion
 */
export function createSequenceGame(config) {
    const {
        id,
        prefix,
        btnClass,
        btnAttr,
        targetAttr,
        baseScore,
        comboMult,
        missPenalty,
        trackUniqueNotes,
        checklistIds,
        comboTarget,
        seqLengths,
        toneOptions,
        flourishOptions,
    } = config;

    const viewId = `#view-game-${id}`;
    const inputPrefix = `${prefix}-step-`;

    function update() {
        const inputs = Array.from(document.querySelectorAll(`${viewId} input[id^="${inputPrefix}"]`));
        if (!inputs.length) return;
        const checked = inputs.filter((input) => input.checked).length;
        const scoreEl = document.querySelector(`[data-${prefix}="score"]`);
        const comboEl = document.querySelector(`[data-${prefix}="combo"]`);
        const liveScore = readLiveNumber(scoreEl, 'liveScore');
        const liveCombo = readLiveNumber(comboEl, 'liveCombo');
        if (scoreEl) {
            scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : (checked * baseScore + (checked === inputs.length ? baseScore : 0)));
        }
        if (comboEl) {
            const combo = Number.isFinite(liveCombo) ? liveCombo : checked;
            comboEl.textContent = `x${combo}`;
        }
    }

    function bind(difficulty = { speed: 1.0, complexity: 1 }) {
        const stage = document.querySelector(viewId);
        if (!stage) return;

        const scoreEl = stage.querySelector(`[data-${prefix}="score"]`);
        const comboEl = stage.querySelector(`[data-${prefix}="combo"]`);
        const statusEl = stage.querySelector(`[data-${prefix}="status"]`) || stage.querySelector(`[data-${prefix}="prompt"]`);
        const sequenceEl = stage.querySelector(`[data-${prefix}="sequence"]`);
        const buttons = Array.from(stage.querySelectorAll(`.${btnClass}`));
        const targets = Array.from(stage.querySelectorAll(`[data-${targetAttr}]`));
        const notePool = ['G', 'D', 'A', 'E'];

        let sequence = [...notePool];
        let seqIndex = 0;
        let combo = 0;
        let score = 0;
        const hitNotes = trackUniqueNotes ? new Set() : null;
        const seqLength = seqLengths[difficulty.complexity] ?? seqLengths[1];
        let currentComboTarget = comboTarget;

        const buildSequence = () => {
            sequence = buildNoteSequence(notePool, seqLength);
            seqIndex = 0;
        };

        const updateTargets = (message) => {
            const targetNote = sequence[seqIndex];
            targets.forEach((target) => {
                target.classList.toggle('is-target', target.dataset[targetAttr] === targetNote);
            });
            if (statusEl) {
                statusEl.textContent = message || `Target: ${targetNote} string · Combo goal x${currentComboTarget}.`;
            }
            if (sequenceEl) {
                sequenceEl.textContent = `Sequence: ${sequence.join(' · ')}`;
            }
        };

        const updateScoreboard = () => updateScoreCombo(scoreEl, comboEl, score, combo);

        const reportResult = attachTuning(id, (tuning) => {
            buildSequence();
            setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
            updateTargets();
        });

        const reportSession = () => {
            if (score <= 0) return;
            const accuracy = currentComboTarget ? Math.min(1, combo / currentComboTarget) * 100 : 0;
            reportResult({ accuracy, score });
            recordGameEvent(id, { accuracy, score });
        };

        const resetSession = () => {
            combo = 0;
            score = 0;
            seqIndex = 0;
            if (hitNotes) hitNotes.clear();
            buildSequence();
            updateTargets();
            updateScoreboard();
        };

        updateTargets();

        buttons.forEach((button) => {
            bindTap(button, () => {
                const note = button.dataset[btnAttr];
                if (note) {
                    playToneNote(note, toneOptions);
                }
                if (note === sequence[seqIndex]) {
                    combo += 1;
                    score += baseScore + combo * comboMult;
                    seqIndex = (seqIndex + 1) % sequence.length;
                    if (hitNotes) {
                        hitNotes.add(note);
                        if (checklistIds[0]) markChecklistIf(hitNotes.size >= 4, checklistIds[0]);
                    }
                    if (seqIndex === 0) {
                        const completedSequence = sequence.slice();
                        if (checklistIds[1]) markChecklist(checklistIds[1]);
                        reportSession();
                        buildSequence();
                        playToneSequence(completedSequence, flourishOptions);
                    }
                    updateTargets();
                } else {
                    combo = 0;
                    score = Math.max(0, score - missPenalty);
                    updateTargets(`Missed. Aim for ${sequence[seqIndex]} next.`);
                }
                updateScoreboard();
                if (checklistIds[2]) markChecklistIf(combo >= currentComboTarget, checklistIds[2]);
            });
        });

        window.addEventListener('hashchange', () => {
            if (window.location.hash === `#view-game-${id}`) {
                resetSession();
                return;
            }
            reportSession();
        }, { passive: true });
    }

    return { update, bind };
}
```

**Step 2: Run existing tests (no tests for game UIs, but run suite)**

```bash
npm test
```

Expected: all pass (new file has no tests yet — it's tested through the wrapper files).

**Step 3: Commit the new file**

```bash
git add src/games/sequence-game.js
git commit -m "feat: add sequence-game.js — shared logic for pizzicato + string-quest"
```

---

### Task 14: Rewrite pizzicato.js as a thin wrapper

**Files:**
- Modify: `src/games/pizzicato.js`

**Step 1: Replace pizzicato.js content**

Note the differences from string-quest:
- prefix: `pizzicato`, btnClass: `pizzicato-btn`, btnAttr: `pizzicatoBtn`, targetAttr: `pizzicatoTarget`
- baseScore: `18`, comboMult: `2`, missPenalty: `4`
- trackUniqueNotes: `true`
- checklistIds: `['pz-step-1', 'pz-step-2', 'pz-step-3']`
- comboTarget: `6`
- seqLengths: `[3, 4, 5]`
- toneOptions: `{ duration: 0.26, volume: 0.2, type: 'triangle' }`
- flourishOptions: `{ tempo: 150, gap: 0.1, duration: 0.18, volume: 0.14, type: 'sine' }`

Replace the entire content of `src/games/pizzicato.js` with:

```js
import { createSequenceGame } from './sequence-game.js';

const { update, bind } = createSequenceGame({
    id: 'pizzicato',
    prefix: 'pizzicato',
    btnClass: 'pizzicato-btn',
    btnAttr: 'pizzicatoBtn',
    targetAttr: 'pizzicatoTarget',
    baseScore: 18,
    comboMult: 2,
    missPenalty: 4,
    trackUniqueNotes: true,
    checklistIds: ['pz-step-1', 'pz-step-2', 'pz-step-3'],
    comboTarget: 6,
    seqLengths: [3, 4, 5],
    toneOptions: { duration: 0.26, volume: 0.2, type: 'triangle' },
    flourishOptions: { tempo: 150, gap: 0.1, duration: 0.18, volume: 0.14, type: 'sine' },
});

export { update, bind };
```

**Step 2: Run tests**

```bash
npm test
```

Expected: all pass.

**Step 3: Manual smoke test**

Open `npm run dev`, navigate to the Pizzicato Pop game, verify:
- Notes buttons work
- Sequence updates correctly
- Completion flourish plays
- Score and combo display correctly

**Step 4: Commit**

```bash
git add src/games/pizzicato.js
git commit -m "refactor: rewrite pizzicato.js as thin wrapper over sequence-game.js (~136→12 lines)"
```

---

### Task 15: Rewrite string-quest.js as a thin wrapper

**Files:**
- Modify: `src/games/string-quest.js`

**Step 1: Note the string-quest differences**

string-quest has an additional checklist mechanic: `lastCorrectNote` tracking (D→A crossing). This is unique enough that it can't be cleanly parameterized into the shared factory without adding complexity that defeats the purpose.

Check: does string-quest's D→A crossing logic fit into the generic `onInteract` callback model, or does it require special-casing?

The D→A detection at `src/games/string-quest.js:113`:
```js
if (lastCorrectNote === 'D' && note === 'A') {
    markChecklist('sq-step-2');
}
```

And G-detection at line 112:
```js
if (note === 'G') markChecklist('sq-step-1');
```

These are per-note callbacks on correct hits. They can be modeled as an `onCorrectHit(note, prevNote)` callback in the factory config.

**Decision:** Add `onCorrectHit` callback to `createSequenceGame` in `sequence-game.js`.

**Step 2: Add onCorrectHit to sequence-game.js**

In `src/games/sequence-game.js`, update the `bind` function's correct-hit block to call an optional callback:

```js
// In createSequenceGame config destructuring, add:
const onCorrectHit = config.onCorrectHit || null;

// In the correct hit branch inside buttons.forEach, add after seqIndex update:
let prevNote = null; // add to bind() scope alongside other state

// In correct hit block, track prevNote and call onCorrectHit:
if (onCorrectHit) onCorrectHit(note, prevNote);
prevNote = note;
```

Full updated correct-hit block in `sequence-game.js`:

```js
if (note === sequence[seqIndex]) {
    combo += 1;
    score += baseScore + combo * comboMult;
    seqIndex = (seqIndex + 1) % sequence.length;
    if (hitNotes) {
        hitNotes.add(note);
        if (checklistIds[0]) markChecklistIf(hitNotes.size >= 4, checklistIds[0]);
    }
    if (onCorrectHit) onCorrectHit(note, prevNote);
    prevNote = note;
    if (seqIndex === 0) {
        const completedSequence = sequence.slice();
        if (checklistIds[1]) markChecklist(checklistIds[1]);
        reportSession();
        buildSequence();
        playToneSequence(completedSequence, flourishOptions);
    }
    updateTargets();
}
```

And add `let prevNote = null;` to the bind() state variables.

**Step 3: Replace string-quest.js content**

Note: string-quest.js currently uses `cachedEl` for module-level caching of score/combo elements. The factory doesn't use this pattern (it queries from stage each bind). For the thin wrapper, omit `cachedEl` — the factory queries from within the stage element on each bind call, which is correct.

Replace the entire content of `src/games/string-quest.js` with:

```js
import { createSequenceGame } from './sequence-game.js';
import { markChecklist } from './shared.js';

const { update, bind } = createSequenceGame({
    id: 'string-quest',
    prefix: 'string',
    btnClass: 'string-btn',
    btnAttr: 'stringBtn',
    targetAttr: 'stringTarget',
    baseScore: 20,
    comboMult: 3,
    missPenalty: 5,
    trackUniqueNotes: false,
    checklistIds: [null, 'sq-step-3', 'sq-step-4'],
    comboTarget: 8,
    seqLengths: [3, 4, 5],
    toneOptions: { duration: 0.28, volume: 0.22, type: 'triangle' },
    flourishOptions: { tempo: 140, gap: 0.1, duration: 0.2, volume: 0.14, type: 'sine' },
    onCorrectHit: (note, prevNote) => {
        if (note === 'G') markChecklist('sq-step-1');
        if (prevNote === 'D' && note === 'A') markChecklist('sq-step-2');
    },
});

export { update, bind };
```

**Step 4: Run tests**

```bash
npm test
```

Expected: all pass.

**Step 5: Manual smoke test**

Open `npm run dev`, navigate to String Quest, verify:
- Note buttons work
- G note marks sq-step-1
- D→A crossing marks sq-step-2
- Sequence completion marks sq-step-3
- Combo goal marks sq-step-4

**Step 6: Commit**

```bash
git add src/games/sequence-game.js src/games/string-quest.js
git commit -m "refactor: rewrite string-quest.js as thin wrapper over sequence-game.js (~145→15 lines)"
```

---

## Phase 4: Extract game-shell.js

**Context:** All 13 games share ~29% boilerplate (stage query, attachTuning, difficulty badge, reportSession, hashchange). Extract to a `createGame()` factory (~120 lines). Migrate simplest games first.

**Risk note:** Games have no unit tests for their UI logic. Each migration requires manual smoke testing. Work one game at a time, commit each independently.

### Task 16: Create game-shell.js

**Files:**
- Create: `src/games/game-shell.js`

**Step 1: Create the factory**

Create `src/games/game-shell.js`:

```js
import {
    recordGameEvent,
    attachTuning,
    setDifficultyBadge,
} from './shared.js';

/**
 * createGame — factory for the universal game shell pattern.
 *
 * @param {object} config
 * @param {string} config.id              - game id (e.g. 'tuning-time')
 * @param {string} config.inputPrefix     - input id prefix for checklist (e.g. 'tt-step-')
 * @param {Function} config.computeUpdate - (stage) => void — runs in update()
 * @param {Function} config.computeAccuracy - (state) => number 0-100
 * @param {Function} config.onBind        - (stage, difficulty, shell) => void
 * @param {Function} config.onReset       - (state) => void
 */
export function createGame({ id, inputPrefix, computeUpdate, computeAccuracy, onBind, onReset }) {
    const viewId = `#view-game-${id}`;
    let reportResult = null;
    let reported = false;
    let gameState = {};

    function update() {
        const stage = document.querySelector(viewId);
        if (!stage) return;
        if (computeUpdate) {
            computeUpdate(stage);
        }
    }

    function bind(difficulty = { speed: 1.0, complexity: 1 }) {
        const stage = document.querySelector(viewId);
        if (!stage) return;

        reported = false;
        gameState = {};

        reportResult = attachTuning(id, (tuning) => {
            setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
            if (onReset) onReset(gameState);
        });

        const reportSession = () => {
            if (reported) return;
            const accuracy = computeAccuracy ? computeAccuracy(gameState) : 0;
            if (accuracy <= 0 && !gameState.score) return;
            reported = true;
            reportResult({ accuracy, score: gameState.score || 0 });
            recordGameEvent(id, { accuracy, score: gameState.score || 0 });
        };

        const resetSession = () => {
            reported = false;
            if (onReset) onReset(gameState);
        };

        const shell = { reportSession, resetSession, gameState };

        onBind(stage, difficulty, shell);

        window.addEventListener('hashchange', () => {
            if (window.location.hash === `#view-game-${id}`) {
                resetSession();
                return;
            }
            reportSession();
        }, { passive: true });
    }

    return { update, bind };
}
```

**Step 2: Run tests**

```bash
npm test
```

Expected: all pass (new file, no tests yet).

**Step 3: Commit**

```bash
git add src/games/game-shell.js
git commit -m "feat: add game-shell.js createGame() factory for universal game boilerplate"
```

---

### Task 17: Migrate tuning-time.js to game-shell

**Files:**
- Modify: `src/games/tuning-time.js`

**Step 1: Read the current file in full**

```bash
cat src/games/tuning-time.js
```

Note: it imports `isSoundEnabled`, `SOUNDS_CHANGE`, `clamp`, and 7 from shared.js. The unique logic: progress bar, audio element playback, `tunedNotes` Set.

**Step 2: Rewrite tuning-time.js using createGame**

```js
import { createGame } from './game-shell.js';
import {
    readLiveNumber,
    markChecklist,
    setDifficultyBadge,
    recordGameEvent,
    attachTuning,
    bindTap,
} from './shared.js';
import { clamp } from '../utils/math.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { SOUNDS_CHANGE } from '../events/event-names.js';

const { update, bind } = createGame({
    id: 'tuning-time',
    inputPrefix: 'tt-step-',
    computeAccuracy: (state) => state.tunedNotes ? (state.tunedNotes.size / (state.targetStrings || 4)) * 100 : 0,
    onBind: (stage, difficulty, { reportSession, resetSession, gameState }) => {
        const statusEl = stage.querySelector('[data-tuning="status"]');
        const progressEl = stage.querySelector('[data-tuning="progress"]');
        const progressBar = stage.querySelector('[data-tuning-bar]');
        const buttons = Array.from(stage.querySelectorAll('[data-tuning-btn]'));
        const audioMap = {};
        const checklistMap = {};

        buttons.forEach((btn) => {
            const note = btn.dataset.tuningBtn;
            const audio = stage.querySelector(`audio[data-tuning-audio="${note}"]`);
            const checkbox = stage.querySelector(`[data-tuning-check="${note}"]`);
            if (audio) audioMap[note] = audio;
            if (checkbox) checklistMap[note] = checkbox;
        });

        gameState.tunedNotes = new Set();
        gameState.targetStrings = difficulty.complexity >= 2 ? 4 : (difficulty.complexity === 1 ? 3 : 2);

        const updateSoundState = () => {
            buttons.forEach((btn) => {
                btn.disabled = !isSoundEnabled();
            });
        };
        updateSoundState();

        const updateProgress = () => {
            const percent = (gameState.tunedNotes.size / gameState.targetStrings) * 100;
            if (progressBar) progressBar.style.width = `${clamp(percent, 0, 100)}%`;
            if (progressEl) progressEl.textContent = `${gameState.tunedNotes.size}/${gameState.targetStrings}`;
        };

        buttons.forEach((btn) => {
            bindTap(btn, () => {
                const note = btn.dataset.tuningBtn;
                if (!note) return;
                if (audioMap[note]) {
                    audioMap[note].currentTime = 0;
                    audioMap[note].play().catch(() => {});
                }
                if (!gameState.tunedNotes.has(note)) {
                    gameState.tunedNotes.add(note);
                    if (checklistMap[note]) markChecklist(checklistMap[note].id);
                    updateProgress();
                    if (gameState.tunedNotes.size >= gameState.targetStrings) {
                        reportSession();
                    }
                }
            });
        });

        document.addEventListener(SOUNDS_CHANGE, updateSoundState);
    },
    onReset: (gameState) => {
        gameState.tunedNotes = new Set();
    },
});

export { update, bind };
```

**Step 3: Run tests**

```bash
npm test
```

Expected: all pass.

**Step 4: Manual smoke test**

Open `npm run dev`, navigate to Tuning Time, verify:
- String buttons play audio
- Progress bar advances
- Checklist items check off

**Step 5: Commit**

```bash
git add src/games/tuning-time.js
git commit -m "refactor: migrate tuning-time.js to createGame() shell"
```

---

### Task 18: Migrate scale-practice.js and rhythm-painter.js

Follow the same pattern as Task 17 for:
1. `src/games/scale-practice.js` (140 lines — tempo/tap scoring game)
2. `src/games/rhythm-painter.js` (149 lines — creativity meter game)

For each:

**Step 1:** Read the full file: `cat src/games/<game>.js`

**Step 2:** Identify unique state (let variables inside bind) and unique interaction handlers

**Step 3:** Rewrite using `createGame()`, putting unique logic in `onBind`

**Step 4:** Run `npm test`

**Step 5:** Manual smoke test the game in dev

**Step 6:** Commit each separately:
```bash
git add src/games/scale-practice.js
git commit -m "refactor: migrate scale-practice.js to createGame() shell"

git add src/games/rhythm-painter.js
git commit -m "refactor: migrate rhythm-painter.js to createGame() shell"
```

---

### Task 19: Migrate ear-trainer.js, bow-hero.js, note-memory.js, pitch-quest.js

Follow the same process as Task 18 for the medium-complexity games. Work one at a time, manual smoke test each, commit each.

Order (easiest to hardest):
1. `src/games/ear-trainer.js` (221 lines)
2. `src/games/bow-hero.js` (227 lines)
3. `src/games/note-memory.js` (286 lines)
4. `src/games/pitch-quest.js` (265 lines)

For timer-based games (bow-hero, note-memory): the timer logic (startTimer/stopTimer/pauseTimer with visibilitychange) stays inside `onBind`.

**After all four:**

```bash
npm test && npx playwright test tests/e2e
```

Expected: all pass.

---

### Task 20: Migrate melody-maker.js, story-song.js, duet-challenge.js

These three use async playback with cancellation tokens (`playToken`). The token pattern stays inside `onBind` — it's unique state, not boilerplate.

Follow the same process. Manual smoke test each. Commit each.

```bash
npm test
```

Expected: all pass after each migration.

---

### Task 21: Migrate rhythm-dash.js (last, most complex)

`rhythm-dash.js` is 371 lines with a metronome system, settings panel, BPM history, and timing meter. It benefits least from the shell. Migrate it last and only if the shell pattern fits without adding complexity.

If extracting to `createGame()` would require adding more than 3 new config options to the factory, **skip this one** — the ROI is insufficient.

**Step 1:** Read the full file and assess how much is genuinely boilerplate vs unique

**Step 2:** If boilerplate is ≥40 lines, migrate. Otherwise leave as-is.

**Step 3:** If migrating, run `npm test` and manual smoke test the metronome, settings panel, and BPM tracking.

---

## Phase 5: Final Verification

### Task 22: Full suite + line count audit

**Step 1: Run full test suite**

```bash
npm test
```

Expected: all pass.

**Step 2: Run E2E tests**

```bash
npx playwright test tests/e2e
```

Expected: all pass.

**Step 3: Run lint**

```bash
npm run lint
```

Expected: no errors.

**Step 4: Run build**

```bash
npm run build
```

Expected: clean build, no errors.

**Step 5: Measure line reduction**

```bash
# Count total lines in src/ (excluding node_modules, dist)
find src/ -name "*.js" | xargs wc -l | tail -1
find tests/ -name "*.js" | xargs wc -l | tail -1
```

Compare to pre-refactor counts. Target: ~600-800 net lines removed.

**Step 6: Commit any cleanup and tag**

```bash
git add -u
git commit -m "chore: code simplification complete — Phase 5 verification"
```

---

## Notes for Implementation

- **Phase 1 is completely safe** — no behavior changes, just deletion of unreachable code. Do it first and commit before starting Phase 2.
- **game-shell.js needs calibration** — after migrating the first 2-3 games, you may find the factory API needs adjustments. That's expected. Adjust `game-shell.js` and update already-migrated games before continuing.
- **Manual smoke tests matter** — there are no unit tests for game UI logic. After each game migration, click through the game in dev to verify correctness.
- **reportSession guard** — the current per-game `reportSession` guards on `score > 0`. The shell guards on `accuracy > 0 || gameState.score > 0`. Review per-game accuracy computation and adjust `computeAccuracy` accordingly.
- **rhythm-dash skip condition** — if rhythm-dash has fewer than 40 lines of extractable boilerplate (relative to its total complexity), skip it for Phase 4.
