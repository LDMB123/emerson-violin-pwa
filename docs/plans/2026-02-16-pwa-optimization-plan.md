# Violin PWA Optimization & Polish Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish production PWA - fix warnings, optimize bundle, validate performance

**Architecture:** Vite 6 + vanilla JS + WASM (panda-core, panda-audio) + Service Workers

**Tech Stack:** Vite 6, ES modules, Web Audio API, Rust/WASM, IndexedDB

---

## Current Status

**Working Code:**
- ✅ 486 JavaScript tests passing
- ✅ 4 WASM tests passing (panda-core, panda-audio)
- ✅ Build successful
- ✅ Dev server running

**Warnings to Fix:**
- ⚠️ 10 JavaScript lint warnings (unused exports)
- ⚠️ 1 Rust dead_code warning (panda-audio buffer_size field)

**Note:** `rust/` directory contains orphaned files (not compiled). Low priority - address after optimization.

---

## Phase 1: Fix All Warnings

### Task 1: Fix JavaScript Lint Warnings

**Files:**
- Modify: `src/analysis/session-review.js`
- Modify: `src/app.js`
- Modify: `src/ml/recommendations.js`
- Modify: `src/recordings/recordings.js`

**Step 1: Remove unused exports**

Remove these 10 unused exports:
- `src/analysis/session-review.js:14-16` - computeTotalMinutes, computeAverageAccuracy, extractAccuracyValues
- `src/app.js:2` - PRIMARY_VIEWS
- `src/ml/recommendations.js:4,7-9` - SKILL_BY_GAME, recencyWeight, average, weightedAverage
- `src/recordings/recordings.js:7-8` - filterValidRecordings, pruneOldRecordings

**Step 2: Verify with lint**

Run: `npm run lint`
Expected: 0 warnings

**Step 3: Verify tests pass**

Run: `npm test`
Expected: 486 tests passing

**Step 4: Commit**

```bash
git add src/
git commit -m "fix: remove 10 unused exports

Clean up lint warnings across 4 files.
All 486 tests passing.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Fix Rust Dead Code Warning

**Files:**
- Modify: `wasm/panda-audio/src/lib.rs`

**Step 1: Check if buffer_size is actually used**

Find usage in panda-audio:
```bash
grep -r "buffer_size" wasm/panda-audio/src/
```

**Step 2: Fix the warning**

Either:
- Use the field (if it should be used)
- Remove the field (if truly unused)
- Add `#[allow(dead_code)]` if it's intentionally unused for future

**Step 3: Verify WASM builds clean**

Run: `cd wasm && cargo build`
Expected: 0 warnings

**Step 4: Run WASM tests**

Run: `cd wasm && cargo test`
Expected: 4 tests passing

**Step 5: Commit**

```bash
git add wasm/panda-audio/
git commit -m "fix: resolve dead_code warning in panda-audio

[Describe fix]

All WASM tests passing.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: WASM Optimization

### Task 3: Audit WASM Usage & Size

**Files:**
- Analyze: JavaScript imports of WASM modules
- Analyze: WASM module sizes
- Document: `docs/reports/2026-02-16-wasm-audit.md`

**Step 1: Find all WASM imports**

```bash
grep -r "panda-core\|panda-audio" src/ tests/ --include="*.js" -B 2 -A 2
```

**Step 2: List WASM exports**

Check what's exported from each module:
```bash
grep -A 3 "#\[wasm_bindgen\]" wasm/panda-core/src/lib.rs | grep "pub fn\|pub struct"
grep -A 3 "#\[wasm_bindgen\]" wasm/panda-audio/src/lib.rs | grep "pub fn\|pub struct"
```

**Step 3: Check WASM sizes**

```bash
ls -lh wasm/target/wasm32-unknown-unknown/release/*.wasm 2>/dev/null || echo "Need release build"
cd wasm && cargo build --release --target wasm32-unknown-unknown
ls -lh target/wasm32-unknown-unknown/release/*.wasm
```

**Step 4: Document findings**

Create `docs/reports/2026-02-16-wasm-audit.md`:
```markdown
# WASM Module Audit

## panda-core
Exports: [list functions/structs]
Used in JS: [list which are imported]
Size: [bytes]
Unused exports: [list if any]

## panda-audio
Exports: [list functions/structs]
Used in JS: [list which are imported]
Size: [bytes]
Unused exports: [list if any]

## Optimization Opportunities
[Any dead code in WASM modules?]
[Size optimization options?]
```

**Step 5: No commit (analysis only)**

---

## Phase 3: Bundle Optimization

### Task 4: Build & Analyze Bundle

**Files:**
- Analyze: Production build output
- Document: `docs/reports/2026-02-16-bundle-analysis.md`

**Step 1: Clean production build**

```bash
rm -rf dist
npm run build
```

**Step 2: Analyze sizes**

```bash
ls -lhR dist/
du -sh dist/
find dist -name "*.js" -exec ls -lh {} \; | sort -k5 -hr | head -10
find dist -name "*.wasm" -exec ls -lh {} \;
```

**Step 3: Check for opportunities**

Look for:
- Large JS bundles (>100KB)
- Duplicate code
- Large WASM files
- Uncompressed assets

**Step 4: Document findings**

Create `docs/reports/2026-02-16-bundle-analysis.md`:
```markdown
# Bundle Analysis

## Sizes
- Total dist/: [MB]
- Main JS: [KB]
- panda-core.wasm: [KB]
- panda-audio.wasm: [KB]
- Assets: [KB]

## Largest Files
[Top 5 with sizes]

## Optimization Opportunities
- Code splitting: [yes/no, details]
- WASM optimization: [opportunities]
- Asset compression: [opportunities]
- Tree shaking: [opportunities]
```

**Step 5: No commit (analysis only)**

---

### Task 5: Implement Bundle Optimizations

**Files:**
- Modify: `vite.config.js` (if optimization needed)
- Modify: `wasm/*/Cargo.toml` (if WASM optimization needed)

**Step 1: Implement optimizations based on Task 4 findings**

This step depends on what was found. Possible optimizations:
- Vite code splitting
- WASM size optimization (opt-level, LTO)
- Remove console.log in production
- Asset compression

**Step 2: Rebuild and verify size reduction**

```bash
rm -rf dist
npm run build
du -sh dist/
```

Compare to Task 4 baseline.

**Step 3: Test production build**

```bash
npm run preview
```

Test functionality in browser.

**Step 4: Run all tests**

```bash
npm test
cd wasm && cargo test
```

**Step 5: Commit if changes made**

```bash
git add vite.config.js wasm/
git commit -m "perf: optimize bundle size

[Describe optimizations]

Size: [before] → [after] ([X]% reduction)

All tests passing.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: Performance Validation

### Task 6: Lighthouse Audit

**Files:**
- Test: Production build with Lighthouse
- Document: `docs/reports/2026-02-16-lighthouse-audit.md`

**Step 1: Production build**

```bash
rm -rf dist
npm run build
npm run preview
```

**Step 2: Run Lighthouse**

DevTools → Lighthouse → Categories: All → Analyze page load

**Step 3: Document scores**

Create `docs/reports/2026-02-16-lighthouse-audit.md`:
```markdown
# Lighthouse Audit

## Scores
- Performance: [score]/100
- Accessibility: [score]/100
- Best Practices: [score]/100
- SEO: [score]/100
- PWA: [score]/100

## Performance Metrics
- FCP: [ms]
- LCP: [ms]
- TBT: [ms]
- CLS: [score]
- SI: [ms]

## Issues Found
[List any red/yellow items]

## Recommendations
[Prioritized list based on impact]
```

**Step 4: No commit (testing only)**

---

### Task 7: Service Worker & Offline Testing

**Files:**
- Test: SW registration, caching, offline functionality
- Document: `docs/reports/2026-02-16-offline-test.md`

**Step 1: Test SW registration**

```bash
npm run dev
```

DevTools → Application → Service Workers
Verify: Registered and activated

**Step 2: Test offline mode**

1. Load app completely
2. DevTools → Network → Offline checkbox
3. Test functionality:
   - App loads from cache
   - WASM modules work
   - Tuner functionality
   - Games playable
   - Data persists (IndexedDB)

**Step 3: Test SW update**

1. Make small change to app
2. Rebuild
3. Reload page
4. Verify SW updates

**Step 4: Document results**

Create `docs/reports/2026-02-16-offline-test.md`:
```markdown
# Offline Functionality Test

## SW Registration
Status: [✅ Working / ❌ Issues]
Scope: [path]

## Offline Features
- App shell loads: [✅/❌]
- WASM modules work: [✅/❌]
- Tuner works: [✅/❌]
- Games work: [✅/❌]
- IndexedDB accessible: [✅/❌]

## SW Update
Update mechanism: [✅ Working / ❌ Issues]

## Issues Found
[List any problems]
```

**Step 5: No commit (testing only)**

---

### Task 8: Production Checklist

**Files:**
- Final validation of all features
- Document: `docs/reports/2026-02-16-production-checklist.md`

**Step 1: Feature testing**

Production build (`npm run build && npm run preview`), test:

- [ ] App loads quickly
- [ ] Tuner detects pitch accurately
- [ ] All 9 games launch and play
- [ ] Audio playback works
- [ ] Practice sessions record and save
- [ ] XP/leveling system updates
- [ ] Achievements unlock
- [ ] Offline mode works
- [ ] PWA installable
- [ ] No console errors
- [ ] No broken links/images

**Step 2: Cross-browser testing**

Test in:
- Chrome/Chromium (primary)
- Safari (iOS target)
- Firefox (optional)

**Step 3: Performance validation**

- Lighthouse Performance >90
- Lighthouse PWA = 100
- Load time <2s
- No layout shifts

**Step 4: Document results**

Create `docs/reports/2026-02-16-production-checklist.md`:
```markdown
# Production Readiness Checklist

## Feature Testing
- [✅/❌] App loads
- [✅/❌] Tuner
- [✅/❌] Games (all 9)
- [✅/❌] Audio
- [✅/❌] Sessions
- [✅/❌] XP system
- [✅/❌] Achievements
- [✅/❌] Offline
- [✅/❌] Installable
- [✅/❌] No errors

## Browser Compatibility
- Chrome: [✅/❌]
- Safari: [✅/❌]
- Firefox: [✅/❌]

## Performance
- Lighthouse scores: [summary]
- Load time: [ms]
- Issues: [list]

## Production Ready?
[✅ YES / ❌ NO - if no, list blockers]
```

**Step 5: Commit documentation**

```bash
git add docs/reports/
git commit -m "docs: production validation complete

Feature testing: [summary]
Lighthouse: Performance X, PWA Y
Offline: [working/issues]

Production ready: [YES/NO]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Optional: Code Cleanup

### Task 9: Handle Orphaned Rust Files (Optional)

**Context:** `rust/` directory has 6 files (4,276 lines) that can't compile (missing dependencies). These were being refactored in Phase 1-2 but aren't part of the working codebase.

**Options:**

**A) Archive for now** (recommended if timeline is tight):
```bash
mkdir -p _archived/rust-incomplete
git mv rust/* _archived/rust-incomplete/
git commit -m "chore: archive incomplete Rust modules"
```

**B) Complete the integration** (if there's a plan to use them):
- Create `rust/lib.rs` with module declarations
- Implement missing modules (dom, storage_pressure, utils)
- Add to wasm/ Cargo workspace
- Wire up to JavaScript

**C) Remove entirely** (if definitely not needed):
```bash
git rm -r rust/
git commit -m "chore: remove incomplete Rust modules"
```

**Decision:** Defer to next planning session. Focus on working code first.

---

## Success Criteria

- ✅ Zero lint warnings (JS + Rust)
- ✅ All 490 tests passing
- ✅ Bundle optimized (size reduction documented)
- ✅ Lighthouse Performance >90
- ✅ Lighthouse PWA = 100
- ✅ Offline functionality confirmed
- ✅ No console errors
- ✅ Production ready

---

## Execution

**Recommended:** Subagent-driven development in this session
- Quick iteration
- Review between tasks
- Adjust plan based on findings

Ready to start with Task 1?
