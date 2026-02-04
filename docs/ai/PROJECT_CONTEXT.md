# Project Context (Token-Optimized)

- Product: Emerson Violin Studio command center (PWA)
- Runtime: HTML/CSS shell + Rust/WASM logic; JS is only the Trunk loader (`dist/emerson-violin-pwa.js`)
- Target: Chromium 143 on macOS 26.2 (Apple Silicon)
- Entry points: `index.html`, `Cargo.toml`, `rust/lib.rs`
- UI model: anchored sections (`#overview`, `#flow`, `#studio`, `#ml`, `#core`, `#support`, `#controls`) with top nav
- Preferences: localStorage (`shell:preferences`)
- Install UX: localStorage (`shell:install-dismissed`)
- Service worker: `public/sw-assets.js` (dev), `dist/sw-assets.js` (build), `public/sw.js`
- Styles: tokens in `src/styles/tokens.css`, command-center styles in `src/styles/app.css`
- Docs: `docs/rebuild/05-architecture.md` architecture
- Commands: `npm run dev`, `npm run build`, `npm run preview`, `npm test`
