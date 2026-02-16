# Badge WebP Optimization Design

## Goal

Reduce bundle size by 3.2 MB (32%) through WebP conversion of 5 badge PNG files.

## Problem

Current state:
- 5 badge PNGs: 3.4 MB
- Displayed in progress view
- Unoptimized, using lossless PNG format
- Post-mascot optimization: badges now account for 33% of image payload

## Approach: WebP Conversion with PNG Fallback

Reuse proven mascot WebP conversion approach for badge images.

### Benefits
- **3.2 MB reduction** (95% compression based on mascot results)
- **Reuses existing infrastructure** (optimize-images.js, `<picture>` pattern)
- **Simple implementation** (~30 minutes)
- **Zero complexity** - identical pattern to mascots

### Trade-offs
- Adds `<picture>` elements for 5 badges (minor complexity)
- PNG fallbacks add 3.4 MB to dist (only loaded if WebP unsupported)
- Safari 14+ required for WebP (already our target)

## Architecture

### Directory Structure

**Before:**
```
public/assets/badges/
├── badge_ear_training.png      # 774 KB
├── badge_first_song.png        # 678 KB
├── badge_practice_streak.png   # 721 KB
├── badge_perfect_pitch.png     # 644 KB
└── badge_metronome_master.png  # 612 KB
```

**After:**
```
public/assets/badges/
├── badge_ear_training.png      # 774 KB (fallback)
├── badge_ear_training.webp     # ~39 KB (primary)
├── badge_first_song.png        # 678 KB (fallback)
├── badge_first_song.webp       # ~34 KB (primary)
├── badge_practice_streak.png   # 721 KB (fallback)
├── badge_practice_streak.webp  # ~36 KB (primary)
├── badge_perfect_pitch.png     # 644 KB (fallback)
├── badge_perfect_pitch.webp    # ~32 KB (primary)
├── badge_metronome_master.png  # 612 KB (fallback)
└── badge_metronome_master.webp # ~31 KB (primary)
```

### WebP Conversion

**Script Enhancement:**
Extend existing `scripts/optimize-images.js` to handle badges (mirrors mascot logic).

**Input files:**
```
public/assets/badges/badge_*.png (5 files)
```

**Output files:**
```
public/assets/badges/badge_*.webp (5 files)
```

**Conversion settings:**
- Format: WebP
- Quality: 85 (visually lossless)
- Method: 6 (best compression)
- Preserve metadata: Yes
- Keep original PNGs: Yes (fallback)

**Expected compression:**
```
badge_ear_training.png:      774 KB → ~39 KB (95% reduction)
badge_first_song.png:        678 KB → ~34 KB (95% reduction)
badge_practice_streak.png:   721 KB → ~36 KB (95% reduction)
badge_perfect_pitch.png:     644 KB → ~32 KB (95% reduction)
badge_metronome_master.png:  612 KB → ~31 KB (95% reduction)

Total: 3.4 MB → ~172 KB (3.2 MB saved)
```

**Tool:** Sharp library (already installed)

## Implementation

### Script Enhancement

**File:** `scripts/optimize-images.js`

Add badge conversion function (mirrors `convertMascotsToWebP`):

```javascript
// Badge WebP conversion
async function convertBadgesToWebP() {
  const badgePattern = 'public/assets/badges/badge_*.png';
  const badges = glob.sync(badgePattern);

  console.log(`[optimize-images] Converting ${badges.length} badges to WebP...`);

  for (const pngPath of badges) {
    const webpPath = pngPath.replace('.png', '.webp');

    await sharp(pngPath)
      .webp({ quality: 85, method: 6 })
      .toFile(webpPath);

    const pngSize = fs.statSync(pngPath).size;
    const webpSize = fs.statSync(webpPath).size;
    const reduction = ((pngSize - webpSize) / pngSize * 100).toFixed(1);

    console.log(`  ${path.basename(pngPath)} → ${path.basename(webpPath)} (${reduction}% smaller)`);
  }

  console.log('[optimize-images] Badge conversion complete');
}

// Call after mascot conversion
await convertBadgesToWebP();
```

### HTML Updates

**File:** `public/views/progress.html`

**Current implementation:**
```html
<img src="./assets/badges/badge_ear_training.png"
     alt="Ear Training Master"
     class="achievement-badge"
     width="200"
     height="200" />
```

**New implementation:**
```html
<picture>
  <source srcset="./assets/badges/badge_ear_training.webp" type="image/webp">
  <img src="./assets/badges/badge_ear_training.png"
       alt="Ear Training Master"
       class="achievement-badge"
       width="200"
       height="200" />
</picture>
```

**Locations to update:**
- Progress view: 5 badge images

**Browser behavior:**
- Modern browsers: Load WebP (~172 KB)
- Older browsers: Load PNG fallback (3.4 MB)
- Target: Safari 14+ supports WebP (our baseline)

## Build Pipeline Integration

### Current Asset Optimization Flow

```
prebuild → preoptimize → (optimize-images + optimize-audio + optimize-fonts)
```

### Updates Needed

**scripts/optimize-images.js:**
- Add `convertBadgesToWebP()` function
- Call after `convertMascotsToWebP()`

**No package.json changes needed:**
- Script already runs in prebuild pipeline
- Vite automatically bundles generated WebP files

### Build Process

**Development:**
```bash
npm run dev
→ predev script runs
→ optimize-images.js generates WebP files
→ Vite dev server includes both PNG and WebP
```

**Production:**
```bash
npm run build
→ prebuild script runs preoptimize
→ optimize-images.js generates WebP files
→ Vite bundles both PNG and WebP to dist/
```

## Data Flow

### WebP Conversion Flow
```
Build time:
optimize-images.js → Sharp → badge_*.webp (172 KB)

Runtime (modern browser):
Browser → <picture> → <source type="webp"> → badge_*.webp (172 KB loaded)

Runtime (old browser):
Browser → <picture> → <img fallback> → badge_*.png (3.4 MB loaded)
```

## Testing Strategy

### Script Testing

**Verify WebP generation:**
```bash
node scripts/optimize-images.js
ls -lh public/assets/badges/badge_*.webp
```

Expected: 5 WebP files, ~172 KB total

### Build Verification

**Verify both formats in dist:**
```bash
npm run build
ls -lh dist/assets/badges/badge_*.webp
ls -lh dist/assets/badges/badge_*.png
```

Expected: 5 WebP + 5 PNG fallbacks

### HTML Verification

**Verify `<picture>` elements:**
```bash
grep -A3 '<picture>' public/views/progress.html
```

Expected: 5 `<picture>` elements with WebP sources

### Browser Testing

**DevTools Network tab:**
1. Open progress view
2. Filter by "Img"
3. Verify badge_*.webp loaded (~172 KB)
4. Verify badge_*.png NOT loaded

### Existing Test Suite

**Should still pass:**
```bash
npm test
npx playwright test
```

Expected: All tests passing (no behavioral changes)

## Performance Targets

### Bundle Size
- Current: 9.8 MB (post-mascot optimization)
- Target: 6.6 MB
- Reduction: 32%

### Breakdown
- Badge WebP savings: -3.2 MB
- Modern browsers load: 172 KB WebP
- Legacy browsers load: 3.4 MB PNG

### Per-File Targets
- badge_ear_training.webp: <45 KB (from 774 KB)
- badge_first_song.webp: <40 KB (from 678 KB)
- badge_practice_streak.webp: <42 KB (from 721 KB)
- badge_perfect_pitch.webp: <38 KB (from 644 KB)
- badge_metronome_master.webp: <36 KB (from 612 KB)

### Core Web Vitals
- No LCP impact (badges not above fold)
- No impact on CLS or INP
- Offline support: unchanged (service worker caches both formats)

## Browser Compatibility

### WebP Support
- Safari: 14+ (Sep 2020)
- Chrome: 23+ (Nov 2012)
- Firefox: 65+ (Jan 2019)
- Edge: 18+ (Nov 2018)

**Target baseline:** Safari 14+ (already our requirement for PWA features)

### Fallback Strategy
`<picture>` element provides automatic fallback:
- Modern browsers: Load WebP (optimal)
- Older browsers: Load PNG (graceful degradation)
- No JavaScript required
- No detection overhead

## Tech Stack

- **Sharp**: WebP conversion (already installed)
- **Vite**: Build system (already configured)
- **HTML5 `<picture>`**: Progressive enhancement
- **Node.js**: Script execution (already used)

## Dependencies

None - all tools already installed:
- Sharp: existing dependency
- fs/path: Node.js built-ins
- glob: existing dependency

## Rollback Plan

**If WebP causes issues:**
1. Remove `<source>` elements from `<picture>` tags
2. Keep only `<img>` elements (PNG fallback)
3. Delete generated `.webp` files
4. App works exactly as before

**Original files preserved:**
- PNGs: kept alongside WebP files
- No data loss

## Migration Path

1. Update optimize-images.js script
2. Run optimization script
3. Update HTML for 5 badge images
4. Test build output
5. Verify browser loading
6. Measure performance gains
7. Commit changes

## Success Criteria

- ✅ Bundle size reduced to ~6.6 MB
- ✅ 5 WebP files generated
- ✅ `<picture>` elements working
- ✅ Modern browsers load WebP
- ✅ Fallback browsers load PNG
- ✅ All tests passing
- ✅ Build pipeline automated
