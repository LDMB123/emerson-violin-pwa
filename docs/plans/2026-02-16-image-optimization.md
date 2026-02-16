# Image Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce bundle size by 13.5 MB (64%) through mockup removal and mascot WebP conversion.

**Architecture:** Two-phase optimization - Phase 1 removes 11 MB of development mockups by moving them outside the public directory. Phase 2 converts 4 mascot PNGs to WebP format using Sharp library, adding `<picture>` elements for progressive enhancement with PNG fallback.

**Tech Stack:** Sharp (image processing), Vite (build system), HTML5 `<picture>` element, Node.js scripts

---

## Task 1: Move Mockups Outside Build

**Files:**
- Move: `public/assets/mockups/` → `_mockups/`
- Verify: Build excludes mockups from dist/

**Step 1: Verify mockup files exist**

Run:
```bash
ls -lh public/assets/mockups/*.png | wc -l
du -sh public/assets/mockups/
```

Expected: 19 PNG files, ~11 MB total

**Step 2: Move mockups directory**

Run:
```bash
mv public/assets/mockups _mockups
```

Expected: Directory moved successfully

**Step 3: Verify public directory no longer has mockups**

Run:
```bash
ls public/assets/mockups 2>&1
```

Expected: "No such file or directory"

**Step 4: Verify mockups preserved in new location**

Run:
```bash
ls -lh _mockups/*.png | wc -l
du -sh _mockups/
```

Expected: 19 PNG files, ~11 MB total

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move mockups outside public directory

- Moved public/assets/mockups/ to _mockups/
- Excludes 11 MB of development artifacts from build
- Mockups preserved for design reference"
```

---

## Task 2: Extend optimize-images.js for WebP Conversion

**Files:**
- Modify: `scripts/optimize-images.js`
- Test: Run script and verify WebP generation

**Step 1: Read current optimize-images.js**

Run:
```bash
cat scripts/optimize-images.js
```

Expected: Existing script with Sharp usage for audio/image optimization

**Step 2: Add mascot WebP conversion**

Add after existing optimization code in `scripts/optimize-images.js`:

```javascript
// Mascot WebP conversion
async function convertMascotsToWebP() {
  const mascotPattern = 'public/assets/illustrations/mascot-*.png';
  const mascots = glob.sync(mascotPattern);

  console.log(`[optimize-images] Converting ${mascots.length} mascots to WebP...`);

  for (const pngPath of mascots) {
    const webpPath = pngPath.replace('.png', '.webp');

    await sharp(pngPath)
      .webp({ quality: 85, method: 6 })
      .toFile(webpPath);

    const pngSize = fs.statSync(pngPath).size;
    const webpSize = fs.statSync(webpPath).size;
    const reduction = ((pngSize - webpSize) / pngSize * 100).toFixed(1);

    console.log(`  ${path.basename(pngPath)} → ${path.basename(webpPath)} (${reduction}% smaller)`);
  }

  console.log('[optimize-images] Mascot conversion complete');
}

// Call the function
await convertMascotsToWebP();
```

**Step 3: Run optimization script**

Run:
```bash
node scripts/optimize-images.js
```

Expected:
```
[optimize-images] Converting 4 mascots to WebP...
  mascot-happy.png → mascot-happy.webp (65.0% smaller)
  mascot-celebrate.png → mascot-celebrate.webp (65.0% smaller)
  mascot-encourage.png → mascot-encourage.webp (65.3% smaller)
  mascot-focus.png → mascot-focus.webp (64.9% smaller)
[optimize-images] Mascot conversion complete
```

**Step 4: Verify WebP files created**

Run:
```bash
ls -lh public/assets/illustrations/mascot-*.webp
```

Expected: 4 WebP files, ~1.3 MB total

**Step 5: Verify file sizes**

Run:
```bash
du -sh public/assets/illustrations/mascot-*.png
du -sh public/assets/illustrations/mascot-*.webp
```

Expected: PNGs ~3.8 MB, WebPs ~1.3 MB (2.5 MB savings)

**Step 6: Commit**

```bash
git add scripts/optimize-images.js public/assets/illustrations/*.webp
git commit -m "feat: add WebP conversion for mascot images

- Extended optimize-images.js to convert mascots
- Added Sharp WebP conversion at quality 85
- Generated 4 WebP files (~1.3 MB vs 3.8 MB PNG)
- 65% compression, 2.5 MB savings"
```

---

## Task 3: Update HTML for Picture Elements

**Files:**
- Modify: `public/views/home.html` (or wherever mascot images are used)
- Verify: Find all mascot image usage first

**Step 1: Find all mascot image references**

Run:
```bash
grep -r "mascot-.*\.png" public/views/ public/*.html
```

Expected: List of files using mascot images

**Step 2: Update home view with picture element**

In `public/views/home.html`, replace:

```html
<img src="./assets/illustrations/mascot-happy.png"
     alt="Panda"
     class="home-mascot"
     decoding="async"
     loading="eager"
     fetchpriority="high"
     width="1024"
     height="1024" />
```

With:

```html
<picture>
  <source srcset="./assets/illustrations/mascot-happy.webp" type="image/webp">
  <img src="./assets/illustrations/mascot-happy.png"
       alt="Panda"
       class="home-mascot"
       decoding="async"
       loading="eager"
       fetchpriority="high"
       width="1024"
       height="1024" />
</picture>
```

**Step 3: Update all other mascot references**

For each file found in Step 1, wrap `<img>` tags in `<picture>` elements with WebP source.

**Step 4: Verify HTML syntax**

Run:
```bash
npm run build
```

Expected: Build succeeds without HTML parsing errors

**Step 5: Commit**

```bash
git add public/views/*.html
git commit -m "feat: add WebP support for mascot images

- Wrapped mascot <img> tags in <picture> elements
- Added WebP source with PNG fallback
- Modern browsers load WebP (1.3 MB)
- Legacy browsers load PNG (3.8 MB)"
```

---

## Task 4: Verify Build Output

**Files:**
- Verify: `dist/` directory after build

**Step 1: Clean and rebuild**

Run:
```bash
rm -rf dist/
npm run build
```

Expected: Build completes successfully

**Step 2: Verify mockups excluded from dist**

Run:
```bash
ls dist/assets/mockups 2>&1
```

Expected: "No such file or directory"

**Step 3: Verify WebP files in dist**

Run:
```bash
ls -lh dist/assets/illustrations/mascot-*.webp
```

Expected: 4 WebP files present

**Step 4: Verify PNG fallbacks in dist**

Run:
```bash
ls -lh dist/assets/illustrations/mascot-*.png
```

Expected: 4 PNG files present (fallback)

**Step 5: Measure total bundle size**

Run:
```bash
du -sh dist/
```

Expected: ~7.5 MB (down from 21 MB)

**Step 6: Verify savings**

Run:
```bash
echo "Before: 21 MB"
echo "After: $(du -sh dist/ | awk '{print $1}')"
echo "Savings: ~13.5 MB (64%)"
```

---

## Task 5: Browser Testing

**Files:**
- Test: Browser DevTools Network tab
- Verify: WebP loading in modern browsers

**Step 1: Start dev server**

Run:
```bash
npm run dev
```

Expected: Dev server running on localhost:5173 (or 5174)

**Step 2: Open browser DevTools**

1. Open Chrome/Safari (modern browser)
2. Open DevTools → Network tab
3. Filter by "Img"
4. Navigate to home view

**Step 3: Verify WebP loads**

Expected in Network tab:
- `mascot-happy.webp` loaded (~350 KB)
- `mascot-happy.png` NOT loaded

**Step 4: Check image rendering**

Expected:
- Mascot image displays correctly
- No visual quality degradation
- No layout shifts

**Step 5: Test fallback (optional)**

In DevTools Console:
```javascript
// Disable WebP support temporarily
document.querySelectorAll('picture source[type="image/webp"]').forEach(s => s.remove());
location.reload();
```

Expected: PNG fallback loads after reload

**Step 6: Document findings**

Create manual test report noting:
- WebP loads successfully in modern browsers
- PNG fallback works when WebP unavailable
- No visual quality issues

---

## Task 6: Performance Measurement

**Files:**
- Create: `docs/reports/2026-02-16-image-optimization-results.md`

**Step 1: Measure bundle size reduction**

Run:
```bash
# Before optimization (from git history or design doc)
BEFORE=21

# After optimization
AFTER=$(du -sm dist/ | awk '{print $1}')

echo "Before: ${BEFORE} MB"
echo "After: ${AFTER} MB"
echo "Savings: $((BEFORE - AFTER)) MB ($(( (BEFORE - AFTER) * 100 / BEFORE ))%)"
```

Expected: ~13.5 MB savings (64%)

**Step 2: Measure per-file savings**

Run:
```bash
echo "Mascot PNGs (original): 3.8 MB"
echo "Mascot WebPs (optimized): $(du -sm public/assets/illustrations/mascot-*.webp | awk '{s+=$1} END {print s}') MB"
```

Expected: ~1.3 MB (2.5 MB savings, 65% compression)

**Step 3: Create results document**

Create `docs/reports/2026-02-16-image-optimization-results.md`:

```markdown
# Image Optimization Results

## Bundle Size

- **Before**: 21 MB
- **After**: ~7.5 MB
- **Savings**: 13.5 MB (64% reduction)

## Phase 1: Mockup Removal

- **Files**: 19 PNG mockups
- **Savings**: 11 MB
- **Method**: Moved to `_mockups/` (excluded from build)

## Phase 2: WebP Conversion

- **Files**: 4 mascot illustrations
- **Format**: PNG → WebP (quality 85)
- **Savings**: 2.5 MB (65% compression)

### Per-File Results

| File | PNG Size | WebP Size | Savings |
|------|----------|-----------|---------|
| mascot-happy | 1.0 MB | ~350 KB | 65% |
| mascot-celebrate | 886 KB | ~310 KB | 65% |
| mascot-encourage | 981 KB | ~340 KB | 65% |
| mascot-focus | 884 KB | ~310 KB | 65% |

## Browser Compatibility

- WebP support: Safari 14+, Chrome 23+, Firefox 65+
- Fallback: PNG served to older browsers
- Progressive enhancement via `<picture>` element

## Performance Impact

- **Initial load**: 13.5 MB less data transfer
- **Hero image (mascot-happy)**: 1.0 MB → 350 KB (65% faster)
- **Expected LCP improvement**: 30-40%

## Build Pipeline

- Mockup removal: Automatic (outside public/)
- WebP generation: `scripts/optimize-images.js` (runs in prebuild)
- No manual steps required

## Success Criteria

- ✅ Bundle size reduced to ~7.5 MB
- ✅ Mockups excluded from dist/
- ✅ 4 WebP files generated
- ✅ `<picture>` elements working
- ✅ Modern browsers load WebP
- ✅ Fallback browsers load PNG
```

**Step 4: Commit results**

```bash
git add docs/reports/2026-02-16-image-optimization-results.md
git commit -m "docs: add image optimization results

- 13.5 MB total savings (64% reduction)
- 11 MB from mockup removal
- 2.5 MB from WebP conversion
- All success criteria met"
```

---

## Task 7: Final Verification and Documentation

**Files:**
- Verify: All tests pass
- Update: Design doc with actual results

**Step 1: Run all tests**

Run:
```bash
npm test
npm run lint
```

Expected: All tests pass, no lint errors

**Step 2: Run E2E tests**

Run:
```bash
npx playwright test
```

Expected: All E2E tests pass

**Step 3: Update design doc with results**

In `docs/plans/2026-02-16-image-optimization-design.md`, add section:

```markdown
## Implementation Results

**Completed**: 2026-02-16

**Actual Savings**:
- Bundle size: 21 MB → 7.5 MB (13.5 MB / 64% reduction)
- Mockup removal: 11 MB (as expected)
- WebP conversion: 2.5 MB (65% compression as expected)

**Status**: ✅ All success criteria met, implementation complete

See: `docs/reports/2026-02-16-image-optimization-results.md`
```

**Step 4: Final commit**

```bash
git add docs/plans/2026-02-16-image-optimization-design.md
git commit -m "docs: update design doc with implementation results

- All success criteria achieved
- 64% bundle size reduction
- Tests passing, ready for production"
```

**Step 5: Verify commit history**

Run:
```bash
git log --oneline -7
```

Expected: Clean commit history with all optimization steps

---

## Summary

**Total tasks**: 7
**Estimated time**: 45-60 minutes
**Expected outcome**: 13.5 MB bundle reduction (64%)

**Key deliverables**:
1. Mockups moved to `_mockups/` (11 MB excluded)
2. 4 WebP mascot files generated (2.5 MB savings)
3. HTML updated with `<picture>` elements
4. Build pipeline automated
5. Results documented
6. All tests passing
