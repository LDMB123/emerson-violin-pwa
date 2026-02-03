# Project Context (Token-Optimized)

- Product: Panda Violin PWA for children, offline-first, Red Panda coach, iPadOS 26.2 focus
- Runtime: Vite + vanilla ES modules, Web Audio API, AudioWorklet, WebAssembly (panda_core, panda_audio)
- Entry points: `index.html`, `src/app.js`
- Storage: IndexedDB KV + blob store in `src/core/persistence/storage.js`
- Service worker: `public/sw-assets.js` (dev) and `dist/sw-assets.js` (build), `sw.js` registered in `src/app.js`
- Styles: design tokens in `src/styles/tokens.css`, main styles in `src/styles/app.css`
- Song data: `src/data/songs.json` → `scripts/build/build-songs-html.js` injects song views into `index.html`
- Core layout: `src/core/` platform/persistence/ml/utils/audio/worklets/wasm, `src/features/` coach/games/trainer/tuner/songs/progress/analysis/parent/backup/notifications/recordings
- WASM sources: `wasm-src/` Rust crates for `panda-core` + `panda-audio`
- Commands: `npm run dev`, `npm run build`, `npm run preview`, `npm test`, `npm run lint`
- Token hints: read `docs/ai/FILE_MAP.md` before scanning repo; skip large assets unless task needs them
- Docs: `docs/README.md` for doc overview
- Archive: `docs/ARCHIVE_POLICY.md`
- Docs assets: `docs/assets/README.md`
