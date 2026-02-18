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
npm run lint     # Run linter
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

Check package.json and src/ directory for current structure.

## Report Writing Standards

When writing reports:
- Use bullet points, not paragraphs
- No introductions or conclusions
- Technical shorthand allowed (e.g., "impl" for implementation)
- Omit articles (a, the) where meaning is clear
- No filler phrases ("it's important to note that...")
