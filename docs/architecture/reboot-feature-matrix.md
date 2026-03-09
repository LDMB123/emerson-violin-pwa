# React Reboot Feature Matrix

> Historical migration tracker. This file is retained as reboot context, not as the live source of truth for routes, feature inventory, or runtime ownership. Use `system-overview.md`, `feature-surface.md`, and `docs/HANDOFF.md` for current behavior.

This matrix tracks the migration of features from the Vanilla JS/HTML shell to the native React 19 architecture. Every feature from the legacy application must be accounted for here, with its final status documented.

| Category | Feature | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Shell & Routing** | Hash Navigation | **Deferred** | Replaced entirely by React Router (`createHashRouter`). Legacy `#view-*` hashes are intercepted and rewritten at boot for backwards compatibility. |
| | Eager/Idle Module Loading | **Parity-Plus** | `module-registry.js` retained as the bridge for legacy module initialization, wrapped cleanly by React Router dynamic suspense logic and View Loaders. |
| | App Shell UI | **Parity-Plus** | Fully rebuilt natively in `AppShell.jsx` including Bottom Nav, Parent Lock gate, and responsive CSS Modules. |
| | Service Worker / Offline | **Parity-Plus** | Preserved the highly-customized `sw.js` and `offline-integrity-cache.js` setup. React SPA chunks are now successfully served offline. |
| **Core Flow** | Home Screen / Missions | **Parity-Plus** | Migrated to `HomeView.jsx`. Curriculum engine hooks added via `useProgressSummary()`. |
| | Practice Runner | **Parity-Plus** | Migrated to `CoachView.jsx`. Timer, progress bar, Red Panda speech all fully React Native. |
| | Onboarding Flow | **Parity-Plus** | 5-step carousel wizard rebuilt natively in React with explicit Child Name saving and Install Education prompts. |
| | Wins / Progress | **Parity-Plus** | Native `WinsView.jsx` handles all streaks and trophy tracking. |
| **Catalogs** | Game Selector | **Parity-Plus** | `GamesView.jsx` natively filters by tags and difficulty curves with Red Panda empty states. |
| | Song Selector | **Parity-Plus** | `SongsView.jsx` handles sheet music catalog and recording options. |
| | Live Game Runner | **Parity-Plus** | `GameRunnerView.jsx` and `SongRunnerView.jsx` mount the legacy WASM/Canvas files seamlessly within standard React `useEffect` lifecycles. |
| **Tools** | Tools Hub | **Parity-Plus** | `ToolsHubView.jsx` orchestrates tuner, metronome, drone strings, bowing, and posture. |
| | Audio Tuner | **Parity-Plus** | WASM Pitch detector runs flawlessly inside `TunerView.jsx`. |
| | Settings | **Parity-Plus** | `ChildSettingsView.jsx` manages background, sound, text size. |
| **Parent Zone** | Parent Security Gate | **Parity-Plus** | Native React PIN pad logic in `ParentView.jsx`. |
| | Data Exports | **Parity-Plus** | All CSV logs, checklists, and WASM metrics export natively from React panels. |
| | Offline Diagnostics | **Parity-Plus** | Web Vitals and App Badge checks preserved and integrated directly into the `app.jsx` initialization sequence. |
