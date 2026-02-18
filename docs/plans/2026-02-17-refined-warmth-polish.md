# Refined Warmth — iPad Mini Polish Pass

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the Emerson Violin PWA for iPad mini 6th gen — sharper micro-details, iPad-optimized layout, improved accessibility, and more delightful interactions — without redesigning the existing warm panda aesthetic.

**Architecture:** CSS-first approach: all 10 polish areas land in `src/styles/app.css` (5614 lines, CSS Layers). HTML view files in `public/views/` are modified for empty states. No new JS modules needed — slider fill update is a tiny inline enhancement to the existing trainer module.

**Tech Stack:** Vanilla JS ES modules, Vite 6, CSS Layers (`@layer tokens, base, components`), Web Audio API, CSS custom properties, `@keyframes`, `@starting-style` (Chrome native)

---

## Task 1: iPad Mini Breakpoints — Layout Optimization

**Context:** Current queries: `min-width: 600px` (home-brand row) and `max-width: 720px` (games 2-col), `max-width: 460px` (games 1-col). iPad mini 6th gen is 820px portrait, 1180px landscape. The `.games-grid` is already 3-col at >720px — perfect for iPad portrait. We need wider grids, taller nav, and landscape max-width.

**Files:**
- Modify: `src/styles/app.css:1114-1133` (games-grid media queries)
- Modify: `src/styles/app.css:1260-1340` (bottom nav + nav-item)
- Modify: `src/styles/app.css:769-829` (home view)

**Step 1: Add tablet breakpoints block at end of `@layer components` (before line 4629 closing brace)**

Find this line in app.css:
```css
    @keyframes skeleton-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
    }
```
...then scroll to line 4628: `}` (end of components layer).

Insert BEFORE the closing `}` of `@layer components` (after line 4628):

```css
    /* =========================================================
       iPad Mini 6 — Portrait (≥768px) & Landscape (≥1024px)
       ========================================================= */
    @media (min-width: 768px) {
        /* Larger nav items */
        .nav-item {
            min-height: 60px;
            padding: var(--space-3) var(--space-4);
            min-width: 72px;
        }

        .nav-icon svg {
            width: 28px;
            height: 28px;
        }

        /* Games: 4-col on iPad portrait */
        .games-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            width: min(100%, 900px);
        }

        .games-section {
            width: min(100%, 900px);
        }

        /* Home: feature grid 4-col, max-width */
        .home-grid {
            width: min(100%, 640px);
            margin-inline: auto;
        }

        /* Increase button min-height for fat-finger friendliness */
        .btn {
            min-height: 52px;
        }

        /* Generous view padding */
        .view {
            padding: var(--space-6) var(--space-6) calc(var(--space-6) + 80px);
        }

        /* Corner mascot larger on iPad */
        .corner-mascot {
            width: 100px;
            height: 100px;
        }
    }

    @media (min-width: 1024px) {
        /* Constrain content width on landscape to prevent over-stretching */
        .progress-layout,
        .coach-layout,
        .trainer-layout,
        .tuner-layout,
        .home-hero,
        .home-grid {
            max-width: 900px;
            margin-inline: auto;
        }

        .games-section {
            width: min(100%, 1100px);
        }

        /* Games: stay 4-col, wider */
        .games-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            width: min(100%, 1100px);
        }
    }
```

**Step 2: Run dev server and open at 820px width**

```bash
npm run dev
```

Open browser at 820px wide. Verify: games grid shows 4 columns, nav items taller, content has breathing room.

**Step 3: Commit**

```bash
git add src/styles/app.css
git commit -m "style: add iPad mini 768/1024px breakpoints for layout"
```

---

## Task 2: Custom Range Slider

**Context:** Line 96-99: `input[type="range"]` only has `accent-color`. Renders as ugly system control on iPadOS. The metronome slider is in `public/views/trainer.html:66`. Pitch Quest game also has sliders. Need branded custom thumb + track.

**Files:**
- Modify: `src/styles/app.css:96-99` (range reset)
- Modify: `src/styles/app.css` — add custom slider styles in `@layer components` (after button section ~line 766)
- Modify: `src/trainer/tools.js` — add `updateSliderFill` helper

**Step 1: Replace the range reset at lines 96-99**

Old:
```css
    input[type="range"] {
        width: 100%;
        accent-color: var(--color-primary);
    }
```

New:
```css
    input[type="range"] {
        width: 100%;
        accent-color: var(--color-primary);
        -webkit-appearance: none;
        appearance: none;
        background: transparent;
        cursor: pointer;
    }
```

**Step 2: Add custom slider CSS after `.btn-sm` block (after line 766)**

Find `/* Home View */` comment at line 768 and insert BEFORE it:

```css
    /* Custom Range Slider */
    input[type="range"]::-webkit-slider-runnable-track {
        height: 8px;
        border-radius: var(--radius-full);
        background: linear-gradient(
            to right,
            var(--color-primary) 0%,
            var(--color-primary) var(--slider-fill, 50%),
            var(--color-bg-alt) var(--slider-fill, 50%),
            var(--color-bg-alt) 100%
        );
        border: 1px solid rgba(255, 255, 255, 0.6);
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
        box-shadow:
            0 3px 10px color-mix(in srgb, var(--color-primary), transparent 45%),
            0 1px 3px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        border: 2px solid white;
        margin-top: -10px;
        transition: transform var(--duration-fast) var(--ease-bounce),
                    box-shadow var(--duration-fast) var(--ease-out);
        cursor: grab;
    }

    input[type="range"]::-webkit-slider-thumb:active {
        transform: scale(0.92);
        cursor: grabbing;
        box-shadow:
            0 1px 4px color-mix(in srgb, var(--color-primary), transparent 50%),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }

    @media (hover: hover) and (pointer: fine) {
        input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.1);
            box-shadow:
                0 5px 15px color-mix(in srgb, var(--color-primary), transparent 35%),
                0 1px 3px rgba(0, 0, 0, 0.12),
                inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
    }

    /* Slider value tooltip */
    input[type="range"].has-tooltip {
        position: relative;
    }

    .slider-tooltip {
        position: absolute;
        background: var(--color-primary);
        color: white;
        font-size: var(--text-xs);
        font-weight: 700;
        padding: 2px 8px;
        border-radius: var(--radius-full);
        white-space: nowrap;
        pointer-events: none;
        transform: translateX(-50%) translateY(-36px);
        left: var(--slider-fill, 50%);
        opacity: 0;
        transition: opacity var(--duration-fast);
    }

    input[type="range"]:active + .slider-tooltip,
    input[type="range"]:focus + .slider-tooltip {
        opacity: 1;
    }
```

**Step 3: Add `updateSliderFill` to `src/trainer/tools.js`**

Find the metronome slider event listener. Add this utility function near the top of the file and call it on slider `input` events:

```js
function updateSliderFill(slider) {
    const min = Number(slider.min) || 0;
    const max = Number(slider.max) || 100;
    const val = Number(slider.value) || 0;
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.setProperty('--slider-fill', `${pct}%`);
}

// Initialize on mount:
const metroSlider = document.querySelector('[data-metronome="slider"]');
if (metroSlider) {
    updateSliderFill(metroSlider);
    metroSlider.addEventListener('input', () => updateSliderFill(metroSlider));
}

// Also apply to any game sliders (pitch offset, tuning window):
document.querySelectorAll('input[type="range"]').forEach(s => {
    updateSliderFill(s);
    s.addEventListener('input', () => updateSliderFill(s));
});
```

**Step 4: Verify**

Navigate to Trainer. Slider thumb should be coral circle with drop shadow. Drag to verify fill color tracks position.

**Step 5: Commit**

```bash
git add src/styles/app.css src/trainer/tools.js
git commit -m "style: branded custom range slider with fill tracking"
```

---

## Task 3: Progress Bar Shimmer Animation

**Context:** `.goal-fill` (line 938-944), `.xp-fill` (line 420-423), `.xp-fill-large` (line 3183-3186), `.level-fill` (line 682-685). All are static gradient fills. Add animated shimmer to make progress feel alive.

**Files:**
- Modify: `src/styles/app.css` — `.goal-fill`, `.xp-fill`, `.xp-fill-large`, `.level-fill`, add `@keyframes progress-shimmer`

**Step 1: Add `@keyframes progress-shimmer` after `@keyframes bounce` (near line 852)**

Find `@keyframes bounce {` at line 852. Insert AFTER the closing `}` of that keyframe block (line ~862):

```css
    @keyframes progress-shimmer {
        0% { background-position: 200% center; }
        100% { background-position: -200% center; }
    }
```

**Step 2: Update `.goal-fill` (lines 938-944)**

Old:
```css
    .goal-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
        border-radius: var(--radius-full);
        width: 0%;
        transition: width var(--duration-slow) var(--ease-out);
    }
```

New:
```css
    .goal-fill {
        height: 100%;
        background: linear-gradient(
            90deg,
            var(--color-primary),
            var(--color-secondary),
            var(--color-primary)
        );
        background-size: 200% 100%;
        border-radius: var(--radius-full);
        width: 0%;
        transition: width var(--duration-slow) var(--ease-out);
        animation: progress-shimmer 2.5s ease-in-out infinite;
        box-shadow: 1px 0 8px color-mix(in srgb, var(--color-secondary), transparent 40%);
    }

    @media (prefers-reduced-motion: reduce) {
        .goal-fill {
            animation: none;
            background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
        }
    }
```

**Step 3: Update `.xp-fill` (line 420-423)**

Old:
```css
    .xp-fill {
        height: 100%;
        background: var(--color-primary);
        border-radius: var(--radius-full);
```

New:
```css
    .xp-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--color-primary), var(--color-secondary), var(--color-primary));
        background-size: 200% 100%;
        border-radius: var(--radius-full);
        animation: progress-shimmer 2.5s ease-in-out infinite;
```

**Step 4: Update `.xp-fill-large` (line 3183-3186)**

Old:
```css
    .xp-fill-large {
        height: 100%;
        width: 30%;
        background: linear-gradient(90deg, #7b58ff, #ffb65f);
```

New:
```css
    .xp-fill-large {
        height: 100%;
        width: 30%;
        background: linear-gradient(90deg, #7b58ff, #ffb65f, #7b58ff);
        background-size: 200% 100%;
        animation: progress-shimmer 2.5s ease-in-out infinite;
        box-shadow: 1px 0 8px rgba(123, 88, 255, 0.35);
```

**Step 5: Update `.level-fill` (line 682-685)**

Old:
```css
    .level-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
```

New:
```css
    .level-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, var(--color-primary), var(--color-secondary), var(--color-primary));
        background-size: 200% 100%;
        animation: progress-shimmer 2.5s ease-in-out infinite;
```

**Step 6: Verify**

Open home view. Daily goal bar should shimmer coral→gold→coral. Open progress view, XP bar should shimmer purple→gold. Both subtle, not distracting.

**Step 7: Commit**

```bash
git add src/styles/app.css
git commit -m "style: add shimmer animation to all progress fill bars"
```

---

## Task 4: Skeleton Loading States — Branded Stagger

**Context:** Skeleton bars at lines 4573-4608. Currently gray-ish `var(--color-bg-alt)`. Make them coral-tinted and stagger the animation delays for a wave effect.

**Files:**
- Modify: `src/styles/app.css:4573-4608`

**Step 1: Update skeleton color in `.skeleton-bar` (line 4574-4578)**

Old:
```css
    .skeleton-bar {
        background: linear-gradient(
            90deg,
            var(--color-bg-alt) 25%,
            color-mix(in oklch, var(--color-bg-alt), white 40%) 50%,
            var(--color-bg-alt) 75%
        );
        background-size: 200% 100%;
        border-radius: var(--radius-md);
        animation: skeleton-shimmer 1.5s ease-in-out infinite;
    }
```

New:
```css
    .skeleton-bar {
        background: linear-gradient(
            90deg,
            rgba(233, 86, 57, 0.07) 25%,
            rgba(249, 169, 63, 0.12) 50%,
            rgba(233, 86, 57, 0.07) 75%
        );
        background-size: 200% 100%;
        border-radius: var(--radius-md);
        animation: skeleton-shimmer 1.8s ease-in-out infinite;
    }
```

**Step 2: Add staggered delays to skeleton sub-elements. Add after `.skeleton-row .skeleton-bar { flex: 1; }` (line 4608):**

```css
    .skeleton-bar:nth-child(1) { animation-delay: 0ms; }
    .skeleton-bar:nth-child(2) { animation-delay: 120ms; }
    .skeleton-bar:nth-child(3) { animation-delay: 240ms; }
    .skeleton-bar:nth-child(4) { animation-delay: 360ms; }
    .skeleton-card { animation-delay: 80ms; }
    .skeleton-card-sm:nth-child(1) { animation-delay: 160ms; }
    .skeleton-card-sm:nth-child(2) { animation-delay: 280ms; }
```

**Step 3: Verify**

Navigate to a view that triggers skeleton (e.g., coach). Skeleton bars should pulse in coral-gold tint with a gentle wave stagger.

**Step 4: Commit**

```bash
git add src/styles/app.css
git commit -m "style: coral-tinted skeleton with staggered wave animation"
```

---

## Task 5: Empty States — Recent Games & Achievements

**Context:** `public/views/progress.html:151-168` — Recent Games section has `.recent-games-empty` (plain text, line 167). We need a styled empty state with mascot. The mascot images are at `./assets/illustrations/mascot-happy.webp`.

**Files:**
- Modify: `public/views/progress.html:151-168`
- Modify: `src/styles/app.css` — add `.empty-state` styles

**Step 1: Replace the Recent Games empty paragraph in `progress.html` (line 167)**

Old:
```html
            <p class="recent-games-empty" data-recent-games-empty="">Play a game to see your latest scores.</p>
```

New:
```html
            <div class="empty-state recent-games-empty" data-recent-games-empty="">
              <picture>
                <source srcset="./assets/illustrations/mascot-happy.webp" type="image/webp">
                <img src="./assets/illustrations/mascot-happy.png" alt="" class="empty-state-mascot" width="64" height="64" loading="lazy" decoding="async">
              </picture>
              <p class="empty-state-text">No games yet — pick one to get started!</p>
              <a href="#view-games" class="btn btn-primary btn-sm">Play a game</a>
            </div>
```

**Step 2: Add `.empty-state` CSS in `src/styles/app.css` — add inside `@layer components` near the end, before the tablet breakpoints block added in Task 1**

```css
    /* Empty States */
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-6) var(--space-4);
        text-align: center;
    }

    .empty-state-mascot {
        width: 64px;
        height: 64px;
        object-fit: contain;
        opacity: 0.85;
        animation: bounce 3s ease-in-out infinite;
    }

    .empty-state-text {
        font-size: var(--text-sm);
        font-weight: 600;
        color: rgba(255, 255, 255, 0.8);
        margin: 0;
        line-height: var(--leading-relaxed);
    }

    @media (prefers-reduced-motion: reduce) {
        .empty-state-mascot {
            animation: none;
        }
    }
```

**Note:** The recent-games section uses `color: #fff` (white text on purple background per line 2880), so the text color `rgba(255,255,255,0.8)` is correct. The btn-primary will show as coral on that dark surface.

**Step 3: Verify**

Open progress view. If no games have been played, empty state shows mascot + text + CTA button. (JS hides/shows `.recent-games-empty` based on data.)

**Step 4: Commit**

```bash
git add public/views/progress.html src/styles/app.css
git commit -m "feat: styled empty state for recent games with mascot + CTA"
```

---

## Task 6: Popover Backdrop — Fade & Blur Transition

**Context:** The popover-menu already has its own animation (`opacity 0 → 1`, `translateY(12px) → 0` per lines 5092-5123). The `.popover-backdrop` is a `<div>` managed by JS (class toggle). Find its CSS and the JS.

**Step 1: Find popover-backdrop CSS**

```bash
grep -n "popover-backdrop" src/styles/app.css
```

**Step 2: Read that CSS section and add transition**

The backdrop div is at `index.html` near the end. Find its CSS in app.css. It likely has `opacity: 0; transition: opacity` already or is just `hidden`. Update to include `backdrop-filter`:

Find: `popover-backdrop` in app.css.

If the CSS is:
```css
.popover-backdrop {
    /* existing */
}
```

Add/update so it contains:
```css
.popover-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(86, 40, 23, 0.18);
    backdrop-filter: blur(4px) saturate(120%);
    -webkit-backdrop-filter: blur(4px) saturate(120%);
    z-index: calc(var(--z-modal) - 1);
    opacity: 0;
    transition: opacity 0.25s var(--ease-out),
                backdrop-filter 0.25s var(--ease-out);
    pointer-events: none;
}

.popover-backdrop.is-visible {
    opacity: 1;
    pointer-events: auto;
}
```

**Step 3: Add `@starting-style` for native popover support**

In app.css, find the `[popover]:popover-open` block (around line 5042-5060) and add:

```css
    @starting-style {
        [popover]:popover-open {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
        }
    }
```

**Step 4: Verify**

Tap "More" nav item. Backdrop should fade in with blur. Popover menu should slide in smoothly. Tap outside — both should fade out.

**Step 5: Commit**

```bash
git add src/styles/app.css
git commit -m "style: animated backdrop blur for popover menu"
```

---

## Task 7: Tuner Polish — Needle Depth & Note Pill Micro-animation

**Context:** Tuner needle at line 1469-1476. Note pill at lines 1384-1407. In-tune state at lines 1483-1502. The needle already has `drop-shadow` but we can enhance the in-tune note pill with a pop animation.

**Files:**
- Modify: `src/styles/app.css:1383-1407` (note pill)
- Modify: `src/styles/app.css:1483-1497` (in-tune state)

**Step 1: Add note-pill animation keyframe. Add after `@keyframes in-tune-glow` block (~line 1502):**

```css
    @keyframes note-pill-pop {
        0% { transform: scale(1); }
        40% { transform: scale(1.06); }
        70% { transform: scale(0.98); }
        100% { transform: scale(1); }
    }
```

**Step 2: Add `transition` to `.tuner-note-pill` so it feels responsive on note detection**

Find `.tuner-note-pill` at line 1384. Add `transition`:

Old ends with:
```css
        display: grid;
        gap: 2px;
    }
```

New:
```css
        display: grid;
        gap: 2px;
        transition: box-shadow var(--duration-fast) var(--ease-out);
    }
```

**Step 3: Enhance in-tune state on note pill (add to `#tuner-live.in-tune` block)**

After the existing `#tuner-live.in-tune .tuner-note` and `#tuner-live.in-tune .tuner-needle` rules, add:

```css
    #tuner-live.in-tune .tuner-note-pill {
        box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.9),
            0 10px 24px rgba(49, 208, 160, 0.3);
        animation: note-pill-pop var(--duration-normal) var(--ease-bounce) both;
    }
```

**Step 4: Enhance needle drop shadow when not in-tune**

The needle at line 1469 already has `filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3))`. This is fine — no change needed.

**Step 5: Add cents bounce when in-tune**

Find `.tuner-cents` at line 1511. Add rule below it:

```css
    #tuner-live.in-tune .tuner-cents {
        color: var(--color-success);
        animation: note-pill-pop var(--duration-normal) var(--ease-bounce) both;
        font-weight: 800;
    }
```

**Step 6: Verify**

Start tuner, hold a violin string near a note. When in-tune: note pill should pop-scale briefly, cents text turns green and pops, needle glows green. Feels satisfying.

**Step 7: Commit**

```bash
git add src/styles/app.css
git commit -m "style: tuner note pill pop animation on in-tune detection"
```

---

## Task 8: Button Tap Targets & Disabled State

**Context:** `.btn-sm` (line 762-766) has no explicit `min-height`. `.btn` has `min-height: 44px`. On iPad, 52px is more comfortable. Disabled state is only `opacity: 0.55` (line 713-719).

**Files:**
- Modify: `src/styles/app.css:705-719` (btn + disabled)
- Modify: `src/styles/app.css:762-766` (btn-sm)

**Step 1: Add `min-height: 44px` to `.btn-sm` (line 762-766)**

Old:
```css
    .btn-sm {
        padding: var(--space-2) var(--space-3);
        font-size: var(--text-sm);
        border-radius: var(--radius-md);
    }
```

New:
```css
    .btn-sm {
        padding: var(--space-2) var(--space-3);
        font-size: var(--text-sm);
        border-radius: var(--radius-md);
        min-height: 44px;
    }
```

**Step 2: Enhance disabled state (lines 713-719)**

Old:
```css
    .btn:disabled,
    .btn[aria-disabled="true"] {
        opacity: 0.55;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }
```

New:
```css
    .btn:disabled,
    .btn[aria-disabled="true"] {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
        background-image: repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 4px,
            rgba(255, 255, 255, 0.12) 4px,
            rgba(255, 255, 255, 0.12) 6px
        );
    }
```

**Step 3: Verify**

Open tuner view. "Stop" button is disabled — it should show a subtle diagonal stripe pattern over the coral background, clearly communicating unavailability. Tap target for `.btn-sm` buttons should be at least 44px tall.

**Step 4: Commit**

```bash
git add src/styles/app.css
git commit -m "style: btn-sm min-height 44px, disabled stripe pattern"
```

---

## Task 9: Typography — Cap Fluid Scale at iPad + Muted Text Contrast

**Context:** `--text-2xl: clamp(1.5rem, 5vw, 2rem)` — at 820px, 5vw = 41px. That's too large. And `--color-text-muted: #553628` may be borderline contrast on warm cream. Fix both.

**Files:**
- Modify: `src/styles/app.css` — add media query in `@layer tokens` to override type scale
- Modify: `src/styles/app.css:126` — `--color-text-muted`

**Step 1: Update `--color-text-muted` at line 126**

Old:
```css
        --color-text-muted: #553628;
```

New:
```css
        --color-text-muted: #4A2E20;
```

**Step 2: Add tablet type scale overrides inside `@layer tokens`**

Find the closing `}` of `@layer tokens` (the `:root { ... }` block ends around line 280). The layer itself closes after that. Add a media query inside `@layer tokens`, after the existing `:root` block:

```css
@layer tokens {
    /* ... existing :root ... */

    @media (min-width: 768px) {
        :root {
            /* Cap fluid type at iPad viewport to prevent oversizing */
            --text-2xl: 1.75rem;
            --text-3xl: 2.25rem;
        }
    }
}
```

Note: Find the exact line where `@layer tokens {` closes and insert before it.

**Step 3: Add letter-spacing to Fraunces display headings**

Find `.home-title` at line 831 and add `letter-spacing`:

Old:
```css
    .home-title {
        font-family: var(--font-display);
        font-size: clamp(2.2rem, 7vw, 3.2rem);
        letter-spacing: 0.015em;
```

New:
```css
    .home-title {
        font-family: var(--font-display);
        font-size: clamp(2.2rem, 7vw, 3.2rem);
        letter-spacing: -0.01em;
```

**Step 4: Verify**

At 820px width: home title and section headings should not oversize. Muted text (subtitles, helper text) should read with more clarity.

**Step 5: Commit**

```bash
git add src/styles/app.css
git commit -m "style: cap fluid type at tablet, improve muted text contrast"
```

---

## Task 10: Navigation Active Glow & Corner Mascot Entry Animation

**Context:** Nav active state at lines 1289-1309. Corner mascot at lines 4494-4505 — bounces continuously, but no entry animation. Add coral glow to active nav, and a `mascot-peek` entry on view load.

**Files:**
- Modify: `src/styles/app.css:1289-1313` (nav active + transition)
- Modify: `src/styles/app.css:4494-4505` (corner mascot)

**Step 1: Add glow to active nav items**

Find the active nav CSS at line 1289. The selector block applies `background`, `color`, `font-weight`, `transform`. Add `box-shadow`:

Old (line 1296-1301):
```css
        background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
        color: white;
        font-weight: 800;
        transform: translateY(-2px);
        text-shadow: 0 1px 4px rgba(65, 32, 20, 0.35);
    }
```

New:
```css
        background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
        color: white;
        font-weight: 800;
        transform: translateY(-2px);
        text-shadow: 0 1px 4px rgba(65, 32, 20, 0.35);
        box-shadow: 0 4px 14px rgba(233, 86, 57, 0.38);
    }
```

Apply the same change to `.nav-item.is-active` at line 1303-1309:

Old:
```css
    .nav-item.is-active {
        background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
        color: white;
        font-weight: 800;
        transform: translateY(-2px);
        text-shadow: 0 1px 4px rgba(65, 32, 20, 0.35);
    }
```

New:
```css
    .nav-item.is-active {
        background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
        color: white;
        font-weight: 800;
        transform: translateY(-2px);
        text-shadow: 0 1px 4px rgba(65, 32, 20, 0.35);
        box-shadow: 0 4px 14px rgba(233, 86, 57, 0.38);
    }
```

**Step 2: Add smooth transition to `.nav-item`**

Find line 1283: `transition: all var(--duration-fast);`

Change to:
```css
        transition: background var(--duration-normal) var(--ease-out),
                    color var(--duration-normal) var(--ease-out),
                    box-shadow var(--duration-normal) var(--ease-out),
                    transform var(--duration-fast) var(--ease-out);
```

**Step 3: Add `@keyframes mascot-peek` and update `.corner-mascot`**

Add keyframe near `@keyframes bounce` (line 852):

```css
    @keyframes mascot-peek {
        0% { opacity: 0; transform: translateY(20px) scale(0.85); }
        60% { transform: translateY(-6px) scale(1.04); }
        80% { transform: translateY(2px) scale(0.99); }
        100% { opacity: 0.8; transform: translateY(0) scale(1); }
    }
```

Update `.corner-mascot` at line 4494-4505:

Old:
```css
    .corner-mascot {
        position: fixed;
        bottom: 100px;
        right: var(--space-4);
        width: 80px;
        height: 80px;
        aspect-ratio: 1 / 1;
        object-fit: contain;
        opacity: 0.8;
        pointer-events: none;
        animation: bounce 3s ease-in-out infinite;
    }
```

New:
```css
    .corner-mascot {
        position: fixed;
        bottom: 100px;
        right: var(--space-4);
        width: 80px;
        height: 80px;
        aspect-ratio: 1 / 1;
        object-fit: contain;
        pointer-events: none;
        opacity: 0;
        animation: mascot-peek 0.7s var(--ease-bounce) 0.6s both,
                   bounce 3s ease-in-out 1.5s infinite;
    }
```

**Step 4: Verify**

Tap different nav items — active item should glow coral under its pill, transition is smooth (no jarring flash). Navigate to Games view — corner mascot peeks in from bottom-right after 600ms delay.

**Step 5: Commit**

```bash
git add src/styles/app.css
git commit -m "style: coral glow on active nav, mascot peek-in entry animation"
```

---

## Final Verification

After all 10 tasks:

```bash
npm run lint
npm test
```

**Manual iPad mini (820px) checklist:**
- [ ] Home: feature grid 4-col, breathing room, title not oversized
- [ ] Nav: coral glow on active tab, smooth transitions, 60px min-height items
- [ ] Trainer: custom branded slider thumb, fill tracks drag position
- [ ] Progress: XP bar shimmer, recent games empty state with mascot + CTA
- [ ] Games: 4-col grid, corner mascot peeks in after 600ms
- [ ] Tuner: in-tune shows green note pill pop + cents animation
- [ ] "More" menu: backdrop fades in with blur
- [ ] Disabled "Stop" button: shows stripe pattern, not just opacity
- [ ] Skeleton: coral-tinted wave pulse (visible during view load)
- [ ] No lint errors, no test regressions
