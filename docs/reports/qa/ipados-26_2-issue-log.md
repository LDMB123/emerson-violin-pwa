# iPadOS 26.2 Issue Log

Tracking modernization, offline-first, UX, and stability issues. Each entry includes the fix applied.

| # | Area | Issue | Fix | Files |
|---:|------|-------|-----|-------|
| 1 | Data retention | Recording history capped at 2 while UI showed 4 slots. | Increase cap to 4 entries. | src/recordings/recordings.js |
| 2 | Parent Zone | Parent recordings panel missing styles. | Added layout + card styling for recordings list. | src/styles/app.css |
| 3 | Parent Zone | Parent recordings module not loaded for Parent view. | Added lazy loader hook. | src/app.js |
| 4 | UX | Recording delete control lacked styling. | Added `recording-delete` button styles. | src/styles/app.css |
| 5 | Platform targeting | iPadOS detection included non-iPad devices. | Limited UA check to iPad signals only. | src/platform/ipados-capabilities.js |
| 6 | Platform targeting | Install guide checked non-iPad devices. | Limited UA check to iPad signals only. | src/platform/install-guide.js |
| 7 | Platform targeting | Offline recovery used generic mobile detection. | Switched to iPad-specific detection for refresh interval. | src/platform/offline-recovery.js |
| 8 | Docs | Non‑iPadOS references in app description. | Updated description to iPadOS 26.2 only. | package.json |
| 9 | Docs | Preview script referenced other OSes. | Updated copy to iPadOS 26.2 only. | start-preview.sh |
| 10 | Docs | Install guide referenced non‑iPad devices. | Updated copy to iPadOS 26.2 only. | INSTALL.txt |
| 11 | QA | Test plan referenced other OSes and iPadOS 26.0. | Updated to iPadOS 26.2 only. | docs/reports/qa/test-plan-ipados26.md |
| 12 | QA | Playwright device profile used phone. | Updated to iPad profile. | playwright.config.js |
| 13 | UX | Parent recordings played audio even if sound toggle off. | Respected sound toggle before playback. | src/parent/recordings.js |
| 14 | UX | Clear recordings button active with no recordings. | Disabled button when list empty. | src/parent/recordings.js |
| 15 | Safety | Clear recordings had no confirmation. | Added confirmation prompt. | src/parent/recordings.js |
| 16 | Safety | Delete recording had no confirmation. | Added confirmation prompt. | src/parent/recordings.js |
| 17 | Offline | Offline mode state could revert after SW controller change. | Persisted current state and reapply safely. | src/platform/offline-mode.js |
| 18 | Data safety | Backup share could throw and abort export. | Wrapped share in try/catch and fallback. | src/backup/export.js |
| 19 | Data safety | Backup import could restore unlimited recordings. | Capped imported recordings to 4. | src/backup/export.js |
| 20 | Offline UX | Offline mode toggle usable without service worker support. | Disabled toggle and status when unsupported. | src/platform/offline-mode.js |
| 21 | Offline UX | Offline integrity buttons active even when cache unsupported. | Disabled buttons when cache unavailable. | src/platform/offline-integrity.js |
| 22 | Settings UX | Recording setting lacked status message. | Added recording status note. | index.html |
| 23 | Settings UX | Recording status not updated on unsupported devices. | Updated status when MediaRecorder unavailable. | src/recordings/recordings.js |
| 24 | Settings UX | Recording status not updated on permission denial. | Added status update on mic denial. | src/recordings/recordings.js |
| 25 | Settings UX | Recording status not updated on recording start. | Added “recording in progress” status. | src/recordings/recordings.js |
| 26 | Settings UX | Recording status not updated on recording stop. | Added ready status on stop. | src/recordings/recordings.js |
| 27 | Settings UX | Recording status not updated when user turns it off. | Added “off” status when toggle disabled. | src/recordings/recordings.js |
| 28 | Parent Zone | Recording list lacked date context. | Added recorded date to list items. | src/parent/recordings.js |
| 29 | Parent Zone | Clear recordings lacked confirmation. | Added confirm prompt. | src/parent/recordings.js |
| 30 | Parent Zone | Delete recording lacked confirmation. | Added confirm prompt. | src/parent/recordings.js |
| 31 | UX | Parent recordings played even when sounds disabled. | Respected sound toggle for playback. | src/parent/recordings.js |
| 32 | Offline UX | Network status message ignored offline mode state. | Added offline mode messaging. | src/platform/native-apis.js |
| 33 | Export UX | Recording exports produced duplicate filenames. | Added date suffix to exported filenames. | src/utils/recording-export.js |
| 34 | UX | Session Review play buttons stayed enabled when sounds disabled. | Disable play buttons based on sound setting and update on change. | src/analysis/session-review.js |
| 35 | Parent Zone | Parent recording play buttons didn’t reflect sound toggle. | Disable play buttons and re-render on sound change. | src/parent/recordings.js |
| 36 | Install | Startup images targeted non‑iPad sizes. | Swapped to iPad-sized startup image queries. | index.html |
| 37 | Accessibility | Viewport disabled pinch zoom. | Allowed user scaling. | index.html |
| 38 | Offline UX | Offline mode toggle enabled without service worker. | Disabled toggle with guidance. | src/platform/offline-mode.js |
| 39 | App Updates | Update status unclear when SW not ready. | Added explicit “not ready” messaging and disabled update button. | src/platform/sw-updates.js |
| 40 | Reminders | Reminder export share could throw and fail silently. | Added share fallback behavior. | src/notifications/reminders.js |
| 41 | Accessibility | Rhythm Painter color dots had no accessible labels. | Added aria-labels for color buttons. | index.html |
| 42 | Accessibility | Parent PIN input lacked accessible label. | Added screen-reader label. | index.html |
| 43 | Accessibility | Hidden focus log inputs exposed to accessibility tree. | Marked inputs hidden and aria-hidden. | index.html |
| 44 | Accessibility | Backup import file input lacked label. | Added aria-label to hidden file input. | index.html |
| 45 | Accessibility | Progress bars lacked semantic roles and ARIA values. | Added progressbar roles/labels and live aria updates. | index.html, src/progress/progress.js |
| 46 | Accessibility | Popover menu lacked focus management. | Added focus-first-item on open and return focus on close. | src/app.js |
| 47 | Notifications | Notification permission request could throw without feedback. | Added try/catch and graceful status update. | src/notifications/reminders.js |
| 48 | Audio UX | Session Review playback continued when leaving view or backgrounding. | Added stop/pause on view change and hide. | src/analysis/session-review.js |
| 49 | Accessibility | Parent PIN dialog lacked explicit label association. | Added aria-labelledby linking to dialog title. | index.html |
| 50 | Accessibility | Primary navigation lacked aria-label. | Added `aria-label` to bottom nav. | index.html |
| 51 | Accessibility | More menu lacked menu roles. | Added dialog/menu roles and menuitems. | index.html |
| 52 | Data safety | Reset progress had no confirmation. | Added destructive action confirmation. | src/progress/progress.js |
| 53 | Offline updates | Service worker updates could be served from cache. | Set `updateViaCache: 'none'` on registration. | src/app.js |
| 54 | Accessibility | Coach bubble and session review messages not announced to screen readers. | Added aria-live to coach speech and analysis messages. | index.html |
| 55 | Accessibility | Parent PIN dialog missing modal semantics. | Added role and aria-modal attributes. | index.html |
| 56 | Accessibility | Focus timer status not announced. | Added aria-live to focus status. | index.html |
| 57 | Accessibility | Major views lacked section labels for screen readers. | Added aria-labels to primary views. | index.html |
| 58 | Accessibility | Song detail views lacked section labels. | Added aria-labels for each song view. | index.html |
| 59 | Accessibility | Game views lacked section labels. | Added aria-labels for each game view. | index.html |
| 60 | Offline UX | Network status text didn’t update when offline mode toggled. | Emitted offline-mode event and listened for updates. | src/platform/offline-mode.js, src/platform/native-apis.js |
| 61 | Recording UX | Recording status didn’t reflect microphone permission state. | Added permission checks and status updates. | src/recordings/recordings.js |
| 62 | Export safety | Recording export could throw on invalid date. | Added safe date parsing guard. | src/utils/recording-export.js |
| 63 | Parent Zone | Recording list could show “Invalid Date”. | Added safe date parsing for recording timestamps. | src/parent/recordings.js |
| 64 | Motion | Navigation animation preference didn’t update when system setting changes. | Read prefers-reduced-motion dynamically. | src/app.js |
| 65 | Offline integrity | Cache selection relied on lexicographic order. | Added numeric version parsing to choose latest cache. | src/platform/offline-integrity.js |
| 66 | Forms | Parent PIN form buttons lacked explicit type. | Added type="submit" for clarity. | index.html |
| 67 | Accessibility | Filtered song cards remained focusable when hidden. | Set aria-hidden and tabindex for hidden cards. | src/songs/song-search.js |
| 68 | Accessibility | Install guide lacked focus management and escape handling. | Added focus restore, initial focus, and Escape close. | src/platform/install-guide.js |
| 69 | Accessibility | Install guide allowed focus to escape dialog. | Added focus trap on Tab navigation. | src/platform/install-guide.js |
| 70 | Accessibility | Decorative ambient background exposed to screen readers. | Marked ambient background as aria-hidden. | index.html |
| 71 | Accessibility | Popover backdrop exposed to accessibility tree. | Marked backdrop as presentation and aria-hidden. | index.html |
| 72 | Performance | Hero mascot lacked eager loading and priority. | Added eager load and fetchpriority for hero image. | index.html |
| 73 | Performance | Posture preview image lacked loading/decoding hints. | Added lazy loading and async decoding. | index.html |
| 74 | Accessibility | No skip link for keyboard users. | Added skip-to-content link and styling. | index.html, src/styles/app.css |
| 75 | UX | Fallback popover allowed background scroll. | Disabled scroll when fallback popover open. | src/app.js, src/styles/app.css |
| 76 | Accessibility | PIN error message not associated with input. | Added aria-describedby and error id. | index.html |
| 77 | Accessibility | PIN error message not announced when shown. | Added role/status and aria-live. | index.html |
| 78 | Performance | Mascot images could shift layout without aspect ratio. | Added aspect-ratio for home and game mascots. | src/styles/app.css |
| 79 | Touch UX | Recording controls were below comfortable touch size. | Increased play/save/delete buttons to 44px. | src/styles/app.css |
| 80 | Touch UX | Popover close button below touch target size. | Increased close button to 44px. | src/styles/app.css |
| 81 | Data integrity | XP percent not clamped, could exceed 100%. | Clamped XP percent for UI safety. | src/progress/progress.js |
| 82 | Security | Backup included transient Parent Zone unlock state. | Removed parent unlock from backup export/import. | src/backup/export.js |
| 83 | Security | Parent PIN was hardcoded. | Added persistent PIN storage and retrieval. | src/parent/pin.js |
| 84 | Security | Parent PIN displayed in clear text. | Masked PIN in Parent Zone header. | index.html, src/parent/pin.js |
| 85 | UX | No UI to update Parent PIN. | Added Parent PIN management card. | index.html, src/styles/app.css, src/parent/pin.js |
| 86 | UX | Parent PIN input allowed non-numeric characters. | Added input sanitization. | src/parent/pin.js |
| 87 | Accessibility | Rhythm Dash accuracy meter lacked progress semantics. | Added progressbar attributes and aria updates. | index.html, src/games/game-metrics.js |
| 88 | Accessibility | Rhythm Painter meter lacked progress semantics. | Added progressbar attributes and aria updates. | index.html, src/games/game-metrics.js |
| 89 | Accessibility | Decorative coach meters were exposed to screen readers. | Marked coach meter and wave as aria-hidden. | index.html |
| 90 | Accessibility | Song notation grid overwhelmed screen readers. | Marked song sheet as aria-hidden in generator. | scripts/build-songs-html.js, index.html |
| 91 | Visual polish | Mascot illustrations had a baked-in checkerboard background. | Removed backgrounds to true transparency for all mascots. | public/assets/illustrations/mascot-*.png |
| 92 | Offline update | Cached mascots might not refresh after asset changes. | Bumped SW cache version to refresh cached assets. | public/sw.js, sw.js |
| 93 | Performance | Song search filtering triggered synchronous work per keystroke. | Debounced filtering via requestAnimationFrame. | src/songs/song-search.js |
| 94 | Accessibility | Start/stop toggle labels were not keyboard focusable. | Added button roles, tabindex, and key handlers for toggle labels. | src/app.js |
| 95 | Accessibility | Pitch quest slider didn’t expose its value to assistive tech. | Added aria-valuenow/aria-valuetext updates. | src/games/game-metrics.js |
| 96 | Accessibility | Scale practice slider lacked accessible value updates. | Added aria-valuenow/aria-valuetext updates. | src/games/game-metrics.js |
| 97 | Accessibility | Metronome slider lacked accessible value updates. | Added aria-valuenow/aria-valuetext updates. | src/trainer/tools.js |
| 98 | Motion | Home mascot kept animating when motion reduction was enabled. | Disabled mascot animation under reduced motion settings. | src/styles/app.css |
| 99 | Performance | Large views rendered fully even when offscreen within scroll. | Applied content-visibility to heavy view layouts. | src/styles/app.css |
| 100 | Performance | Non-critical modules loaded eagerly at startup. | Deferred ML/guide/offline helpers until idle; loaded settings helpers on demand. | src/app.js |
| 101 | Performance | Mascot images were larger than needed for offline cache. | Losslessly optimized PNGs to reduce cache size. | public/assets/illustrations/mascot-*.png |
| 102 | Offline update | Optimized assets might remain stale in cache. | Bumped SW cache version to refresh optimized assets. | public/sw.js, sw.js |
| 103 | Data retention | Game event history grew unbounded, increasing storage and lookup cost. | Capped stored events to 500 most recent entries. | src/games/game-metrics.js |
| 104 | Performance | Game checklist updates ran immediately on every change event. | Batched updates with requestAnimationFrame. | src/games/game-metrics.js |
| 105 | Offline update | Updated logic needed a cache refresh for offline installs. | Bumped SW cache version after code slimming changes. | public/sw.js, sw.js |
| 106 | Performance | Note Memory timer kept running while the app was backgrounded. | Paused/resumed timers on visibility changes. | src/games/game-metrics.js |
| 107 | Performance | Bow Hero timer kept running while the app was backgrounded. | Paused/resumed timers on visibility changes and preserved elapsed time. | src/games/game-metrics.js |
| 108 | Offline update | Timer optimizations required a cache refresh offline. | Bumped SW cache version to refresh updated scripts. | public/sw.js, sw.js |
| 109 | UX | Note Memory mismatch timer could fire after leaving the view. | Cleared mismatch timeout on reset and hash change. | src/games/game-metrics.js |
| 110 | UX | Story Song timers kept running when the app backgrounded. | Stopped timers on visibility change and prompted resume. | src/games/game-metrics.js |
| 111 | Offline update | Latest QA fixes needed cache refresh for offline installs. | Bumped SW cache version for updated scripts. | public/sw.js, sw.js |
| 112 | Feature depth | Pitch Quest lacked a tuning window control. | Added tolerance slider with accessible value updates. | index.html, src/games/game-metrics.js |
| 113 | Feature depth | Rhythm Dash had no in-game settings for target tempo. | Added settings popover with coach reset and BPM slider. | index.html, src/games/game-metrics.js, src/styles/app.css |
| 114 | UX | Rhythm Dash runs could continue when app backgrounded. | Paused runs on visibility change and preserved state. | src/games/game-metrics.js |
| 115 | Feature depth | Ear Trainer only supported A/E notes. | Expanded to G/D/A/E with updated checklist and reference tones. | index.html, src/games/game-metrics.js |
| 116 | Offline update | New game features needed offline cache refresh. | Bumped SW cache version for updated assets. | public/sw.js, sw.js |
| 117 | Offline reliability | Persistent storage was never requested when the storage UI wasn’t present. | Requested persistent storage regardless of UI presence. | src/platform/native-apis.js |
| 118 | Offline reliability | Storage usage pressure was not tracked for proactive offline safety. | Added storage pressure dataset and estimate updates. | src/platform/native-apis.js |
| 119 | iPadOS UX | Platform status didn’t reflect installed vs Safari mode. | Added standalone detection and dataset updates. | src/platform/ipados-capabilities.js |
| 120 | Offline update | Storage optimizations required a cache refresh for offline installs. | Bumped SW cache version after iPadOS storage updates. | public/sw.js, sw.js |
| 121 | Offline reliability | Persistent storage was only requested via manual button. | Added auto-persist with backoff in standalone/offline mode. | src/platform/native-apis.js |
| 122 | UX | Storage estimates lacked guidance when device storage was tight. | Added high/medium pressure warnings in storage estimate text. | src/platform/native-apis.js |
| 123 | Offline reliability | Storage status wasn’t refreshed on lifecycle or connectivity changes. | Refresh storage status/estimate on visibility & online events. | src/platform/native-apis.js |
| 124 | Offline update | Auto-persist logic needed a cache refresh for offline installs. | Bumped SW cache version after storage hardening. | public/sw.js, sw.js |
| 125 | Bundle size | Unused liquid glass stylesheet was cached offline. | Removed unused `liquid-glass.css` asset from source. | src/styles/liquid-glass.css |
| 126 | Repo hygiene | Legacy stylesheet not referenced by the app. | Removed unused `styles.css`. | styles.css |
| 127 | Repo hygiene | Legacy HTML snapshot not used in build. | Removed unused `index.old.html`. | index.old.html |
| 128 | PWA hygiene | Duplicate manifest file created confusion. | Removed unused `public/manifest.json` in favor of `manifest.webmanifest`. | public/manifest.json |
| 129 | Offline update | Cache needed refresh after asset slimming. | Bumped SW cache version after slimming pass. | public/sw.js, sw.js |
| 130 | Offline storage | Recordings were stored as base64 strings, inflating storage usage. | Store recording blobs directly in IndexedDB with fallback to data URLs. | src/persistence/storage.js, src/recordings/recordings.js |
| 131 | Offline storage | Old recording blobs could linger after deletions. | Added blob cleanup on delete/clear and when trimming history. | src/recordings/recordings.js, src/parent/recordings.js |
| 132 | UX | Recording playback/export only worked with data URLs. | Added blob-backed playback/export for Session Review and Parent Zone. | src/analysis/session-review.js, src/parent/recordings.js, src/utils/recording-export.js |
| 133 | Offline update | Recording storage changes needed cache refresh for offline installs. | Bumped SW cache version after recording optimization pass. | public/sw.js, sw.js |
| 134 | Backup integrity | Recording blobs were excluded from JSON backups after switching to blob storage. | Convert blob recordings to data URLs for export and rehydrate to blobs on import. | src/backup/export.js |
| 135 | Offline update | Backup recording changes required cache refresh for offline installs. | Bumped SW cache version after backup hydration update. | public/sw.js, sw.js |
| 136 | Offline storage | Legacy recordings stored as data URLs were never migrated to blob storage. | Added idle migration from data URLs to IndexedDB blobs. | src/recordings/recordings.js |
| 137 | Offline update | Recording migration required cache refresh for offline installs. | Bumped SW cache version after migration update. | public/sw.js, sw.js |
| 138 | Recording reliability | Stopping a recording could discard the clip before save. | Wait for MediaRecorder stop event to finish before clearing state. | src/recordings/recordings.js |
| 139 | Offline update | Recording stop fix required cache refresh for offline installs. | Bumped SW cache version after stop handling fix. | public/sw.js, sw.js |
| 140 | Performance | Parent Zone playback leaked blob URLs on repeated plays. | Reuse a single audio element and revoke URLs on stop/end. | src/parent/recordings.js |
| 141 | Offline update | Recording playback fix required cache refresh for offline installs. | Bumped SW cache version after blob URL cleanup. | public/sw.js, sw.js |
| 142 | Gameplay | Ear Trainer could miss repeat-note answers because radio stayed checked. | Reset choice selection after each answer to allow repeats. | src/games/game-metrics.js |
| 143 | Analytics | Ear Trainer completion didn’t record game events. | Record game event when rounds complete. | src/games/game-metrics.js |
| 144 | Gameplay | Duet Challenge partner playback could continue after sound off or navigation. | Added playback cancellation token and stop handler. | src/games/game-metrics.js |
| 145 | Gameplay | Pitch Quest allowed scoring without selecting a target note. | Require a target note before checking pitch. | src/games/game-metrics.js |
| 146 | Offline update | Game improvements required cache refresh for offline installs. | Bumped SW cache version after game improvements. | public/sw.js, sw.js |
| 147 | UX | Tap-heavy games relied on click events, adding latency on touch. | Added pointerdown tap handler for core game controls. | src/games/game-metrics.js |
| 148 | Offline update | Tap handler improvements required cache refresh for offline installs. | Bumped SW cache version after tap improvements. | public/sw.js, sw.js |
| 149 | Offline update | Tap handler timing tweak required cache refresh for offline installs. | Bumped SW cache version after tap threshold tuning. | public/sw.js, sw.js |
| 150 | UX | Pointerdown + click could double-fire taps on some devices. | Suppressed click events immediately after pointer taps. | src/games/game-metrics.js |
| 151 | Offline update | Tap suppression fix required cache refresh for offline installs. | Bumped SW cache version after tap suppression fix. | public/sw.js, sw.js |
| 152 | UX | Audio could continue playing after navigating to another view. | Stop all audio on hash navigation. | src/platform/native-apis.js |
| 153 | Offline update | Audio navigation stop required cache refresh for offline installs. | Bumped SW cache version after audio navigation fix. | public/sw.js, sw.js |
| 154 | UX | Game sessions could retain stale scores when re-entered. | Reset per-game session state on view entry across games. | src/games/game-metrics.js |
| 155 | Offline update | Game reset changes required cache refresh for offline installs. | Bumped SW cache version after game reset pass. | public/sw.js, sw.js |
| 156 | Reliability | Tuner could be started multiple times, causing overlapping setup. | Added start token/guard to prevent concurrent tuner starts. | src/tuner/tuner.js |
| 157 | Offline update | Tuner start guard required cache refresh for offline installs. | Bumped SW cache version after tuner guard update. | public/sw.js, sw.js |
| 158 | UX | Session Review playback/export handlers could hold stale recording references after updates. | Resolve recordings at click time from the latest saved list. | src/analysis/session-review.js |
| 159 | Performance | Playback audio elements preloaded when idle on review/parent pages. | Set playback audio preload to `none` to reduce background work. | src/analysis/session-review.js, src/parent/recordings.js |
| 160 | UX | Parent Zone playback could continue after deleting/clearing recordings or list refresh. | Stop playback before deletes/clears and on recordings updates. | src/parent/recordings.js |
| 161 | Offline update | Recording polish fixes required cache refresh for offline installs. | Bumped SW cache version after recording polish pass. | public/sw.js, sw.js |
| 162 | Performance | Idle module loading didn’t leverage modern task scheduling for smoother UI. | Use `scheduler.postTask` for background module loads when available. | src/app.js |
| 163 | Performance | Prerendered pages could start heavy boot work before activation. | Delay boot/idle tasks until `prerenderingchange`. | src/app.js |
| 164 | Offline update | Scheduling improvements required cache refresh for offline installs. | Bumped SW cache version after scheduling update. | public/sw.js, sw.js |
| 165 | Pedagogy | Lesson plan lacked master-teacher step guidance and total time. | Added structured lesson steps with total minutes and cues. | src/ml/recommendations.js, src/ml/recommendations-ui.js, index.html, src/styles/app.css |
| 166 | Pedagogy | Today’s goals were static and too shallow for a master practice flow. | Expanded goals to five teacher-grade steps with dynamic minutes. | index.html, src/ml/recommendations-ui.js |
| 167 | Coaching | Coach prompts did not integrate lesson plan cues. | Build coach messages from master lesson steps and cues. | src/coach/coach-actions.js |
| 168 | Progress | New teacher goals were not classified in progress scoring. | Updated goal patterns for progress and skill profiling. | src/progress/progress.js, src/utils/skill-profile.js |
| 169 | Offline update | Master lesson plan updates required cache refresh for offline installs. | Bumped SW cache version after lesson plan upgrade. | public/sw.js, sw.js |
| 170 | Code health | Recording module held an unused state value. | Removed unused `recordingStart` variable to slim code. | src/recordings/recordings.js |
| 171 | Performance | Tuner tone samples preloaded even when unused. | Set tuner sample audio preloads to `none`. | index.html |
| 172 | Offline update | Slimming/optimization pass required cache refresh for offline installs. | Bumped SW cache version after tuning/audio preload changes. | public/sw.js, sw.js |
| 173 | Performance | Duet challenge audio samples preloaded unnecessarily. | Set duet sample preloads to `none` to reduce idle load. | index.html |
| 174 | QA | Test suite exited early due to no tests, blocking production readiness checks. | Added smoke coverage for recommendations and skill profiling. | tests/recommendations.test.js, tests/skill-profile.test.js |
| 175 | Offline update | Duet audio preload change required cache refresh for offline installs. | Bumped SW cache version after duet audio preload update. | public/sw.js, sw.js |
| 176 | Pedagogy | Daily goal target was hardcoded and drifted from lesson plan total. | Sync daily/parent goal targets with lesson plan total. | src/ml/recommendations-ui.js, src/progress/progress.js |
| 177 | Offline update | Daily goal sync required cache refresh for offline installs. | Bumped SW cache version after goal target sync. | public/sw.js, sw.js |
| 178 | Parent UX | Parent goal setting was static with no editable recital focus or weekly target. | Added editable parent goal form with persistent weekly target. | index.html, src/parent/goals.js, src/styles/app.css |
| 179 | Parent UX | Weekly goal progress used daily minutes instead of weekly total. | Sync parent goal progress to weekly minutes and target. | src/progress/progress.js |
| 180 | Sharing | Weekly summary omitted recital focus details. | Included recital focus title in share summary. | src/platform/native-apis.js |
| 181 | Offline update | Parent goal feature required cache refresh for offline installs. | Bumped SW cache version after parent goals feature. | public/sw.js, sw.js |
| 182 | Game UX | Games lacked consistent teacher-grade coaching guidance. | Injected coach panels with skills, goals, steps, and tips for every game. | src/games/game-enhancements.js, src/styles/app.css |
| 183 | Game UX | Games had no unified session timer/reset controls. | Added session timer, progress bar, and reset controls across games. | src/games/game-enhancements.js, src/styles/app.css |
| 184 | Offline update | Game enhancements required cache refresh for offline installs. | Bumped SW cache version after game enhancement pass. | public/sw.js, sw.js |
| 185 | Offline update | Game enhancement fix required cache refresh for offline installs. | Bumped SW cache version after game enhancement fix. | public/sw.js, sw.js |
| 186 | Game UX | Game session timers could keep running after leaving a game view. | Stop session timers on view change, page hide, and when document is hidden. | src/games/game-enhancements.js |
| 187 | Game UX | Game reset toggles forced checklists off even if defaults were on. | Reset game checklist inputs to default checked state before dispatching changes. | src/games/game-enhancements.js |
| 188 | Offline update | Game session cleanup changes required cache refresh for offline installs. | Bumped SW cache version after session cleanup pass. | public/sw.js, sw.js |
| 189 | UX | Back buttons and icon controls were below iPadOS touch target size. | Raised back button and icon button targets to 44px with touch action support. | src/styles/app.css |
| 190 | UX | Icon controls lacked press/disabled feedback for tactile clarity. | Added active/disabled states and transitions for icon buttons. | src/styles/app.css |
| 191 | Code health | Duplicate primary button styles and unused install styles inflated CSS and caused overrides. | Removed unused install action/button styles and duplicate `.btn-primary` override. | src/styles/app.css |
| 192 | Offline update | UI polish updates required cache refresh for offline installs. | Bumped SW cache version after UI polish pass. | public/sw.js, sw.js |
| 193 | Performance | Game enhancements attached redundant lifecycle listeners per game view. | Centralized lifecycle handling and session cleanup in a single global handler. | src/games/game-enhancements.js |
| 194 | Performance | Navigation state recalculated primary view set on every hash change. | Reused a shared primary view set and cached media query. | src/app.js |
| 195 | Offline update | Optimization pass required cache refresh for offline installs. | Bumped SW cache version after optimization cleanup. | public/sw.js, sw.js |
| 196 | A11y | Session timer progressbar updates were applied to the wrong element. | Sync `aria-valuenow` on the progress track element for accurate updates. | src/games/game-enhancements.js |
| 197 | UX | Game reset skipped firing change events when inputs were already default, leaving stale UI in some games. | Force change events during resets and keep default checked state. | src/games/game-enhancements.js |
| 198 | Offline update | Final polish fixes required cache refresh for offline installs. | Bumped SW cache version after session polish. | public/sw.js, sw.js |
| 199 | Readability | Base palette leaned too light, lowering contrast on warm surfaces. | Deepened text colors and strengthened surface/glass opacities. | src/styles/app.css |
| 200 | Readability | White text on primary tiles and nav lacked separation from saturated backgrounds. | Added subtle text shadow for active nav and feature tiles. | src/styles/app.css |
| 201 | Offline update | Color/contrast polish required cache refresh for offline installs. | Bumped SW cache version after palette refinements. | public/sw.js, sw.js |
| 202 | Readability | Ambient gradients/glows competed with foreground text on multiple pages. | Softened ambient gradients and glow intensity for calmer backdrops. | src/styles/app.css |
| 203 | Readability | Some glass surfaces remained too transparent for dense text blocks. | Increased glass opacity and ensured default text color on glass. | src/styles/app.css |
| 204 | Readability | Song titles used a lighter custom brown, lowering contrast in some cards. | Unified song title color with primary text token. | src/styles/app.css |
| 205 | Offline update | Final full-page polish required cache refresh for offline installs. | Bumped SW cache version after global readability pass. | public/sw.js, sw.js |
| 206 | Docs | QA documentation and command references still included stale legacy references. | Updated `README.md`, `CLAUDE.md`, and `docs/reports/qa/changelog.md` to match current iPad Safari-only platform configuration. | README.md, CLAUDE.md, docs/reports/qa/changelog.md |
