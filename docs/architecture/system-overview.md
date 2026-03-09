# System Overview

This app is a local-first violin practice PWA built with Vite, React 19, and React Router 7. The runtime is intentionally hybrid: React owns the shell and most user-facing views, while selected legacy HTML/WASM runners remain embedded where preserving shipped audio/game behavior is more important than rewriting the surface.

## Runtime Shape

- `index.html` provides document metadata, global dialogs, `#react-root`, and shared overlay containers
- `src/app.jsx` boots the React app into `#react-root`
- `src/AppShell.jsx` owns shell chrome, `#main-content`, route-level suspense, and the legacy hash compatibility bridge
- `src/routes.jsx` defines the pathname routing tree with `createBrowserRouter()`
- `src/views/` holds the native React experience surfaces for Home, hubs, parent flows, settings, and support views
- `GameRunnerView.jsx` selects per-game React wrappers; many of those wrappers render `LegacyGameView.jsx`, which loads legacy markup from `public/views/games/`
- `SongRunnerView.jsx` loads legacy song runner HTML from `public/views/songs/`
- `src/app/module-registry.js` and `src/app/legacy-view-runtime.js` still hydrate the remaining DOM-bound helper modules that attach by legacy `view-*` id
- low-priority runtime preloads still flow through the idle-task path to keep startup contention down

## Source Of Truth

- App bootstrap: `index.html` and `src/app.jsx`
- Shell and legacy-hash bridge: `src/AppShell.jsx`
- Pathname routing: `src/routes.jsx`
- Native route surfaces: `src/views/`
- Legacy game embedding: `src/views/Games/GameRunnerView.jsx`, `src/views/Games/LegacyGameView.jsx`, and `public/views/games/`
- Legacy song runner embedding: `src/views/Songs/SongRunnerView.jsx` and `public/views/songs/`
- DOM-bound legacy module hydration: `src/app/module-registry.js` and `src/app/legacy-view-runtime.js`

## Maintainer Guidance

- If a new route or view is added, update the relevant React route/view docs in the same PR
- If a legacy DOM-bound module is added or removed, update the module-registry/runtime notes here
- Keep human docs focused on behavior and ownership; use the source files above for exact inventory
- Do not document view counts here; they drift too quickly
