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
npm run audit:full # Full local quality gate (lint + dead code + deps + tests + build)
npm run handoff:verify # Full gate + E2E for handoff
```

## Project Overview

Violin tuner PWA with real-time pitch detection using Web Audio API.

## Key Technologies

- Framework: Vite 6 + vanilla JavaScript (ES modules)
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

## Worktree Notes (2026-02-18)

- E2E runs should account for onboarding-first behavior on fresh contexts.
- Audio source rewriting now occurs after each view render in `showView()`.
- Idle module imports are staggered with `requestIdleCallback` fallback to reduce startup contention.
- Sharing fallback logic is centralized via `tryShareFile()` in `src/utils/recording-export.js`.
- Known transitive duplicate versions are intentionally allowlisted in `scripts/audit-dependency-duplicates.mjs`.
- CI quality guard is defined in `.github/workflows/quality.yml`.
- Zero-context pickup runbook is in `docs/HANDOFF.md`.

## Report Writing Standards

When writing reports:
- Use bullet points, not paragraphs
- No introductions or conclusions
- Technical shorthand allowed (e.g., "impl" for implementation)
- Omit articles (a, the) where meaning is clear
- No filler phrases ("it's important to note that...")
