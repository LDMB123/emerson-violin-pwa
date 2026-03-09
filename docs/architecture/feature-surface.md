# Feature Surface And Ownership

The repo is organized by user-facing experience areas rather than by framework layers. Use this page to locate the right subsystem before editing.

## Primary Areas

- App shell and route composition: `src/AppShell.jsx`, `src/routes.jsx`, `src/app/`
- Native React route surfaces: `src/views/`
- Legacy embedded games and song runner markup: `src/views/Games/`, `src/views/Songs/`, `public/views/games/`, `public/views/songs/`
- Practice game runtime and scoring: `src/games/`
- Songs, playback, and recordings: `src/songs/`, `src/recordings/`, `src/persistence/`
- Tuner and tool experiences: `src/views/Tools/`, `src/audio/`, `src/tuner/`, `src/trainer/`
- Coach and curriculum flows: `src/views/Coach/`, `src/coach/`, `src/curriculum/`
- Parent/review/reporting flows: `src/views/Parent/`, `src/analysis/`, `src/progress/`
- Cross-cutting platform/runtime behavior: `src/platform/`, `src/notifications/`, `src/realtime/`

## How Views Pick Up Behavior

- Pathname routes render React views from `src/views/` via `src/routes.jsx`
- Some React views embed legacy HTML from `public/views/` to preserve shipped game and song behavior
- Game routes typically go through per-game React wrappers and `LegacyGameView.jsx`; song play routes load the legacy song HTML directly in `SongRunnerView.jsx`
- `src/app/module-registry.js` and `src/app/legacy-view-runtime.js` decide which DOM-bound helpers still initialize for a given legacy `view-*` id
- Some runtime helpers are eager at startup for baseline platform/runtime behavior
- Other helpers are intentionally deferred until idle to reduce startup contention

## When To Update Docs

- Add or remove a routed experience: update `docs/README.md` if discoverability changes
- Change module ownership or startup/loading rules: update this file and `docs/architecture/system-overview.md`
- Add a new family of features or directories: document the owner area here instead of inflating `README.md`
