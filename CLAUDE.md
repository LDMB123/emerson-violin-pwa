# Emerson Violin PWA

## Project Scope

**This project is ONLY the Emerson Violin PWA.** Do not reference, suggest, or pull context from any other project in this workspace (dmb-almanac, blaires-kind-heart, imagen-experiments, gemini-mcp-server). All work here is scoped exclusively to this repository. The Rust/WASM modules under `wasm/` (panda-audio, panda-core) belong to this project, not dmb-almanac.

Progressive Web App for violin tuning and practice assistance.

## Quick Start

```bash
npm install
npm run dev    # Development server
npm run build  # Production build
npm run lint   # Lint source files
npm run preview # Preview build
npm run audit:full # Full local quality gate
npm run handoff:verify # Full gate + E2E for handoff
```

## Project Overview

Violin tuner PWA with real-time pitch detection using Web Audio API.

## Key Technologies

- Framework: Vite 7 + vanilla JavaScript (ES modules)
- Audio: Web Audio API
- PWA: Service Workers, Web App Manifest
- Browser Target: Modern evergreen browsers (Chrome, Firefox, Safari) — no legacy IE/Edge fallbacks

## Common Commands

```bash
npm run dev      # Start development
npm run build    # Build for production
npm run test     # Run unit tests
npm run test:e2e # Run Playwright E2E tests
npm run lint     # Run linter
npm run lint:all # Lint src + scripts + tests
npm run audit:deadcode # Unused file/export/dependency scan
npm run audit:deps # Duplicate dependency scan with allowlist
npm run audit:secrets # Secret/credential leak pattern scan across tracked files
npm run audit:perf:config # Validate perf budget/workflow env consistency
npm run audit:full # Full pre-handoff/pre-merge quality gate
npm run handoff:status # Print branch/commit/env snapshot
npm run handoff:verify # audit:full + E2E
```

## Gotchas

- **Web Audio API**: Requires HTTPS or localhost
- **Microphone permission**: Prompt user before accessing
- **Audio context**: Must be created after user gesture
- **PWA install**: Requires HTTPS and valid manifest

## Architecture

- App shell + nav in `index.html`, view content injected into `#main-content`
- Lazy view HTML loaded from `public/views/**` via `src/views/view-loader.js`
- View visibility is controlled with `.view.is-active` (JS-applied on render)
- Persistence is IndexedDB-first (`src/persistence/storage.js`) with localStorage fallback

## Worktree Notes

- AudioContext can enter `'interrupted'` state on iOS (phone calls, system audio) — handle alongside `'suspended'` in `src/audio/tone-player/context-manager.js`.
- Safari 26+ removed `window.orientationchange` — use `screen.orientation.addEventListener('change', ...)` with `{ passive: true }` fallback for older browsers.
- Safari 26+ freezes OS version in UA string — `parseIPadOSVersion()` returns stale value; don't display parsed version to users (`ipados-capabilities.js`).
- `Map.getOrInsertComputed(key, fn)` is the established pattern for atomic get-or-create (Safari 26.2+/Chrome 133+); used in module-registry, view-loader, progress-model-primary — always include `supportsGetOrInsertComputed` fallback.
- WASM bindings in `src/wasm/panda_audio.js` follow `{typename}_{methodname}` export naming — mismatches return `undefined` silently; verify with `console.log(wasm)` exports when debugging.
- `[profile.release]` in per-crate `Cargo.toml` (workspace members) is **silently ignored** — release profile must be in `wasm/Cargo.toml` workspace root to take effect.
- WASM rebuild on macOS may fail with "You have not agreed to the Xcode license" — run `sudo xcodebuild -license accept` first; proc-macro build scripts need the native host linker.
- Dead `#[wasm_bindgen]` exports: remove the attribute from functions not called by any JS consumer — LTO will then eliminate them from the binary. Don't just delete the Rust function without first checking JS imports.
- `calculate_streak` (panda-core) returns **trailing** streak — iterates backward from most-recent day and breaks on first gap; it is NOT best-ever. Test mocks must match this semantics (dedup, sort ascending, walk backward, break on gap).
- SW `clients.claim()` must be inside `event.waitUntil()` and awaited — placing it outside causes an activation race (`public/sw.js`).
- Canvas games: `desynchronized: true` on 2D context for GPU compositor independence; avoid `translateZ` values > 0 (creates oversized compositing layers); use `100dvh` not `100vh` for mobile Safari toolbar clearance.
- E2E runs should account for onboarding-first behavior on fresh contexts.
- Audio source rewriting now occurs after each view render in `showView()`.
- Idle module imports are staggered with `requestIdleCallback` fallback to reduce startup contention.
- Sharing fallback logic is centralized via `tryShareFile()` in `src/utils/recording-export.js`.
- Known transitive duplicate versions are intentionally allowlisted in `scripts/audit-dependency-duplicates.mjs`.
- Secret leak pattern scanning is enforced by `scripts/audit-secrets.mjs`.
- Perf budget workflow consistency is validated by `scripts/audit-performance-budget-config.mjs`.
- CI quality guard is defined in `.github/workflows/quality.yml`.
- Zero-context pickup runbook is in `docs/HANDOFF.md`.
- Shipped game views live under `public/views/games/`: Bow Hero, Duet Challenge, Dynamic Dojo, Ear Trainer, Echo, Melody Maker, Note Memory, Pitch Quest, Pizzicato, Rhythm Dash, Rhythm Painter, Scale Practice, Stir Soup, Story Song, String Quest, Tuning Time, Wipers.
- `src/games/sequence-game.js` is a shared runtime factory used by sequence-style games such as `pizzicato.js` and `string-quest.js`; it is not a standalone shipped game view.
- Song library expanded: 21 playable song sheets under `public/views/songs/`.
- CSS dead code pass removed unused variables/classes; remaining CSS is auditable via `scripts/find-dead-css-vars.mjs`.
- All game views use full-bleed immersive layout (no bottom-nav overlap).
- Coach speech bubble is connected via `data-progress="coach-speech"` + `.coach-bubble-text` in `coach.html`.
- `formatCountdown` (Math.ceil variant) is exported from `session-timer.js`; focus-timer imports it instead of a private copy.
- Coach module-level listeners (coach-actions, mission-progress-listeners) are permanent singletons guarded by `listenersBound` / `globalListenersBound` flags — teardown not needed.
- `mission-progress-render.js` anchors reference `.coach-kid-layout` (coach view) and `.home-giant-actions` (home view).
- Canvas engines: `src/utils/canvas-engine.js` (non-game use) stores `this.rafId` and calls `cancelAnimationFrame(this.rafId)` in `stop()` — subclasses must not bypass `stop()`. Game canvases use `src/games/canvas-engine-base.js` which uses `render()` as the RAF callback (self-terminating via `isRunning` guard).
- Game click handlers: extract start-button handlers to a module-level `let handler = null`; call `startBtn.removeEventListener('click', handler)` before re-registering on each `init()` call. Anonymous arrow functions passed to `addEventListener` cannot be `removeEventListener`-ed (new object reference each time) — stacks on every navigate-away + return cycle. Pattern established in `echo.js`, `stir-soup.js`, `wipers.js`.
- `dispose()` scope: module-level `dispose()` can only access module-level refs. Handler refs created inside `init()` are invisible to `dispose()` unless explicitly elevated to module scope with a `let` declaration outside the function.
- `async` flag pattern: `let active = false` at module level, set `true` on start, set `false` first in cleanup. Async callbacks (setTimeout, etc.) check `if (!active) return` before re-registering any listeners. Prevents zombie listeners from delayed callbacks firing after navigation cleanup. Pattern established in `dynamic-dojo.js`.
- `vite.config.js` dev SW: the dev-only `devServiceWorkerPlugin()` is a one-shot cleanup SW — it intentionally calls `self.clients.claim()` BEFORE `self.registration.unregister()`. Do NOT move `clients.claim()` after `unregister()` — by then the SW has already unregistered and `claim()` is a no-op (confirmed by E2E regression).
- `document.activeViewTransition?.skipTransition()` — call before `document.startViewTransition()` to abort any in-flight transition; optional chain is safe no-op on older engines; see `navigation-controller.js` (Safari 26.2+ / Chrome 111+).
- CSS `sibling-index()` — Safari 26.2+ only (no Chrome/Firefox); used in `app.css` for skeleton-bar stagger (`animation-delay: calc(sibling-index() * 80ms)`); replaces `:nth-child` selector stacks.

## Code Style

- No nested/chained ternaries — `a === 'x' ? b : a === 'y' ? c : d` → `let v = d; if (a === 'x') v = b; else if (a === 'y') v = c;`. Code-simplifier enforces this.

## Report Writing Standards

When writing reports:
- Use bullet points, not paragraphs
- No introductions or conclusions
- Technical shorthand allowed (e.g., "impl" for implementation)
- Omit articles (a, the) where meaning is clear
- No filler phrases ("it's important to note that...")
