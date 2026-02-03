# Modernization Audit Map (iPad mini 6 • iPadOS 26.2)

## Scope & Targets
- Primary device: iPad mini 6th gen (A15), Safari 26.2.
- Goal: Minimize JS, maximize native HTML/CSS and platform APIs, retain offline-first behavior.
- Success: Offline deterministic, installable PWA, smooth UI at 60fps, stable audio pipeline.

## Audit Map

**App Shell & Navigation**
- Files: `index.html`, `src/app.js`, `src/styles/app.css`
- Native-first targets: Navigation API for routing, `command/commandfor` for built-in dialog/popover controls, view transitions for native-feel navigation, CSS `scroll-timeline` where possible.
- Risks: Hash navigation and manual focus management can drift as views grow.

**Settings & Diagnostics**
- Files: `index.html`, `src/core/platform/capability-registry.js`, `src/core/platform/performance-mode.js`
- Native-first targets: Capability registry surfaced in settings, device-aware performance toggles, CSS `@supports` for visual gating.
- Risks: Capability checks can become stale without a registry.

**Offline Core**
- Files: `public/sw.js`, `src/core/platform/offline-integrity.js`, `src/core/platform/offline-mode.js`
- Native-first targets: Cache-first for static assets, offline self-test, navigation preload, clean cache trim rules, persistent storage request.
- Auto-repair cached lesson packs on refresh/activate.
- Risks: Cache eviction by WebKit, cold-start offline misses.

**Persistence & Storage**
- Files: `src/core/persistence/storage.js`, `src/core/ml/feature-store.js`
- Native-first targets: IndexedDB-first for user data, storage persist requests, local-first sync queues.
- Integrity checksums for JSON values with repair signals.
- Risks: Large data (audio clips) could pressure storage limits.

**Audio + Worklets**
- Files: `src/core/worklets/tuner-processor.js`, `src/features/tuner/tuner.js`, `src/features/recordings/recordings.js`
- Native-first targets: AudioWorklet for low-latency analysis, avoid main-thread DSP, handle suspended contexts.
- Audio budget monitor to detect sustained overload and trigger fallback.
- Risks: Audio pipeline regressions if feature detection is incomplete.

**Games Hub & Metrics**
- Files: `src/features/games/game-hub.js`, `src/features/games/game-metrics.js`
- Native-first targets: Reduce DOM thrash by using templates + minimal updates, use `requestAnimationFrame` for UI updates that are animation-bound.
- Risks: Frequent updates can create jank on low power mode.

**Coach & Focus Tools**
- Files: `src/features/coach/focus-timer.js`, `src/features/coach/lesson-plan.js`, `src/features/coach/coach-actions.js`
- Native-first targets: Use CSS timers/animations where feasible, keep JS timers lightweight, use `scheduler.postTask` for background save.
- Risks: Timer accuracy vs power tradeoffs.

**Trainer & Posture**
- Files: `src/features/trainer/tools.js`
- Native-first targets: Replace JS hover/tooltip logic with anchor positioning, reduce motion toggles via CSS only.
- Risks: Accessibility and focus handling.

**Adaptive Learning + ML**
- Files: `src/core/ml/*`
- Native-first targets: WebGPU / WASM feature flagging, on-device inference only when perf mode is high, background scheduling for data processing.
- Risks: Complex ML pipelines blocking UI if not scheduled.

**Install & Manifest**
- Files: `manifest.webmanifest`, `src/core/platform/install-guide.js`
- Native-first targets: Native install prompts, minimal JS for install guide, `command/commandfor` to open/close dialogs.
- Risks: Installation flow inconsistency across Safari modes.

**Styling & Layout**
- Files: `src/styles/app.css`, `src/styles/scroll-animations.css`, `src/styles/tokens.css`
- Native-first targets: Container queries, CSS anchor positioning, `field-sizing` for auto inputs, scroll-driven animations.
- Risks: Fallbacks must exist for unsupported CSS.

## Immediate Refactor Candidates (Top 3)

1. **Navigation API adoption**
- Files: `src/app.js`, `index.html`
- Why: Removes hash-based routing glue, simplifies navigation transitions and history management.
- JS reduction: High

2. **HTML `command/commandfor` for popover + dialog control**
- Files: `index.html`, `src/app.js`, `src/core/platform/install-guide.js`, `src/features/parent/pin.js`
- Why: Replace JS click handlers for open/close with native command wiring.
- JS reduction: Medium

3. **CSS-first input sizing + tooltip anchoring**
- Files: `index.html`, `src/styles/app.css`
- Why: Replace JS layout calculations with `field-sizing` and anchor positioning.
- JS reduction: Medium

## Status Update (February 3, 2026)
- Added Navigation API view change utility and migrated view listeners to `onViewChange`.
- Added WASM GameTimer wrapper and wired Rhythm Dash to use it with JS fallback.
- Ported skill-profile rules into Rust (`apply_practice_event`) with JS fallback.
- Rebuilt wasm artifacts and added a smoke test for the new export.
- Added audio budget monitor for tuner fallback gating.
- Added storage integrity checksums for IndexedDB values.
- Added auto-repair for cached lesson packs in the service worker.
