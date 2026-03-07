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

7. Update `manifest.webmanifest` shortcuts from hash URLs to pathnames:
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
8. **The actual audio processing chain remains unchanged** — only the UI layer is React

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

### Phase 0: Reboot Spec + Technical Spike (1-2 weeks)

**Goal:** Validate framework choice, prove bridge pattern, establish design system.

**Deliverables:**
- [ ] Framework spike: Vite + React SPA with `<LegacyBridge>` mounting one vanilla module (home)
- [ ] SW spike: custom SW working with SPA pathname routing
- [ ] Performance baseline: measure current app on iPad mini 6 Simulator (LCP, TTI, CLS, bundle)
- [ ] Route map finalized (above)
- [ ] Design system implemented: CSS custom properties for colors, typography, spacing, elevation, easing, duration tokens
- [ ] Figtree font evaluation: load test on iPad mini 6, measure FOUT/FOIT, confirm fallback chain
- [ ] Component primitives built: `<Button>`, `<Card>`, `<NavBar>`, `<PandaSpeech>`, `<Skeleton>`, `<LegacyBridge>`
- [ ] Feature matrix created (`docs/architecture/reboot-feature-matrix.md`)
- [ ] Hash → pathname redirect script working
- [ ] Target state doc (`docs/architecture/next-reboot-target-state.md`)
- [ ] Page-by-page wireframes validated on iPad mini 6 Simulator at 768px portrait

**Gate:** Spike passes all 45 E2E tests with React shell + legacy bridge. Performance baseline documented.

### Phase 1: React Shell + Navigation (2-3 weeks)

**Goal:** React owns the shell, routing, and navigation. All content renders through legacy bridges.

**Deliverables:**
- [ ] React app shell: root layout, `<Suspense>` boundaries, error boundaries
- [ ] Child bottom nav (5 items) as React component
- [ ] Parent gate (PIN) as React component
- [ ] All 17 current views mounted via `<LegacyBridge>`
- [ ] All 17 games mounted via `<LegacyBridge>`
- [ ] `<AppRuntimeProvider>` wrapping app (storage, audio, platform, persona)
- [ ] Hash redirect script active
- [ ] Eager/idle module loading ported to React lazy + Suspense
- [ ] CSS Modules for shell components; global CSS unchanged
- [ ] Shared components built in Phase 1: `<Modal>`, `<ProgressBar>`, `<StarRating>`, `<FilterChips>`, `<ErrorBoundary>`, `<Skeleton>`, `<PandaSpeech>` — used by all later phases

**Gate:** `npm run handoff:verify` passes (567 unit + 45 E2E). No visual regression on iPad Safari.

### Phase 2: Core Habit Loop (3-4 weeks)

**Goal:** The primary user flow — open app → see mission → practice → earn reward — is fully native React.

**Deliverables:**
- [ ] **Home page** — Daily mission display, "start practice" CTA, Red Panda embedded guide
- [ ] **Practice runner** — Step-through UI with progress bar, timing, pause/resume, completion state
- [ ] **Wins page** — Child-friendly streaks, achievements, rewards display
- [ ] **Onboarding** — Full rebuild (existing scroll-snap carousel not reusable): 5-step wizard, `CHILD_NAME_KEY` persisted, progressive save
- [ ] Curriculum/mission state integrated with React via hooks
- [ ] Progress model integrated with React via hooks (including WASM fallback path via `progress-model-fallback.js`)
- [ ] Auto-goals engine wired: `AUTO_GOALS_KEY` populated from curriculum + ML recommendations
- [ ] EMA baseline seeded after first song/game completion (first-activity calibration)
- [ ] Web Vitals write-side: LCP/INP/CLS captured from first session, persisted to `WEB_VITALS_KEY`
- [ ] Custom event bus: `AppEventBus` singleton created, `useAppEvent()` hook available, dual-emit for backward compat
- [ ] Legacy bridges removed for: home, coach, progress, onboarding

**Gate:** Core habit loop E2E test passes. New onboarding → first mission → completion flow tested. Performance budget met on iPad mini 6.

### Phase 3: Tools + Child Settings (2-3 weeks)

**Goal:** All tools are native React with enhanced UX. Child settings page functional.

**Deliverables:**
- [ ] **Tool selector** — 5-tool hub with purpose-driven entry points
- [ ] **Tuner** — React wrapper around existing audio pipeline, better permission/error UX
- [ ] **Metronome** — New page: BPM slider, tap tempo, visual beat, subdivisions, accent toggle
- [ ] **Drone tones** — New page: 4 string buttons, sustained reference tone via tone-player synth, volume control
- [ ] **Bowing trainer** — Enhanced feedback, camera permission pre-prompt, help states
- [ ] **Posture trainer** — Enhanced feedback, camera permission pre-prompt, help states
- [ ] **Child settings** (`/settings`) — Sound toggle, motion toggle, text size, background theme, help + parent links
- [ ] `<RealtimeSessionProvider>` for routes needing live audio (wraps tuner, mic games, bowing/posture)
- [ ] `useRealtimeAudio()` hook
- [ ] `<CoachOverlay>` React portal migrated from `coach-overlay.js` body-append pattern
- [ ] RT coaching presets (gentle/standard/challenge) read from parent settings and wired into policy Web Worker
- [ ] Voice coach toggle migrated to `<ChildSettings>` (reads `featureFlags.voiceCoachEnabled`)
- [ ] Legacy bridges removed for: tuner, trainer, bowing, posture, settings

**Gate:** Tuner works on iPad mini 6 Safari with real microphone. Metronome/drone functional with Web Audio. Audio recovery from interruption tested. Child settings persist across sessions.

### Phase 4: Content Libraries (4-5 weeks)

**Goal:** Songs and Games on enhanced React shells with full detail pages.

**Deliverables:**
- [ ] **Songs library** — Search, filter, skill tags, difficulty badges, "ready to play" indicators, 3-tier organization
- [ ] **Song detail** — Scrolling staff, CSS playhead, BPM display, practice tips, section checkpoints, mastery display
- [ ] **Song recording** — MediaRecorder integration, count-in, auto-assess, recording history, playback
- [ ] **Song assessment** — Weighted scoring (timing 45% + intonation 45% + overall 10%), mastery tier display
- [ ] **Games catalog** — Skill-filtered grid with 5 color-coded skill categories, difficulty framing, personal bests
- [ ] **Game shell component** — `<GameShell>` with consistent pre-game (objectives, tips, difficulty), in-game (full-bleed, HUD), post-game (stars, score, retry/done)
- [ ] All 17 games mounted in new game shell (most still via `<LegacyBridge>` internally for canvas logic)
- [ ] Per-game Panda tips (3-4 tips per game, rotated in pre-game state)
- [ ] Adaptive difficulty integration — EMA per-game, auto-adjust after each play
- [ ] All 30 songs with enhanced metadata (skill tags, difficulty stars, readiness indicators)
- [ ] Spaced repetition integration — overdue songs/games appear in mission builder queue
- [ ] Legacy bridges removed for: songs library, song detail, games catalog

**Note:** Individual game internals (canvas rendering, game state machines) may remain vanilla JS behind the bridge through v1. The game *shell* (entry, objectives, scoring, completion) is React. The game *engine* stays vanilla where it's working.

**Gate:** All 17 games launch and complete through `<GameShell>`. All 30 songs play with recording option. Song assessment working on 3+ songs. Feature matrix shows parity-plus for songs and games families.

### Phase 5: Parent Zone + Support (3-4 weeks)

**Goal:** Parent workspace is a coherent, PIN-gated React surface with all 6 sub-panels.

**Deliverables:**
- [ ] **Parent gate** — PIN entry/creation with clear UX (PBKDF2-hashed, existing contract)
- [ ] **Review panel** — Session history, skill radar chart (SVG 5-axis), per-skill trends, song mastery table, RT coaching replay timeline
- [ ] **Goals panel** — Daily time slider, weekly day checkboxes, recital date, progress bar
- [ ] **Checklist panel** (enhanced from `home-teacher.js`) — Suzuki-style observation form, 5-point per-category ratings, notes, history, CSV/PDF export
- [ ] **Recordings panel** — Library with playback, filter, individual + bulk export, delete, storage indicator
- [ ] **Data panel** — JSON backup/restore, CSV practice log export, storage breakdown, clear-all with double confirmation, offline integrity check
- [ ] **Settings panel** — Coaching style presets, ICS reminder export, per-game difficulty override, ML diagnostics (EMA values, demo mode, reset)
- [ ] **Support pages** — `/support/help` (FAQ), `/support/about` (version), `/support/privacy` (policy)
- [ ] All parent-facing features consolidated under tabbed workspace
- [ ] Legacy bridges removed for: parent, analysis, backup, settings, recordings

**Gate:** Parent unlock → all 6 tabs navigate correctly → data export tested E2E → checklist save/load verified → ICS file downloads correctly.

### Phase 6: Consolidation + Launch (2-3 weeks)

**Goal:** Legacy bridges removed, performance tuned, platform features verified, launched.

**Deliverables:**
- [ ] All remaining legacy bridges replaced or explicitly deferred with rationale
- [ ] Legacy redirect script tested and verified (all hash routes including new metronome/drone/checklist)
- [ ] Manifest shortcuts updated from hash URLs to pathnames; `display_override` and `launch_handler` preserved
- [ ] Performance audit on iPad mini 6: all budgets met
- [ ] Accessibility audit: all WCAG 2.1 AA violations resolved
- [ ] Offline behavior verified: full app shell cached, recordings preserved, offline indicator works, integrity self-test functional
- [ ] Install education: clear prompts for Home Screen installation
- [ ] App Badge implemented: Badge API sets icon badge when no practice today, cleared after daily mission started (feature-detect + graceful degrade)
- [ ] Platform features verified: App Badge, wake lock, orientation, sharing, audio codec fallback, ICS reminders, MediaSession
- [ ] Web Vitals tracking confirmed: LCP/INP/CLS persisted, viewable in ML diagnostics
- [ ] Feature matrix: every row is `parity-plus` or `deferred` with rationale
- [ ] Dead code cleanup: removed unused legacy modules, CSS, test fixtures
- [ ] Documentation updated: HANDOFF.md, architecture docs, CLAUDE.md
- [ ] Spaced repetition + adaptive difficulty verified end-to-end across multiple sessions

**Gate:** `npm run handoff:verify` passes. Feature matrix complete. iPad mini 6 real-device testing pass. All 17 games through `<GameShell>`. All 30 songs with recording + assessment.

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
1. **Phase 1 (hash redirect active):** E2E helpers still work — hash URLs redirect to pathnames. No immediate breakage.
2. **Phase 1 deliverable:** Create pathname-based helper wrappers that call `page.goto('/practice')` etc. Old helpers remain as aliases.
3. **Phase 2+:** New E2E tests use pathname helpers exclusively.
4. **Phase 6 (hash redirect removed):** Delete old hash-based helpers, update remaining E2E tests.
5. **`seed-kv.js`:** Update hardcoded `onboarding-complete` key to also seed `CHILD_NAME_KEY`. Update IDB version references if schema changes.

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

**State 2: In-Game** — Full-bleed canvas/HTML game. No nav. Minimal HUD (back, score, timer). Game engine owns the screen.

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
- **Background:** Cosmetic theme swap. Changes `--color-bg` and `--color-bg-alt`. Cream (default), Calm Blue (#F0F4F8), Soft Green (#F0F8F4).
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

**UX:** Simple scrollable text. FAQ uses `<details>/<summary>` accordion. About page shows app version from `manifest.webmanifest`, build hash, and "Made with love" credit. Privacy policy is plain text. No Panda mascot on these pages.

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

**Tab: Review** (`/parent/review`)
- Last 7 sessions: date, duration, activities, completion %
- Skill radar chart (SVG 5-axis pentagon)
- Per-skill trend sparklines (last 10 sessions)
- Song mastery table: song name, current tier, trend arrow
- RT coaching replay: tap a session → timeline view of pitch contour, note events, coaching triggers. Toggle between gentle/standard/challenge presets to compare.

**Tab: Goals** (`/parent/goals`)
- Daily practice time slider (5-30 min, default 15)
- Weekly practice day checkboxes (default: Mon-Fri)
- Recital date picker + countdown
- Goal progress bar (this week's actual vs. target)

**Tab: Checklist** (`/parent/checklist`) — NEW
- Suzuki-style home teacher observation form
- Per-session checklist items: bow hold (1-5), posture (1-5), tone quality (1-5), rhythm accuracy (1-5), left hand position (1-5)
- Free-text notes field
- "Save Observation" button → timestamped entry in IndexedDB
- History list of past observations (date, summary rating)
- Export all observations as CSV or PDF

**Tab: Recordings** (`/parent/recordings`)
- Recording list: date, song name, duration, star rating, playback button
- Filter by song, date range
- Export: individual (share/download), bulk (zip)
- Delete: individual or bulk (confirmation required)
- Storage usage indicator

**Tab: Data** (`/parent/data`)
- Full backup: export all app data as JSON file
- Restore: import from JSON (with confirmation)
- Export practice log as CSV
- Storage usage breakdown (events, recordings, ML data, cache)
- Clear all data (double confirmation: "Are you sure?" → "Type DELETE to confirm")
- Offline integrity check: verify SW cache completeness, repair if needed

**Tab: Settings** (`/parent/settings`)
- Coaching style: gentle / standard / challenge (radio buttons with descriptions)
- Practice reminders: time picker + day checkboxes → "Download Calendar Reminder" (ICS export)
- Per-game difficulty override: list of 17 games with auto/easy/medium/hard selector
- Sound/haptic master controls
- ML diagnostics: expandable panel showing EMA values, forgetting curves, recommendation weights. "Demo Mode" toggle. "Simulate Data" button (generates synthetic events for testing recommendation flow). "Reset ML" button (with confirmation). Web Vitals viewer: 40-session LCP/INP/CLS rolling history chart (reads `WEB_VITALS_KEY`).
- App version, about, privacy policy links

---

## Interaction Patterns

### Touch Feedback

Every tappable element responds immediately:
- **Buttons:** `scale(0.97)` on touch-start, `scale(1.0)` on touch-end (spring easing). Shadow compresses.
- **Cards:** `scale(0.98)` + slight shadow reduction. Subtle, not dramatic.
- **Nav items:** Background highlight fade-in (`80ms`). Active state persists.
- **Checkboxes:** Spring-animated check mark SVG path draw.
- **Sliders:** Thumb scales up on touch, visual track fill follows finger.

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
  starRating: number;        // 1-5 (derived: Math.round(weightedTotal / 20), clamped 1-5; 0-20→1, 21-40→2, 41-60→3, 61-80→4, 81-100→5)
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
