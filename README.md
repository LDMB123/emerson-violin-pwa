# Panda Violin PWA

A local-first violin teaching Progressive Web App for children, featuring a Red Panda coach and optimized for iPadOS 26.2.

## Overview

Interactive violin teaching application designed for young learners with:
- Red Panda mascot coach
- Local-first architecture (works offline)
- Safari 26.2 / iPadOS 26.2 optimization
- iPad mini (6th generation) tested and optimized
- Progressive Web App capabilities

## Project Structure

```
emerson-violin-pwa/
├── src/              # Application source code
├── public/           # Static assets
├── tests/            # Test suites
├── wasm/             # WebAssembly modules
├── scripts/          # Build scripts
│   ├── build-songs-html.js
│   └── build-sw-assets.js
├── docs/             # Reports and QA notes
│   └── reports/qa/    # QA plans and issue logs
├── _archived/         # Legacy assets
├── manifest.webmanifest
└── index.html
```

## Features

- **Offline-First**: Works without internet connection
- **PWA**: Installable on devices
- **WebAssembly**: High-performance audio processing with Rust
- **Safari Compatible**: Tested on Safari 26.2 / iPadOS 26.2
- **iPad Optimized**: Specifically tuned for iPad mini (6th generation)
- **Safe Harbor Fullscreen**: Custom fullscreen implementation for Safari
- **Optimized Assets**: Automatic audio compression (Opus/MP3) and font subsetting reduce bundle size by 1.4 MB
- **Testing**: Comprehensive test suite with Playwright + Vitest

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint source
npm run lint

# Run tests
npm test

# Watch mode testing
npm run test:watch

# Run iPad Safari QA suite
npx playwright test tests/e2e

# Preview production build
npm run preview
```

## Technologies

- **Build**: Vite 6.0
- **Testing**: Vitest + Playwright
- **Service Worker**: Custom offline-first implementation
- **Audio**: WebAssembly for performance

## Requirements

- Node.js >= 20.0.0
- Modern browser with PWA support
- For full experience: Safari 26.2+ / iPadOS 26.2+
- Recommended device: iPad mini (6th generation) or newer

## Scripts

- `predev` / `prebuild`: Builds song HTML and service worker assets
- `prebuild` (production): Runs asset optimizations (audio, fonts, images)
- `postbuild`: Updates service worker with dist assets
- `scripts/qa-screenshots.mjs`: Captures iPad Safari QA screenshots (WebKit)
- All builds automatically generate required static content

## Asset Optimization

Production builds automatically optimize assets:
- **Audio**: WAV → Opus (primary) + MP3 (fallback) for 86% size reduction
- **Fonts**: Variable fonts subset to Basic Latin + music notation for 94% size reduction
- **Images**: PNG → WebP conversion with fallback support

See `docs/guides/asset-optimization.md` for details.

## Status

Version 2.0.0 - Production ready
