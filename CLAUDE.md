# Emerson Violin PWA

Progressive Web App for violin tuning and practice assistance.

## Quick Start

```bash
npm install
npm run dev    # Development server
npm run build  # Production build
npm run preview # Preview build
```

## Project Overview

Violin tuner PWA with real-time pitch detection using Web Audio API.

## Key Technologies

- Framework: [Tech stack TBD - check package.json]
- Audio: Web Audio API
- PWA: Service Workers, Web App Manifest

## Common Commands

```bash
npm run dev      # Start development
npm run build    # Build for production
npm run lint     # Run linter
npm run type-check # TypeScript validation
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
