# Feature Surface And Ownership

The repo is organized by user-facing experience areas rather than by framework layers. Use this page to locate the right subsystem before editing.

## Primary Areas

- App shell and routing: `src/app/`, `src/views/`, `public/views/`
- Practice games: `src/games/`, `public/views/games/`
- Songs and playback: `src/songs/`, `public/views/songs/`
- Tuner and trainer tools: `src/tuner/`, `src/trainer/`
- Coach and curriculum flows: `src/coach/`, `src/curriculum/`
- Parent/review/reporting flows: `src/parent/`, `src/analysis/`, `src/recordings/`
- Cross-cutting platform behavior: `src/platform/`, `src/notifications/`, `src/progress/`

## How Views Pick Up Behavior

- Each routed view loads HTML from `public/views/`
- `src/app/module-registry.js` decides which feature modules initialize for a given `view-*` id
- Some modules are eager at startup for baseline platform/runtime behavior
- Some modules are intentionally deferred until idle to reduce startup contention

## When To Update Docs

- Add or remove a routed experience: update `docs/README.md` if discoverability changes
- Change module ownership or startup/loading rules: update this file and `docs/architecture/system-overview.md`
- Add a new family of features or directories: document the owner area here instead of inflating `README.md`
