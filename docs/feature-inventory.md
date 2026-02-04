# Feature & Game Inventory (Pre-Rebuild)

Date: February 4, 2026

Purpose: Capture the full product surface before coaching, teaching, and games were removed. This inventory reflects the legacy feature set and the files that implemented it.

## Feature Inventory

| Feature Area | Description | Views / UI | Primary Sources | Status (post-change) |
| --- | --- | --- | --- | --- |
| Shell Navigation | Hash-based view routing, bottom nav, page sections. | `#view-home`, `#view-settings`, `#view-help`, `#view-about`, `#view-roadmap` | `index.html` (legacy), `src/core/utils/view-events.js` | Retained (shell only) |
| Daily Practice Flow | Guided daily practice steps linking to tuner, metronome, songs, and games. | `#view-daily` | `index.html` (legacy), `src/features/coach/lesson-plan.js` | Removed |
| Coach Insights | Weekly goal tracking, insights, focus tips, next-step CTA. | `#view-coach` | `src/features/coach/coach-insights.js`, `src/features/coach/coach-actions.js` | Removed |
| Focus Timer | Focus mode timer and coach reminders. | `#view-coach` | `src/features/coach/focus-timer.js` | Removed |
| Lesson Planning | Daily lesson plan assembly and step rendering. | `#view-home`, `#view-daily` | `src/features/coach/lesson-plan.js` | Removed |
| Trainer Tools | Metronome, posture capture, bowing drills, tempo presets. | `#view-trainer`, `#view-bowing`, `#view-posture` | `src/features/trainer/tools.js`, `src/core/worklets/metronome-processor.js` | Removed |
| Tuner | Real-time tuner UI and pitch detection. | `#view-tuner` | `src/features/tuner/tuner.js`, `src/core/worklets/tuner-processor.js` | Removed |
| Games Hub | Game recommendations, weekly goals, quests, recent stats. | `#view-games` | `src/features/games/game-hub.js`, `src/features/games/game-meta.js` | Removed |
| Game Metrics | Scoring, accuracy, stars, adaptive difficulty, game events. | `#view-games`, `#view-game-*` | `src/features/games/game-metrics.js`, `src/core/wasm/game-timer.js` | Removed |
| Game Enhancements | UX helpers, checklists, badges, and game UI helpers. | `#view-games`, `#view-game-*` | `src/features/games/game-enhancements.js` | Removed |
| Game Metadata | Game labels, steps, tips, and goals. | `#view-game-*` | `src/features/games/game-meta.js` | Removed |
| Songs Library | Song list, search, and song progress tracking. | `#view-songs`, `#view-song-*` | `src/features/songs/song-search.js`, `src/features/songs/song-progress.js`, `src/data/songs.json` | Removed |
| Progress Dashboard | Weekly streaks, badges, and progress summaries. | `#view-progress` | `src/features/progress/progress.js` | Removed |
| Session Review | Charts, coach messages, and recording playback. | `#view-analysis` | `src/features/analysis/session-review.js` | Removed |
| Recordings | Recording capture list and playback management. | `#view-recordings` (legacy), `#view-analysis` | `src/features/recordings/recordings.js`, `src/core/utils/recording-export.js` | Removed |
| Parent Controls | Goal management, PIN access, and recordings review. | `#view-parent` | `src/features/parent/goals.js`, `src/features/parent/pin.js`, `src/features/parent/recordings.js` | Removed |
| Notifications | Practice reminders and schedule prompts. | `#view-settings` | `src/features/notifications/reminders.js` | Removed |
| Backup & Restore | JSON export/import of events, recordings, ML state. | `#view-backup` | `src/features/backup/export.js`, `src/core/utils/download.js` | Removed |
| ML / Adaptive Engine | Feature store, recommendations, inference, WebGPU/WASM backends. | System | `src/core/ml/*` | Removed |
| Audio Core | Tone playback, audio context, budget checks. | System | `src/core/audio/*` | Removed |
| WASM Core | Rhythm timer, core audio/pitch engine, bindings. | System | `src/core/wasm/*` | Removed |
| Persistence | Local storage, IndexedDB blobs, integrity checks. | System | `src/core/persistence/*` | Removed |
| Platform & Offline | Install guidance, capability tiering, offline integrity, SW updates. | `#view-settings`, `#view-help` | `src/core/platform/*`, `public/sw.js`, `public/offline.html` | Partially retained (shell only) |

## Game Inventory

| Game ID | Display Name | Focus Skill | Goal (from metadata) | View | Sources | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `pitch-quest` | Pitch Quest | Pitch | Match target notes with a centered tone. | `#view-game-pitch-quest` | `src/features/games/game-meta.js` | Removed |
| `rhythm-dash` | Rhythm Dash | Rhythm | Lock in the beat and build a steady combo. | `#view-game-rhythm-dash` | `src/features/games/game-meta.js` | Removed |
| `note-memory` | Note Memory | Reading | Match notes quickly and remember their places. | `#view-game-note-memory` | `src/features/games/game-meta.js` | Removed |
| `ear-trainer` | Ear Trainer | Pitch | Identify open strings by ear. | `#view-game-ear-trainer` | `src/features/games/game-meta.js` | Removed |
| `bow-hero` | Bow Hero | Bowing | Keep the bow straight and controlled. | `#view-game-bow-hero` | `src/features/games/game-meta.js` | Removed |
| `string-quest` | String Quest | Bowing | Travel through strings with clean crossings. | `#view-game-string-quest` | `src/features/games/game-meta.js` | Removed |
| `rhythm-painter` | Rhythm Painter | Rhythm | Paint rhythmic patterns with precision. | `#view-game-rhythm-painter` | `src/features/games/game-meta.js` | Removed |
| `story-song` | Story Song Lab | Reading | Tell the story with expressive dynamics. | `#view-game-story-song` | `src/features/games/game-meta.js` | Removed |
| `pizzicato` | Panda Pizzicato | Rhythm | Pop the strings cleanly and keep time. | `#view-game-pizzicato` | `src/features/games/game-meta.js` | Removed |
| `tuning-time` | Tuning Time | Pitch | Center each string with calm listening. | `#view-game-tuning-time` | `src/features/games/game-meta.js` | Removed |
| `melody-maker` | Melody Maker | Reading | Build a melody with strong note choices. | `#view-game-melody-maker` | `src/features/games/game-meta.js` | Removed |
| `scale-practice` | Scale Practice | Pitch | Play the scale with even tone and tempo. | `#view-game-scale-practice` | `src/features/games/game-meta.js` | Removed |
| `duet-challenge` | Duet Challenge | Rhythm | Play in sync with the duet partner. | `#view-game-duet-challenge` | `src/features/games/game-meta.js` | Removed |

## Song Inventory (Legacy)

| Song ID | Title | View | Sources | Status |
| --- | --- | --- | --- | --- |
| `open_strings` | Open String Song | `#view-song-open_strings` | `src/data/songs.json` | Removed |
| `twinkle` | Twinkle Twinkle Little Star | `#view-song-twinkle` | `src/data/songs.json` | Removed |
| `mary` | Mary Had a Little Lamb | `#view-song-mary` | `src/data/songs.json` | Removed |
| `lightly_row` | Lightly Row | `#view-song-lightly_row` | `src/data/songs.json` | Removed |
| `go_tell_aunt_rhody` | Go Tell Aunt Rhody | `#view-song-go_tell_aunt_rhody` | `src/data/songs.json` | Removed |
| `ode_to_joy` | Ode to Joy | `#view-song-ode_to_joy` | `src/data/songs.json` | Removed |
| `minuet_1` | Minuet 1 | `#view-song-minuet_1` | `src/data/songs.json` | Removed |
| `gavotte` | Gavotte | `#view-song-gavotte` | `src/data/songs.json` | Removed |
| `perpetual_motion` | Perpetual Motion | `#view-song-perpetual_motion` | `src/data/songs.json` | Removed |

Notes:
- Legacy sources (`src/core/`, `src/features/`, `src/data/`, and the legacy `index.html`) were removed after this inventory was captured.
- The shell-only runtime now lives in `index.html`, `rust/`, `src/styles/*`, and `public/sw.js`.
