# Full Debug & Polish Sweep — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Comprehensive quality audit across 6 domains, consolidate findings, fix by severity.

**Architecture:** Dispatch 6 parallel read-only audit agents (one per domain), each produces a findings list with severity ratings. Consolidate into a single prioritized fix list. Implement fixes in severity batches with lint/test/build verification between batches.

**Tech Stack:** Vite 6, vanilla JS (ES modules), Web Audio API, Service Workers, Vitest, Playwright

---

## Phase 1: Parallel Audit (6 agents, read-only)

All agents are dispatched simultaneously. Each agent audits its domain and returns findings as a structured list. **No code changes in this phase.**

### Baseline State

- Lint: clean
- Tests: 4 passing (2 unit test files)
- E2E: iPad Safari via Playwright
- Source: 43 JS files, 2 CSS files, 1 HTML (3338 lines), 1 SW (312 lines)
- Total: ~31k lines JS

---

### Agent 1: Code Quality Audit

**Scope:** All 43 JS files in `src/`

**Checklist:**
- [ ] Dead code: unused functions, unreachable branches, commented-out code
- [ ] Unused exports: functions exported but never imported
- [ ] Complexity: functions > 40 lines or cyclomatic complexity > 10
- [ ] Error handling: unguarded async calls, missing try/catch, swallowed errors
- [ ] Consistency: naming conventions, patterns that diverge from codebase norms
- [ ] Duplicate logic: same pattern repeated across files that could be a shared util

**Files to read:**
- All `src/**/*.js`
- `scripts/build-songs-html.js`, `scripts/build-sw-assets.js`

**Output format:**
```
| # | Severity | File:Line | Issue | Suggested Fix |
```

---

### Agent 2: Accessibility Audit

**Scope:** `index.html` + all JS that touches DOM

**Checklist:**
- [ ] ARIA: missing labels, incorrect roles, stale aria-live regions
- [ ] Keyboard navigation: unreachable controls, missing tabindex, broken focus order
- [ ] Focus management: dialogs/popovers trap focus correctly, focus returns on close
- [ ] Screen reader: decorative elements hidden, live regions announce updates
- [ ] Color contrast: text on backgrounds meets WCAG AA (4.5:1 normal, 3:1 large)
- [ ] Motion: all animations respect `prefers-reduced-motion`
- [ ] Touch targets: all interactive elements >= 44px

**Files to read:**
- `index.html`
- `src/styles/app.css`, `src/styles/scroll-animations.css`
- `src/app.js`, `src/games/game-enhancements.js`, `src/platform/install-guide.js`
- `src/songs/song-search.js`, `src/parent/pin.js`

**Output format:**
```
| # | Severity | File:Line | WCAG Criterion | Issue | Suggested Fix |
```

---

### Agent 3: Performance Audit

**Scope:** Build output, load path, runtime performance patterns

**Checklist:**
- [ ] Bundle size: identify largest modules, unnecessary dependencies
- [ ] Lazy loading: are non-critical modules deferred correctly?
- [ ] CSS paint: `content-visibility`, `will-change` usage, forced layout patterns
- [ ] Render perf: DOM thrashing, synchronous layout reads, missing batching
- [ ] Images: proper sizing, format, loading attributes (lazy/eager/fetchpriority)
- [ ] Fonts: preload strategy, font-display, subsetting
- [ ] Audio: preload attributes, blob URL lifecycle, memory cleanup
- [ ] Scheduling: `requestAnimationFrame`, `scheduler.postTask` usage

**Files to read:**
- `index.html` (preloads, inline scripts, image tags)
- `src/app.js` (boot sequence, idle loading)
- `src/games/game-metrics.js`, `src/games/game-enhancements.js` (runtime perf)
- `src/songs/song-search.js` (filtering perf)
- `src/recordings/recordings.js`, `src/parent/recordings.js` (blob lifecycle)
- `src/styles/app.css` (paint properties)
- `vite.config.js` or `vite.config.mjs` if present

**Output format:**
```
| # | Severity | File:Line | Metric | Issue | Suggested Fix |
```

---

### Agent 4: PWA Health Audit

**Scope:** Manifest, SW, offline behavior, install flow

**Checklist:**
- [ ] Manifest: all required fields, correct icons, correct start_url
- [ ] Service Worker: caching strategy, cache versioning, update flow
- [ ] Offline resilience: all critical paths work offline, graceful degradation
- [ ] Install flow: `beforeinstallprompt` handling, install guide accuracy
- [ ] Storage: persistent storage request, quota management, pressure handling
- [ ] Cache hygiene: stale caches cleaned up, no unbounded growth
- [ ] SW registration: `updateViaCache`, scope, error handling

**Files to read:**
- `manifest.webmanifest`
- `public/sw.js` (production SW)
- `sw.js` (source SW if different)
- `src/platform/offline-mode.js`, `src/platform/offline-integrity.js`
- `src/platform/offline-recovery.js`, `src/platform/sw-updates.js`
- `src/platform/install-guide.js`, `src/platform/native-apis.js`
- `src/app.js` (SW registration)
- `scripts/build-sw-assets.js`

**Output format:**
```
| # | Severity | File:Line | PWA Criterion | Issue | Suggested Fix |
```

---

### Agent 5: Security Audit

**Scope:** All user input paths, storage, data handling

**Checklist:**
- [ ] XSS: innerHTML usage, unsanitized user input in DOM
- [ ] Input sanitization: PIN inputs, form fields, search inputs
- [ ] Storage exposure: sensitive data in localStorage/IndexedDB without protection
- [ ] Backup safety: exported data doesn't leak sensitive state
- [ ] CSP: Content-Security-Policy headers or meta tags
- [ ] External resources: any CDN/external script loads
- [ ] Audio/media: blob URL cleanup, no data leaks in recordings

**Files to read:**
- `index.html` (CSP meta, inline scripts)
- `src/parent/pin.js` (PIN handling)
- `src/backup/export.js` (data export/import)
- `src/persistence/storage.js`, `src/persistence/persist.js`
- `src/recordings/recordings.js` (recording data)
- `src/songs/song-search.js` (search input)
- `src/platform/native-apis.js` (sharing, permissions)

**Output format:**
```
| # | Severity | File:Line | OWASP Category | Issue | Suggested Fix |
```

---

### Agent 6: HTML/CSS Polish Audit

**Scope:** `index.html`, all CSS files, visual consistency

**Checklist:**
- [ ] Markup validity: unclosed tags, deprecated attributes, nesting errors
- [ ] Semantic HTML: appropriate heading hierarchy, landmark usage
- [ ] CSS specificity: overly specific selectors, `!important` abuse
- [ ] Unused CSS: rules with no matching HTML selectors
- [ ] Responsive: layouts that break at edge widths, overflow issues
- [ ] Consistency: inconsistent spacing, mismatched border-radius, mixed units
- [ ] Dark mode: if any dark mode support exists, verify completeness
- [ ] Print styles: any print considerations

**Files to read:**
- `index.html` (all 3338 lines)
- `src/styles/app.css`
- `src/styles/scroll-animations.css`

**Output format:**
```
| # | Severity | File:Line | Issue | Suggested Fix |
```

---

## Phase 2: Consolidate Findings

**Step 1:** Collect all 6 agent reports

**Step 2:** Merge into single prioritized list:
- **Critical**: Crashes, data loss, security vulnerabilities
- **High**: Broken functionality, a11y blockers, significant perf issues
- **Medium**: UX issues, minor a11y, code smells, moderate perf
- **Low**: Polish, style consistency, nice-to-haves

**Step 3:** Save consolidated report to `docs/reports/qa/2026-02-15-audit-findings.md`

---

## Phase 3: Implement Fixes

### Batch 1: Critical + High severity fixes

**Step 1:** Implement all critical/high fixes
**Step 2:** Run verification:
```bash
npm run lint
npm test
npm run build
```
**Step 3:** Commit:
```bash
git add -A
git commit -m "fix: resolve critical and high-severity audit findings"
```

### Batch 2: Medium severity fixes

**Step 1:** Implement all medium fixes
**Step 2:** Run verification:
```bash
npm run lint
npm test
npm run build
```
**Step 3:** Commit:
```bash
git add -A
git commit -m "fix: resolve medium-severity audit findings"
```

### Batch 3: Low severity fixes

**Step 1:** Implement all low fixes
**Step 2:** Run verification:
```bash
npm run lint
npm test
npm run build
```
**Step 3:** Commit:
```bash
git add -A
git commit -m "chore: resolve low-severity audit findings"
```

### Batch 4: SW cache bump (if any files changed)

**Step 1:** Bump SW cache version in `public/sw.js` and `sw.js`
**Step 2:** Run full verification
**Step 3:** Commit:
```bash
git commit -m "chore: bump SW cache version after audit fixes"
```

---

## Phase 4: Final Verification

**Step 1:** Run full QA suite:
```bash
npm run lint
npm test
npm run build
npx playwright test tests/e2e
```

**Step 2:** Verify no size regressions (compare build output)

**Step 3:** Update issue log if new entries were created

---

## Success Criteria

- Lint: clean
- Tests: all pass
- Build: clean, no size regressions
- E2E: all iPad Safari tests pass
- No critical or high-severity issues remaining
