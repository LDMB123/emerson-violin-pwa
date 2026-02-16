# Extract + Test Pure Logic — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract testable pure functions from progress.js and game-enhancements.js, deduplicate clamp(), add unit tests.

**Architecture:** Pure-function extraction into separate utility files + unit tests. Side-effect modules stay as orchestrators. Same pattern as Phase 1 (tuner-utils + tone-player).

**Tech Stack:** Vitest 2 + happy-dom, ES modules, vanilla JavaScript.

---

### Task 1: Create shared `clamp()` in `src/utils/math.js`

**Files:**
- Create: `src/utils/math.js`
- Modify: `src/tuner/tuner-utils.js`
- Modify: `src/utils/skill-profile.js`

**Step 1: Create `src/utils/math.js`**

```js
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
```

**Step 2: Update `src/tuner/tuner-utils.js`**

Replace line 1:
```js
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
```
With:
```js
export { clamp } from '../utils/math.js';
```

**Step 3: Update `src/utils/skill-profile.js`**

Replace line 1:
```js
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
```
With:
```js
import { clamp as rawClamp } from './math.js';
const clamp = (value, min = 0, max = 100) => rawClamp(value, min, max);
```

Note: skill-profile.js has default params `min=0, max=100` so we keep a local wrapper that calls the shared clamp with defaults. This avoids changing the internal API.

**Step 4: Run tests**

Run: `npx vitest run`
Expected: 46 tests pass (no regressions)

**Step 5: Run lint**

Run: `npm run lint`
Expected: 0 errors

**Step 6: Commit**

```bash
git add src/utils/math.js src/tuner/tuner-utils.js src/utils/skill-profile.js
git commit -m "refactor: extract shared clamp() to src/utils/math.js"
```

---

### Task 2: Extract `src/progress/progress-utils.js`

**Files:**
- Create: `src/progress/progress-utils.js`
- Modify: `src/progress/progress.js`

**Step 1: Create `src/progress/progress-utils.js`**

```js
import { clamp } from '../utils/math.js';

const RADAR_CENTER = 100;
const RADAR_RADIUS = 80;
const RADAR_ORDER = ['pitch', 'rhythm', 'bow_control', 'posture', 'reading'];
const RADAR_ANGLES = RADAR_ORDER.map((_, index) => ((index * 2 * Math.PI) / RADAR_ORDER.length) - Math.PI / 2);

export const todayDay = () => Math.floor(Date.now() / 86400000);

export const minutesForInput = (input) => {
    if (input?.dataset?.minutes) {
        const parsed = Number.parseInt(input.dataset.minutes, 10);
        if (!Number.isNaN(parsed)) return parsed;
    }
    const id = input?.id || '';
    if (/^(goal-step-|parent-goal-)/.test(id)) return 5;
    if (/^goal-(warmup|scale|song|rhythm|ear)/.test(id)) return 5;
    if (/^bow-set-/.test(id)) return 5;
    if (/^(pq-step-|rd-set-|et-step-|bh-step-|sq-step-|rp-pattern-|ss-step-|pz-step-|tt-step-|mm-step-|sp-step-|dc-step-)/.test(id)) return 2;
    if (/^nm-card-/.test(id)) return 1;
    return 1;
};

export const toTrackerTimestamp = (value) => {
    const parsed = Number.isFinite(Number(value)) ? Number(value) : Date.now();
    return BigInt(Math.floor(parsed));
};

export const formatRecentScore = (event) => {
    if (!event) return 'Score 0';
    if (Number.isFinite(event.accuracy)) {
        return `${Math.round(event.accuracy)}%`;
    }
    if (Number.isFinite(event.stars)) {
        return `${Math.round(event.stars)}★`;
    }
    if (Number.isFinite(event.score)) {
        return `Score ${Math.round(event.score)}`;
    }
    return 'Score 0';
};

export const coachMessageFor = (skill) => {
    switch (skill) {
        case 'pitch':
            return 'Let\u2019s focus on pitch today. Use slow bows and listen for a clear ring.';
        case 'rhythm':
            return 'Let\u2019s lock in the rhythm. Tap a steady beat before you play.';
        case 'bow_control':
            return 'Today is for smooth bowing. Keep the bow straight and relaxed.';
        case 'posture':
            return 'Quick posture check: tall spine, relaxed shoulders, soft bow hand.';
        case 'reading':
            return 'Let\u2019s build reading skills. Follow the notes slowly and name each one.';
        default:
            return 'Let\u2019s start with warm-ups and keep the sound smooth.';
    }
};

export const buildRadarPoints = (skills) => {
    return RADAR_ORDER.map((key, index) => {
        const raw = skills?.[key] ?? 50;
        const value = clamp(raw, 0, 100) / 100;
        const radius = RADAR_RADIUS * value;
        const angle = RADAR_ANGLES[index];
        const x = RADAR_CENTER + radius * Math.cos(angle);
        const y = RADAR_CENTER + radius * Math.sin(angle);
        return { key, x: x.toFixed(1), y: y.toFixed(1) };
    });
};
```

**Step 2: Update `src/progress/progress.js`**

Add import at line 2 (after the storage import):
```js
import { todayDay, minutesForInput, toTrackerTimestamp, formatRecentScore, coachMessageFor, buildRadarPoints } from './progress-utils.js';
import { clamp } from '../utils/math.js';
```

Remove these blocks from progress.js:
- Lines 49-52: `RADAR_CENTER`, `RADAR_RADIUS`, `RADAR_ORDER`, `RADAR_ANGLES` constants
- Line 69: `const todayDay = ...`
- Lines 94-106: `const minutesForInput = ...`
- Line 108: `const clamp = ...`
- Lines 119-122: `const toTrackerTimestamp = ...`
- Lines 141-151: `const buildRadarPoints = ...`
- Lines 153-165: `const formatRecentScore = ...`
- Lines 167-182: `const coachMessageFor = ...`

Keep `GAME_LABELS` (line 53-67) in progress.js — it's used only by `buildProgress` and `applyUI`.

**Step 3: Run tests**

Run: `npx vitest run`
Expected: 46 tests pass (no regressions)

**Step 4: Run lint**

Run: `npm run lint`
Expected: 0 errors

**Step 5: Commit**

```bash
git add src/progress/progress-utils.js src/progress/progress.js
git commit -m "refactor: extract pure functions to progress-utils.js"
```

---

### Task 3: Write tests for `progress-utils.js`

**Files:**
- Create: `tests/progress-utils.test.js`

**Step 1: Write the test file**

```js
import { describe, expect, it } from 'vitest';
import {
    todayDay,
    minutesForInput,
    toTrackerTimestamp,
    formatRecentScore,
    coachMessageFor,
    buildRadarPoints,
} from '../src/progress/progress-utils.js';

describe('todayDay', () => {
    it('returns a positive integer', () => {
        const day = todayDay();
        expect(day).toBeGreaterThan(0);
        expect(Number.isInteger(day)).toBe(true);
    });

    it('matches manual calculation', () => {
        const expected = Math.floor(Date.now() / 86400000);
        expect(todayDay()).toBe(expected);
    });
});

describe('minutesForInput', () => {
    it('returns data-minutes attribute when present', () => {
        expect(minutesForInput({ dataset: { minutes: '10' }, id: '' })).toBe(10);
    });

    it('returns 5 for goal-step- ids', () => {
        expect(minutesForInput({ dataset: {}, id: 'goal-step-focus-scales' })).toBe(5);
    });

    it('returns 5 for parent-goal- ids', () => {
        expect(minutesForInput({ dataset: {}, id: 'parent-goal-1' })).toBe(5);
    });

    it('returns 5 for goal-warmup ids', () => {
        expect(minutesForInput({ dataset: {}, id: 'goal-warmup' })).toBe(5);
    });

    it('returns 5 for bow-set- ids', () => {
        expect(minutesForInput({ dataset: {}, id: 'bow-set-1' })).toBe(5);
    });

    it('returns 2 for game step ids (pq-step-)', () => {
        expect(minutesForInput({ dataset: {}, id: 'pq-step-1' })).toBe(2);
    });

    it('returns 2 for rd-set- ids', () => {
        expect(minutesForInput({ dataset: {}, id: 'rd-set-2' })).toBe(2);
    });

    it('returns 1 for nm-card- ids', () => {
        expect(minutesForInput({ dataset: {}, id: 'nm-card-3' })).toBe(1);
    });

    it('returns 1 for unknown ids', () => {
        expect(minutesForInput({ dataset: {}, id: 'random-thing' })).toBe(1);
    });

    it('handles null/undefined input gracefully', () => {
        expect(minutesForInput(null)).toBe(1);
        expect(minutesForInput(undefined)).toBe(1);
    });

    it('ignores non-numeric data-minutes', () => {
        expect(minutesForInput({ dataset: { minutes: 'abc' }, id: 'pq-step-1' })).toBe(2);
    });
});

describe('toTrackerTimestamp', () => {
    it('converts numeric value to BigInt', () => {
        const result = toTrackerTimestamp(1000);
        expect(result).toBe(1000n);
    });

    it('converts string number to BigInt', () => {
        const result = toTrackerTimestamp('5000');
        expect(result).toBe(5000n);
    });

    it('returns current time BigInt for non-finite input', () => {
        const before = BigInt(Math.floor(Date.now()));
        const result = toTrackerTimestamp('not-a-number');
        const after = BigInt(Math.floor(Date.now()));
        expect(result).toBeGreaterThanOrEqual(before);
        expect(result).toBeLessThanOrEqual(after);
    });

    it('floors decimal values', () => {
        expect(toTrackerTimestamp(99.9)).toBe(99n);
    });
});

describe('formatRecentScore', () => {
    it('formats accuracy as percentage', () => {
        expect(formatRecentScore({ accuracy: 85.7 })).toBe('86%');
    });

    it('formats stars with star symbol', () => {
        expect(formatRecentScore({ stars: 4 })).toBe('4\u2605');
    });

    it('formats raw score', () => {
        expect(formatRecentScore({ score: 150 })).toBe('Score 150');
    });

    it('prefers accuracy over stars', () => {
        expect(formatRecentScore({ accuracy: 90, stars: 3 })).toBe('90%');
    });

    it('prefers stars over raw score', () => {
        expect(formatRecentScore({ stars: 5, score: 100 })).toBe('5\u2605');
    });

    it('returns "Score 0" for null event', () => {
        expect(formatRecentScore(null)).toBe('Score 0');
    });

    it('returns "Score 0" for empty event', () => {
        expect(formatRecentScore({})).toBe('Score 0');
    });
});

describe('coachMessageFor', () => {
    it('returns pitch message', () => {
        expect(coachMessageFor('pitch')).toContain('pitch');
    });

    it('returns rhythm message', () => {
        expect(coachMessageFor('rhythm')).toContain('rhythm');
    });

    it('returns bow_control message', () => {
        expect(coachMessageFor('bow_control')).toContain('bowing');
    });

    it('returns posture message', () => {
        expect(coachMessageFor('posture')).toContain('posture');
    });

    it('returns reading message', () => {
        expect(coachMessageFor('reading')).toContain('reading');
    });

    it('returns default message for unknown skill', () => {
        expect(coachMessageFor('unknown')).toContain('warm-ups');
    });

    it('returns default for undefined', () => {
        expect(coachMessageFor(undefined)).toContain('warm-ups');
    });
});

describe('buildRadarPoints', () => {
    it('returns 5 points (one per skill)', () => {
        const skills = { pitch: 80, rhythm: 60, bow_control: 70, posture: 50, reading: 90 };
        const points = buildRadarPoints(skills);
        expect(points).toHaveLength(5);
    });

    it('returns correct keys in radar order', () => {
        const skills = { pitch: 50, rhythm: 50, bow_control: 50, posture: 50, reading: 50 };
        const points = buildRadarPoints(skills);
        expect(points.map((p) => p.key)).toEqual(['pitch', 'rhythm', 'bow_control', 'posture', 'reading']);
    });

    it('centers at (100, 100) when all skills are 0', () => {
        const skills = { pitch: 0, rhythm: 0, bow_control: 0, posture: 0, reading: 0 };
        const points = buildRadarPoints(skills);
        points.forEach((p) => {
            expect(Number(p.x)).toBeCloseTo(100, 0);
            expect(Number(p.y)).toBeCloseTo(100, 0);
        });
    });

    it('clamps values above 100', () => {
        const skills = { pitch: 200, rhythm: 50, bow_control: 50, posture: 50, reading: 50 };
        const clamped = buildRadarPoints(skills);
        const normal = buildRadarPoints({ pitch: 100, rhythm: 50, bow_control: 50, posture: 50, reading: 50 });
        expect(clamped[0].x).toBe(normal[0].x);
        expect(clamped[0].y).toBe(normal[0].y);
    });

    it('defaults missing skills to 50', () => {
        const points = buildRadarPoints({});
        expect(points).toHaveLength(5);
        // With default 50, radius should be 40 (80 * 0.5)
        // First point (pitch) at angle -PI/2: x=100, y=100-40=60
        expect(Number(points[0].y)).toBeCloseTo(60, 0);
    });

    it('produces string coordinates with 1 decimal', () => {
        const points = buildRadarPoints({ pitch: 75, rhythm: 75, bow_control: 75, posture: 75, reading: 75 });
        points.forEach((p) => {
            expect(p.x).toMatch(/^\d+\.\d$/);
            expect(p.y).toMatch(/^\d+\.\d$/);
        });
    });
});
```

**Step 2: Run tests to verify they pass**

Run: `npx vitest run tests/progress-utils.test.js`
Expected: ~24 tests pass

**Step 3: Run full suite**

Run: `npx vitest run`
Expected: ~70 tests pass (46 existing + ~24 new)

**Step 4: Commit**

```bash
git add tests/progress-utils.test.js
git commit -m "test: add unit tests for progress-utils.js"
```

---

### Task 4: Extract `src/games/game-config.js`

**Files:**
- Create: `src/games/game-config.js`
- Modify: `src/games/game-enhancements.js`

**Step 1: Create `src/games/game-config.js`**

Move the entire `GAME_META` object (lines 1-145 of game-enhancements.js) into this file.

```js
export const GAME_META = {
    'pitch-quest': {
        // ... exact content from lines 2-144 of game-enhancements.js
    },
    // all 13 games
};
```

Copy lines 1-145 verbatim and add `export` before `const`.

**Step 2: Update `src/games/game-enhancements.js`**

Add import at line 1:
```js
import { GAME_META } from './game-config.js';
```

Remove lines 1-145 (the `GAME_META` constant).

**Step 3: Run tests**

Run: `npx vitest run`
Expected: All existing tests pass

**Step 4: Run lint**

Run: `npm run lint`
Expected: 0 errors

**Step 5: Commit**

```bash
git add src/games/game-config.js src/games/game-enhancements.js
git commit -m "refactor: extract GAME_META to game-config.js"
```

---

### Task 5: Extract `src/games/session-timer.js`

**Files:**
- Create: `src/games/session-timer.js`
- Modify: `src/games/game-enhancements.js`

**Step 1: Create `src/games/session-timer.js`**

```js
export const formatMinutes = (value) => `${Math.max(1, Math.round(value || 0))} min`;

export const formatTime = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const createSessionTimer = ({ targetMinutes, onUpdate, onMilestone }) => {
    let interval = null;
    let startedAt = null;
    const safeTargetMinutes = Math.max(1, targetMinutes || 0);
    const targetMs = safeTargetMinutes * 60 * 1000;
    const halfMs = targetMs / 2;
    const oneMinMs = 60 * 1000;
    const announced = new Set();

    const elapsed = () => (startedAt ? Date.now() - startedAt : 0);

    const checkMilestones = (ms) => {
        if (!onMilestone) return;
        const remaining = targetMs - ms;
        if (ms >= targetMs && !announced.has('end')) {
            announced.add('end');
            onMilestone('end', 'Session complete');
        } else if (remaining > 0 && remaining <= oneMinMs && !announced.has('1min')) {
            announced.add('1min');
            onMilestone('1min', '1 minute remaining');
        } else if (ms >= halfMs && !announced.has('half')) {
            announced.add('half');
            onMilestone('half', 'Halfway there');
        }
    };

    const tick = () => {
        const ms = elapsed();
        const percent = Math.min(100, Math.round((ms / targetMs) * 100));
        const complete = ms >= targetMs;
        if (onUpdate) onUpdate({ ms, percent, complete, timeLabel: formatTime(ms) });
        checkMilestones(ms);
    };

    const start = () => {
        if (interval) return;
        startedAt = Date.now();
        announced.clear();
        tick();
        interval = globalThis.setInterval(tick, 1000);
    };

    const stop = () => {
        if (!interval) return;
        globalThis.clearInterval(interval);
        interval = null;
    };

    const reset = () => {
        stop();
        startedAt = null;
        announced.clear();
    };

    return { start, stop, reset, elapsed };
};
```

Note: `createSessionTimer` is a refactored version of `attachSessionTimer`. It takes pure callbacks instead of DOM elements. `game-enhancements.js` will use `createSessionTimer` with a thin DOM adapter.

**Step 2: Update `src/games/game-enhancements.js`**

Add import at line 1 (after `GAME_META` import):
```js
import { formatMinutes, formatTime, createSessionTimer } from './session-timer.js';
```

Remove these blocks:
- `const formatMinutes = ...` (old line 147)
- `const formatTime = ...` (old lines 150-155)

Replace the `attachSessionTimer` function (old lines 183-257) with a thin DOM adapter:

```js
const attachSessionTimer = (view, timerEl, fillEl, trackEl, targetMinutes, scoreEl, announceEl) => {
    const timer = createSessionTimer({
        targetMinutes,
        onUpdate: ({ percent, complete, timeLabel }) => {
            if (timerEl) timerEl.textContent = timeLabel;
            if (fillEl) {
                fillEl.style.width = `${percent}%`;
                if (trackEl) trackEl.setAttribute('aria-valuenow', String(percent));
            }
            if (scoreEl) {
                scoreEl.textContent = complete ? 'Session Complete' : 'Session Active';
            }
        },
        onMilestone: (_id, message) => {
            if (announceEl) announceEl.textContent = message;
        },
    });

    const start = () => {
        view.dataset.session = 'active';
        if (announceEl) announceEl.textContent = 'Session started';
        timer.start();
    };

    const stop = () => {
        timer.stop();
        view.dataset.session = 'idle';
        if (scoreEl) scoreEl.textContent = scoreEl.dataset.defaultScore || 'Guided Drill';
    };

    const reset = () => {
        timer.reset();
        if (timerEl) timerEl.textContent = '00:00';
        if (announceEl) announceEl.textContent = '';
        if (fillEl) {
            fillEl.style.width = '0%';
            if (trackEl) trackEl.setAttribute('aria-valuenow', '0');
        }
    };

    return { start, stop, reset };
};
```

**Step 3: Run tests**

Run: `npx vitest run`
Expected: All existing tests pass

**Step 4: Run lint**

Run: `npm run lint`
Expected: 0 errors

**Step 5: Commit**

```bash
git add src/games/session-timer.js src/games/game-enhancements.js
git commit -m "refactor: extract session timer to session-timer.js"
```

---

### Task 6: Write tests for game utils

**Files:**
- Create: `tests/game-utils.test.js`

**Step 1: Write the test file**

```js
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GAME_META } from '../src/games/game-config.js';
import { formatMinutes, formatTime, createSessionTimer } from '../src/games/session-timer.js';

describe('GAME_META', () => {
    it('contains 13 games', () => {
        expect(Object.keys(GAME_META)).toHaveLength(13);
    });

    it('has required fields for each game', () => {
        for (const [id, meta] of Object.entries(GAME_META)) {
            expect(meta.skill, `${id} missing skill`).toBeTruthy();
            expect(meta.goal, `${id} missing goal`).toBeTruthy();
            expect(meta.targetMinutes, `${id} missing targetMinutes`).toBeGreaterThan(0);
            expect(meta.steps, `${id} missing steps`).toBeInstanceOf(Array);
            expect(meta.steps.length, `${id} has no steps`).toBeGreaterThan(0);
            expect(meta.tip, `${id} missing tip`).toBeTruthy();
        }
    });

    it('includes pitch-quest', () => {
        expect(GAME_META['pitch-quest']).toBeTruthy();
        expect(GAME_META['pitch-quest'].skill).toBe('Pitch');
    });

    it('includes duet-challenge', () => {
        expect(GAME_META['duet-challenge']).toBeTruthy();
        expect(GAME_META['duet-challenge'].skill).toBe('Rhythm');
    });
});

describe('formatMinutes', () => {
    it('formats whole minutes', () => {
        expect(formatMinutes(5)).toBe('5 min');
    });

    it('rounds fractional values', () => {
        expect(formatMinutes(2.7)).toBe('3 min');
    });

    it('clamps to minimum of 1', () => {
        expect(formatMinutes(0)).toBe('1 min');
        expect(formatMinutes(-5)).toBe('1 min');
    });

    it('handles null/undefined as 1 min', () => {
        expect(formatMinutes(null)).toBe('1 min');
        expect(formatMinutes(undefined)).toBe('1 min');
    });
});

describe('formatTime', () => {
    it('formats zero as 00:00', () => {
        expect(formatTime(0)).toBe('00:00');
    });

    it('formats seconds with padding', () => {
        expect(formatTime(5000)).toBe('00:05');
    });

    it('formats minutes and seconds', () => {
        expect(formatTime(90000)).toBe('01:30');
    });

    it('handles large values', () => {
        expect(formatTime(600000)).toBe('10:00');
    });

    it('clamps negative to 00:00', () => {
        expect(formatTime(-1000)).toBe('00:00');
    });
});

describe('createSessionTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('calls onUpdate after start', () => {
        const onUpdate = vi.fn();
        const timer = createSessionTimer({ targetMinutes: 1, onUpdate });
        timer.start();
        expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
            ms: expect.any(Number),
            percent: 0,
            complete: false,
            timeLabel: '00:00',
        }));
        timer.stop();
    });

    it('ticks every second', () => {
        const onUpdate = vi.fn();
        const timer = createSessionTimer({ targetMinutes: 1, onUpdate });
        timer.start();
        onUpdate.mockClear();
        vi.advanceTimersByTime(3000);
        expect(onUpdate).toHaveBeenCalledTimes(3);
        timer.stop();
    });

    it('reports halfway milestone', () => {
        const onMilestone = vi.fn();
        const timer = createSessionTimer({ targetMinutes: 1, onUpdate: vi.fn(), onMilestone });
        timer.start();
        vi.advanceTimersByTime(30000); // 30 seconds = half of 1 minute
        expect(onMilestone).toHaveBeenCalledWith('half', 'Halfway there');
        timer.stop();
    });

    it('reports end milestone', () => {
        const onMilestone = vi.fn();
        const timer = createSessionTimer({ targetMinutes: 1, onUpdate: vi.fn(), onMilestone });
        timer.start();
        vi.advanceTimersByTime(61000); // just past 1 minute
        expect(onMilestone).toHaveBeenCalledWith('end', 'Session complete');
        timer.stop();
    });

    it('stop prevents further ticks', () => {
        const onUpdate = vi.fn();
        const timer = createSessionTimer({ targetMinutes: 1, onUpdate });
        timer.start();
        timer.stop();
        onUpdate.mockClear();
        vi.advanceTimersByTime(5000);
        expect(onUpdate).not.toHaveBeenCalled();
    });

    it('reset clears state for re-use', () => {
        const onUpdate = vi.fn();
        const onMilestone = vi.fn();
        const timer = createSessionTimer({ targetMinutes: 1, onUpdate, onMilestone });
        timer.start();
        vi.advanceTimersByTime(61000);
        timer.reset();
        onMilestone.mockClear();
        timer.start();
        vi.advanceTimersByTime(30000);
        // Should fire 'half' again after reset
        expect(onMilestone).toHaveBeenCalledWith('half', 'Halfway there');
        timer.stop();
    });

    it('does not double-start', () => {
        const onUpdate = vi.fn();
        const timer = createSessionTimer({ targetMinutes: 1, onUpdate });
        timer.start();
        timer.start(); // second call should be no-op
        onUpdate.mockClear();
        vi.advanceTimersByTime(1000);
        expect(onUpdate).toHaveBeenCalledTimes(1); // not 2
        timer.stop();
    });
});
```

**Step 2: Run the new test file**

Run: `npx vitest run tests/game-utils.test.js`
Expected: ~17 tests pass

**Step 3: Run full suite**

Run: `npx vitest run`
Expected: ~87 tests pass (46 existing + ~24 progress-utils + ~17 game-utils)

**Step 4: Commit**

```bash
git add tests/game-utils.test.js
git commit -m "test: add unit tests for game-config and session-timer"
```

---

### Task 7: Remove `clamp` from `progress.js`

**Files:**
- Modify: `src/progress/progress.js`

After Task 2 extracted most functions, `clamp` is still used inside `progress.js` by `applyUI` and `buildProgress`. It was imported in Task 2.

**Step 1: Verify `clamp` import exists in progress.js**

After Task 2, progress.js should already import `clamp` from `../utils/math.js`. Verify the local `const clamp = ...` (line 108) was removed in Task 2.

If it was not removed (because `buildProgress` and `applyUI` still use it), remove it now and ensure the import from `../utils/math.js` is present.

**Step 2: Run tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 3: Run lint**

Run: `npm run lint`
Expected: 0 errors

**Step 4: Commit (if any changes made)**

```bash
git add src/progress/progress.js
git commit -m "refactor: use shared clamp import in progress.js"
```

---

### Task 8: Verification gate

**Step 1: Run lint**

Run: `npm run lint`
Expected: 0 errors

**Step 2: Run full test suite**

Run: `npx vitest run`
Expected: ~87 tests pass, 0 failures

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Verify no behavioral changes**

Run: `npx vitest run --reporter=verbose 2>&1 | head -100`
Confirm test counts match expectations.

---

### Task 9: Bump SW cache version

**Files:**
- Modify: `public/sw-assets.js` (or wherever `CACHE_VERSION` lives)

**Step 1: Find and bump the cache version**

Search for `CACHE_VERSION` or `v1` pattern in the service worker assets file.
Increment by 1 (e.g., `v111` -> `v112`).

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add public/sw-assets.js
git commit -m "chore: bump SW cache version for extraction refactor"
```
