# Target Architecture State: React 19 SPA

> Historical migration snapshot. This file captures the intended end-state during the reboot project. For current routing, shell ownership, and runtime behavior, use `system-overview.md`, `feature-surface.md`, `offline-and-persistence.md`, and `audio-and-realtime.md`.

This document defines the final architectural shape of the Panda Violin PWA after completing the React 19 migration (Phases 1-9).

## 1. Core Shell & Routing
The legacy custom hash-router and vanilla DOM manipulation have entirely been replaced by **React Router 7**. All navigation actions now trigger React state changes within `AppShell.jsx`.
- **Legacy URL preservation:** A pre-React execution script in `src/app.jsx` intercepts old `#view-xyz` URLs and maps them to standard React Router hashes (`#/xyz`). This ensures that user bookmarks and installed PWA shortcuts do not 404.
- **Service Worker integration:** The custom `sw.js` remains largely untouched, preserving its excellent offline caching strategy, while `web-vitals.js` and `badging.js` APIs initialize inside the `whenReady` callback of the new React shell.

## 2. Shared Interface Tokens
The CSS-First philosophy remains, meaning all complex animations and layout mechanics are CSS driven.
- **Global CSS Modules:** `app.css` retains all variables and overarching typography. Component specific styles use CSS Modules.
- **Glassmorphism:** Heavily leveraged across the application (e.g., `NavBars`, `Cards`, `Popovers`) for a premium iOS feel without JavaScript overhead.

## 3. Native Views vs. Legacy Modules
To guarantee zero regressions in the critical audio and canvas pipelines, the app observes a strict boundary:
- **100% Native UIs:** All menus, progress tracking, catalogs (Songs, Games), parent controls, onboarding flows, and settings are written entirely in React JSX using modern React Hooks.
- **Legacy Runners:** The realtime audio logic and HTML5 Canvas gameloops remain in their optimized Vanilla JS context. They are brought into the React tree via `GameRunnerView.jsx` and `SongRunnerView.jsx`. These "Runner" components fetch the legacy HTML DOM nodes and execute the legacy WASM initialization entirely within a `useEffect` lifecycle hook. This ensures exact behavior parity with the previous app version, while benefiting from the React Router transition systems.

## 4. State Management
- **Persistence:** All state reads/writes use the async IndexedDB wrappers living in `src/persistence`. React components manage local UI state using `useState`, but synchronize core data (Streaks, Child Name, Checklists) directly to IndexedDB.
- **Global Context:** App-wide preferences (like Theme or Sound) are provided via `UserPreferencesContext.jsx` and `HardwareCapabilitiesContext.jsx`.

## 5. Deployment
The repository is fully built through Vite via `npm run build`, outputting standard static assets into `dist/`. `npm run preview` validates the PWA locally. The repository continues to be zero configuration for the end user and functions completely offline under iPadOS 26.
