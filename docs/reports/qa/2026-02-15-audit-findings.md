# Consolidated Audit Findings — 2026-02-15

6-domain parallel audit. Findings merged and deduplicated, sorted by severity.

## Stats

- **Total findings:** 62 (across 6 domains)
- **Critical:** 3
- **High:** 10
- **Medium:** 20
- **Low:** 29

---

## Critical (3)

| ID | Domain | File | Issue | Fix |
|----|--------|------|-------|-----|
| C1 | Code | src/trainer/tools.js:263-264 | Functions `applyPostureTuning()`, `applyBowingTuning()`, `reportBowing()` called but may be undefined if not hoisted | Verify function declarations exist; convert to hoisted `function` declarations if needed |
| C2 | Code | src/tuner/tuner.js:261 | Duplicate `isSoundEnabled()` check — unreachable dead code after line 258 already returns | Remove duplicate check on line 261 |
| C3 | A11y | index.html:484 (x9 song views) | `aria-hidden="true"` on `.song-sheet` hides all note/pitch/bowing content from screen readers — primary learning content invisible | Remove `aria-hidden` from `.song-sheet`; keep only on decorative playhead elements |

## High (10)

| ID | Domain | File | Issue | Fix |
|----|--------|------|-------|-----|
| H1 | Security | src/parent/pin.js:29-115 | Parent PIN stored plaintext in IndexedDB/localStorage | Hash with Web Crypto SHA-256 before storage; compare hashes |
| H2 | Security | src/backup/export.js:85-93 | PIN key may not be explicitly excluded from backup export | Add PIN_KEY and UNLOCK_KEY to export blacklist |
| H3 | Code | src/platform/native-apis.js:472-474 | Redundant nested `isSoundEnabled()` check in play handler | Remove second check on line 474 |
| H4 | Code | src/persistence/storage.js:221-230 | `clearBlobFallback` swallows IndexedDB errors with empty catch | Log errors or remove try/catch if intentionally silent |
| H5 | Code | src/recordings/recordings.js:175-176 | Mic permission denial handled silently — user may miss failure | Add visible status feedback beyond status text |
| H6 | A11y | src/styles/app.css:3361 | `.songs-search-input` has `outline: none` with no replacement focus indicator | Add `:focus-visible` box-shadow replacement |
| H7 | A11y | index.html:189 | Focus timer checkbox `#focus-timer` has no accessible label | Add `aria-label="Toggle focus timer"` |
| H8 | A11y | index.html:2011-2014 | Pitch Quest target radios lack fieldset/legend group context | Wrap in `<fieldset><legend class="sr-only">Target Note</legend>` |
| H9 | A11y | index.html:2128,2425,2627 | Game run toggles (`#rhythm-run`, `#bow-hero-run`, `#story-play`) lack `aria-label` | Add descriptive `aria-label` to each |
| H10 | A11y | index.html:2744 | Tuning Time progress bar missing `role="progressbar"` and ARIA attributes | Add `role="progressbar"` with valuemin/max/now/label |
| H11 | A11y | index.html:134 | Coach stars `★★★★☆` has no accessible label for rating | Add `aria-label="Coach rating: 4 out of 5 stars"` |
| H12 | Perf | index.html (all) | 172KB inline HTML with all game views upfront, no code splitting | Extract game views into lazy-loaded HTML chunks (future consideration — complex refactor) |

## Medium (20)

| ID | Domain | File | Issue | Fix |
|----|--------|------|-------|-----|
| M1 | Security | index.html | No Content-Security-Policy meta tag | Add CSP meta restricting to 'self' |
| M2 | Security | src/games/game-enhancements.js:329-375 | innerHTML with template literals (static data, but risky pattern) | Migrate to textContent/createElement |
| M3 | Security | src/parent/recordings.js, session-review.js, install-guide.js | Multiple innerHTML usages for UI building | Migrate to DOM APIs for dynamic data |
| M4 | Code | Multiple files (7+) | `isSoundEnabled()` duplicated across 7 files | Extract to shared `src/utils/sound-state.js` |
| M5 | Code | src/ml/recommendations.js:239-251 | Weighted average fragile to future edits (NaN if empty) | Add explicit NaN guard |
| M6 | A11y | index.html:469 (x9 songs) | `song-play-toggle` checkboxes lack accessible name | Add `aria-label="Toggle playhead animation"` |
| M7 | A11y | index.html:195 | Focus sprint duration radios lack fieldset/legend | Wrap in fieldset with legend |
| M8 | A11y | index.html:2349-2356 | Ear Trainer answer radios lack group label | Wrap in fieldset with legend |
| M9 | A11y | src/styles/app.css:4170 | Toggle switch inputs use `opacity:0; width:0; height:0` instead of sr-only clip-rect | Use proper sr-only clip-rect pattern |
| M10 | A11y | index.html:3250,3257,3263 | More menu has role mismatch: `aria-haspopup="menu"` opens `role="dialog"` | Commit to dialog pattern: remove menu/menuitem roles |
| M11 | A11y | src/games/game-enhancements.js:283 | Game timer has `aria-live="polite"` — announces every second | Remove aria-live; announce only at milestones |
| M12 | A11y | index.html:1608-1612 | Duplicate adjacent aria-live regions for coach messages | Use single region; hide inactive with aria-hidden |
| M13 | Perf | src/games/game-metrics.js (2826 lines) | Largest JS file — all 13 games in single module | Consider code splitting per game (future) |
| M14 | Perf | src/styles/app.css (7143 lines) | All CSS loaded upfront including game-specific rules | Consider extracting game CSS (future) |
| M15 | Perf | index.html:63,136,269,464 | Mascot images missing width/height attributes — layout shift risk | Add explicit width/height |
| M16 | Perf | wasm modules (93KB) | WASM loaded even if tuner/analysis never used | Lazy-load only when needed |
| M17 | PWA | manifest.webmanifest:60-69 | Wide screenshot declared 1024x1024 (square, not landscape) | Fix dimensions or remove `form_factor: "wide"` |
| M18 | HTML/CSS | index.html:2941,2945 | h4 without parent h3 in heading hierarchy | Fix to h3 or ensure proper hierarchy |
| M19 | HTML/CSS | app.css (multiple) | Hardcoded colors (#6A3A2A, #7A4A3B) used 20+ times without custom properties | Define `--color-brand-brown`, `--color-brand-tan` tokens |
| M20 | HTML/CSS | index.html:3250,3257 | Inline styles for anchor-name/position-anchor | Move to CSS |

## Low (29)

Omitted from this summary for brevity. Includes:
- PWA: start_url fragment, SW install resilience, cache cleanup semantics, navigation preload try/catch, persist retry on iPadOS, manual cache versioning, SW registration error swallowing, launch_handler Chrome-only (11 items)
- Perf: DOM query caching, progress bar batching, game update DOM read/write separation, audio cleanup, font subsetting, font-display, content-visibility expansion, will-change hints, idle timeout tuning, recording stop timeout (10 items)
- A11y: song-play decorative arrows, streak emoji, skill stars labels, demo toggle id, lesson steps aria-live, search input height (6 items)
- HTML/CSS: close button duplication, selector duplicates, undefined CSS custom properties, missing semicolon (4 items)
- Code: naming consistency, buildProgress complexity (2 items)
- Security: dev dependency vulns, session unlock persistence (2 items)

---

## Implementation Priority

### Batch 1 — Critical + High (immediate)
C1, C2, C3, H1, H2, H3, H4, H5, H6, H7, H8, H9, H10, H11

### Batch 2 — Medium (next pass)
M1, M2, M3, M4, M5, M6, M7, M8, M9, M10, M11, M12, M15, M17, M18, M19, M20

### Batch 3 — Low (polish)
All low items

### Deferred (architectural)
H12, M13, M14, M16 — code splitting and WASM lazy loading are significant refactors, tracked separately
