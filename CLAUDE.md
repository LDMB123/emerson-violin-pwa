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

For QA checks:

```bash
npm run lint
npm test
npx playwright test tests/e2e
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

## Worktree Notes (2026-02-28)

- E2E runs should account for onboarding-first behavior on fresh contexts.
- Audio source rewriting now occurs after each view render in `showView()`.
- Idle module imports are staggered with `requestIdleCallback` fallback to reduce startup contention.
- Sharing fallback logic is centralized via `tryShareFile()` in `src/utils/recording-export.js`.
- Known transitive duplicate versions are intentionally allowlisted in `scripts/audit-dependency-duplicates.mjs`.
- Secret leak pattern scanning is enforced by `scripts/audit-secrets.mjs`.
- Perf budget workflow consistency is validated by `scripts/audit-performance-budget-config.mjs`.
- CI quality guard is defined in `.github/workflows/quality.yml`.
- Zero-context pickup runbook is in `docs/HANDOFF.md`.
- Games use `src/games/canvas-engine-base.js` as shared base for canvas-driven games (Dynamic Dojo, Echo, Stir Soup, Wipers).
- Song library expanded: 21 playable song sheets under `public/views/songs/`.
- CSS dead code pass removed unused variables/classes; remaining CSS is auditable via `scripts/find-dead-css-vars.mjs`.
- All game views use full-bleed immersive layout (no bottom-nav overlap).
- Coach speech bubble is connected via `data-progress="coach-speech"` + `.coach-bubble-text` in `coach.html`.
- `formatCountdown` (Math.ceil variant) is exported from `session-timer.js`; focus-timer imports it instead of a private copy.
- Coach module-level listeners (coach-actions, mission-progress-listeners) are permanent singletons guarded by `listenersBound` / `globalListenersBound` flags — teardown not needed.
- `mission-progress-render.js` anchors reference `.coach-kid-layout` (coach view) and `.home-giant-actions` (home view).

## Report Writing Standards

When writing reports:
- Use bullet points, not paragraphs
- No introductions or conclusions
- Technical shorthand allowed (e.g., "impl" for implementation)
- Omit articles (a, the) where meaning is clear
- No filler phrases ("it's important to note that...")
