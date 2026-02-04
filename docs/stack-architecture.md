# Stack Rebuild Architecture (Shell)

## Target Runtime
- macOS 26.2 on Apple Silicon (primary)
- Chromium 143+ only (desktop-first, no legacy fallbacks)

## First-Principles Constraints
- HTML/CSS-first UI with minimal JS glue (Trunk loader only).
- Rust/WASM owns runtime logic (sessions, tools, storage, PWA UX).
- Keep runtime dependencies near-zero.
- Offline support via service worker.

## Structure
- `index.html` HTML-first shell + Trunk hooks
- `rust/` Rust/WASM modules (dom, storage, session, flow, tuner, metronome, recorder, ML, PWA)
- `Cargo.toml` + `Trunk.toml` build config
- `src/styles/` design tokens + shell UI
- `public/` static assets + `public/sw.js` + `public/offline.html`
- Build output: `dist/emerson-violin-pwa.js` loader + `dist/emerson-violin-pwa_bg.wasm` + bundled CSS/assets

## Native APIs & Modern CSS
- View Transitions + CSS anchor positioning
- Native `popover` + `dialog` commands
- WebGPU readiness (Chromium 143)
- CSS `color-mix`, `@layer`, `:has`, scroll-driven animations

## Offline Strategy
- Precache shell assets via `scripts/build/build-sw-assets.js`
- Cache-first for static assets
- Network-first for document navigation with offline fallback

## Local State
- Preferences: localStorage (`shell:preferences`)
- Install dismissal: localStorage (`shell:install-dismissed`)

## Performance Budgets (gzip)
- Enforced in `scripts/build/budgets.json`
