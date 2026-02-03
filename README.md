# Panda Violin PWA

Local-first violin teaching PWA for children with a Red Panda coach, optimized for iPadOS 26.2.

## Quick Start

```bash
npm install
npm run dev
```

## Commands

- `npm run dev` development server
- `npm run build` production build
- `npm run preview` preview build
- `npm test` run unit tests
- `npm run lint` lint JS

## Structure

- `src/app.js` app boot + view-based module loading
- `src/core/` platform, persistence, ML, utils, audio, worklets, WASM
- `src/features/` coach, games, trainer, tuner, songs, progress, analysis, parent, backup, notifications, recordings
- `src/data/songs.json` song data source
- `public/assets/` images, audio, icons, mockups, badges, illustrations
- `docs/` reports + AI context pack
- `docs/strategy/` architecture + modernization plans

## AI Context

- `docs/ai/FAST_PATH.md`
- `docs/ai/PROJECT_CONTEXT.md`
- `docs/ai/FILE_MAP.md`
- `docs/ai/IGNORE.md`
