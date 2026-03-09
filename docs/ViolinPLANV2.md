# Emerson Violin PWA Reboot Plan — V2

## Executive Summary

Rebuild the app as a **child-first, daily-practice PWA** and retire the hash-driven UI model. The new product centers on one clear next step, guided practice, optional exploration, and a gated parent zone.

This is a **full product reboot** of a **mature, working codebase**: 334 JS files, 35K LOC production code, 567 unit tests, 45 E2E tests, 17 games, 17 views, 2 WASM crates, zero production dependencies. The reboot must respect this investment while transforming the product.

---

## Locked Decisions

- Primary product goal: build a **daily practice habit** for a child
- Primary user: **child-first**, with parent support and oversight
- Home model: **one clear next step**, not a launcher dashboard
- Platform priority: **Safari 26.2+, iPadOS 26.2+, iPad mini 6th gen**, including installed Home Screen mode
- Red Panda: embedded guide across surfaces, not a top-level destination
- Child nav: goal-based — `Home`, `Songs`, `Games`, `Tools`, `Wins`
- Parent access: intentional and gated, not co-equal with child navigation
- Compatibility: old `#view-*` hashes redirect to new routes for 2 major versions

---

## Open Decisions (Resolve In Phase 0)

### Framework Choice

The current app is zero-dependency vanilla JS on Vite 7. The plan targets Next.js App Router. This decision needs explicit justification because it carries significant technical risk.

**Next.js static export constraints that conflict with this app:**
- No middleware (needed for parent PIN gate, route guards)
- No API routes (may need for future sync/backup)
- No `next/image` optimization in static export
- Service worker integration requires third-party adapter (`@serwist/next` or equivalent)
- React hydration adds ~45KB min to baseline bundle (currently 0KB framework)
- `next export` + PWA is a known friction point (manifest, SW registration, offline shell)

**Alternatives to evaluate:**
1. **Vite + React SPA** — Keep current build tool, add React, retain full SW control, zero SSR complexity
2. **Vite + React Router 7 (SPA mode)** — File-based routing without SSR baggage, full Vite plugin ecosystem
3. **Next.js App Router (static export)** — File-based routing, React Server Components (limited in static), ecosystem momentum
4. **Incremental React adoption on current Vite** — Strangler fig: add React islands inside existing shell, migrate view-by-view

**Recommendation:** Option 1 or 2. The app is static-first, offline-first, with a deeply custom SW. Next.js adds complexity without delivering value that Vite + React can't provide more simply. Resolve this in Phase 0 with a spike.

### 3D Scope

The plan introduces React Three Fiber for home hero, practice rewards, and note-memory. **This should be deferred to post-launch.**

**Why:**
- Current app has zero 3D — this is a net-new feature, not a migration
- R3F + Three.js adds ~150KB min to bundle (currently 0KB framework deps)
- iPad mini 6 GPU budget is limited; 3D + AudioWorklet + WASM is aggressive
- "Home hero scene" and "reward moments" are cosmetic, not functional
- High risk of scope creep and performance regression on target device

**Recommendation:** Ship the reboot with 2D. Add 3D as a post-launch enhancement with its own performance budget and device testing pass.

### TypeScript Strategy

The codebase is 35K LOC vanilla JS with zero types. Full TS conversion during a rewrite is risky.

**Recommendation:**
- New code: TypeScript (strict mode)
- Bridged legacy code: `allowJs: true`, JSDoc types where helpful
- Migrate legacy modules to TS as they're rewritten, not before
- Do NOT block migration on typing legacy code

---

## Product Architecture

### Route Map

```
/                           Daily Mission Home
/practice                   Guided session runner
/practice/[step-slug]       Individual practice step (deep-link)
/songs                      Song library (filterable, searchable)
/songs/[slug]               Song detail + playback + recording
/games                      Game catalog (skill-filtered)
/games/[slug]               Game session
/tools                      Tool selector hub
/tools/tuner                Real-time pitch detector
/tools/metronome            Metronome + tap tempo
/tools/drone                Drone / reference tones
/tools/bowing               Bowing technique coach
/tools/posture              Posture check (camera)
/wins                       Child progress, streaks, achievements, rewards
/settings                   Child-facing preferences (sound, motion, text size)
/parent                     Parent zone gate (PIN)
/parent/review              Session review + stats + RT coaching replay
/parent/goals               Goal management + recital tracking
/parent/checklist           Home teacher observation form (Suzuki-style)
/parent/recordings          Recording library + export
/parent/data                Backup, export, import, data controls
/parent/settings            Advanced preferences, reminders, ML diagnostics
/support/help               FAQ
/support/about              App info
/support/privacy            Privacy policy
```

### Route Redirect Map (Legacy Compatibility)

```
#view-home          → /
#view-coach         → /practice
#view-games         → /games
#view-songs         → /songs
#view-tuner         → /tools/tuner
#view-trainer       → /tools
#view-progress      → /wins
#view-analysis      → /parent/review
#view-parent        → /parent
#view-settings      → /settings          (child settings stay child-accessible)
#view-backup        → /parent/data
#view-help          → /support/help
#view-about         → /support/about
#view-privacy       → /support/privacy
#view-bowing        → /tools/bowing
#view-posture       → /tools/posture
#view-onboarding    → /                    (onboarding is inline on Home — first-visit detection triggers wizard, no dedicated /onboarding route)
#view-metronome     → /tools/metronome     (new route — was inline in trainer)
#view-ear-trainer   → /games/ear-trainer    (ear-trainer is a real game, not a tool)
#view-checklist     → /parent/checklist    (new parent sub-panel)
```

A one-time redirect script checks `window.location.hash` on first load and replaces with the pathname equivalent. Remove after 2 major versions.

### Navigation Model

- **Child nav (bottom):** Home, Songs, Games, Tools, Wins — 5 items max, icon + label, `52px` minimum touch target
- **Child settings:** Gear icon in top-left of Home (see wireframe). Opens `/settings` — child-safe preferences (sound toggle, motion toggle, text size, calm background). No PIN required.
- **Parent access:** Long-press gear icon OR dedicated "Parent" label inside `/settings` → PIN gate → parent workspace
- **Support access:** Accessible from parent settings AND from `/settings` (child settings has a "Help" link)
- **Back navigation:** Standard browser back, no custom back stacks
- **Deep links:** Every route is directly addressable and shareable
- **Game / Practice focus mode:** Bottom nav hides during `/practice` active steps and `/games/[slug]` in-game state (State 2 only). Post-game (State 3) and practice completion restore nav. Only back/exit button visible while in focus mode.

---

## Feature Coverage And Enhancement Contract

### Feature Matrix

Create `docs/architecture/reboot-feature-matrix.md` as the canonical tracker. Each row:

| Column | Description |
|--------|-------------|
| Feature ID | Unique identifier |
| Current Surface | Where it lives today (view, module, file) |
| New Surface | Target route + component |
| Parity Status | `not-started` / `in-progress` / `parity` / `parity-plus` / `deferred` |
| Enhancement | Required user-visible improvement |
| Tests | Unit + E2E coverage refs |
| Notes | Blockers, risks, decisions |

**"Deferred" is allowed** — but requires explicit rationale and must not break existing user data. A feature deferred in v1 keeps its data intact for future activation.

### Required Enhancement Outcomes By Family

#### Onboarding
- **Currently:** Single onboarding view with mixed child/parent audience
- **Enhancement:** Split child/parent flows, reduce time-to-first-practice to <90s
- **New flow:** Welcome → Name → Parent PIN setup → Install education → First mission launch
- **Calibration:** After first song/game, seed initial difficulty for ML system (EMA baseline)
- **Data:** Save progress progressively — quitting at step 3 preserves steps 1-2

#### Home / Mission / Curriculum
- **Currently:** Home + coach split with separate navigation. Curriculum has multi-unit track with flow-based progression
- **Enhancement:** Unified home with embedded Red Panda coach, single "what to do next" CTA
- **Curriculum engine preserved (per `engine-flow.js`):**
  - Multi-unit beginner-to-intermediate track (open strings → shifting/vibrato)
  - 4 flow states: `first_time` / `progressing` / `regressing` / `stable`
  - 4 phase labels (mapped from flow states via `PHASE_BY_FLOW`): `onramp` / `advance` / `remediation` / `core`
  - Flow resolution: `first_time` if no events; `regressing` if recent avg <65% or dropped 6+ pts; `progressing` if recent avg rose 6+ pts or ≥80% cold start; otherwise `stable`
  - Auto-advance: when flow=`progressing` AND unit completion ≥75% → next unit
  - Auto-regress: when flow=`regressing` AND unit completion ≤45% → previous unit
  - Unit completion is a composite of game ratio + song ratio + practice minutes ratio
- **Mission builder:** ML recommendation engine constructs daily mission from: curriculum position, spaced-repetition queue, skill gaps, auto-goals queue, time budget (parent-configured, default 15 min)
- **Auto-goals system** (existing `mission-progress-goals.js`): Games auto-queue goal slots (`goal-warmup`, `goal-scale`, `goal-rhythm`, `goal-ear`, `goal-song`) based on game-to-goal mapping. Coach materializes queued goals into next mission plan. Preserved exactly — React mission builder reads from `AUTO_GOALS_KEY`.
- **Mission types:** warmup → technique → song → game → review (flexible; ML may reorder based on engagement data)

#### Practice Session
- **Currently:** Coach view with lesson plan + focus timer + mission progress as separate modules. **Existing `lesson-plan-runner-machine.js` provides a step-runner state machine** — the practice runner enhances this, does not replace it.
- **Enhancement:** Linear step-through runner with visible progress bar, timing, pause/resume, skip
- **Step types:** warmup (technique drill), technique (focused skill exercise), song (play-along), game (embedded), free_practice (open tuner/metronome), review (spaced-repetition revisit)
- **Timer:** Per-step countdown. Visual fill bar. Auto-complete with encouragement when time expires.
- **Session state persisted:** Resume if child leaves mid-session. `CURRICULUM_STATE_KEY` tracks step index + completion.
- **Realtime coaching:** During mic-active steps, Panda coaching strip shows contextual feedback from RT session controller (pitch accuracy, tempo, bow quality)
- **RT coaching presets:** Parent-configurable: `gentle` (encouragement only), `standard` (tips + encouragement), `challenge` (corrections + tips + encouragement)

#### Songs (30 items)
- **Currently:** Flat list with basic detail views across 3 tiers (12 easy, 12 intermediate, 6 challenge)
- **Enhancement:** Difficulty badges, "ready to play" indicators, integrated recording, rich detail pages
- **Song tiers preserved:** Easy (Suzuki Vol 1 level), Intermediate (Vol 2-3), Challenge (soft-locked until SkillProfile average ≥60; existing `song-progression.js` unlock logic)
- **Song detail page includes:**
  - Scrolling staff/sheet music display with CSS playhead indicator
  - BPM display + tap-tempo override
  - Practice tips (3-4 per song, rotated)
  - Section checkpoints for long songs (A/B repeat)
  - "Record yourself" toggle → MediaRecorder integration
  - Mastery display: current tier (foundation / bronze / silver / gold)
  - Skill tags showing which abilities this song develops
- **Song assessment system:**
  - Weighted star scoring: timing 45% + intonation 45% + overall impression 10%
  - Mastery tiers with thresholds: foundation (<40%), bronze (40-65%), silver (65-85%), gold (85%+)
  - Spaced review scheduling: songs due for review bubble up in mission builder
- **Recording integration:**
  - MediaRecorder with MIME type selection (prefer `audio/webm;codecs=opus`, fallback `audio/mp4`)
  - Recordings saved to IndexedDB (`RECORDINGS_KEY`) with song ID, timestamp, duration, star rating
  - Playback available on song detail page and in parent recordings panel

#### Games (17 items)
- **Currently:** 17 shipped games with inconsistent entry patterns (canvas + HTML hybrid), varied lifecycle management
- **Enhancement:** Unified `<GameShell>` component, consistent pre-game/in-game/post-game states, difficulty framing, rewards
- **Game inventory with skill mapping (17 games, verified against `game-config.js` + `game-metrics.js`):**

| Game ID | Skill | Input | Engine | Notes |
|---------|-------|-------|--------|-------|
| pitch-quest | pitch | mic | canvas | Core pitch game |
| ear-trainer | pitch | mic | canvas | Open string identification |
| tuning-time | pitch | mic | canvas | Intonation centering |
| scale-practice | pitch | mic | canvas | Scale runs with dynamics |
| echo | rhythm | mic | canvas | Call-and-response rhythm |
| rhythm-dash | rhythm | touch | canvas | Lane-based beat matching |
| rhythm-painter | rhythm | touch | canvas | Rhythmic pattern painting |
| pizzicato | rhythm | touch | HTML | Sequence-game factory (`sequence-game.js`) |
| duet-challenge | rhythm | touch | canvas | Synchronized partner play |
| note-memory | reading | touch | HTML | Card-matching note pairs |
| story-song | reading | touch | HTML | Expressive dynamics reading |
| melody-maker | reading | touch | HTML | Compose + playback short melodies |
| bow-hero | bowing | touch | canvas | Straight bow path tracking |
| string-quest | bowing | touch | HTML | String crossing sequences (`sequence-game.js`) |
| stir-soup | bowing | touch | canvas | Air bow circles (pre-technique) |
| wipers | bowing | touch | canvas | Forearm pronation/supination |
| dynamic-dojo | dynamics | mic | canvas | Volume control forte↔piano |

- **Existing game infrastructure to migrate (not rebuild):**
  - `game-shell.js` — `createGame()` factory already provides universal game boilerplate (session lifecycle, tuning attach, difficulty badge, accuracy reporting). The React `<GameShell>` wraps this, it does NOT replace it.
  - `game-config.js` — `GAME_META` object (per-game skill, goal, steps, tips, difficulty profiles, objective packs, mastery thresholds). Carried forward as data source for pre-game/post-game states.
  - `game-session-lifecycle.js` — session start/end tracking, already wired to `game-shell.js`.
  - `game-session-reporting.js` — event emission to progress model. Preserved.
  - `game-enhancements.js` / `game-objectives.js` — objective tier system (foundation/core/mastery) and guided-session panel. Integrate into React `<GameShell>` pre-game state.
  - `game-mastery.js` — per-game mastery state (tier, days, validation). Feeds into game catalog cards.
  - `game-sort-model.js` — favorites and sort/filter model. Powers game catalog filter chips.

- **Canvas infrastructure (existing, preserved):**
  - `canvas-engine-base.js` — base class for game canvases (RAF via `render()` callback, `isRunning` guard, self-terminating)
  - `canvas-engine.js` — non-game canvas (stores `this.rafId`, `cancelAnimationFrame` in `stop()`)
  - `DragCanvasEngineBase` — drag-interaction canvas base class
  - `canvas-surface.js` — shared canvas setup (resolution, DPR, resize)
  - `canvas-pointer-bindings.js` — pointer event normalization for canvas games
  - `game-reset-guards.js` — prevents double-reset during game cleanup
  - `game-start-stop-bindings.js` — start/stop button lifecycle management
- **Per-game enhancement needs:**
  - Canvas games (pitch-quest, ear-trainer, tuning-time, scale-practice, echo, rhythm-dash, rhythm-painter, duet-challenge, bow-hero, stir-soup, wipers, dynamic-dojo): standardize RAF cleanup via `canvas-engine-base.js`, wrap in React `<GameShell>` pre/post states, keep canvas internals behind `<LegacyBridge>`
  - HTML games (note-memory, story-song, melody-maker): wrap in `<GameShell>`, add Panda tips from `GAME_META`, consistent scoring overlay
  - Sequence games (pizzicato, string-quest): shared `sequence-game.js` factory already consistent; add `<GameShell>` wrapper
- **Canvas game accessibility (12 canvas games have zero a11y spec currently):**
  - Each canvas game must have an `aria-label` describing the game state
  - Screen reader announcements for score changes, game start/end, level changes via `aria-live` region
  - `prefers-reduced-motion`: canvas animations reduce to essential-only (no particle effects, simpler transitions)
  - In-app motion toggle (`motionEnabled` in ChildSettings) must also suppress canvas animation complexity
- **Adaptive difficulty (ML):**
  - EMA (exponential moving average) per-game difficulty tracking
  - Difficulty adjusts after each play: +1 step if score >85%, -1 step if score <50%, hold otherwise
  - Parent can override difficulty in parent settings (lock to easy/medium/hard)
- **Game favorites and sort/filter** (existing `game-sort-model.js`):
  - Favorite game IDs persisted to `GAME_FAVORITES_KEY`
  - Sort tags per card (`data-sort-tags`): quick, new, etc.
  - Filter chips on game catalog: All, Favorites, Quick, + skill filters
  - Sort model builds lookup tables from rendered cards (`buildGameSortMaps`)
- **Spaced repetition for games:**
  - Games scheduled for review based on forgetting curve (last play date + skill decay rate)
  - Overdue games appear in daily mission as "review" steps

#### Tools
- **Currently:** Tuner + ear-trainer with separate views; bowing + posture added later
- **Enhancement:** 5-tool hub with purpose-driven entry, consistent back navigation
- **Tool inventory:**
  - `/tools/tuner` — Real-time pitch detection via WASM PitchDetector (YIN algorithm). Shows note name, cents offset, string suggestion. Auto-detects current string being tuned.
  - `/tools/metronome` — Tap tempo + manual BPM entry. Visual + audio beat (Web Audio oscillator). Subdivisions: quarter, eighth, triplet. Accent on beat 1. Visual flash on beat. **New in reboot** (currently embedded in trainer view).
  - `/tools/drone` — Sustained reference tones for open strings (G3, D4, A4, E5). Selectable from string buttons. Uses tone-player synth voice. Adjustable volume. Useful for intonation practice. **New in reboot** (currently in ear-trainer canvas).
  - `/tools/bowing` — Camera-based bow arm position checker. Posture overlay with reference guides.
  - `/tools/posture` — Camera-based standing posture checker. Reference silhouette overlay.
- **All tools:** Microphone/camera permission pre-prompt before tool opens. Panda explains why permission is needed. Recovery messaging if denied.

#### Wins / Progress / Achievements
- **Currently:** Combined progress + analysis views with mixed child/parent audience
- **Enhancement:** Split into child-facing rewards (`/wins`) and parent-facing analysis (`/parent/review`)
- **Child `/wins` page shows:**
  - Practice streak (consecutive days, flame icon, milestone badges at 7/14/30/60/100)
  - Daily star count (earned from practice completion + games)
  - Achievement badges (9 defined):

| Badge | Name | Unlock Criteria |
|-------|------|----------------|
| 1 | First Note | Complete first practice session |
| 2 | Week Warrior | 7-day practice streak |
| 3 | Rising Star | Reach level 5 |
| 4 | Dedicated | Accumulate 100 minutes of practice |
| 5 | Pitch Perfect | Score 90%+ on 3 pitch games |
| 6 | Rhythm Master | Score 90%+ on 3 rhythm games |
| 7 | Bow Hero | Score 90%+ on 3 bowing games |
| 8 | Golden Ear | Earn gold mastery on 5 songs |
| 9 | Game Master | Play all 17 games at least once |

  - Skill meters (5 axes, visual bars not percentages): pitch, rhythm, bow_control, posture, reading (0-100 scale from WASM SkillProfile)
  - **No confusing numbers:** Stars, streaks, badges, and colored bars. No XP display, no "level 47", no decimals.
- **Parent `/parent/review` page shows:**
  - Session history with dates, durations, activities completed
  - Skill radar chart (SVG 5-axis pentagon: pitch, rhythm, bowing, posture, reading)
  - Per-skill trend lines (last 10 sessions)
  - Song mastery progression (which songs improving, which stalled)
  - Game performance trends (EMA curves per game)
  - Practice time distribution (weekly bar chart)
  - XP/leveling detail (WASM PlayerProgress: total XP, current level, XP to next level) — shown only in parent view
  - RT coaching replay: review realtime event timeline from recent sessions (pitch contour, note events, coaching triggers). 3 coaching presets visible for comparison.

#### Parent Zone
- **Currently:** Scattered across parent view + settings + backup + analysis
- **Enhancement:** Single PIN-gated workspace with tabbed navigation
- **Sub-panels:**
  - **Review** (`/parent/review`): Session analysis + skill charts + RT coaching replay (detailed above)
  - **Goals** (`/parent/goals`): Set daily practice time target (5-30 min slider). Recital date tracking. Weekly goal checkboxes. Progress toward goals.
  - **Checklist** (`/parent/checklist`): Suzuki-style home teacher observation form (existing `home-teacher.js` provides the base — **enhanced, not new**). Per-session checklist: bow hold, posture, tone quality, rhythm accuracy, left hand position. Saves timestamped entries. Export as PDF/CSV.
  - **Recordings** (`/parent/recordings`): Recording library with playback, date, song association, duration. Export individual recordings (via `navigator.share()` or direct download). Bulk export as zip. Delete recordings (parent-only action).
  - **Data** (`/parent/data`): Full backup to JSON file. Import from JSON. Export practice log as CSV. Clear all data (with confirmation + re-confirmation). Storage usage display.
  - **Settings** (`/parent/settings`): Coaching style preset (gentle/standard/challenge). Practice reminder configuration (time-of-day, days-of-week → ICS calendar export). Difficulty override per game. Sound/haptic preferences (master). ML diagnostics panel (view EMA values, forgetting curves, recommendation weights; demo mode; simulate data; reset ML state). App version + about info.

#### Child Settings (`/settings`)
- **Currently:** Settings view accessible as top-level navigation item
- **Enhancement:** Simplified child-safe preferences, no PIN required
- **Controls:**
  - Sound on/off toggle (mutes tone player, not mic input)
  - Motion toggle (`prefers-reduced-motion` override)
  - Text size selector (small/medium/large → adjusts `--text-base` scale factor)
  - Background theme (warm cream default, calm blue, soft green — cosmetic only)
  - "Help" link → `/support/help`
  - "Parent Area" link → PIN gate → `/parent`

#### Platform Capabilities (Preserved + Enhanced)
- **Install / Home Screen:** Install education during onboarding. Detect standalone display mode. Different behavior in browser vs. installed (installed: no address bar prompts, persistent orientation lock).
- **Offline:** Full app shell cached by SW. Practice, games, songs all work offline. Recordings saved locally. Offline indicator banner (warm, not alarming). Offline integrity self-test (cache audit + manual check/repair in parent data panel).
- **Updates:** SW update detection → non-blocking banner "Update available! Tap to refresh." Version displayed in parent settings.
- **Reminders:** ICS/RFC 5545 recurring calendar event export (practice time reminder). Not push notifications. Parent configures day/time in settings → downloads `.ics` file.
- **App Badge:** Badge API on app icon when no practice today (if supported). Cleared after daily mission started.
- **Wake Lock:** Acquired during practice session and active games. Released on pause/exit. Graceful degradation if API unavailable.
- **Orientation:** `screen.orientation` API preferred, `orientationchange` fallback. Portrait-preferred, landscape supported. Games may request landscape.
- **Sharing:** Weekly practice summary shareable via `navigator.share()` (text + optional image). Recording export via `tryShareFile()` (share API → fallback download).
- **Audio Codec Fallback:** Runtime detection: prefer `.opus` → fallback `.mp3` → fallback `.wav`. Error-driven swap (try preferred, catch → try next). SW handles range requests for audio streaming.
- **Data Saver:** Respect `prefers-reduced-data` media query where supported — skip non-essential asset preloading, reduce animation complexity.
- **Input Detection:** Detect pen/touch/mouse via pointer events → set `data-input` dataset on root. Adjust touch target sizes if pen input detected (can be smaller).
- **Web Vitals:** LCP, INP, CLS tracked and persisted locally. 40-session rolling history. Viewable in parent ML diagnostics panel. No external reporting.

#### Audio / Realtime / WASM
- **Preserve all existing capabilities** — zero regressions in audio pipeline
- **AudioContext lifecycle:** Handle `'suspended'` + `'interrupted'` (iOS). Resume on user gesture. Close + null on unrecoverable failure. Single shared context via `context-manager.js`.
- **AudioWorklet pipeline:** Microphone → rt-audio-processor.js → WASM PitchDetector (YIN) → feature extraction → session controller → UI. Unchanged in v1.
- **WASM modules preserved:**
  - `panda-audio`: PitchDetector (YIN algorithm), EchoBuffer (circular buffer for echo game)
  - `panda-core`: PlayerProgress (XP/leveling), AchievementTracker (9 badges), SkillProfile (5-axis), `calculate_streak` (trailing streak)
  - **JS fallback path:** `progress-model-fallback.js` + `progress-model-result.js` provide pure-JS progress computation when WASM fails to load (memory pressure, iOS restrictions). `<AppRuntimeProvider>` auto-selects fallback on init failure.
- **Tone player:** Synth voice (Web Audio oscillator) + sample voice (audio file playback). Codec-aware loading. Used by drone tones, metronome clicks, game sound effects.
- **Enhancement:** Better microphone permission prompts with Panda explanation. Clearer error recovery when audio interrupted. Device limitation messaging (e.g., "Your device doesn't support this feature").

#### Voice Coach (Web Speech API)
- **Currently:** `speech-utils.js` + `voice-coach-speech.js` provide spoken coaching tips via `window.speechSynthesis`. Toggle via `#setting-voice` checkbox, persisted to root `dataset.voiceCoach`.
- **Feature flags:** `isVoiceCoachEnabled` and `isRecordingEnabled` in `feature-flags.js`, exposed as DOM checkboxes + `documentElement.dataset` attributes.
- **Enhancement:** Migrate voice toggle to `<ChildSettings>` React component. Preserve `speechSynthesis` usage as-is (no TTS API swap). Feature flag reads move from DOM dataset to `<AppRuntimeProvider>` context.
- **Caveat:** `speechSynthesis.speak()` requires user gesture on Safari before first call. Trigger voice priming during onboarding "Let's Go!" tap.

#### MediaSession + Audio Focus
- **Currently:** `media-sound-controller.js` sets MediaSession metadata and handles `SOUNDS_CHANGE` events for audio focus arbitration.
- **Enhancement:** Preserve MediaSession integration. Wire into React practice runner so Now Playing shows song title during play-along.

---

## Technical Architecture

### Build System

- **Vite** (keep current `^7.3.1`) as build tool and dev server
- **React 19** (`react@^19.0`, `react-dom@^19.0`) for component model (introduced incrementally, not big-bang)
- **React Router 7** (`react-router@^7`) for pathname routing (replaces hash nav)
- **TypeScript 5.7+** (`typescript@^5.7`) for new code; `allowJs: true` for bridged legacy; `strict: true`
- **Vite React plugin** (`@vitejs/plugin-react@^4`) — SWC-based Fast Refresh
- **CSS Modules** for component styles; migrate global CSS incrementally. **Specificity rule:** global styles load first (reset, tokens, utilities); CSS Modules load per-component and naturally win specificity via hashed class names. During migration, wrap legacy global rules that clash with `@layer legacy { }` so CSS Modules always override without `!important`. Audit with `find-dead-css-vars.mjs` after each phase.
- **Testing additions:** `@testing-library/react@^16`, `@testing-library/jest-dom@^6`, `@testing-library/user-event@^14`
- **Current custom service worker preserved** — no framework SW adapter
- **Zero new runtime dependencies beyond React + React Router.** All other runtime code stays vanilla JS or WASM.

### AI Toolchain: Antigravity + Gemini 3.1 Pro + Stitch + Nano Banana

This migration is optimized for execution inside **Google Antigravity 1.20.3** (agent-first IDE, VSCode OSS 1.107.0, Chromium 142). All phases use the following tool stack:

> **Upgrade note:** If running Antigravity < 1.20.3, update first. The [March 5, 2026 release](https://discuss.ai.google.dev/t/antigravity-update-1-20-3-2026-3-5/129320) adds **AGENTS.md** support (project-level agent instructions), auto-continue as default behavior, and a token accounting fix critical for long migration sessions.

#### Antigravity Agent Manager (Multi-Agent Orchestration)

The [Agent Manager](https://developers.googleblog.com/build-with-google-antigravity-our-new-agentic-development-platform/) spawns up to 5 parallel agents, each with independent context windows. Use this for:

- **Parallel migration tracks:** Spawn separate agents for "React Shell," "Component Tests," "CSS Module Migration," and "E2E Pathname Helpers" — all running simultaneously on the same branch
- **Artifacts for review:** Each agent produces diffs, test results, and screenshots as Artifacts. Leave feedback directly on an Artifact; the agent incorporates it without stopping
- **Rules file:** Create `AGENTS.md` at project root (supported since Antigravity 1.20.3 — loaded automatically by all agents alongside `GEMINI.md`):
  ```
  - Every commit must pass `npm run handoff:verify` (567 unit + 45 E2E)
  - No new runtime deps beyond React + React Router
  - CSS Modules for new components; global CSS unchanged unless migrating
  - TypeScript strict for new files; allowJs for bridged legacy
  - WASM modules (panda-core, panda-audio) are read-only — no Rust changes
  - 26 platform files stay vanilla JS — singleton init, never unmount
  - All games use <GameShell> 3-state pattern (pre/in/post)
  - Touch-first: 52px min targets, no hover-only interactions
  ```
- **Auto-continue:** Enabled by default in 1.20.3 — agents complete multi-step tasks without manual "continue" prompts. No configuration needed.
- **Workflows:** Save per-phase prompts as Workflows (see phase-specific sections below). Trigger on demand — no re-typing migration instructions each time.

**Per-phase agent allocation:**

| Phase | Agent 1 | Agent 2 | Agent 3 | Agent 4 | Agent 5 |
|-------|---------|---------|---------|---------|---------|
| 0 | Framework spike | SW spike | Design system tokens | Stitch screen gen | Performance baseline |
| 1 | React shell + router | LegacyBridge impl | E2E pathname helpers | CSS Module migration | Shared components |
| 2 | Home + Mission | Practice runner | Onboarding wizard | Event bus migration | Wins page |
| 3 | Tuner + RT audio | Metronome + Drone | Bowing + Posture | Child settings | CoachOverlay portal |
| 4 | Songs library + detail | Game shell + catalog | Recording + assessment | Adaptive difficulty | Spaced repetition |
| 5 | Parent gate + review | Goals + checklist | Recordings + data | Settings + support | CSV/PDF export |
| 6 | Perf audit + a11y | Dead code cleanup | Offline verification | Platform features | Documentation |

#### Gemini 3.1 Pro (High) — Primary Code Generation Model

Use [Gemini 3.1 Pro](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-pro/) as the Antigravity agent model. Follow the **80/20 thinking level rule** ([source](https://www.nxcode.io/en/resources/news/gemini-3-1-pro-developer-guide-api-coding-vibe-coding-2026)): 80% of tasks at Low/Medium, 20% at High. High activates **Deep Think Mini** — deeper reasoning chain but 3-4× token cost.

**When to use High (reserve for ~20% of tasks):**
- Multi-file atomic migrations (bridge + hook + vanilla + test must change together)
- Audio pipeline debugging (AudioWorklet → WASM → Policy Worker → CoachOverlay)
- Complex E2E scenario design with cross-route assertions

**When to use Medium (bulk of work ~65%):**
- Single-component migrations, code review, test generation, bridge integration

**When to use Low (~15%):**
- Documentation, comments, CSS extraction, simple refactors, file renames

**Model selection per task type:**

| Task | Model | Thinking Level | Rationale |
|------|-------|---------------|-----------|
| Component migration (vanilla → React) | Gemini 3.1 Pro | Medium | Single-file scope, predictable pattern |
| Multi-file atomic migration (bridge+hook+test) | Gemini 3.1 Pro | **High** | Cross-file reasoning required |
| Bridge integration (mount/unmount lifecycle) | Gemini 3.1 Pro | Medium | Well-defined pattern from Phase 1 |
| Unit test generation (RTL) | Gemini 3.1 Pro | Medium | Pattern matching from existing tests |
| CSS Module extraction | Gemini 3.1 Pro | Low | Mechanical transformation |
| E2E test writing (Playwright) | Gemini 3.1 Pro | Medium | Template-driven, helpers from Phase 1 |
| Complex E2E scenarios (multi-route flows) | Gemini 3.1 Pro | **High** | Cross-route state reasoning |
| Code review of agent diffs | Gemini 3.1 Pro | Medium | Verification, not generation |
| Audio/WASM debugging | Gemini 3.1 Pro | **High** | Deep pipeline tracing needed |
| Documentation generation | Gemini 3.1 Pro | Low | Summarization task |

**Context caching strategy** ([source](https://ai.google.dev/gemini-api/docs/caching), [pricing source](https://www.nxcode.io/en/resources/news/gemini-3-1-pro-complete-guide-benchmarks-pricing-api-2026)):

| Cost Type | Standard | Cached | Savings |
|-----------|---------|--------|---------|
| Input tokens | $2.00/M | $0.50/M | **75%** |
| Output tokens | $12.00/M | $12.00/M | 0% |

- Cache the following across agent sessions: `AGENTS.md` (~800 tokens), design system tokens (~1,500 tokens), phase plan section (~2,000 tokens), shared component interfaces (~3,000 tokens) — total ~7,300 tokens cached per agent
- **Prompt ordering rule:** Place cached data (files, tokens, plan context) FIRST in the prompt, questions/instructions LAST — Gemini 3.1 Pro performs best when queries appear after context
- For repeated file analysis (code review, test generation on same files), enable context caching to avoid re-tokenizing the same source files
- Estimated savings across full migration: 7 phases × 5 agents × ~27K tokens/session × 3 sessions avg = ~2.8M input tokens. At $1.50/M savings = **~$4.20 saved** on input alone

#### Stitch — Design-to-Component Pipeline

[Stitch](https://developers.googleblog.com/stitch-a-new-way-to-design-uis/) generates production React code from text prompts and wireframes. Integrated via [Stitch MCP Server](https://www.geeky-gadgets.com/google-stitch-mcp-gemini-agent-skills/) in Antigravity.

**Setup:**
1. Add Stitch MCP server in Antigravity (Settings → MCP Servers → search "stitch")
2. Install [Stitch Agent Skills](https://github.com/google-labs-code/stitch-skills) for Antigravity:
   ```bash
   npx skills add google-labs-code/stitch-skills --skill design-md --global
   npx skills add google-labs-code/stitch-skills --skill react:components --global
   npx skills add google-labs-code/stitch-skills --skill stitch-loop --global
   npx skills add google-labs-code/stitch-skills --skill enhance-prompt --global
   ```
3. Create Stitch project: "Emerson Violin PWA Reboot"
4. Set device type: **TABLET** (768px portrait, iPad mini 6 target)

**Available Stitch Agent Skills:**
| Skill | Purpose | Phase Usage |
|-------|---------|-------------|
| `design-md` | Convert design specs → Markdown design docs | Phase 0 (design tokens) |
| `react:components` | Convert Stitch HTML/CSS → React TypeScript + Tailwind ([source](https://deepwiki.com/google-labs-code/stitch-skills/2.1-understanding-agent-skills)). **Post-process:** Antigravity agent converts Tailwind classes → CSS Modules (see note below) | All phases |
| `stitch-loop` | Generate complete multi-page site from enhanced prompt — iterative screen creation with shared layout ([source](https://github.com/google-labs-code/stitch-skills)) | Phase 2, 4, 5 (multi-screen batches) |
| `enhance-prompt` | Transform vague UI descriptions → optimized Stitch prompts with specificity, UI/UX keywords, and design system context injection | All phases (pre-process wireframes) |
| `remotion` | Create video walkthroughs from Stitch projects with transitions and overlays | Phase 6 (demo/marketing) |
| `shadcn-ui` | shadcn/ui component library integration guidance | Not used (custom design system) |

> **Tailwind → CSS Modules post-processing:** Stitch `react:components` outputs **Tailwind CSS** by default. This project uses **CSS Modules**. After each Stitch export, the Antigravity agent must convert Tailwind utility classes to CSS Modules: (1) extract Tailwind classes into a `.module.css` file using design token CSS variables, (2) replace `className="..."` strings with `styles.componentName` imports, (3) validate against the project design token set. Add this conversion step to the `AGENTS.md` rules so all agents perform it automatically.

**Stitch pipeline (recommended flow):**
```
ASCII wireframe → enhance-prompt → next-prompt.md → Stitch generate → react:components → Tailwind→CSS Modules conversion → Antigravity agent integration
                                                   ↘ stitch-loop (for multi-page batches)
```

**Workflow per screen:**
1. Run `enhance-prompt` on the ASCII wireframe + design tokens — injects UI/UX keywords, validates design specs, outputs `next-prompt.md`
2. Feed `next-prompt.md` to Stitch → generate 3-5 design candidates at tablet resolution
3. Select best candidate → run `react:components` to export React TypeScript + Tailwind CSS
4. **Tailwind → CSS Modules conversion** (required): Antigravity agent converts Tailwind utility classes to CSS Modules using project design tokens (see post-processing note above)
5. For multi-screen batches (Onboarding 5-step wizard, Parent workspace 6 tabs), use `stitch-loop` instead of step 2 — generates all screens in one pass with shared navigation and layout consistency
6. Antigravity agent integrates the converted component with hooks/providers, adds Vitest + RTL tests

**Stitch screen generation schedule:**

| Phase | Screens to Generate |
|-------|--------------------|
| 0 | Component primitives: Button, Card, NavBar, PandaSpeech, Skeleton |
| 1 | App shell layout, bottom nav, parent PIN gate, error boundary |
| 2 | Home (mission CTA), Practice runner (step UI), Wins (trophy shelf), Onboarding (5-step wizard) |
| 3 | Tool selector hub, Tuner, Metronome, Drone, Bowing trainer, Posture trainer, Child settings |
| 4 | Songs library, Song detail, Games catalog, GameShell (pre/in/post), Post-game celebration |
| 5 | Parent workspace (6 tabs), Review (radar chart), Goals, Checklist, Recordings, Data, Settings |
| 6 | Support pages (Help, About, Privacy), Install education |

**Design system input for Stitch prompts:**
- Font: Fredoka (child), Figtree (parent). Include CSS `@font-face` declarations.
- Colors: Pass the full `--color-*` token set from this plan's Color System section
- Corners: `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 16px`, `--radius-pill: 999px`
- Elevation: 3-tier shadow system from tokens
- Touch targets: 52px minimum on all interactive elements

#### Nano Banana 2 — Asset Generation Pipeline

[Nano Banana 2](https://blog.google/innovation-and-ai/technology/ai/nano-banana-2/) (Gemini 3.1 Flash Image) generates custom imagery. Available in [Antigravity](https://blog.google/innovation-and-ai/technology/developers-tools/build-with-nano-banana-2/) and AI Studio. Supports 14 aspect ratios including ultra-tall/wide (1:4, 4:1, 1:8, 8:1) useful for onboarding scroll illustrations.

**Pricing tiers** ([source](https://www.aifreeapi.com/en/posts/nano-banana-2-pricing)):

| Resolution | Standard API | Batch API (50% off) | Project Use |
|------------|-------------|--------------------:|-------------|
| 512px | $0.045 | $0.022 | Icons, badges, textures |
| 1024px | $0.067 | $0.034 | Red Panda poses (Retina 2×), illustrations |
| 2048px | $0.101 | $0.050 | Not needed |
| 4096px | $0.151 | $0.076 | Not needed |

> **Cost optimization:** Use **Batch API** for all non-urgent asset generation (50% instant savings). Generate Red Panda pose set (8-10 images) and badge set (9 images) as batch requests. Estimated total asset cost: 33 images × $0.034 avg (batch, 1024px) ≈ **$1.12** for all project imagery.

**Use cases for this project:**

| Asset Category | Nano Banana Prompt Strategy | Output |
|---------------|---------------------------|--------|
| Red Panda poses (8-10) | "Cute red panda character, warm studio illustration style, [pose]: coaching, celebrating, thinking, encouraging, sleeping, waving, playing violin, reading" | PNG, transparent bg, 512×512 |
| Achievement badges (9) | "Round badge icon, warm gold border, embossed style: [achievement name]" — maintain 5-character consistency across all 9 | PNG, 256×256 |
| Game skill icons (5) | "Rounded icon, [skill color] palette: pitch/rhythm/reading/bowing/posture" | SVG-style PNG, 128×128 |
| Onboarding illustrations (5) | "Child-friendly illustration, warm tones, cozy music room: [step theme]" | PNG, 768×480 |
| Background textures (3) | "Subtle seamless texture: warm linen / soft parchment / light wood grain" | Tileable PNG, 512×512 |
| Empty states (4) | "Cute red panda illustration, [context]: no songs yet / no recordings / loading / offline" | PNG, 400×300 |

**Workflow:**
1. Generate via Nano Banana 2 **Batch API** (model: `gemini-3.1-flash-image-preview`) — 50% cost savings on all non-urgent assets
2. Use character consistency for Red Panda poses — generate full set in a single batch request for visual coherence
3. Generate at **1024px** resolution (2× for Retina iPad displays). Use 512px only for icons/badges/textures.
4. Optimize with `sharp` or `squoosh` CLI before adding to `public/assets/`
5. Reference in CSS/JSX via standard `<img>` tags — no build-time image optimization (static PWA)
6. For onboarding scroll illustrations, use **1:4 ultra-tall** aspect ratio (native Nano Banana 2 support, no cropping)

**Asset generation schedule:**
- **Phase 0:** Background textures (3), Red Panda coaching pose (1, for design system validation)
- **Phase 2:** Red Panda poses (full set of 8-10), Onboarding illustrations (5), Empty states (4)
- **Phase 4:** Achievement badges (9), Game skill icons (5)

---

### Migration Strategy: Strangler Fig

The core technical challenge is migrating 334 JS files (35K LOC) without breaking 567 unit tests and 45 E2E tests. A big-bang rewrite will fail. Use the **strangler fig pattern**:

#### Phase 1: React Shell Around Vanilla Core

```
┌─────────────────────────────────────────┐
│  React Shell (App, Router, Layout, Nav) │
│  ┌───────────────────────────────────┐  │
│  │  Legacy Bridge Container          │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  Existing Vanilla Module    │  │  │
│  │  │  (mounted via bridge API)   │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

1. Add React + React Router to the Vite config (React plugin, not a framework swap)
2. Create a React app shell: root layout, child nav, parent gate
3. Build a `<LegacyBridge>` component that mounts existing vanilla modules into a React-managed container
4. Each route initially renders `<LegacyBridge module="home" />` etc.
5. Existing vanilla modules are mounted/unmounted by the bridge, preserving their lifecycle
6. **All existing tests continue to pass** — vanilla modules are unchanged

#### Phase 2+: Progressive Replacement

Replace legacy bridges one at a time with native React components:
1. Pick a module (e.g., `songs`)
2. Build the React replacement
3. Add tests for the React version
4. Swap `<LegacyBridge module="songs">` → `<SongsPage />`
5. Delete the legacy module when fully replaced
6. Repeat

**Rule:** At every commit, `npm run handoff:verify` passes. No "migration branch" that diverges for weeks.

**Modules requiring special migration attention:**
- `async-gate.js` — Promise-based initialization gate; React equivalent is `<Suspense>` + lazy loading
- `view-prefetch.js` — prefetches next likely view; replace with React Router `prefetch` or `<link rel="prefetch">`
- `view-paths.js` / `view-container.js` — view routing infrastructure; replaced entirely by React Router
- Analysis subsystem (4 files) — parent-facing charts/stats; migrate to React components in Phase 5
- `queued-async-runner.js` / `countdown.js` / `animation-frame.js` — utility modules used by games; carry forward unchanged behind bridge

### App Bootstrap Sequence

The current app boots through a chain of vanilla modules that must integrate cleanly with the React shell:

```
index.html
  └→ module-loader.js          (dynamic import orchestrator)
       ├→ ServiceWorkerBootstrap (registers SW, waits for activation)
       ├→ AsyncGate              (resolves when critical modules ready)
       ├→ module-registry.js     (singleton Map of module name → factory)
       └→ navigation-controller.js (hash → view dispatcher)
            └→ view-loader.js    (mounts/unmounts view modules)
```

**React integration plan:**
1. `index.html` entry point changes from `module-loader.js` to `main.tsx` (React root)
2. `<AppRuntimeProvider>` replaces `AsyncGate` — wraps `<Suspense>` around lazy providers for storage, audio, platform, persona
3. `module-registry.js` remains as-is during bridge period — `<LegacyBridge>` calls `registry.get(moduleName)` to obtain mount functions
4. `navigation-controller.js` and `view-loader.js` are **fully replaced** by React Router — these do not survive Phase 1
5. `ServiceWorkerBootstrap` stays vanilla — called once in `main.tsx` before `ReactDOM.createRoot()`, not wrapped in React lifecycle
6. `module-loader.js` idle-stagger logic migrates to React `lazy()` + route-level code splitting; its `requestIdleCallback` pattern is no longer needed

### Platform Module Strategy

26 platform files install ambient listeners (orientation, visibility, viewport, wake lock, network). Strategy: **keep vanilla, mount once**.

| Module | Listener Type | React Integration |
|--------|--------------|-------------------|
| `viewport-offset-controller.js` | `visualViewport` resize/scroll | Singleton — init in `<AppRuntimeProvider>`, expose via `usePlatform()` context |
| `power-controls.js` | `visibilitychange`, `pagehide` | Singleton — fire-and-forget wake lock; init once, never unmount |
| `ipados-capabilities.js` | None (read-once) | Call once in provider, memoize result |
| `orientation-controller.js` | `screen.orientation` change | Singleton — expose `orientation` value via `usePlatform()` |
| `network-status.js` | `online`/`offline` | Singleton — expose via `usePlatform()` |
| `standalone-detect.js` | `matchMedia` display-mode | Read-once in provider |
| `accelerator.js` | None (read-once) | Read-once in provider |

**Pattern:** All 26 files stay as vanilla JS modules. `<AppRuntimeProvider>` calls their `init()` once on mount and never calls `dispose()` — these are app-lifetime singletons. React components access platform state via `const { orientation, isOnline, isStandalone } = usePlatform()`. No React re-renders on platform changes unless the consuming component subscribes via the context.

### Curriculum Engine Integration

7 curriculum files (`curriculum-engine.js`, `mission-generator.js`, `practice-session.js`, `skill-profile.js`, `practice-policy.js`, `progress-model-primary.js`, `song-progression.js`) form a complex state machine.

**Strategy:** Curriculum engine stays vanilla behind `<LegacyBridge>` through **all of Phase 1 and Phase 2**. It migrates in Phase 3 when the core habit loop is native React.

- **Phase 1-2:** `<CurriculumProvider>` wraps the vanilla engine in a React context. It calls `curriculumEngine.init()` on mount, subscribes to `panda:progress-updated` / `panda:mission-complete` events, and exposes `{ currentMission, skillProfile, nextStep }` to React consumers via `useCurriculum()`.
- **Phase 3 migration:** Replace vanilla state machine with React state + reducers. Port `mission-generator.js` logic into a `useMissionGenerator()` hook. `practice-policy.js` becomes a pure function called by the hook.
- **WASM dependency:** `progress-model-primary.js` calls `calculate_streak()` and `calculate_skill_profile()` from panda-core WASM. These calls stay synchronous — the WASM module is loaded by the provider and passed down. No async boundary needed.

### Legacy Bridge API

```typescript
interface LegacyModuleAdapter {
  /** Mount the module into a container, return a cleanup function */
  mount(container: HTMLElement, context: BridgeContext): () => void;
}

interface BridgeContext {
  /** Current route params */
  params: Record<string, string>;
  /** Navigate to a new route (React Router) */
  navigate: (path: string) => void;
  /** Access shared state (persistence, audio, etc.) */
  runtime: AppRuntime;
}
```

Existing modules gain a thin `mount()` wrapper that:
1. Calls the module's existing `init()` / setup function
2. Returns a cleanup function that calls `dispose()` / teardown
3. Forwards navigation events to React Router instead of `window.location.hash`

### Utilities Inventory Strategy

`src/utils/` contains ~39 files. These are pure functions and small helpers — they do not need React migration. Strategy: **keep as-is, import directly**.

| Category | Files | Action |
|----------|-------|--------|
| Math | `math.js`, `clamp.js`, `positive-round.js` | Keep vanilla. Import in React components directly. |
| DOM | `dom-utils.js`, `ensure-child-div.js` | Keep vanilla. Used only by `<LegacyBridge>` internals and legacy modules. Gradually unused as modules migrate. |
| Date/Time | `day-utils.js`, `countdown.js`, `session-timer.js` | Keep vanilla. React components import `formatCountdown()`, `todayDay()`, etc. |
| Audio | `recording-export.js`, `tone-player-utils.js` | Keep vanilla. `tryShareFile()` stays as shared export util. |
| Canvas | `canvas-engine.js`, `canvas-engine-base.js` | Keep vanilla. Used by game canvases behind `<LegacyBridge>`. |
| String/Format | `star-string.js`, `format-utils.js` | Keep vanilla. Import as needed. |
| Event | `emit-event.js` | Migrates to `AppEventBus.emit()` in Phase 3. |
| Storage | `storage.js`, `storage-collections.js`, `loaders.js` | Keep vanilla — persistence layer is frozen for v1. |

**Rule:** No utility file needs a React wrapper or hook unless it manages state or subscriptions. Pure functions stay pure. If a util is only used by a single module that gets deleted during migration, delete the util too.

### Custom Event Bus Migration

**Current state:** 30+ named `panda:*` custom events dispatched on `document` via `document.addEventListener` / `document.dispatchEvent` across 68+ files (~137 listener registrations). This is the most pervasive cross-cutting concern.

**Key event categories:**
- Progress: `panda:event-logged`, `panda:progress-updated`, `panda:achievement-unlocked`
- Audio: `panda:audio-ready`, `panda:mic-permission`, `panda:sounds-change`
- Coach/RT: `panda:cue-state`, `panda:session-start`, `panda:session-end`, `panda:mission-complete`
- Navigation: `VIEW_RENDERED`, `panda:view-change`
- UI: `panda:theme-change`, `panda:settings-change`, `panda:toast`

**Migration strategy (phased, not big-bang):**

1. **Phase 1 (bridge period):** Keep `document` event bus working. `<LegacyBridge>` cleanup functions call `removeEventListener` for bridge-scoped listeners. No changes to event dispatch side.
2. **Phase 2:** Introduce a typed `AppEventBus` singleton (thin wrapper around `EventTarget`). New React code subscribes via `useAppEvent(eventName, handler)` hook (auto-cleanup on unmount). Vanilla modules keep using `document.addEventListener`.
3. **Phase 3:** Migrate dispatch sites: `emitEvent('panda:foo', detail)` calls route to `AppEventBus.emit()` which also dispatches on `document` (dual-emit) for backward compat with any remaining vanilla listeners.
4. **Phase 4:** When a module is fully React, remove its `document.addEventListener` calls and use only `useAppEvent`. Remove dual-emit for events that have zero vanilla listeners remaining.
5. **Final:** When all modules are React, `AppEventBus` can be replaced with React context / state if desired, or kept as a lightweight pub-sub.

**`VIEW_RENDERED` specifically:** This event will NOT fire under React Router. Replace with `useEffect` in route components or a `<RouteChangeTracker>` component that fires equivalent analytics/lifecycle hooks.

**Rule:** Never remove a `document.dispatchEvent` call until all listeners for that event are confirmed migrated. Use `grep -r 'addEventListener.*panda:event-name'` to verify.

**Dual-emit window:** Phase 3 dual-emit (dispatching on both `AppEventBus` and `document`) begins when the first dispatch site migrates and ends when the last vanilla listener for that event is removed. Track per-event migration status in `docs/architecture/event-bus-migration.md` — a table of event name, dispatch sites (vanilla/React), listener sites (vanilla/React), dual-emit active (yes/no). An event's dual-emit can be removed when its "vanilla listener" column is empty. Target: all dual-emit removed by end of Phase 4.

### State Management

**Current state:** Decentralized — each subsystem owns its state via `storage.js` facade over IndexedDB/localStorage.

**Strategy:** Keep the existing persistence layer as-is. Do NOT introduce Redux/Zustand/Jotai for v1. Instead:

1. **Persistence layer stays vanilla** — `src/persistence/storage.js` + `storage-collections.js` + `loaders.js` continue to work unchanged. React hooks (`useStorage(key)`) provide reactive reads.
2. **React state** — React components use hooks (`useState`, `useReducer`, `useContext`) for UI state
3. **Shared runtime context** — A single `<AppRuntimeProvider>` wraps the app and provides:
   - Storage access (read/write via existing `storage.js`)
   - Audio context singleton
   - Platform capabilities
   - Current user persona (child/parent)
4. **No global state library** — The app's state is persistence-first, not UI-first. Adding a state library creates a second source of truth.

### Persistence Contracts (Preserved Exactly)

These IndexedDB/localStorage keys and their data shapes are **frozen for v1** (complete registry from `storage-keys.js`):

**Core data:**
- `EVENTS_KEY` (`panda-violin:events:v1`) — practice/game/song events
- `RECORDINGS_KEY` (`panda-violin:recordings:v1`) — audio blob metadata
- `PROGRESS_KEY` (`panda-violin:progress:v1`) — progress snapshots + achievements
- `UI_STATE_KEY` (`panda-violin:ui-state:v1`) — scroll, last view, preferences

**Curriculum + mission:**
- `CURRICULUM_STATE_KEY` (`panda-violin:curriculum-state-v1`) — mission/level progression
- `MISSION_HISTORY_KEY` (`panda-violin:mission-history-v1`) — completed mission log
- `SONG_PROGRESS_KEY` (`panda-violin:song-progress-v2`) — per-song mastery (note: v2)
- `GAME_MASTERY_KEY` (`panda-violin:game-mastery-v1`) — per-game mastery state

**ML / adaptive:**
- `ML_MODEL_KEY` (`panda-violin:ml:adaptive-v1`) — adaptive engine model payload
- `ML_LOG_KEY` (`panda-violin:ml:events:v1`) — adaptive engine event history
- `ML_RECS_KEY` (`panda-violin:ml:recs-v1`) — cached recommendations

**Realtime coaching:**
- `RT_PROFILE_KEY`, `RT_EVENT_LOG_KEY`, `RT_POLICY_KEY`, `RT_QUALITY_KEY`, `RT_UI_PREFS_KEY` — realtime coaching state (5 keys)

**Parent zone:**
- `PARENT_GOAL_KEY` (`panda-violin:parent-goal-v1`) — goal configuration
- `PARENT_PIN_KEY` (`panda-violin:parent-pin-v2`) — current PIN record (PBKDF2)
- `PARENT_PIN_LEGACY_KEY` (`panda-violin:parent-pin-v1`) — legacy PIN (migration source → v2)
- `PARENT_UNLOCK_KEY` (`panda-violin:parent-unlocked`) — temporary unlock state

**Platform / install:**
- `INSTALL_GUIDE_KEY` (`panda-violin:install-guide:v1`) — install guide dismissal
- `PERSIST_REQUEST_KEY` (`panda-violin:persist-request-v1`) — persistent storage request attempts

**Offline + vitals:**
- `OFFLINE_MODE_KEY`, `OFFLINE_METRICS_KEY` — offline state and integrity metrics
- `WEB_VITALS_KEY` (`panda-violin:web-vitals-v1`) — 40-session rolling LCP/INP/CLS history

**Onboarding:**
- `ONBOARDING_KEY` (`onboarding-complete`) — onboarding completion flag
- `CHILD_NAME_KEY` (`panda-violin:child-name-v1`) — child name entered during onboarding step 2; used by Panda speech and mission personalization

**Game subsystems (not in `storage-keys.js` but used):**
- `GAME_FAVORITES_KEY` (`panda-violin:game-favorites:v1`) — favorite game IDs for sort/filter (in `game-sort-model.js`)
- `AUTO_GOALS_KEY` (`panda-violin:coach-auto-goals:v1`) — auto-generated goal queue (in `mission-progress-goals.js`)

**Total: 28+ keys. Any schema change requires a versioned migration with rollback.**

### Service Worker Strategy

The current SW (`public/sw.js`, v114) is deeply custom: generated precache manifest, 180-entry LRU runtime cache, codec-aware audio fallback. It stays.

**Changes needed:**
1. Update `scripts/build-sw-assets.js` to discover new file-based route chunks
2. Update SW route matching from `#view-*` patterns to pathname patterns
3. Add App Shell fallback: all navigation requests → `/index.html` (SPA behavior)
4. Preserve offline.html fallback
5. Preserve audio codec runtime fallback (`.wav` → `.opus`/`.mp3`)
6. Preserve recording blob caching

7. Update `public/manifest.webmanifest` shortcuts from hash URLs to pathnames:
   - `./#view-tuner` → `./tools/tuner`
   - `./#view-coach` → `./practice`
   - `./#view-songs` → `./songs`
   - `./#view-games` → `./games`
8. Manifest already has `display_override` (`standalone` → `fullscreen` → `minimal-ui`) and `launch_handler` (`focus-existing`) — preserve these.

**Offline integrity cache:** `offline-integrity-cache.js` has a hardcoded `CRITICAL_OFFLINE_ASSETS` list including font paths. If fonts change (e.g., Nunito → Figtree), this list MUST be updated or offline integrity checks will report missing assets. Consider generating this list from build manifest instead of hardcoding.

**Do NOT adopt `next-pwa`, `@serwist/next`, or any framework SW adapter.** The custom SW is battle-tested and framework adapters add abstraction without value for this app.

### Audio / WASM Bridge

The realtime audio pipeline is the most complex subsystem and the highest migration risk:

```
Microphone → AudioWorklet (rt-audio-processor.js)
           → WASM PitchDetector (panda-audio)
           → Feature extraction
           → RT Session Controller → Policy Worker → UI overlay (coach-overlay.js body-append)
```

**Full RT subsystem (~20 files):**
- `rt-audio-processor.js` (AudioWorklet) — pitch detection + echo buffer
- `rt-session-controller.js` — orchestrates session lifecycle, emits 6 event types: `pitch`, `note-onset`, `note-off`, `bow-event`, `dynamics`, `silence`
- `policy-worker.js` (dedicated Web Worker) — runs coaching decision logic off main thread; receives RT events, emits cue decisions
- `CUE_STATES` enum — `idle` / `listening` / `prompting` / `celebrating` / `correcting` — drives Panda coach overlay state
- `coach-overlay.js` — body-appended overlay (not view-scoped); reads `CUE_STATES` to show contextual feedback
- RT persistence: 5 storage keys (`RT_PROFILE_KEY`, `RT_EVENT_LOG_KEY`, `RT_POLICY_KEY`, `RT_QUALITY_KEY`, `RT_UI_PREFS_KEY`)

**Strategy:**
1. Audio modules stay vanilla JS through v1. They work. Don't touch them.
2. React components interact with audio through the `AppRuntimeProvider` context
3. `<RealtimeSessionProvider>` wraps routes that need live audio (tuner, games with mic input)
4. The provider manages AudioContext lifecycle, worklet setup, and WASM initialization
5. React components receive pitch/feature data through a hook: `useRealtimeAudio()`
6. Policy Worker stays as dedicated Web Worker; React provider posts messages to it and reads cue decisions
7. `coach-overlay.js` migrates to a React portal (`<CoachOverlay>`) rendered from `<RealtimeSessionProvider>`
8. **`<CoachOverlay>` and the practice runner coaching strip are the same `<PandaSpeech>` component** in two configurations: `<PandaSpeech size="sm" position="strip">` (fixed bottom strip in `/practice`) vs. `<PandaSpeech size="lg" position="overlay">` (body-appended portal for tuner/games). Both subscribe to the same CUE_STATE feed from the Policy Worker via `useRealtimeAudio()`. Only one renders at a time — whichever route is active.
9. **The actual audio processing chain remains unchanged** — only the UI layer is React

**Risk mitigation:** If any audio module is broken during migration, the bridge allows instant rollback to the vanilla version on that route.

### WASM Lifecycle Under React

**Problem:** WASM modules (`panda-audio`, `panda-core`) are initialized once at startup via dynamic `import()`. Under React, components mount/unmount on navigation. WASM must remain a singleton, not re-initialize per mount.

**Strategy:**
1. `<AppRuntimeProvider>` initializes WASM once (top-level `useEffect` with empty deps)
2. WASM instances stored in context; components access via `useRuntime().wasm`
3. WASM init is async — provider shows `<Skeleton>` until ready, then renders children
4. If WASM init fails, provider falls back to JS-only mode (`progress-model-fallback.js`)
5. AudioWorklet (`rt-audio-processor.js`) instantiation stays in `<RealtimeSessionProvider>` (only routes with mic)

### React Strict Mode Considerations

**Problem:** React Strict Mode double-invokes effects in development. This re-exposes the click-handler stacking bugs fixed in passes 13-14 (`echo.js`, `stir-soup.js`, `wipers.js`) if game `init()` runs inside `useEffect`.

**Mitigations:**
1. `<LegacyBridge>` calls `mount()` in `useEffect` with cleanup calling `dispose()` — Strict Mode will mount→unmount→mount, which is safe IF `dispose()` fully cleans up
2. Game `dispose()` functions MUST be idempotent and complete (already enforced by passes 13-14)
3. `async` flag pattern (`let active = false`) prevents zombie listeners from double-invoke (established in `dynamic-dojo.js`)
4. **Test in Strict Mode during development. Disable for production builds.**
5. AudioContext resume must be guarded — double-invoke of `resume()` on already-running context is a no-op (safe)

### TypeScript Configuration

```json
// tsconfig.json (new file)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "allowJs": true,           // Bridge period: existing JS files type-checked loosely
    "checkJs": false,          // Don't type-check legacy JS
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "paths": {
      "@/*": ["./src/*"]       // Alias for clean imports
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist", "wasm"]
}
```

---

## Performance Budget

The current app loads zero framework JS. The reboot will add React. Define hard budgets before writing code:

| Metric | Budget | Current | Notes |
|--------|--------|---------|-------|
| Initial JS (compressed) | < 80KB | ~35KB | React adds ~45KB; must offset |
| LCP | < 2.0s | measured | iPad mini 6, Safari, 4G throttle |
| TTI | < 3.5s | measured | Same conditions |
| Total transfer (shell) | < 200KB | measured | Excludes lazy chunks |
| Largest lazy chunk | < 50KB | N/A | Per-route code splitting |
| WASM load | < 100ms | ~80ms | panda-audio + panda-core |
| CLS | < 0.05 | measured | Skeleton → content swap |

**Enforcement:**
- Add Lighthouse CI to quality gate (`.github/workflows/quality.yml`)
- Add bundle size check to PR workflow (`npm run audit:perf`)
- Measure on iPad mini 6 Simulator with 4G throttle at each phase gate
- If any budget is exceeded, the phase is not complete

---

## Safari And iPad Constraints

- Portrait-first at `768px`, explicit landscape at `1024px+`
- Touch-primary: no hover-only interactions, `52px` minimum primary controls, clear spacing
- `100dvh` not `100vh` for Safari toolbar clearance
- **Feature detection** for all API gating — no UA sniffing for capabilities
- Safe-area insets via `env(safe-area-inset-*)` on all edge-touching elements
- `prefers-reduced-motion` respected for all transitions
- AudioContext `'interrupted'` + `'suspended'` both handled
- Microphone permission recovery with clear user messaging
- Wake lock API with graceful degradation
- Standalone display-mode detection for installed app behavior
- `desynchronized: true` on Canvas 2D contexts for GPU compositor
- Orientation change via `screen.orientation` API with `orientationchange` fallback
- iPadOS capabilities detection (`ipados-capabilities.js`): parses OS version for feature gating. Note: some iPad Safari builds freeze OS version in UA string — do NOT display parsed version to users.
- ML accelerator detection (`accelerator.js`): detects WebGPU availability for potential future ML inference. Currently informational only — no feature gates on this.

**Do NOT depend on:**
- Background Sync API
- Fullscreen API (unreliable on iPad Safari)
- Chrome-only transition features
- `navigator.vibrate()` (no Safari support)
- Push Notifications (WebKit support is limited and permission-hostile for children)

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Bundle size exceeds iPad mini 6 budget | High | High | Measure at every phase gate; aggressive code splitting; tree-shake unused React features |
| Audio pipeline breaks during migration | Medium | Critical | Keep audio modules vanilla through v1; bridge pattern allows instant rollback |
| SW integration with new routing fails | Medium | High | Spike SW + SPA routing in Phase 0; keep custom SW, don't adopt framework adapter |
| Game canvas lifecycle breaks under React | Medium | High | Games stay in `<LegacyBridge>` through Phase 3; migrate only with dedicated testing |
| TypeScript migration slows velocity | Medium | Medium | `allowJs: true`; only type new code; don't block features on typing |
| Scope creep from "enhancement" requirement | High | High | Allow "deferred" status in matrix; enhancement can be small (a11y fix counts) |
| E2E tests break during shell migration | Medium | High | Phase 1 must pass all 45 E2E tests before proceeding |
| IndexedDB schema drift during migration | Low | Critical | Freeze all storage keys/shapes; versioned migrations only |
| 3D (R3F) blows performance budget on iPad mini | High | Medium | Defer 3D to post-launch; ship 2D reboot first |
| Loss of offline-first behavior | Medium | High | SW strategy defined upfront; offline E2E test retained |

---

## Delivery Phases

### Pre-Phase 0 Checklist (Day 1 Blockers)

These must be done before any Phase 0 work begins. They are pure setup — no design decisions.

- [x] **Install React stack:** `npm install react@19 react-dom@19 react-router@7`
- [x] **Install dev deps:** `npm install -D @vitejs/plugin-react @testing-library/react@16 @testing-library/jest-dom@6 @testing-library/user-event@14`
- [x] **Vite config:** Add `@vitejs/plugin-react` to `vite.config.js` plugins array. Enable JSX transform. Add CSS Modules: `css: { modules: { localsConvention: 'camelCase' } }`
- [x] **TypeScript (optional):** If enabling TS, add `tsconfig.json` with `allowJs: true`, `jsx: "react-jsx"`, `strict: true`. Otherwise, use JSDoc types in `.jsx` files.
- [x] **RTL setup:** Create `tests/setup-rtl.js` that imports `@testing-library/jest-dom`. Add to Vitest `setupFiles` in `vitest.config.js`. Verify with a trivial `render(<div>hello</div>)` test.
- [x] **PDF export library:** `npm install jspdf` (for parent checklist/data export). No other runtime deps.
- [x] **WASM + React strict mode:** Verify WASM init is idempotent — React 19 strict mode double-invokes effects in dev. `panda_audio.js` and `panda_core.js` init must not crash on double-call. Add guard: `if (wasmInstance) return wasmInstance;`
- [x] **Verify existing tests pass:** Run `npm run handoff:verify` — 567 unit + 45 E2E must pass with new deps installed, before any code changes.

### Phase 0: Reboot Spec + Technical Spike (1-2 weeks)

**Goal:** Validate framework choice, prove bridge pattern, establish design system.

**Deliverables:**
- [x] Framework spike: Vite + React SPA with `<LegacyBridge>` mounting one vanilla module (home)
- [x] SW spike: custom SW working with SPA pathname routing
- [x] Performance baseline: measure current app on iPad mini 6 Simulator (LCP, TTI, CLS, bundle)
- [x] Route map finalized (above)
- [x] Design system implemented: CSS custom properties for colors, typography, spacing, elevation, easing, duration tokens
- [x] Figtree font evaluation: load test on iPad mini 6, measure FOUT/FOIT, confirm fallback chain
- [x] Component primitives built: `<Button>`, `<Card>`, `<NavBar>`, `<PandaSpeech>`, `<Skeleton>`, `<LegacyBridge>`
- [x] Feature matrix created (`docs/architecture/reboot-feature-matrix.md`)
- [x] Hash → pathname redirect script working
- [x] Target state doc (`docs/architecture/next-reboot-target-state.md`)
- [x] Page-by-page wireframes validated on iPad mini 6 Simulator at 768px portrait

**Gate:** Spike passes all 45 E2E tests with React shell + legacy bridge. Performance baseline documented.

**Antigravity Workflow — Phase 0:**
```
Workflow name: "phase-0-spike"
Agents (5 parallel):
  1. Framework spike — Vite + React SPA + LegacyBridge mounting home module
  2. SW spike — custom SW with SPA pathname routing
  3. Design system — CSS custom properties (full token set from plan)
  4. Stitch screens — generate Button, Card, NavBar, PandaSpeech, Skeleton at tablet res
  5. Perf baseline — iPad mini 6 Simulator: LCP, TTI, CLS, bundle size

Nano Banana (Phase 0): Background textures (3), Red Panda coaching pose (1)
Gemini 3.1 Pro: High for spike code, Medium for design token validation
```

### Phase 1: React Shell + Navigation (2-3 weeks)

**Goal:** React owns the shell, routing, and navigation. All content renders through legacy bridges.

**Deliverables:**
- [x] React app shell: root layout, `<Suspense>` boundaries, error boundaries
- [x] Child bottom nav (5 items) as React component
- [x] Parent gate (PIN) as React component
- [x] All 17 current views mounted via `<LegacyBridge>`
- [x] All 17 games mounted via `<LegacyBridge>`
- [x] `<AppRuntimeProvider>` wrapping app (storage, audio, platform, persona)
- [x] Hash redirect script active
- [x] Eager/idle module loading ported to React lazy + Suspense
- [x] CSS Modules for shell components; global CSS unchanged
- [x] Shared components built in Phase 1: `<Modal>`, `<ProgressBar>`, `<StarRating>`, `<FilterChips>`, `<ErrorBoundary>`, `<Skeleton>`, `<PandaSpeech>` — used by all later phases

**Gate:** `npm run handoff:verify` passes (567 unit + 45 E2E). No visual regression on iPad Safari.

**Antigravity Workflow — Phase 1:**
```
Workflow name: "phase-1-shell"
Agents (5 parallel):
  1. React shell — root layout, Suspense boundaries, error boundaries, AppRuntimeProvider
  2. LegacyBridge — mount/unmount 17 views + 17 games, BridgeContext interface
  3. E2E pathname helpers — create wrappers before any route changes (timing guarantee)
  4. CSS Modules — shell components only; global CSS untouched
  5. Shared components — Modal, ProgressBar, StarRating, FilterChips, ErrorBoundary, Skeleton

Stitch screens: App shell layout, bottom nav (5 items), parent PIN gate, error fallback
Gemini 3.1 Pro: High for bridge lifecycle code, Medium for component tests
```

### Phase 2: Core Habit Loop (3-4 weeks)

**Goal:** The primary user flow — open app → see mission → practice → earn reward — is fully native React.

**Deliverables:**
- [x] **Home page** — Daily mission display, "start practice" CTA, Red Panda embedded guide
- [x] **Practice runner** — Step-through UI with progress bar, timing, pause/resume, completion state
- [x] **Wins page** — Child-friendly streaks, achievements, rewards display
- [x] **Onboarding** — Full rebuild (existing scroll-snap carousel not reusable): 5-step wizard, `CHILD_NAME_KEY` persisted, progressive save
- [x] Curriculum/mission state integrated with React via hooks
- [x] Progress model integrated with React via hooks (including WASM fallback path via `progress-model-fallback.js`)
- [x] Auto-goals engine wired: `AUTO_GOALS_KEY` populated from curriculum + ML recommendations
- [x] EMA baseline seeded after first song/game completion (first-activity calibration)
- [x] Web Vitals write-side: LCP/INP/CLS captured from first session, persisted to `WEB_VITALS_KEY`
- [x] Custom event bus: `AppEventBus` singleton created, `useAppEvent()` hook available, dual-emit for backward compat
- [x] Legacy bridges removed for: home, coach, progress, onboarding

**Gate:** Core habit loop E2E test passes. New onboarding → first mission → completion flow tested. Performance budget met on iPad mini 6.

**Antigravity Workflow — Phase 2:**
```
Workflow name: "phase-2-habit-loop"
Agents (5 parallel):
  1. Home + Mission — daily mission display, CTA, Red Panda coach embed
  2. Practice runner — step-through UI, progress bar, timer, pause/resume
  3. Onboarding — 5-step wizard, progressive save, CHILD_NAME_KEY
  4. Event bus — AppEventBus singleton, useAppEvent() hook, dual-emit bridge
  5. Wins page — streaks, stars, badges, skill meters (SVG animated fills)

Stitch screens: Home, Practice runner steps, Wins trophy shelf, Onboarding wizard (5 steps)
Nano Banana: Red Panda full pose set (8-10), Onboarding illustrations (5), Empty states (4)
Gemini 3.1 Pro: High for curriculum/mission integration, High for event bus dual-emit
```

### Phase 3: Tools + Child Settings (2-3 weeks)

**Goal:** All tools are native React with enhanced UX. Child settings page functional.

**Deliverables:**
- [x] **Tool selector** — 5-tool hub with purpose-driven entry points
- [x] **Tuner** — React wrapper around existing audio pipeline, better permission/error UX
- [x] **Metronome** — New page: BPM slider, tap tempo, visual beat, subdivisions, accent toggle
- [x] **Drone tones** — New page: 4 string buttons, sustained reference tone via tone-player synth, volume control
- [x] **Bowing trainer** — Enhanced feedback, camera permission pre-prompt, help states
- [x] **Posture trainer** — Enhanced feedback, camera permission pre-prompt, help states
- [x] **Child settings** (`/settings`) — Sound toggle, motion toggle, text size, background theme, help + parent links
- [x] `<RealtimeSessionProvider>` for routes needing live audio (wraps tuner, mic games, bowing/posture)
- [x] `useRealtimeAudio()` hook
- [x] `<CoachOverlay>` React portal migrated from `coach-overlay.js` body-append pattern
- [x] RT coaching presets (gentle/standard/challenge) read from parent settings and wired into policy Web Worker
- [x] Voice coach toggle migrated to `<ChildSettings>` (reads `featureFlags.voiceCoachEnabled`)
- [x] Legacy bridges removed for: tuner, trainer, bowing, posture, settings

**Gate:** Tuner works on iPad mini 6 Safari with real microphone. Metronome/drone functional with Web Audio. Audio recovery from interruption tested. Child settings persist across sessions.

**Antigravity Workflow — Phase 3:**
```
Workflow name: "phase-3-tools"
Agents (5 parallel):
  1. Tuner — React wrapper around RT audio pipeline, permission UX
  2. Metronome + Drone — new pages, Web Audio synth, BPM slider, tap tempo
  3. Bowing + Posture — camera permission pre-prompt, enhanced feedback
  4. Child settings — sound/motion/text-size/background toggles, persistent
  5. CoachOverlay — React portal from coach-overlay.js, RT presets wired

Stitch screens: Tool selector hub, Tuner, Metronome, Drone, Bowing, Posture, Child settings
Gemini 3.1 Pro: High for RealtimeSessionProvider + useRealtimeAudio() hook (AudioWorklet + WASM)
```

### Phase 4: Content Libraries (4-5 weeks)

**Goal:** Songs and Games on enhanced React shells with full detail pages.

**Deliverables:**
- [x] **Songs library** — Search, filter, skill tags, difficulty badges, "ready to play" indicators, 3-tier organization
- [x] **Song detail** — Scrolling staff, CSS playhead, BPM display, practice tips, section checkpoints, mastery display
- [x] **Song recording** — MediaRecorder integration, count-in, auto-assess, recording history, playback
- [x] **Song assessment** — Weighted scoring (timing 45% + intonation 45% + overall 10%), mastery tier display
- [x] **Games catalog** — Skill-filtered grid with 5 color-coded skill categories, difficulty framing, personal bests
- [x] **Game shell component** — `<GameShell>` with consistent pre-game (objectives, tips, difficulty), in-game (full-bleed, HUD), post-game (stars, score, retry/done)
- [x] All 17 games mounted in new game shell (most still via `<LegacyBridge>` internally for canvas logic)
- [x] Per-game Panda tips (3-4 tips per game, rotated in pre-game state)
- [x] Adaptive difficulty integration — EMA per-game, auto-adjust after each play
- [x] All 30 songs with enhanced metadata (skill tags, difficulty stars, readiness indicators)
- [x] Spaced repetition integration — overdue songs/games appear in mission builder queue
- [x] Legacy bridges removed for: songs library, song detail, games catalog

**Note:** Individual game internals (canvas rendering, game state machines) may remain vanilla JS behind the bridge through v1. The game *shell* (entry, objectives, scoring, completion) is React. The game *engine* stays vanilla where it's working.

**Gate:** All 17 games launch and complete through `<GameShell>`. All 30 songs play with recording option. Song assessment working on 3+ songs. Feature matrix shows parity-plus for songs and games families.

**Antigravity Workflow — Phase 4:**
```
Workflow name: "phase-4-content"
Agents (5 parallel):
  1. Songs library + detail — search, filter, skill tags, sheet music, CSS playhead
  2. Game shell + catalog — <GameShell> 3-state, skill-filtered grid, color-coded cards
  3. Recording + assessment — MediaRecorder, count-in, weighted scoring, mastery tiers
  4. Adaptive difficulty — EMA per-game, auto-adjust, spaced repetition queue
  5. Song metadata — 30 songs with enhanced tags, difficulty stars, readiness indicators

Stitch screens: Songs library, Song detail, Games catalog, GameShell (pre/in/post), Post-game
Nano Banana: Achievement badges (9), Game skill icons (5)
Gemini 3.1 Pro: High for MediaRecorder + assessment pipeline, Medium for catalog UI
```

### Phase 5: Parent Zone + Support (3-4 weeks)

**Goal:** Parent workspace is a coherent, PIN-gated React surface with all 6 sub-panels.

**Deliverables:**
- [x] **Parent gate** — PIN entry/creation with clear UX (PBKDF2-hashed, existing contract)
- [x] **Review panel** — Session history, skill radar chart (SVG 5-axis), per-skill trends, song mastery table, RT coaching replay timeline
- [x] **Goals panel** — Daily time slider, weekly day checkboxes, recital date, progress bar
- [x] **Checklist panel** (enhanced from `home-teacher.js`) — Suzuki-style observation form, 5-point per-category ratings, notes, history, CSV/PDF export
- [x] **Recordings panel** — Library with playback, filter, individual + bulk export, delete, storage indicator
- [x] **Data panel** — JSON backup/restore, CSV practice log export, storage breakdown, clear-all with double confirmation, offline integrity check
- [x] **Settings panel** — Coaching style presets, ICS reminder export, per-game difficulty override, ML diagnostics (EMA values, demo mode, reset)
- [x] **Support pages** — `/support/help` (FAQ), `/support/about` (version), `/support/privacy` (policy)
- [x] All parent-facing features consolidated under tabbed workspace
- [x] Legacy bridges removed for: parent, analysis, backup, settings, recordings

**Gate:** Parent unlock → all 6 tabs navigate correctly → data export tested E2E → checklist save/load verified → ICS file downloads correctly.

**Antigravity Workflow — Phase 5:**
```
Workflow name: "phase-5-parent"
Agents (5 parallel):
  1. Parent gate + review — PIN entry, session history, SVG radar chart, coaching replay
  2. Goals + checklist — time slider, day checkboxes, Suzuki observation form, 5-point ratings
  3. Recordings + data — library, playback, export, storage, JSON backup/restore
  4. Settings + support — coaching presets, ICS export, ML diagnostics, FAQ/About/Privacy
  5. CSV/PDF export — jspdf integration, checklist export, practice log export

Stitch screens: Parent workspace (6-tab layout), Review (radar), Goals, Checklist, Recordings, Data, Settings
Gemini 3.1 Pro: High for SVG radar chart + coaching replay timeline, Medium for form UIs
```

### Phase 6: Consolidation + Launch (2-3 weeks)

**Goal:** Legacy bridges removed, performance tuned, platform features verified, launched.

**Deliverables:**
- [x] All remaining legacy bridges replaced or explicitly deferred with rationale
- [x] Legacy redirect script tested and verified (all hash routes including new metronome/drone/checklist)
- [x] Manifest shortcuts updated from hash URLs to pathnames; `display_override` and `launch_handler` preserved
- [x] Performance audit on iPad mini 6: all budgets met
- [x] Accessibility audit: all WCAG 2.1 AA violations resolved
- [x] Offline behavior verified: full app shell cached, recordings preserved, offline indicator works, integrity self-test functional
- [x] Install education: clear prompts for Home Screen installation
- [x] App Badge implemented: Badge API sets icon badge when no practice today, cleared after daily mission started (feature-detect + graceful degrade)
- [x] Platform features verified: App Badge, wake lock, orientation, sharing, audio codec fallback, ICS reminders, MediaSession
- [x] Web Vitals tracking confirmed: LCP/INP/CLS persisted, viewable in ML diagnostics
- [x] Feature matrix: every row is `parity-plus` or `deferred` with rationale
- [x] Dead code cleanup: removed unused legacy modules, CSS, test fixtures
- [x] Documentation updated: HANDOFF.md, architecture docs, CLAUDE.md
- [x] Spaced repetition + adaptive difficulty verified end-to-end across multiple sessions

**Gate:** `npm run handoff:verify` passes. Feature matrix complete. iPad mini 6 real-device testing pass. All 17 games through `<GameShell>`. All 30 songs with recording + assessment.

**Antigravity Workflow — Phase 6:**
```
Workflow name: "phase-6-launch"
Agents (5 parallel):
  1. Perf audit + a11y — iPad mini 6 budgets, WCAG 2.1 AA, Lighthouse
  2. Dead code cleanup — legacy modules, unused CSS, stale test fixtures
  3. Offline verification — SW cache shell, recordings offline, integrity self-test
  4. Platform features — App Badge, wake lock, orientation, sharing, MediaSession, ICS
  5. Documentation — HANDOFF.md, architecture docs, CLAUDE.md, feature matrix finalization

Gemini 3.1 Pro: Medium for cleanup passes, High for offline E2E edge cases
Final Stitch pass: Support pages (Help, About, Privacy), Install education screens
```

---

## Testing Strategy

### During Migration

- **Existing tests run at every commit.** The bridge pattern ensures vanilla modules work identically.
- **Unit tests for vanilla modules stay in Vitest** — don't rewrite tests until the module itself is rewritten
- **New React component tests use Vitest + React Testing Library**
- **E2E tests (Playwright) are the migration safety net** — they test user flows, not implementation details
- **Add new E2E tests for enhanced flows** (onboarding, practice runner, parent workspace)

### E2E Navigation Helper Migration

**Problem:** All 45 existing E2E tests use hash-based navigation helpers (`navigate-view.js`, `view-navigation.js`, `open-home.js`) that will break under React Router.

**Migration steps:**
1. **Phase 1, week 1 (before any route changes):** Create pathname-based helper wrappers that call `page.goto('/practice')` etc. Old helpers remain as aliases. Both helpers point to the same destinations — the pathname versions are future-proof, the hash versions work via redirect. **This is the first Phase 1 deliverable, before any component migration.**
2. **Phase 1 (hash redirect active):** Existing 45 E2E tests continue to pass unchanged — hash URLs redirect to pathnames. No immediate breakage.
3. **Phase 2+:** New E2E tests use pathname helpers exclusively. Existing tests are migrated to pathname helpers opportunistically (when touching a test for other reasons).
4. **Phase 6 (hash redirect removed):** Delete old hash-based helpers. Any remaining tests using hash helpers must be migrated first. Run `grep -r 'navigate.*#view' tests/` to find stragglers.
5. **`seed-kv.js`:** Update hardcoded `onboarding-complete` key to also seed `CHILD_NAME_KEY`. Update IDB version references if schema changes.
6. **Pathname helper timing guarantee:** All 45 existing E2E tests must pass at every commit. If a route change breaks an E2E test, the pathname helper for that route must be updated in the same commit — not deferred.

**New E2E tests to add:**
- Onboarding complete flow (5 steps → first mission)
- Practice runner (mission → step sequence → completion → wins)
- Parent workspace (PIN → tab switching → each panel)
- Hash redirect coverage (each legacy `#view-*` URL → correct pathname)
- Offline behavior (SW cache → practice works offline)

### Test Organization

```
tests/
  unit/           # Vitest — vanilla module tests (existing)
  components/     # Vitest + RTL — React component tests (new)
  e2e/            # Playwright — user flow tests (existing + new)
  integration/    # Vitest — bridge/provider integration (new)
```

### Coverage Requirements

- Every new React component has unit tests
- Every rewritten module replaces its vanilla tests with component tests
- E2E tests added for each new user flow
- Core habit loop (home → practice → completion → wins) has 3+ E2E scenarios
- Audio/WASM flows have dedicated integration tests
- Offline behavior has dedicated E2E tests

### Platform Test Matrix

| Device | Browser | Mode | Priority |
|--------|---------|------|----------|
| iPad mini 6 (real) | Safari 26.2 | Installed (Home Screen) | P0 |
| iPad mini 6 (Xcode Sim) | Safari 26.2 | Browser tab | P0 |
| iPad Pro 11 (Playwright) | WebKit | Automated | P0 (CI) |
| iPad Air (Xcode Sim) | Safari 26.2 | Installed | P1 |
| iPhone 15 (Xcode Sim) | Safari 26.2 | Browser tab | P2 |

---

## Design Philosophy

### The Feeling

The app should feel like **opening a favorite storybook** — warm, familiar, focused, and rewarding. Not a classroom. Not a dashboard. Not a game console. A place where a child sits down, knows exactly what to do, does it, and feels proud.

**Three emotional beats define every session:**
1. **Arrival** — "Welcome back. Here's what we're doing today." (Calm, clear, warm)
2. **Flow** — "You're doing great. Keep going." (Focused, encouraging, uncluttered)
3. **Celebration** — "Look what you did!" (Joyful, earned, specific)

### Design Principles

- **One thing at a time.** Every screen has one primary action. Secondary actions exist but don't compete. A child should never wonder "what do I tap?"
- **Earned complexity.** New features, harder songs, advanced tools — these appear when the child is ready, not before. The UI surface grows with the player.
- **The Panda is a friend, not a mascot.** The Red Panda speaks in short, encouraging sentences. It reacts to what the child does. It appears when helpful and stays quiet when the child is focused.
- **Parents are welcome guests.** The parent zone is intentionally separate — different visual tone, denser information, adult language. Entering it feels like stepping behind the curtain, not switching apps.
- **Touch is the only input.** Every interaction is designed for fingers on glass. No hover states needed. No tiny targets. No drag precision. Generous spacing, large hit areas, forgiving gesture zones.

---

## Visual Identity

### Aesthetic Direction: "Warm Studio"

The visual language is inspired by a **cozy music practice room** — warm wood tones, soft light, handcrafted textures, instruments on the wall. Not sterile. Not chaotic. A place where you want to spend time.

**What this means concretely:**
- Warm cream backgrounds, not cold white
- Rounded, pillowy shapes — never sharp corners
- Skeuomorphic depth on interactive elements (the 3D button shadows stay — they're a signature)
- Glass morphism for floating UI layers (preserved from current design)
- Subtle paper/linen texture on surfaces (CSS noise overlay, not image)
- Color comes from the Red Panda palette, not arbitrary decoration

### Color System

Evolve the current palette. Keep its warmth; improve contrast and semantic clarity.

```css
/* ── Core Identity (from the Red Panda) ── */
--color-primary:        #E95639;  /* Panda fur — CTAs, active states, primary actions */
--color-primary-light:  #F4795F;  /* Hover/focus variant */
--color-primary-dark:   #C43E26;  /* Pressed variant */
--color-secondary:      #F9A93F;  /* Golden orange — secondary actions, warmth */
--color-accent:         #4FB69E;  /* Jade green — success states, "go" signals */

/* ── Surfaces ── */
--color-bg:             #FFF9F3;  /* Warm cream — primary background */
--color-bg-alt:         #FFEFE2;  /* Slightly deeper — section differentiation */
--color-surface:        #FFFFFF;  /* Cards, modals — elevated content */
--color-surface-glass:  rgba(255, 255, 255, 0.92);  /* Glass morphism */

/* ── Text ── */
--color-text:           #352019;  /* Dark warm brown — primary text */
--color-text-muted:     #6A5040;  /* Lighter brown — secondary/caption text */
--color-text-inverse:   #FFF9F3;  /* On dark/primary backgrounds */

/* ── Semantic ── */
--color-success:        #31D0A0;  /* Achievement unlocked, correct answer */
--color-warning:        #F9C74F;  /* Caution, timer running low */
--color-error:          #EF5A5A;  /* Mistakes, blocked states */
--color-brand-brown:    #6A3A2A;  /* Button borders, depth shadows */

/* ── Skill Colors (5 axes match SkillProfile from WASM) ── */
--color-skill-pitch:    #5B8DEF;  /* Blue — pitch games/skills */
--color-skill-rhythm:   #F97066;  /* Coral — rhythm games/skills */
--color-skill-reading:  #A78BFA;  /* Purple — reading games/skills */
--color-skill-bowing:   #4FB69E;  /* Teal — bowing/bow_control games/skills */
--color-skill-posture:  #F9A93F;  /* Gold — posture games/skills */

/* ── Game Filter Colors (game catalog uses per-game skill from GAME_META) ── */
/* dynamic-dojo (skill: "Dynamics") maps to --color-skill-bowing for filter chip
   since dynamics is a bowing sub-skill. Alternatively, use --color-secondary. */
```

**Rules:**
- No dark mode for v1 (children don't need it; parents can request it post-launch)
- Skill colors are functional, not decorative — they create wayfinding across games, progress, and tools
- Glass morphism: `backdrop-filter: blur(20px) saturate(180%)` — preserve this signature
- Never use pure black (`#000`) or pure white (`#FFF`) as background

### Typography

**Keep Fredoka** as the display font — it's rounded, warm, distinctive, and already loaded. Replace Nunito with **Figtree** for body text (better readability, more open counters, more personality than system fonts).

```css
/* ── Font Families ── */
/* Nunito stays in fallback chains as the FOUT/FOIT fallback during font load.
   The current app already loads Nunito — keeping it prevents blank text flash
   while Fredoka/Figtree download. Remove Nunito from fallback chain only after
   confirming Fredoka+Figtree are cached by SW on first install. */
--font-display:  'Fredoka', 'Nunito', sans-serif;  /* Headings, buttons, labels */
--font-body:     'Figtree', 'Nunito', -apple-system, sans-serif;  /* Body, captions */
--font-mono:     'SF Mono', 'Menlo', monospace;  /* Timer displays, tuner readouts */

/* ── Fluid Type Scale (keep current clamp system) ── */
--text-xs:    clamp(0.85rem, 2vw, 0.95rem);    /* Captions, badges, metadata */
--text-sm:    clamp(1.0rem, 2.5vw, 1.15rem);   /* Secondary text, nav labels */
--text-base:  clamp(1.15rem, 3vw, 1.3rem);     /* Body text, descriptions */
--text-lg:    clamp(1.3rem, 3.5vw, 1.55rem);   /* Section headings, card titles */
--text-xl:    clamp(1.55rem, 4.2vw, 1.85rem);  /* Page titles, prominent labels */
--text-2xl:   clamp(1.85rem, 5.5vw, 2.4rem);   /* Hero headings */
--text-3xl:   clamp(2.4rem, 7vw, 3.2rem);      /* Celebration numbers, streaks */
```

**Rules:**
- Fredoka for anything a child reads first (headings, buttons, labels, the Panda's speech)
- Figtree for anything a parent reads (descriptions, settings, analysis, longer text)
- Mono for anything that's a measurement (timer countdown, pitch Hz, tuner cents)
- No font below `--text-xs` anywhere in the child experience
- Line height: 1.4 for body, 1.2 for headings, 1.0 for display numbers
- Letter spacing: `0.02em` on uppercase labels, `0` elsewhere

### Spacing And Layout

```css
/* ── 8pt Base Grid ── */
--space-1:   4px;    /* Hairline gaps, icon-to-label */
--space-2:   8px;    /* Tight grouping, chip padding */
--space-3:   12px;   /* Standard inline spacing */
--space-4:   16px;   /* Card padding, section gap */
--space-5:   24px;   /* Section separation */
--space-6:   32px;   /* Major section breaks */
--space-7:   48px;   /* Page-level vertical rhythm */
--space-8:   64px;   /* Hero spacing, breathing room */

/* ── Border Radius ── */
--radius-sm:    8px;     /* Small chips, badges */
--radius-md:    14px;    /* Cards, inputs */
--radius-lg:    22px;    /* Buttons, modals */
--radius-xl:    30px;    /* Giant buttons, game panels */
--radius-2xl:   38px;    /* Glass panels */
--radius-full:  9999px;  /* Pills, avatar circles */
```

**Layout Principles:**
- Content max-width: `680px` for single-column child views (songs, tools, wins)
- Content max-width: `960px` for multi-column parent views (review, settings)
- Game views: full-bleed, no max-width, `position: fixed; inset: 0`
- Minimum page padding: `--space-4` (16px) on smallest viewport
- Bottom nav height: `72px` + `env(safe-area-inset-bottom)`
- Content area: `calc(100dvh - 72px - env(safe-area-inset-bottom))`

### Elevation And Depth

```css
/* ── Shadows (warm brown tint, not gray) ── */
--shadow-sm:    0 2px 4px rgba(106, 58, 42, 0.08);    /* Subtle lift */
--shadow-md:    0 4px 12px rgba(106, 58, 42, 0.12);   /* Cards */
--shadow-lg:    0 12px 32px rgba(106, 58, 42, 0.16);  /* Modals, popovers */
--shadow-button: 0 6px 0 var(--color-brand-brown);     /* 3D button depth */
--shadow-glass: 0 8px 32px rgba(0, 0, 0, 0.12);       /* Glass panels */

/* ── Glass Morphism ── */
--glass-bg:     rgba(255, 255, 255, 0.92);
--glass-border: rgba(255, 255, 255, 0.6);
--glass-blur:   blur(20px) saturate(180%);
```

**Rules:**
- Shadow color always has a warm brown tint (`rgba(106, 58, 42, ...)`) — never cold gray
- Glass morphism used sparingly: bottom nav, game HUD, floating panels. Not on every card.
- `translateZ(0)` for GPU promotion on animated elements, but avoid `translateZ > 0` on large elements (compositing cost on iPad)

### Z-Index System

```css
/* ── Z-Index Tokens (exhaustive — no unlisted z-index values allowed) ── */
--z-base:        0;      /* Default stacking context */
--z-card:        1;      /* Cards that overlap siblings (e.g., skill progress overlap) */
--z-sticky:      10;     /* Sticky headers, filter bars */
--z-nav:         100;    /* Bottom nav bar */
--z-game-hud:    200;    /* In-game HUD (score, timer, pause) — above nav */
--z-overlay:     300;    /* Coach overlay, practice coaching strip */
--z-modal:       400;    /* Modal dialogs, parent gate PIN */
--z-toast:       500;    /* Toast notifications — above everything */
--z-splash:      600;    /* Splash/loading screen — topmost */
```

**Rules:**
- Every `z-index` in the codebase MUST use a token — no magic numbers
- New stacking contexts: create with `isolation: isolate` on containers to prevent z-index bleed
- Game views establish their own stacking context (`isolation: isolate` on game container); internal game z-indexes are local

### Line-Height Tokens

```css
/* ── Line Heights ── */
--leading-none:    1.0;    /* Display numbers (streak count, timer, Hz readout) */
--leading-tight:   1.2;    /* Headings (Fredoka display) */
--leading-snug:    1.3;    /* Button labels, card titles */
--leading-normal:  1.4;    /* Body text (Figtree) */
--leading-relaxed: 1.6;    /* Long-form parent text (settings descriptions, analysis) */
```

### Landscape And Responsive Breakpoints

```css
/* ── Breakpoints ── */
--bp-mobile:     320px;   /* iPhone SE — minimum supported */
--bp-tablet:     768px;   /* iPad mini 6 portrait — primary target */
--bp-landscape:  1024px;  /* iPad mini 6 landscape / iPad Air portrait */
--bp-desktop:    1280px;  /* Desktop dev only — not a shipping target */
```

**Landscape behavior:**
- **Default:** Portrait-preferred. All child views render single-column at 768px.
- **Games:** May request landscape via `screen.orientation.lock('landscape')` if supported. Game canvas scales to fill viewport. HUD repositions to horizontal strip at top.
- **Practice runner:** Stays portrait. Landscape is not blocked but layout does not reflow — content scrolls vertically.
- **Parent zone:** At `1024px+`, panels switch to 2-column grid (sidebar nav + content). Below 1024px, parent stays single-column with tab bar.
- **Orientation change handler:** `screen.orientation.addEventListener('change', ...)` fires layout recalc. Canvas games call `resizeCanvas()`. Non-game views rely on CSS media queries only (no JS resize handler needed).

### Dark Mode And Background Theme Override

- **v1 ships light-only.** No `prefers-color-scheme: dark` media query. Explicitly set `color-scheme: light` on `<html>` to prevent Safari auto-darkening form controls.
- **Background theme selector** (in `/parent/settings`): swaps `--color-bg` and `--color-bg-alt` to one of 3 palettes (Cream default, Calm Blue `#F0F4F8`/`#E3EAF2`, Soft Green `#F0F8F4`/`#E0F0E8`). Applied via `data-bg-theme="cream|blue|green"` attribute on `<html>`. Persisted in localStorage.
- **Future dark mode:** When added (post-v1), implement as a 4th background theme option, not a system preference override. Children should not get unexpected dark mode from parent device settings.

---

## Motion And Animation System

### Philosophy

Motion in this app has **one job: communicate.** It tells the child "you tapped that," "this is loading," "you did it!" It never decorates.

### Easing Tokens

```css
--ease-out:     cubic-bezier(0.2, 0.8, 0.2, 1);      /* Standard deceleration */
--ease-bounce:  cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Elastic arrival */
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);    /* Playful overshoot */
```

### Duration Tokens

```css
--duration-instant:  80ms;    /* Tap feedback, color change */
--duration-fast:     200ms;   /* Button press, toggle */
--duration-normal:   350ms;   /* Page transitions, card reveals */
--duration-slow:     500ms;   /* Modal entrance, celebration start */
--duration-celebration: 800ms; /* Confetti burst, achievement reveal */
```

### Animation Catalog

| Animation | Trigger | Duration | Easing | Purpose |
|-----------|---------|----------|--------|---------|
| **Tap feedback** | Touch start on button | instant | ease-out | `scale(0.97)` — physical press feel |
| **Button release** | Touch end on button | fast | spring | `scale(1.0)` — bounce back |
| **Page enter** | Route change (forward) | normal | ease-out | `slide-in-right` + `fade-in` |
| **Page exit** | Route change (forward) | normal | ease-out | `slide-out-left` + `fade-out` |
| **Page enter (back)** | Route change (back) | normal | ease-out | `slide-in-left` |
| **Card reveal** | Page load | normal | bounce | Staggered `translateY(20px) → 0` + `opacity 0 → 1` |
| **Skeleton shimmer** | Loading state | 1.8s loop | ease-in-out | Gradient sweep left → right |
| **Panda bounce** | Idle on home | 3s loop | ease-in-out | Gentle `translateY` oscillation |
| **Panda celebrate** | Achievement earned | celebration | spring | Scale up + wiggle + sparkle burst |
| **Progress fill** | Value update | slow | ease-out | Width/height expansion |
| **Streak counter** | Number change | normal | spring | Scale up from center + settle |
| **Confetti burst** | Practice complete | celebration | ease-out | CSS particles from center, gravity fall |
| **Star earned** | Game complete | celebration | spring | Scale from 0 → 1.2 → 1.0, gold glow |
| **Check mark** | Task complete | fast | spring | SVG path draw + scale bounce |
| **Shake (error)** | Invalid input | fast | ease-out | `translateX` oscillation (3 cycles) |
| **Pulse (attention)** | Needs input | 2s loop | ease-in-out | Subtle scale/opacity pulse |

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

All animation is CSS-driven (not JS RAF loops for UI). Canvas game animations are separate and respect a `shouldAnimate` runtime flag.

### SVG Animation Techniques

Inline SVG animations are used for data visualization, micro-interactions, and celebratory moments. All SVG animations respect `prefers-reduced-motion` via the same CSS media query above (transitions collapse to instant).

#### SVG Path Drawing (Check Marks, Progress Arcs)

```css
/* Animated checkmark — used in task completion, onboarding steps */
.check-path {
  stroke-dasharray: 48;       /* total path length */
  stroke-dashoffset: 48;      /* hidden initially */
  transition: stroke-dashoffset var(--duration-fast) var(--ease-spring);
}
.check-path.drawn {
  stroke-dashoffset: 0;       /* reveals path */
}
```

**Use cases:**
- Task completion checkmark (practice step done, onboarding step done)
- Circular progress arcs (session timer, loading rings)
- Star outline fill (game stars earned)

#### SVG Radar Chart (Parent Review — 5-Axis Skill Profile)

```svg
<!-- 5-axis radar: Pitch, Rhythm, Reading, Bowing, Posture -->
<svg viewBox="0 0 200 200" class="radar-chart">
  <!-- Static grid rings (3 levels: 33%, 66%, 100%) -->
  <polygon class="radar-grid" points="..." fill="none" stroke="var(--color-text-muted)" opacity="0.2" />
  <!-- Animated data polygon -->
  <polygon class="radar-data"
    points="..."
    fill="var(--color-primary)" fill-opacity="0.15"
    stroke="var(--color-primary)" stroke-width="2">
    <animate attributeName="points"
      from="100,100 100,100 100,100 100,100 100,100"
      to="[computed vertex positions]"
      dur="0.6s" fill="freeze"
      calcMode="spline" keySplines="0.34 1.56 0.64 1" />
  </polygon>
  <!-- Axis labels positioned at vertices -->
  <text x="100" y="10" class="radar-label">Pitch</text>
  <!-- ... 4 more labels -->
</svg>
```

**Implementation notes:**
- Vertex positions computed from `SkillProfile` WASM output (0-100 per axis)
- Animated via `<animate>` SMIL for Safari compatibility (CSS `d:` path animation has gaps in WebKit)
- Grid rings: 3 concentric pentagons at 33/66/100% radius
- Color-coded dots at each vertex using `--color-skill-*` tokens
- Responsive: `viewBox` scales, container is `max-width: 300px`

#### SVG Skill Meter Fills (Wins Page)

```css
/* Horizontal bar fill animation — used in /wins skill meters */
.skill-bar-fill {
  transform-origin: left center;
  transform: scaleX(0);
  transition: transform var(--duration-slow) var(--ease-bounce);
}
.skill-bar-fill.revealed {
  transform: scaleX(var(--fill-pct));  /* set via CSS custom property */
}
```

**Intersection Observer triggers reveal on scroll-into-view** — skill bars animate when the Wins page scrolls to the Skills section. Each bar staggers by 80ms (`animation-delay`).

#### SVG Streak Flame (Wins Page Hero)

```svg
<svg viewBox="0 0 40 40" class="flame-icon">
  <path class="flame-body" d="M20 5 C15 15, 8 20, 10 30 C12 35, 28 35, 30 30 C32 20, 25 15, 20 5Z"
    fill="var(--color-secondary)">
    <animateTransform attributeName="transform" type="scale"
      values="1,1; 1.05,1.08; 1,1" dur="2s" repeatCount="indefinite"
      calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
  </path>
  <path class="flame-inner" d="M20 15 C18 20, 14 22, 16 28 C17 30, 23 30, 24 28 C26 22, 22 20, 20 15Z"
    fill="var(--color-warning)" opacity="0.8">
    <animateTransform attributeName="transform" type="scale"
      values="1,1; 0.95,1.1; 1,1" dur="1.8s" repeatCount="indefinite"
      calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
  </path>
</svg>
```

**Streak flame behavior:**
- Idle: gentle breathing scale animation (2s loop, SMIL)
- Active (today practiced): flame becomes brighter (inner flame opacity → 1.0)
- Streak milestone (7, 14, 30 days): sparkle particles burst from flame tip (CSS `@keyframes` + `::after`)

#### SVG Confetti Burst (Practice Completion)

CSS-only confetti using pseudo-elements + `@keyframes`. No JS RAF needed.

```css
.confetti-container {
  position: relative;
}
.confetti-particle {
  position: absolute;
  width: 8px; height: 8px;
  border-radius: 2px;
  animation: confetti-fall var(--duration-celebration) var(--ease-out) forwards;
}
@keyframes confetti-fall {
  0%   { transform: translate(0, 0) rotate(0deg); opacity: 1; }
  100% { transform: translate(var(--x-drift), 120px) rotate(var(--spin)); opacity: 0; }
}
```

**12 particles** with randomized `--x-drift` (-60px to 60px), `--spin` (180-720deg), and `animation-delay` (0-200ms). Colors: `--color-primary`, `--color-secondary`, `--color-accent`, `--color-warning`, `--color-success`.

#### SVG Star Earn Animation (Post-Game)

```css
.star-earned {
  transform: scale(0);
  animation: star-pop var(--duration-celebration) var(--ease-spring) forwards;
}
@keyframes star-pop {
  0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
  50%  { transform: scale(1.3) rotate(5deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
/* Gold glow ring expands behind star */
.star-glow {
  animation: glow-ring 0.6s var(--ease-out) forwards;
}
@keyframes glow-ring {
  0%   { transform: scale(0.5); opacity: 0.8; box-shadow: 0 0 0 0 var(--color-secondary); }
  100% { transform: scale(1.5); opacity: 0; box-shadow: 0 0 20px 10px var(--color-secondary); }
}
```

**3 stars stagger** with 200ms delay each. If all 3 earned, a fourth "bonus sparkle" burst fires.

#### Gemini 3.1 Pro SVG Generation Workflow

Use Gemini 3.1 Pro (High) to generate SVG animations:

1. **Prompt pattern:** "Generate an inline SVG [component type] with SMIL animation. viewBox `0 0 [w] [h]`. Use CSS custom properties for colors: `var(--color-primary)`, `var(--color-secondary)`. Animation must respect `prefers-reduced-motion` via `@media` query. Target Safari 26.2 WebKit — avoid CSS `d:` path animation."
2. **Nano Banana for complex illustrations:** Generate base illustration with Nano Banana, then trace to SVG with Potrace/SVGO for inline use. Best for Red Panda poses that need animation hooks (mouth, arms, eyes).
3. **SVGO optimization:** Run all SVGs through `svgo --multipass` before committing. Target: <2KB per icon, <5KB per illustration.

---

## Page-By-Page UX Specifications

### `/` — Daily Mission Home

**Layout:**

```
┌─────────────────────────────────────┐
│  [gear icon]          [streak: 🔥7] │  ← Top bar (minimal)
├─────────────────────────────────────┤
│                                     │
│         🐼 (Red Panda, medium)      │  ← Mascot, context-aware pose
│                                     │
│    "Ready for today's practice?"    │  ← Panda speech (Fredoka, xl)
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🎵  Today's Mission        │    │  ← Mission card (primary CTA)
│  │  15 min · 4 activities      │    │
│  │                             │    │
│  │  [████████░░] 2/4 done      │    │  ← Progress bar (if resuming)
│  │                             │    │
│  │  ┌───────────────────────┐  │    │
│  │  │   ▶  Start Practice   │  │    │  ← Giant primary button
│  │  └───────────────────────┘  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌──────────┐  ┌──────────┐        │  ← Quick-access cards (secondary)
│  │ 🎵 Songs │  │ 🎮 Games │        │
│  └──────────┘  └──────────┘        │
│                                     │
├─────────────────────────────────────┤
│  🏠   🎵   🎮   🔧   ⭐           │  ← Bottom nav (5 items)
└─────────────────────────────────────┘
```

**UX Behaviors:**
- **First visit (no mission):** Panda says "Let's set up your first practice!" → inline onboarding
- **Returning, mission incomplete:** Panda says "Welcome back! You were doing great." → resume button
- **Returning, mission complete:** Panda celebrates → "Play more or see your wins!" → songs/games CTAs
- **Streak at risk:** Panda says "One more day and you'll hit [N]! Let's go!" — gentle urgency, never guilt
- Mascot pose changes: `focus` (mission available), `celebrate` (mission complete), `encourage` (streak at risk), `happy` (default)
- Quick-access cards only show below the mission card — mission is always the visual priority
- Top bar is minimal: gear icon (→ `/settings` child preferences; parent access is inside settings via long-press or explicit link), streak badge. No title. The Panda IS the header.

### `/practice` — Guided Session Runner

**Layout:**

```
┌─────────────────────────────────────┐
│  ✕ Exit          Step 2 of 4    ⏸   │  ← Compact header (no back — forward only)
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │  [█████░░░░░] 2:30 left     │    │  ← Progress bar + timer
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │   CURRENT ACTIVITY AREA     │    │  ← Full-height activity zone
│  │                             │    │
│  │   (embedded game, song,     │    │
│  │    exercise, or tool)       │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  🐼 "Great bow hold! Try the       │  ← Panda coaching strip (collapsible)
│      next note a little slower."    │
│                                     │
│  ┌───────────────────────────┐      │
│  │      ▶  Next Activity      │     │  ← Advance button (after step complete)
│  └───────────────────────────┘      │
└─────────────────────────────────────┘
```

**UX Behaviors:**
- **Linear progression** — child moves forward through steps. No back (prevents endless re-doing easy steps)
- **Timer** — counts down per step. Visual progress bar fills. When time's up, the step auto-completes with encouragement
- **Pause** — ⏸ button pauses timer and shows "Take a break!" overlay with Panda. Resume or quit options
- **Skip** — Long-press the Next button to skip (intentionally harder than continuing). Panda says "That's okay! Let's move on."
- **Completion** — Final step complete → full-screen celebration → star/badge earned → auto-navigate to `/wins`
- **Recovery** — If the child leaves mid-practice and returns, home shows "Resume" with progress intact
- Activity zone uses `<LegacyBridge>` or native React depending on activity type
- Panda coaching strip is a fixed bottom strip (above the progress button, no bottom nav on this page)
- No bottom nav during practice — full focus, minimal chrome

### `/songs` — Song Library

**Layout:**

```
┌─────────────────────────────────────┐
│  Songs                    [🔍]      │  ← Page title + search toggle
├─────────────────────────────────────┤
│  [All] [⭐Ready] [🔒Locked] [❤Fav] │  ← Filter chips (horizontal scroll)
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🎵 Twinkle Twinkle    ⭐⭐  │    │  ← Song card (difficulty stars)
│  │  Ready to play · Beginner   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🎵 Ode to Joy          ⭐⭐⭐│    │
│  │  2 more practices · Medium  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🔒 Bach Minuet      ⭐⭐⭐⭐│    │  ← Locked state (dimmed)
│  │  Unlock at Level 5          │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│  🏠   🎵   🎮   🔧   ⭐           │
└─────────────────────────────────────┘
```

**UX Behaviors:**
- **"Ready to play"** badge on songs the child has sufficient skill for — green accent, prominent
- **Locked songs** are visible but dimmed with a lock icon and unlock requirement. Child can see what's coming without frustration.
- **Difficulty** shown as stars (1-5), not numbers. Matches game difficulty language.
- **Filter chips** horizontal scroll, one selected at a time. "All" is default. "Ready" surfaces actionable songs.
- **Search** expands inline (push content down, not overlay). Search by title. Instant filter, no submit.
- **Song card tap** → `/songs/[slug]` with playback, sheet music, recording option, skill tags
- Cards stagger-animate on entry (`translateY(12px)` + `opacity`, 60ms delay each)

### `/games` — Game Catalog

**Layout:**

```
┌─────────────────────────────────────┐
│  Games                              │
├─────────────────────────────────────┤
│  [All] [🎯Pitch] [🥁Rhythm]        │  ← Skill filter chips
│  [📖Reading] [🎻Bowing] [💥Dynamic] │     (color-coded per skill)
├─────────────────────────────────────┤
│                                     │
│  ┌────────────┐  ┌────────────┐    │  ← 2-column grid
│  │  🎯        │  │  🥁        │    │
│  │ Pitch Quest │  │ Rhythm Dash│    │
│  │ ⭐⭐ Easy   │  │ ⭐⭐⭐ Med  │    │
│  │ Best: 850  │  │ Best: 720  │    │
│  └────────────┘  └────────────┘    │
│                                     │
│  ┌────────────┐  ┌────────────┐    │
│  │  📖        │  │  🎻        │    │
│  │ Note Memory│  │ Bow Hero   │    │
│  │ ⭐ Beginner│  │ ⭐⭐⭐⭐ Hard│    │
│  │ New!       │  │ Best: 940  │    │
│  └────────────┘  └────────────┘    │
│                                     │
├─────────────────────────────────────┤
│  🏠   🎵   🎮   🔧   ⭐           │
└─────────────────────────────────────┘
```

**UX Behaviors:**
- **2-column grid** — square-ish cards with icon, title, difficulty, and personal best or "New!" badge
- **Skill filter chips** are color-coded to match `--color-skill-*` tokens. Tapping a chip filters instantly.
- **Game card** has a subtle colored left border matching its skill category
- **Tap** → transitions to game shell (`/games/[slug]`), not directly into canvas
- **"New!"** badge appears for unplayed games. Clears after first play.
- **Personal best** shown on replayed games — motivates improvement
- Cards stagger-animate on entry, same pattern as songs

### `/games/[slug]` — Game Shell (Pre-Game → Game → Post-Game)

**Three states, one route:**

**State 1: Pre-Game**
```
┌─────────────────────────────────────┐
│  ← Back              🎯 Pitch Quest │
├─────────────────────────────────────┤
│                                     │
│         🐼 (coaching pose)          │
│                                     │
│    "Match the notes I play!         │
│     Listen carefully."              │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Objective: Match 10 notes  │    │  ← Checklist card
│  │  Difficulty: ⭐⭐ Easy       │    │
│  │  Your best: 850 pts         │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌───────────────────────────┐      │
│  │       ▶  Start Game        │     │  ← Giant primary button
│  └───────────────────────────┘      │
└─────────────────────────────────────┘
```

**State 2: In-Game** — Full-bleed canvas/HTML game. No nav. Minimal HUD. Game engine owns the screen.

```
┌─────────────────────────────────────┐
│  ← ·····························  ⏸ │  ← HUD top bar (glass-over-canvas)
│  ^back    timer / progress     pause│
│                                     │
│                                     │
│         (game canvas area)          │
│                                     │
│                                     │
│                                     │
│  Score: 420     ⭐⭐☆ (live stars) │  ← HUD bottom strip (glass)
└─────────────────────────────────────┘
```

**HUD elements (all positioned with safe-area insets):**
- **Top-left:** Back/exit button (`←`, 44px touch target, glass bg). Tap → confirm dialog ("Leave game? Progress won't be saved.").
- **Top-center:** Timer (countdown games) or progress indicator (dot trail for level-based games). Fredoka mono, `--text-sm`.
- **Top-right:** Pause button (`⏸`, 44px). Tap → pause overlay: dim canvas, show "Paused" + "Resume" / "Quit" buttons.
- **Bottom-left:** Live score counter. Animates on increment (scale bounce). Fredoka, `--text-base`.
- **Bottom-right:** Live star preview (shows current star tier based on running accuracy). Dims when accuracy is low.
- **All HUD:** `z-index: var(--z-game-hud)`, `pointer-events: none` on container, `pointer-events: auto` on buttons only. Glass bg: `rgba(255,255,255,0.8)` + `backdrop-filter: blur(8px)`.

**State 3: Post-Game** (bottom nav returns — focus mode only hides nav during in-game)
```
┌─────────────────────────────────────┐
│                                     │
│      ⭐ ⭐ ⭐  (earned stars)       │  ← Stars animate in sequence
│                                     │
│         🐼 (celebrate pose)         │
│                                     │
│    "Amazing! You got 920 points!"   │
│                                     │
│    New best! 850 → 920  🎉         │  ← If personal best broken
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │ 🔄 Retry │  │ ✓ Done   │        │  ← Two options
│  └──────────┘  └──────────┘        │
├─────────────────────────────────────┤
│  🏠   🎵   🎮   🔧   ⭐           │  ← Nav returns
└─────────────────────────────────────┘
```

**UX Behaviors:**
- Pre-game always shows objectives, difficulty, and personal best. No surprise mechanics.
- Panda gives a game-specific tip in pre-game. Rotates between 3-4 tips per game.
- In-game: full immersion. No distractions. Only a back/exit button (top-left, small, glass-over-canvas).
- Post-game: stars animate one by one (spring easing, 200ms stagger). If new best, a "New best!" banner slides in.
- "Retry" loops back to in-game immediately (no pre-game again). "Done" returns to `/games`.
- Every game uses this same 3-state shell. The game engine plugs into State 2. This is the consistency fix.

### `/wins` — Child Progress And Rewards

**Layout:**

```
┌─────────────────────────────────────┐
│  Your Wins                          │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🔥 7-Day Streak!           │    │  ← Streak hero (large, animated)
│  │  ████████████████░░░  7/10  │    │
│  │  3 more days to next badge! │    │
│  └─────────────────────────────┘    │
│                                     │
│  Today's Stars                      │
│  ⭐ ⭐ ⭐ ⭐ ☆  (4/5 earned)        │  ← Daily star progress
│                                     │
│  Badges                             │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│  │ 🏅 │ │ 🏅 │ │ 🏅 │ │ 🔒 │      │  ← Badge grid (earned + next)
│  └────┘ └────┘ └────┘ └────┘      │
│                                     │
│  Skills                             │
│  Pitch    [████████░░]             │  ← Skill meters (color-coded bars, NO %)
│  Rhythm   [██████░░░░]             │    Uses --color-skill-* tokens
│  Reading  [██████░░░░]             │    All 5 SkillProfile axes
│  Bowing   [████░░░░░░]             │    Visual fill only — child sees bars grow
│  Posture  [███░░░░░░░]             │
│                                     │
├─────────────────────────────────────┤
│  🏠   🎵   🎮   🔧   ⭐           │
└─────────────────────────────────────┘
```

**UX Behaviors:**
- **Streak is the hero** — largest element, always visible, animated flame icon
- **Stars** are daily — earned from practice completion and game play. Simple, countable, visible.
- **Badges** are achievement-based (existing system). Show earned badges prominently, next earnable badge as locked with progress hint.
- **Skills** are simplified meters — not percentages, but visual fill. Color matches skill tokens.
- **No numbers a child can't understand.** No "XP", no "level 47", no decimal percentages. Stars, streaks, badges, and colored bars.
- Tapping a badge opens a detail modal with the Panda saying what was earned and when
- Everything on this page should feel like a trophy shelf — celebratory, not analytical

### `/tools` — Tool Selector

**Layout:**

```
┌─────────────────────────────────────┐
│  Practice Tools                     │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🎸  Tune Your Violin       │    │  ← Purpose-driven, not "Tuner"
│  │  Get each string in tune    │    │     Requires mic permission
│  │  before you play.           │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🎵  Keep the Beat          │    │  ← Metronome (NEW)
│  │  Set the tempo and play     │    │     No permissions needed
│  │  in time with the clicks.   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🔊  Listen to a Drone      │    │  ← Drone tones (NEW)
│  │  Play a steady note to      │    │     No permissions needed
│  │  match while you practice.  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🎻  Practice Your Bow Hold │    │
│  │  Check your bow arm          │    │     Requires camera permission
│  │  position with the camera.  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🧍  Check Your Posture     │    │
│  │  Stand tall! The camera      │    │     Requires camera permission
│  │  will help you check.       │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│  🏠   🎵   🎮   🔧   ⭐           │
└─────────────────────────────────────┘
```

**UX Behaviors:**
- **Purpose-driven labels** — "Tune Your Violin" not "Tuner". The child understands WHY, not just WHAT.
- Each card has a short Panda-voice description explaining the tool's purpose
- Tap → navigate to tool. Tool page has its own back button.
- Tools that require microphone/camera show a permission prompt BEFORE the tool opens (not after)
- If permission denied, Panda explains: "I need to hear you to help! Ask a grown-up to turn on the microphone."
- **Metronome page:** BPM slider (40-208) + tap tempo button + visual beat flash + subdivision selector (quarter/eighth/triplet). Large "Start/Stop" button. Accent toggle on beat 1.
- **Drone page:** 4 string buttons (G, D, A, E) → sustained reference tone via tone-player synth. Volume slider. Visual waveform indicator. Tap string to start, tap again to stop.

### `/tools/metronome` — Metronome

```
┌─────────────────────────────────────┐
│  ← Back              Keep the Beat  │
├─────────────────────────────────────┤
│                                     │
│           ╭───────────╮             │
│           │    120     │             │  ← Large BPM display
│           │    BPM     │             │
│           ╰───────────╯             │
│                                     │
│    [──────────●──────────]          │  ← BPM slider (40–208)
│                                     │
│    ○ ● ○ ○   ○ ● ○ ○               │  ← Beat dots (accent on 1)
│                                     │
│    Subdivision: [♩] [♪♪] [♪♪♪]     │  ← Quarter / Eighth / Triplet
│                                     │
│  ┌───────────────────────────┐      │
│  │     ▶  Start / ■ Stop     │      │  ← Large toggle
│  └───────────────────────────┘      │
│                                     │
│    [Tap Tempo]                      │  ← Tap repeatedly to set BPM
│                                     │
├─────────────────────────────────────┤
│  🏠   🎵   🎮   🔧   ⭐           │
└─────────────────────────────────────┘
```

### `/tools/drone` — Reference Drone

```
┌─────────────────────────────────────┐
│  ← Back         Listen to a Drone   │
├─────────────────────────────────────┤
│                                     │
│  Tap a string to hear its pitch:    │
│                                     │
│  ┌──────┐  ┌──────┐                │
│  │  G3  │  │  D4  │                │  ← Open string buttons
│  │      │  │      │                │    Tap to start, tap to stop
│  └──────┘  └──────┘                │    Active string glows
│  ┌──────┐  ┌──────┐                │
│  │  A4  │  │  E5  │                │
│  │      │  │      │                │
│  └──────┘  └──────┘                │
│                                     │
│  🔊  [──────────●───]              │  ← Volume slider
│                                     │
│  ┌─────────────────────────────┐    │
│  │  ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿    │    │  ← Visual waveform (animated)
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│  🏠   🎵   🎮   🔧   ⭐           │
└─────────────────────────────────────┘
```

### `/practice/[step-slug]` — Individual Practice Step

Reached when deep-linking or tapping a step from the practice session runner.

```
┌─────────────────────────────────────┐
│  ← Back to Session    Step 2 of 5   │
├─────────────────────────────────────┤
│                                     │
│  🎯 Bow Hold Check                 │  ← Step title (from lesson plan)
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │  (Step-specific content:    │    │  ← Varies by step type:
│  │   tuner, play-along,        │    │    tuner, game, song, exercise
│  │   exercise, or game embed)  │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌───────────────────────────┐      │
│  │    ✓  Mark Complete        │     │  ← Advances to next step
│  └───────────────────────────┘      │
│                                     │
└─────────────────────────────────────┘
```

**UX:** Bottom nav hidden (focus mode). Step content is the same component used inline by the practice runner, rendered standalone here. "Mark Complete" advances to the next step or returns to the session summary if this was the last step.

### `/songs/[slug]` — Song Detail

**Layout:**

```
┌─────────────────────────────────────┐
│  ← Back           Twinkle Twinkle   │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │  ♩♩♩♩ (scrolling staff)     │    │  ← Sheet music area
│  │  ▲ playhead indicator       │    │     (horizontally scrollable)
│  └─────────────────────────────┘    │
│                                     │
│  ⭐⭐⭐☆☆  Silver Mastery          │  ← Current mastery tier
│                                     │
│  ♩ = 80 BPM    Beginner   3:20     │  ← Metadata strip
│                                     │
│  ┌─────────────────────────────┐    │
│  │  🐼 "Try playing the first  │    │  ← Panda tip (rotates)
│  │   four notes slowly."       │    │
│  └─────────────────────────────┘    │
│                                     │
│  Skills: 🎯Pitch  🥁Rhythm         │  ← Skill tags (color-coded)
│                                     │
│  Sections: [A] [B] [A']            │  ← Section checkpoints
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │ ▶  Play  │  │ 🔴 Record│        │  ← Primary actions
│  └──────────┘  └──────────┘        │
│                                     │
│  Past Recordings                    │
│  ┌─────────────────────────────┐    │
│  │  Mar 5 · ⭐⭐⭐ · 2:45  ▶  │    │  ← Recording history
│  │  Mar 3 · ⭐⭐  · 3:10   ▶  │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│  🏠   🎵   🎮   🔧   ⭐           │
└─────────────────────────────────────┘
```

**UX Behaviors:**
- **Sheet music** scrolls horizontally with CSS playhead tracking current position during playback
- **Record mode:** Tap record → 3-beat count-in (metronome clicks) → recording starts → play along → tap stop → auto-assess → show stars
- **Section checkpoints:** For songs with A/B sections, child can tap a section to jump to that part (practice loops)
- **Mastery display:** Foundation (gray) → Bronze (brown) → Silver (silver shimmer) → Gold (gold glow animation)
- **Past recordings:** Show recent recordings with date, star rating, duration. Tap to play back. Long-press to delete (parent PIN required).
- **BPM override:** Tap tempo display → inline BPM adjustment (slower for practice)

### `/settings` — Child Preferences

**Layout:**

```
┌─────────────────────────────────────┐
│  ← Back              Settings       │
├─────────────────────────────────────┤
│                                     │
│  Sound                              │
│  ┌─────────────────────────────┐    │
│  │  🔊  Sound Effects    [ON ] │    │  ← Toggle
│  └─────────────────────────────┘    │
│                                     │
│  Motion                             │
│  ┌─────────────────────────────┐    │
│  │  ✨  Animations       [ON ] │    │  ← Toggle (sets reduced-motion)
│  └─────────────────────────────┘    │
│                                     │
│  Text Size                          │
│  ┌─────────────────────────────┐    │
│  │  Aa  [S] [M] [L]           │    │  ← Segmented control
│  └─────────────────────────────┘    │
│                                     │
│  Background                         │
│  ┌──────┐  ┌──────┐  ┌──────┐     │
│  │Cream │  │ Blue │  │Green │     │  ← Color swatches
│  │  ✓   │  │      │  │      │     │
│  └──────┘  └──────┘  └──────┘     │
│                                     │
│  ─────────────────────────────      │
│                                     │
│  [?] Help & FAQ                     │  ← Links
│  [🔒] Parent Area                   │  ← PIN gate entry
│                                     │
├─────────────────────────────────────┤
│  🏠   🎵   🎮   🔧   ⭐           │
└─────────────────────────────────────┘
```

**UX Behaviors:**
- **All controls take effect immediately** — no save button. Visual preview updates in real-time.
- **Sound toggle:** Mutes tone player, game sound effects, celebration sounds. Does NOT mute mic input for tuner/games.
- **Motion toggle:** When off, applies `prefers-reduced-motion` override. All CSS animations skip to end state. Canvas game animations respect `shouldAnimate` flag.
- **Text size:** Adjusts `--text-base` CSS custom property scale factor (0.9x / 1.0x / 1.1x). Fluid clamp system ensures safe bounds.
- **Background:** Cosmetic theme swap via `data-bg-theme` attribute on `<html>`. Cream (default: `--color-bg: #FFF9F3`, `--color-bg-alt: #FFEFE2`), Calm Blue (`--color-bg: #F0F4F8`, `--color-bg-alt: #E3EAF2`), Soft Green (`--color-bg: #F0F8F4`, `--color-bg-alt: #E0F0E8`). Persisted in localStorage. All other tokens unchanged — only `bg` and `bg-alt` vary.
- **Parent Area link:** Tap → PIN gate → full parent workspace. Clearly labeled with lock icon.

### `/support/*` — Support Pages

Three static-content pages. Accessible from child settings ("Help" link) and parent settings.

```
┌─────────────────────────────────────┐
│  ← Back              Help / About   │
├─────────────────────────────────────┤
│                                     │
│  (Markdown-rendered content area)   │  ← Static HTML, no dynamic data
│                                     │
│  /support/help    — FAQ accordion   │
│  /support/about   — Version, build  │
│  /support/privacy — Privacy policy  │
│                                     │
├─────────────────────────────────────┤
│  🏠   🎵   🎮   🔧   ⭐           │
└─────────────────────────────────────┘
```

**UX:** Simple scrollable text. FAQ uses `<details>/<summary>` accordion. About page shows app version from `public/manifest.webmanifest`, build hash, and "Made with love" credit. Privacy policy is plain text. No Panda mascot on these pages.

### `/parent` — Parent Zone

**Visual shift:** When entering the parent zone, the visual tone shifts:
- Background becomes slightly cooler (`#F8F6F4` instead of `#FFF9F3`)
- Typography uses Figtree for everything (body font, more adult)
- Fredoka only used for the page title
- Spacing tightens slightly (more information density)
- Panda mascot does NOT appear in parent zone (this is the parent's space)
- Color palette stays warm but accents become more muted

**Parent Gate (PIN Entry):**
```
┌─────────────────────────────────────┐
│                                     │
│       Parent Area                   │
│                                     │
│    Enter your PIN to continue       │
│                                     │
│    ┌──┐ ┌──┐ ┌──┐ ┌──┐            │  ← 4-digit PIN dots
│    │ ● │ │ ● │ │ ○ │ │ ○ │            │
│    └──┘ └──┘ └──┘ └──┘            │
│                                     │
│    ┌───┐ ┌───┐ ┌───┐              │
│    │ 1 │ │ 2 │ │ 3 │              │  ← Number pad
│    ├───┤ ├───┤ ├───┤              │
│    │ 4 │ │ 5 │ │ 6 │              │
│    ├───┤ ├───┤ ├───┤              │
│    │ 7 │ │ 8 │ │ 9 │              │
│    └───┘ ├───┤ └───┘              │
│          │ 0 │                      │
│          └───┘                      │
│                                     │
│    [← Back to app]                  │
└─────────────────────────────────────┘
```

**Parent Dashboard:**

```
┌─────────────────────────────────────┐
│  ← Back to App        Parent Zone   │
├─────────────────────────────────────┤
│  [Review][Goals][Check][Rec][Data][⚙]│  ← Scrollable tab bar (6 tabs)
├─────────────────────────────────────┤
│                                     │
│  (Tab content area — see below)     │
│                                     │
└─────────────────────────────────────┘
```

**Parent Auto-Revert UX:**
- After PIN unlock, `AppRuntime.persona` is set to `'parent'` and stored in `sessionStorage` (NOT localStorage — revert on tab close).
- A 15-minute inactivity timer starts. Any `pointerdown` or `keydown` event on the parent zone resets the timer.
- At 14 minutes: subtle banner appears at top of parent zone — "Returning to child mode in 1 minute" with "Stay" button.
- At 15 minutes: auto-navigate to `/` (Home), set `persona = 'child'`, clear `sessionStorage` flag.
- "← Back to App" button in parent header: immediately reverts to child mode (no timer needed).
- If app is backgrounded (`visibilitychange` → `hidden`) while in parent mode, the timer continues — returning to the app after 15+ minutes reverts to child mode automatically.
- PIN is stored as a hash in `PARENT_PIN_KEY` in localStorage. Default PIN on first use: `1234`. Parent is prompted to change it on first unlock.

**Tab: Review** (`/parent/review`)

```
┌─────────────────────────────────────┐
│  Recent Sessions                    │
│  ┌─────────────────────────────┐    │
│  │ Mon 3/4  │ 12m │ ████░ 82% │ >  │  ← Tap row → session detail
│  │ Sun 3/3  │ 15m │ █████ 96% │ >  │
│  │ Sat 3/2  │  8m │ ███░░ 64% │ >  │
│  └─────────────────────────────┘    │
│                                     │
│  Skill Overview                     │
│     ┌──────────────┐               │
│     │   ╱ pitch ╲  │               │  ← SVG 5-axis radar chart
│     │ bow ──●── rhy│               │     filled area = current level
│     │   ╲ read  ╱  │               │
│     └──────────────┘               │
│  [Pitch ━━] [Rhythm ━] [Bow ━━━]  │  ← Per-skill sparklines (10 sessions)
│                                     │
│  Song Mastery                       │
│  Twinkle       ⭐⭐⭐⭐⭐  ↑     │
│  Lightly Row   ⭐⭐⭐☆☆  →     │
│  Go Tell Aunt  ⭐⭐☆☆☆  ↑     │
└─────────────────────────────────────┘
```

- Tap a session row → timeline view: pitch contour, note events, coaching triggers
- Toggle coaching preset (gentle/standard/challenge) to compare session replay

**Tab: Goals** (`/parent/goals`)

```
┌─────────────────────────────────────┐
│  Daily Practice Goal                │
│  ○────────●──────────○  15 min     │  ← Slider (5-30 min)
│                                     │
│  Practice Days                      │
│  [M✓] [T✓] [W✓] [T✓] [F✓] [S] [S]│  ← Day checkboxes
│                                     │
│  This Week                          │
│  ████████░░░░░  3/5 days  45/75m   │  ← Progress bar
│                                     │
│  Recital Countdown                  │
│  🎻 Spring Recital — 23 days away  │
│  [Change Date]                      │
└─────────────────────────────────────┘
```

**Tab: Checklist** (`/parent/checklist`) — NEW

```
┌─────────────────────────────────────┐
│  Home Practice Observation          │
│                                     │
│  Bow Hold        ①②③④⑤            │  ← Tap number to rate
│  Posture         ①②③④⑤            │
│  Tone Quality    ①②③④⑤            │
│  Rhythm          ①②③④⑤            │
│  Left Hand       ①②③④⑤            │
│                                     │
│  Notes                              │
│  ┌─────────────────────────────┐    │
│  │ Good focus today. Bow hold  │    │  ← Free-text textarea
│  │ improved since last week.   │    │
│  └─────────────────────────────┘    │
│                                     │
│  [      Save Observation      ]     │  ← Primary button
│                                     │
│  ── Past Observations ──            │
│  Mar 4  Avg: 3.8  "Good focus..."  │
│  Mar 2  Avg: 3.2  "Struggles w..." │
│  [Export CSV] [Export PDF]          │
└─────────────────────────────────────┘
```

- Per-session checklist items: bow hold (1-5), posture (1-5), tone quality (1-5), rhythm accuracy (1-5), left hand position (1-5)
- "Save Observation" → timestamped entry in IndexedDB
- History list: date, average rating, notes preview
- Export all observations as CSV or PDF

**Tab: Recordings** (`/parent/recordings`)

```
┌─────────────────────────────────────┐
│  Recordings       [Filter ▾] [📤]  │
│                                     │
│  Mar 4 — Twinkle           ⭐⭐⭐ │
│  1:42  [▶ Play]  [📤 Share]       │
│  ─────────────────────────────────  │
│  Mar 3 — Lightly Row       ⭐⭐   │
│  2:15  [▶ Play]  [📤 Share]       │
│  ─────────────────────────────────  │
│  Mar 1 — Go Tell Aunt      ⭐⭐⭐ │
│  1:58  [▶ Play]  [📤 Share]       │
│                                     │
│  Storage: 42 MB / 200 MB  ████░░   │
└─────────────────────────────────────┘
```

- Filter by song, date range
- Export: individual (share/download via `tryShareFile()`), bulk (zip)
- Delete: individual or bulk (long-press → multi-select → delete, confirmation required)
- Storage usage indicator with visual bar

**Tab: Data** (`/parent/data`)

```
┌─────────────────────────────────────┐
│  Data Management                    │
│                                     │
│  Backup & Restore                   │
│  [📤 Export Full Backup (JSON)]     │
│  [📥 Import Backup]                │
│  [📊 Export Practice Log (CSV)]     │
│                                     │
│  Storage Breakdown                  │
│  Events     ████░░░░  12 MB        │
│  Recordings ██████░░  42 MB        │
│  ML Data    █░░░░░░░   2 MB        │
│  SW Cache   ██░░░░░░   8 MB        │
│  ─────────────────── Total: 64 MB  │
│                                     │
│  Maintenance                        │
│  [🔍 Check Offline Integrity]       │
│  [🗑  Clear All Data]  ← danger    │
└─────────────────────────────────────┘
```

- Full backup: export all app data as JSON file
- Restore: import from JSON (with confirmation dialog)
- Clear all data: double confirmation ("Are you sure?" → "Type DELETE to confirm")
- Offline integrity check: verify SW cache completeness, repair if needed

**Tab: Settings** (`/parent/settings`)

```
┌─────────────────────────────────────┐
│  Settings                           │
│                                     │
│  Coaching Style                     │
│  (○) Gentle  — encouraging only     │
│  (●) Standard — balanced feedback   │
│  (○) Challenge — push for accuracy  │
│                                     │
│  Practice Reminders                 │
│  Time: [4:00 PM ▾]                 │
│  Days: [M✓][T✓][W✓][T✓][F✓][S][S] │
│  [Download Calendar Reminder (ICS)] │
│                                     │
│  Sound & Feedback                   │
│  Sound effects    [━━━●━━] on       │  ← Toggle + volume
│  Haptic feedback  [━━━━●━] on       │
│  Voice coach cues [━━━●━━] on       │  ← NEW: enables/disables
│                                     │     PandaSpeech TTS audio
│  Per-Game Difficulty                │
│  echo            [Auto ▾]          │
│  pitch-quest     [Hard ▾]          │
│  rhythm-dash     [Auto ▾]          │
│  ... (17 games, scrollable)         │
│                                     │
│  ▸ ML Diagnostics (expandable)     │
│  ▸ Web Vitals Viewer               │
│                                     │
│  App v2.0.0 · About · Privacy      │
└─────────────────────────────────────┘
```

- Voice coach toggle: when OFF, `<PandaSpeech>` renders text-only (no TTS audio). Default: ON.
- ML diagnostics: expandable panel showing EMA values, forgetting curves, recommendation weights. "Demo Mode" toggle. "Simulate Data" button. "Reset ML" button (with confirmation). Web Vitals viewer: 40-session LCP/INP/CLS rolling history chart.
- Per-game difficulty: list of 17 games with auto/easy/medium/hard selector. "Auto" uses ML-recommended difficulty.

---

## Interaction Patterns

### Touch Feedback

Every tappable element responds immediately:
- **Buttons:** `scale(0.97)` on touch-start, `scale(1.0)` on touch-end (spring easing). Shadow compresses.
- **Cards:** `scale(0.98)` + slight shadow reduction. Subtle, not dramatic.
- **Nav items:** Background highlight fade-in (`80ms`). Active state persists.
- **Checkboxes:** Spring-animated check mark SVG path draw.
- **Sliders:** Thumb scales up on touch, visual track fill follows finger.

### Long-Press Interaction

Long-press is used sparingly — only where it adds real value:
- **Song cards:** Long-press (500ms) opens quick-action popover: "Practice", "Listen", "Details". Short press navigates to default action.
- **Game cards:** Long-press (500ms) opens quick-action popover: "Play", "High Scores". Short press starts game.
- **Recording items:** Long-press (500ms) enters multi-select mode for bulk export/delete.
- **No long-press on buttons, nav items, or settings.** Only on list/card items.

**Implementation:**
- `pointerdown` starts a 500ms timer. `pointerup`/`pointercancel`/`pointermove` (>10px) cancels.
- Visual feedback: subtle scale(0.96) begins at 200ms. At 500ms, haptic pulse (if available) + popover appears.
- **iOS Safari:** Must call `e.preventDefault()` on `contextmenu` event to suppress native context menu on long-press. Register handler: `element.addEventListener('contextmenu', e => e.preventDefault())`.
- Popover dismisses on outside tap or Escape.

### Swipe Navigation

- **Horizontal swipe on child bottom nav** is **disabled.** Child navigates via tab taps only — accidental swipes during practice must not switch views.
- **CSS:** `overscroll-behavior-x: contain` on all scrollable containers to prevent back-nav on iOS.
- **Parent tab bar:** Horizontal swipe between tabs IS allowed (uses native scroll behavior of the tab bar, not gesture detection).
- **Game views:** Swipe gestures are game-specific (e.g., bowing direction in stir-soup). Global nav swipe is always suppressed in game state.
- **Song list / game catalog:** Vertical scroll only. No horizontal swipe-to-delete or swipe-to-reveal actions — use long-press for multi-action instead.

### Safe-Area Rules

All edge-touching elements account for device safe areas:

```css
/* ── Global safe-area application ── */
html {
  /* Extend color behind notch/home indicator */
  padding: env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left);
}

/* Bottom nav */
.nav-bar {
  padding-bottom: env(safe-area-inset-bottom);
  height: calc(72px + env(safe-area-inset-bottom));
}

/* Game views (full-bleed, no nav) */
.game-container {
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
           env(safe-area-inset-bottom) env(safe-area-inset-left);
}

/* Toast notifications */
.toast {
  bottom: calc(72px + env(safe-area-inset-bottom) + var(--space-3));
}

/* Modal close buttons / back buttons */
.modal-close, .back-button {
  top: calc(var(--space-3) + env(safe-area-inset-top));
}
```

**Rules:**
- `env(safe-area-inset-*)` on every element within `8px` of a screen edge
- Test on iPad mini 6 in both portrait and landscape — landscape has different insets
- Home indicator region: never place interactive elements in bottom `34px` on notchless iPads
- Game HUD: position relative to safe area, not viewport edge

### Loading States

- **Page transition:** Instant slide animation (content may still be loading inside)
- **Content loading:** Skeleton with shimmer (current pattern preserved)
- **Game loading:** Full-screen with Panda "Getting ready..." + spinner
- **Audio loading:** Inline indicator on the element that needs audio ("Warming up the microphone...")
- **Never a blank screen.** Every route has a skeleton. Every async operation has an indicator.

### Empty States

- **No songs played yet:** Panda says "Your song list is empty! Start a practice to unlock songs."
- **No games played yet:** Panda says "Games unlock as you practice! Start today's mission."
- **No recordings yet:** "Record yourself playing to hear how you sound!" with illustration
- **No achievements:** "Keep practicing and you'll earn your first badge soon!" with greyed-out badge preview

Every empty state has: Panda illustration + encouraging text + CTA button pointing to the action that fills the empty state.

### Error States

- **Network error:** Banner at top: "You're offline! Your practice is saved and will sync later." (warm, not alarming)
- **Microphone denied:** Panda says "I need to hear you! Ask a grown-up to check the microphone settings." + link to system settings
- **Audio interrupted (phone call, etc.):** Overlay: "Audio paused! Tap to resume when you're ready." + resume button
- **Game crash:** "Oops! Something went wrong." + "Try Again" button + "Go Home" button. Never show error codes to children.
- **Storage full:** Parent-zone notification: "Storage is getting full. Export recordings or clear old data."

### Celebration And Reward Moments

The most important UX moments — these are what build the habit.

**Practice completion:**
1. Final step completes → brief pause (200ms)
2. Screen dims slightly
3. Stars fly in from edges toward center (spring easing, staggered 150ms)
4. Panda appears in celebrate pose with confetti burst
5. Text: "You did it! [Specific achievement]" (e.g., "You practiced for 15 minutes!")
6. Streak counter increments with scale-bounce animation
7. If new badge earned: badge reveal animation (scale from 0, gold shimmer)
8. Auto-navigate to `/wins` after 3 seconds or on tap

**Game high score:**
1. Score counts up rapidly (number ticker animation)
2. If personal best: "New Best!" banner slides in from top
3. Stars earned appear one-by-one (spring bounce)
4. Panda reacts to score tier: 1 star = "Good try!", 2 = "Nice work!", 3 = "Amazing!"

**Streak milestone (7, 14, 30, 60, 100 days):**
1. Special full-screen celebration
2. Unique Panda pose for each milestone
3. Special badge with milestone name
4. Confetti in skill colors

---

## Accessibility

### WCAG 2.1 AA Requirements

- **Color contrast:** All text meets 4.5:1 against its background. Large text (18px+) meets 3:1.
- **Focus indicators:** 4px outline in `--color-secondary` on `:focus-visible`. Never hidden.
- **Touch targets:** 52px minimum for primary actions, 44px minimum for secondary.
- **Screen reader:** All interactive elements have labels. Game states announced via `aria-live="polite"`.
- **Motion:** All animation disabled via `prefers-reduced-motion`. No flashing content (>3 Hz).
- **Text scaling:** UI works at 200% text zoom without horizontal scroll or overlap.
- **Semantic HTML:** `<main>`, `<nav>`, `<section>`, `<article>`, `<button>` — never div-with-onclick.

### Child-Specific Accessibility

- **Reading level:** All child-facing text at Flesch-Kincaid grade 2 or below
- **No time pressure on navigation** — only within game mechanics (which have pause)
- **Consistent navigation** — bottom nav always in same position, same order
- **Clear state communication** — locked items are visually distinct AND labeled ("Locked — practice 3 more times to unlock")
- **No accidental destructive actions** — delete/clear require parent PIN

---

## Component Library

### Primitives (Build In Phase 0-1)

**`<Button>`**
- Variants: `primary`, `secondary`, `ghost`, `giant`, `danger`
- States: default, hover, active (pressed), disabled, loading
- Primary: coral bg, brand-brown 6px offset shadow, scale(0.97) on press
- Giant: full-width, `--text-lg`, `--radius-xl`, icon + label stacked on mobile
- Loading: spinner replaces label, button remains tappable area but non-interactive
- All variants: Fredoka font, `52px` minimum height

**`<Card>`**
- Variants: `default`, `glass`, `interactive`, `locked`
- Slots: header, body, footer, badge (absolute-positioned corner)
- Interactive: `scale(0.98)` on press, cursor: pointer
- Locked: 40% opacity, lock icon overlay, non-interactive
- Shadow: `--shadow-md`, increases to `--shadow-lg` on active

**`<NavBar>`**
- Fixed bottom, glass morphism bg, safe-area padding
- 5 items max: icon (24px SVG) + label (Fredoka, `--text-sm`)
- Active: skill-colored indicator dot above icon, label bold
- Hides during practice runner and full-screen games

**`<Modal>`**
- Centered overlay on dimmed backdrop (`rgba(53, 32, 25, 0.5)`)
- Content card: `--radius-2xl`, `--shadow-lg`, max-width `440px`
- Enter: scale(0.9 → 1.0) + opacity(0 → 1), `--duration-normal`, `--ease-bounce`
- Exit: opacity(1 → 0), `--duration-fast`
- Trap focus inside modal. Escape to dismiss (if dismissible).

**`<PandaSpeech>`**
- Mascot image (context-aware pose) + speech bubble
- Bubble: glass bg, rounded triangle pointer, Fredoka text
- Text animates in word-by-word (30ms per word) — gives "speaking" feel
- `aria-live="polite"` on speech content
- Sizes: `sm` (inline coaching strip), `md` (card-embedded), `lg` (full-width hero)

**`<ProgressBar>`**
- Variants: `linear`, `circular` (ring)
- Fill color: contextual (skill color, primary, or success)
- Animation: width transition `--duration-slow` with `--ease-out`
- Optional label: percentage or "2/4 done" format
- Shimmer overlay on indeterminate state

**`<Skeleton>`**
- Matches target component dimensions exactly (no generic rectangles)
- Shimmer: gradient sweep, 1.8s loop, warm tint
- Stagger: `sibling-index() * 60ms` delay (Safari 26.2+), 0ms fallback
- Fade-in on mount: `--duration-fast`

**`<GameShell>`**
- Three-state container: pre-game → in-game → post-game
- Pre-game: objectives, difficulty, Panda tip, start CTA
- In-game: full-bleed, minimal HUD, back button
- Post-game: stars, score, Panda reaction, retry/done
- Manages game lifecycle (mount/unmount canvas, cleanup RAF, etc.)

**`<StarRating>`**
- 1-5 stars, filled/empty/half states
- Star icons: custom SVG, not emoji (consistent rendering)
- Animation: sequential spring-in on earn (`150ms` stagger)
- Gold shimmer on newly earned stars

**`<FilterChips>`**
- Horizontal scrollable row of pill buttons
- Single-select or multi-select mode
- Active: filled bg in contextual color, white text
- Inactive: outlined, transparent bg
- Scroll snap for touch friendliness

**`<ErrorBoundary>`**
- Catches React errors. Shows friendly message + Panda illustration.
- "Something went wrong" + "Try Again" button
- Logs error to console for debugging. Never shows stack trace to child.

**`<LegacyBridge>`**
- Mounts vanilla JS modules into a React-managed div
- Calls `mount()` on render, cleanup on unmount
- Passes `BridgeContext` with route params, navigate fn, runtime
- Error boundary wrapping for graceful failure

---

## Session Handoff Contract

### Live Repo Documents

1. `docs/HANDOFF.md` — current status, next step, verification commands
2. `docs/architecture/next-reboot-target-state.md` — canonical target-state spec
3. `docs/architecture/reboot-feature-matrix.md` — parity-plus tracker

### Checkpoint Requirements

Every paused checkpoint updates:
- Current phase and completion percentage
- Completed feature families (with matrix row refs)
- Blockers and open risks
- Exact next recommended task
- Last verification commands run and their output
- Performance measurements if relevant to current phase
- Feature matrix rows changed since last checkpoint

### Zero-Context Pickup

1. Read `docs/HANDOFF.md`
2. Read `docs/architecture/next-reboot-target-state.md`
3. Read `docs/architecture/reboot-feature-matrix.md`
4. Run `npm run handoff:status`
5. Run targeted checks for active phase before editing
6. A checkpoint is not handoff-ready until `npm run audit:docs` passes

---

## Interfaces And Contracts

### Runtime Providers

```typescript
// Wraps entire app — provides storage, audio, platform, persona
interface AppRuntime {
  storage: StorageFacade;          // Existing storage.js
  audio: AudioContextManager;      // Existing context-manager.js
  platform: PlatformCapabilities;  // Feature detection results
  persona: 'child' | 'parent';    // Current user mode (auto-reverts to 'child' after 15 min idle or on parent zone exit)
  childName: string | null;        // From CHILD_NAME_KEY, set during onboarding step 2
  featureFlags: FeatureFlags;      // Voice coach, recording, etc. (from feature-flags.js)
  navigate: (path: string) => void;
}

interface FeatureFlags {
  voiceCoachEnabled: boolean;      // Web Speech API coaching
  recordingEnabled: boolean;       // MediaRecorder for song recording
}

// Pitch data shape emitted by AudioWorklet → WASM pipeline
interface PitchFeatures {
  noteName: string;         // e.g. "A4"
  frequency: number;        // Hz
  centsOffset: number;      // -50 to +50
  confidence: number;       // 0.0-1.0
  rmsAmplitude: number;     // 0.0-1.0
  inTune: boolean;          // |centsOffset| <= threshold (recomputed downstream, not from WASM)
  stringIndex?: number;     // 0-3 (G,D,A,E) if auto-detected
}

// Wraps routes needing live audio (tuner, mic-based games)
interface RealtimeSession {
  isActive: boolean;
  pitchData: PitchFeatures | null;
  start(): Promise<void>;
  stop(): void;
  onFeature(callback: (features: PitchFeatures) => void): () => void;
}
```

### Legacy Bridge

```typescript
interface LegacyModuleAdapter {
  mount(container: HTMLElement, context: BridgeContext): () => void;
}

interface BridgeContext {
  params: Record<string, string>;
  navigate: (path: string) => void;
  runtime: AppRuntime;
}
```

### Product Contracts

```typescript
interface DailyMission {
  id: string;
  title: string;
  steps: PracticeStep[];
  estimatedMinutes: number;
  completedSteps: number;
  isComplete: boolean;
}

interface PracticeStep {
  id: string;
  type: 'warmup' | 'technique' | 'song' | 'game' | 'free_practice' | 'review';
  title: string;
  durationSeconds: number;
  moduleRef: string;        // Route or legacy module ID
  isComplete: boolean;
}
// Step types:
// - warmup: technique drill (scales, open strings)
// - technique: focused skill exercise
// - song: play-along with assessment
// - game: embedded game session
// - free_practice: open tool (tuner/metronome) — child explores freely
// - review: spaced-repetition revisit of previously-mastered content

interface SongAssessment {
  songId: string;
  timestamp: number;
  timingScore: number;       // 0-100, weight: 45%
  intonationScore: number;   // 0-100, weight: 45%
  overallScore: number;      // 0-100, weight: 10%
  starRating: number;        // 1-5 (derived: Math.min(5, Math.max(1, Math.ceil(weightedTotal / 20))); 0→1, 1-20→1, 21-40→2, 41-60→3, 61-80→4, 81-100→5)
  masteryTier: 'foundation' | 'bronze' | 'silver' | 'gold';
  recordingId?: string;      // Link to recording if recorded
}

interface ParentChecklist {
  id: string;
  sessionId?: string;        // Links to practice session (if observed during session)
  timestamp: number;
  ratings: {
    bowHold: number;         // 1-5
    posture: number;         // 1-5
    toneQuality: number;     // 1-5
    rhythmAccuracy: number;  // 1-5
    leftHandPosition: number; // 1-5
  };
  notes: string;
}

interface ChildSettings {
  soundEnabled: boolean;      // Default: true
  motionEnabled: boolean;     // Default: true (false → prefers-reduced-motion)
  textSize: 'small' | 'medium' | 'large';  // Default: 'medium'
  backgroundTheme: 'cream' | 'blue' | 'green';  // Default: 'cream'
}

interface GameDifficultyState {
  gameId: string;
  emaScore: number;          // Exponential moving average (0-100)
  currentDifficulty: number; // 1-5 step
  parentOverride?: 'auto' | 'easy' | 'medium' | 'hard'; // Maps to difficulty step: auto→EMA, easy→1, medium→3, hard→5
  lastPlayedAt: number;
  decayRate: number;         // For spaced repetition scheduling
}

interface FeatureMatrixRow {
  id: string;
  phase: 1 | 2 | 3 | 4 | 5 | 6; // Which build phase owns this row
  currentSurface: string;
  newSurface: string;
  parityStatus: 'not-started' | 'in-progress' | 'parity' | 'parity-plus' | 'deferred';
  enhancement: string;
  deferralRationale?: string;
  tests: string[];
}
```

---

## Onboarding UX Flow

The current onboarding is a simple scroll-snap carousel (`onboarding.js`) with a binary completion flag (`ONBOARDING_KEY`). **This is a full rebuild, not a migration** — the existing carousel has no reusable state machine or step logic. The reboot replaces it with a focused 5-step wizard.

**Onboarding detection mechanism:**
- On every mount of `<HomePage>`, check `localStorage.getItem('onboarding-complete')`.
- If `null` or `'false'` → render `<OnboardingWizard>` instead of normal Home content. No separate route — wizard replaces Home body.
- On wizard completion (step 5 "Done" tap) → `localStorage.setItem('onboarding-complete', 'true')` + `localStorage.setItem('panda-violin:child-name-v1', name)` → wizard unmounts → Home renders normal content with first mission.
- `<OnboardingWizard>` is a `React.lazy()` chunk — not loaded unless needed.
- E2E tests: fresh context (no localStorage) → wizard appears. Seeded context (`seed-kv.js` sets `onboarding-complete: 'true'`) → wizard does NOT appear.

### Flow

```
Step 1: Welcome (child-facing)
┌─────────────────────────────────────┐
│        ● ○ ○ ○ ○                    │  ← Progress dots (5 steps)
│                                     │
│         🐼 (happy pose, large)      │
│                                     │
│    "Hi! I'm Panda.                  │
│     Let's learn violin together!"   │
│                                     │
│  ┌───────────────────────────┐      │
│  │       ▶  Let's Go!        │      │
│  └───────────────────────────┘      │
└─────────────────────────────────────┘

Step 2: Name (child-facing)
┌─────────────────────────────────────┐
│    ←   ○ ● ○ ○ ○                    │  ← Back + progress dots
│                                     │
│         🐼 (listening pose)         │
│                                     │
│    "What's your name?"              │
│                                     │
│    ┌─────────────────────────┐      │
│    │  [name input field]      │     │
│    └─────────────────────────┘      │
│                                     │
│  ┌───────────────────────────┐      │
│  │         Next →             │      │
│  └───────────────────────────┘      │
└─────────────────────────────────────┘

Step 3: Parent Setup (parent-facing)
┌─────────────────────────────────────┐
│    ←   ○ ○ ● ○ ○                    │  ← Back + progress dots
│                                     │
│  For grown-ups:                     │
│                                     │
│  Set a PIN so only you can          │
│  access parent settings.            │
│                                     │
│    ┌──┐ ┌──┐ ┌──┐ ┌──┐            │
│    │   │ │   │ │   │ │   │          │
│    └──┘ └──┘ └──┘ └──┘            │
│                                     │
│    [number pad]                     │
│                                     │
│  [Skip for now]                     │
└─────────────────────────────────────┘

Step 4: Install Education (if not installed)
┌─────────────────────────────────────┐
│    ←   ○ ○ ○ ● ○                    │  ← Back + progress dots
│                                     │
│  Add to Home Screen                 │
│                                     │
│  For the best experience,           │
│  add this app to your               │
│  iPad home screen.                  │
│                                     │
│  [animated visual showing           │
│   share → add to home screen]       │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │  Show Me  │  │  Later   │        │
│  └──────────┘  └──────────┘        │
└─────────────────────────────────────┘

Step 5: First Mission Launch (child-facing)
┌─────────────────────────────────────┐
│    ←   ○ ○ ○ ○ ●                    │  ← Back + progress dots
│                                     │
│         🐼 (focus pose)             │
│                                     │
│    "[Name], your first mission      │
│     is ready! Let's warm up         │
│     and play a song."               │
│                                     │
│  ┌───────────────────────────┐      │
│  │    ▶  Start First Mission  │     │
│  └───────────────────────────┘      │
└─────────────────────────────────────┘
```

### Rules
- **Total time: under 90 seconds.** If it takes longer, it's too much.
- Steps 1-2 are child-facing: Fredoka, large text, Panda-centered
- Step 3 is parent-facing: Figtree, smaller text, functional layout
- Step 4 only appears if not already installed to home screen (detect standalone display mode)
- Step 5 immediately launches the practice runner — no "go to home first"
- Progress dots at top show 5 steps. Back button available on steps 2-5.
- All data is saved progressively — if the child quits at step 3, steps 1-2 are preserved

---

## AI Toolchain Integration Summary

### Environment Requirements

```
Google Antigravity >= 1.20.3 (VSCode OSS 1.107.0, Chromium 142)
  — Upgrade from 1.19.6: AGENTS.md support, auto-continue default, token accounting fix
Gemini 3.1 Pro (model: gemini-3.1-pro, thinking: 80% Low/Medium, 20% High)
  — Enable explicit context caching for repeated file analysis ($0.50/M vs $2.00/M)
Stitch MCP Server (add via Antigravity MCP settings)
  — Agent Skills: npx skills add google-labs-code/stitch-skills --skill <name> --global
  — Required skills: design-md, react:components, stitch-loop, enhance-prompt
Nano Banana 2 (model: gemini-3.1-flash-image-preview)
  — Pricing: $0.045/img (512px), $0.067 (1024px); Batch API: 50% off all tiers
  — 14 aspect ratios incl. ultra-tall/wide (1:4, 4:1, 1:8, 8:1)
  — Use Batch API for all non-urgent generation (badges, poses, textures)
```

### Antigravity Project Configuration

**`AGENTS.md`** (project root) — loaded automatically by all agents (Antigravity 1.20.3+):
```markdown
# Emerson Violin PWA — Agent Rules

## Hard Constraints
- Every commit: `npm run handoff:verify` passes (567+ unit + 45+ E2E)
- Zero new runtime deps beyond react@19, react-dom@19, react-router@7, jspdf
- WASM crates (panda-core, panda-audio) are read-only — no Rust modifications
- 26 platform files stay vanilla JS — singleton init via AppRuntimeProvider
- All games use <GameShell> 3-state pattern (pre-game/in-game/post-game)
- Touch-first: 52px min targets, no hover-only interactions
- CSS Modules for new components; global CSS untouched unless explicitly migrating
- Stitch `react:components` exports Tailwind — always convert to CSS Modules before committing
- TypeScript strict for new files; allowJs: true for bridged legacy

## Code Style
- No nested/chained ternaries
- Prefer SMIL <animate> for SVG animation (WebKit CSS d: path gaps)
- CSS animations over JS RAF for UI motion
- prefers-reduced-motion respected everywhere

## Architecture
- Strangler fig: <LegacyBridge> wraps vanilla modules during migration
- Event bus dual-emit: React AppEventBus + legacy panda:* events until fully migrated
- Curriculum engine stays vanilla through Phase 2, migrates Phase 3
- Audio pipeline (AudioWorklet → WASM → PolicyWorker) stays vanilla through v1

## Testing
- New React components: Vitest + RTL (tests/components/)
- Vanilla modules: existing Vitest tests unchanged (tests/unit/)
- E2E: Playwright, pathname helpers created Phase 1 week 1
- Audio/WASM: dedicated integration tests (tests/integration/)
```

**Saved Workflows** (one per phase, see per-phase blocks in Delivery Phases):
- `phase-0-spike`, `phase-1-shell`, `phase-2-habit-loop`, `phase-3-tools`
- `phase-4-content`, `phase-5-parent`, `phase-6-launch`

### Stitch Project Structure

```
Project: "Emerson Violin PWA Reboot"
Device: TABLET (768px portrait)

Screens organized by phase:
  Phase 0/  — Button, Card, NavBar, PandaSpeech, Skeleton
  Phase 1/  — App shell, Bottom nav, PIN gate, Error boundary
  Phase 2/  — Home, Practice runner, Wins, Onboarding (5 screens)
  Phase 3/  — Tool hub, Tuner, Metronome, Drone, Bowing, Posture, Settings
  Phase 4/  — Songs library, Song detail, Games catalog, GameShell (3 states)
  Phase 5/  — Parent workspace, Review, Goals, Checklist, Recordings, Data, Settings
  Phase 6/  — Help, About, Privacy, Install education
```

**Per-screen Stitch prompt template:**
```
Design a [screen name] for a children's violin practice PWA.
Target device: iPad mini 6 (768px portrait).
Design system:
- Font: Fredoka (child-facing), Figtree (parent-facing)
- Primary color: #E95639 (warm red-orange)
- Background: #FFF9F3 (warm cream)
- Surface: #FFFFFF with 3-tier elevation shadows
- Touch targets: 52px minimum
- Corner radius: 8/12/16px
- Glass morphism for floating layers: rgba(255,255,255,0.92) + blur(12px)

Layout: [paste ASCII wireframe from plan]

Style: Warm, rounded, child-friendly. Inspired by a cozy music practice room.
No sharp corners. Generous spacing. Pillowy interactive elements.
```

### Nano Banana Asset Catalog

| Asset ID | Description | Dimensions | Phase | Status |
|----------|-------------|------------|-------|--------|
| `panda-coach` | Red Panda coaching pose | 512×512 | 0 | Pending |
| `panda-celebrate` | Red Panda celebration | 512×512 | 2 | Pending |
| `panda-think` | Red Panda thinking | 512×512 | 2 | Pending |
| `panda-encourage` | Red Panda encouraging | 512×512 | 2 | Pending |
| `panda-sleep` | Red Panda sleeping | 512×512 | 2 | Pending |
| `panda-wave` | Red Panda waving | 512×512 | 2 | Pending |
| `panda-violin` | Red Panda playing violin | 512×512 | 2 | Pending |
| `panda-read` | Red Panda reading music | 512×512 | 2 | Pending |
| `onboard-welcome` | Welcome illustration | 768×480 | 2 | Pending |
| `onboard-name` | Name entry illustration | 768×480 | 2 | Pending |
| `onboard-parent` | Parent setup illustration | 768×480 | 2 | Pending |
| `onboard-install` | Install education | 768×480 | 2 | Pending |
| `onboard-ready` | Ready to play illustration | 768×480 | 2 | Pending |
| `empty-songs` | No songs state | 400×300 | 2 | Pending |
| `empty-recordings` | No recordings state | 400×300 | 2 | Pending |
| `empty-loading` | Loading state | 400×300 | 2 | Pending |
| `empty-offline` | Offline state | 400×300 | 2 | Pending |
| `badge-streak-7` | 7-day streak badge | 256×256 | 4 | Pending |
| `badge-streak-14` | 14-day streak badge | 256×256 | 4 | Pending |
| `badge-streak-30` | 30-day streak badge | 256×256 | 4 | Pending |
| `badge-first-song` | First song completed | 256×256 | 4 | Pending |
| `badge-all-games` | All 18 games played | 256×256 | 4 | Pending |
| `badge-perfect-score` | Perfect game score | 256×256 | 4 | Pending |
| `badge-recorder` | First recording made | 256×256 | 4 | Pending |
| `badge-explorer` | All tools used | 256×256 | 4 | Pending |
| `badge-master` | Max skill in any axis | 256×256 | 4 | Pending |
| `icon-pitch` | Pitch skill icon | 128×128 | 4 | Pending |
| `icon-rhythm` | Rhythm skill icon | 128×128 | 4 | Pending |
| `icon-reading` | Reading skill icon | 128×128 | 4 | Pending |
| `icon-bowing` | Bowing skill icon | 128×128 | 4 | Pending |
| `icon-posture` | Posture skill icon | 128×128 | 4 | Pending |
| `texture-linen` | Warm linen bg texture | 512×512 tile | 0 | Pending |
| `texture-parchment` | Soft parchment bg | 512×512 tile | 0 | Pending |
| `texture-wood` | Light wood grain bg | 512×512 tile | 0 | Pending |

**Nano Banana prompt consistency rules:**
- All Red Panda poses generated in a **single Batch API request** for character consistency (est. 8-10 images × $0.034 = ~$0.34)
- Style anchor: "cute red panda character, warm children's book illustration, soft lighting, rounded features, warm brown and orange tones, cream background"
- All badges use same border style: "round badge, embossed gold border, warm tones, award style"
- Red Panda poses + illustrations: generate at **1024px** (Retina 2×). Icons/badges/textures: **512px**.
- Optimize with `sharp` or `squoosh` CLI before committing.
- **Total estimated asset cost:** 33 images ≈ **$1.12** (Batch API, mixed resolution tiers)

### Token Budget Strategy (Gemini 3.1 Pro)

Gemini 3.1 Pro has a 1M token context window and 64K token output ([source](https://www.nxcode.io/en/resources/news/gemini-3-1-pro-complete-guide-benchmarks-pricing-api-2026)). Budget allocation:

| Context Allocation | Tokens | Purpose |
|-------------------|--------|---------|
| `AGENTS.md` | ~800 | Agent rules (loaded every session) |
| Current phase plan section | ~2,000 | Phase-specific instructions |
| Relevant source files | ~15,000 | Files being migrated this session |
| Existing test files | ~5,000 | Test patterns to match |
| Design tokens (CSS) | ~1,500 | Color/type/spacing/animation tokens |
| Stitch export (if applicable) | ~3,000 | Generated component code to integrate |
| **Total per-agent context** | **~27,300** | Well within 1M budget |

**Tips for efficient token use:**
- Follow 80/20 rule: High thinking only for multi-file atomics and audio debugging (~20% of tasks)
- Enable **explicit context caching** on `AGENTS.md`, design tokens, and phase plan — saves 75% on input tokens across repeated agent sessions
- **Prompt ordering:** Cached context first, questions/instructions last (Gemini 3.1 Pro optimizes for this layout)
- Load only the files relevant to the current migration task, not the entire codebase
- Stitch-generated code reduces token spend on layout/styling — agent focuses on logic/hooks
- Nano Banana asset generation is separate from code context — no token overlap
- Auto-continue (default in 1.20.3) eliminates "continue" token waste in multi-step tasks

---

## Definition Of Done

- Every row in `reboot-feature-matrix.md` is `parity-plus` or `deferred` with rationale
- Performance budgets met on iPad mini 6 real device
- 45+ E2E tests pass (existing + new flows)
- Core habit loop (home → practice → completion → wins) works offline
- Hash redirect script handles all legacy routes (17 original + 3 new)
- Visible product no longer reflects hash-nav mental model
- No `<LegacyBridge>` remains for core flows (Home, Practice, Wins, Songs catalog/detail, Games catalog, Tools hub/tuner/metronome/drone/bowing/posture, Settings, Parent zone, Support)
- Individual game engines may remain bridged if stable and passing tests
- All 17 games render through `<GameShell>` with consistent pre/in/post states
- All 30 songs have detail pages with recording, assessment, and mastery display
- Adaptive difficulty (EMA) and spaced repetition scheduling functional
- 9 achievement badges unlock correctly based on defined criteria
- 5-axis skill meters update from WASM SkillProfile
- Child settings (`/settings`) persist preferences across sessions
- Parent zone: all 6 tabs functional (review, goals, checklist, recordings, data, settings)
- Parent checklist saves/loads observations, exports CSV/PDF
- Coaching style presets (gentle/standard/challenge) affect RT coaching feedback
- ICS reminder export downloads valid calendar file
- Install + offline + audio recovery all tested on real iPad mini 6 in Home Screen mode
- App Badge, wake lock, sharing, orientation — all platform features verified
- Repo docs sufficient for zero-context pickup
- `npm run handoff:verify` passes
