# Asset-First Optimization - Design Document

**Date**: 2026-02-16
**Goal**: Reduce bundle from 22 MB → ~7 MB (67% reduction) through asset optimization
**Target**: Safari 26.2 / iPadOS 26.2 on iPad mini (6th generation)
**Risk Level**: Low (build-time optimizations, no runtime code changes)

---

## Executive Summary

Asset-first optimization focuses on the largest opportunity for bundle reduction: 21 MB of unoptimized assets (images, audio, fonts). By converting to modern formats (WebP, Opus) with Safari-compatible fallbacks, we achieve 13.8 MB savings (63% reduction) with minimal code changes.

### Expected Results

| Asset Type | Current | Optimized | Savings | Reduction |
|------------|---------|-----------|---------|-----------|
| Images     | 21 MB   | 9 MB      | 12 MB   | 57%       |
| Audio      | 2.3 MB  | 0.5 MB    | 1.8 MB  | 78%       |
| WASM       | 47 KB   | 26 KB     | 21 KB   | 45%       |
| Fonts      | 48 KB   | 38 KB     | 10 KB   | 21%       |
| **Total**  | **22 MB** | **8.2 MB** | **13.8 MB** | **63%** |

### Key Benefits

- **User Experience**: 67% faster initial load on iPad mini
- **Bandwidth**: Save 13.8 MB per install (critical for cellular users)
- **Safari Compatible**: All optimizations work on Safari 26.2+
- **Low Risk**: Build-time only, original assets preserved
- **Quick Implementation**: 2-3 hours total

---

## Architecture

### High-Level Strategy

**Build-Time Optimization Pipeline**:
1. Convert assets to modern formats (WebP, Opus)
2. Generate fallbacks for older browsers (PNG, MP3)
3. Serve optimal format based on browser capabilities
4. Preserve originals in `_archived/original-assets/`

**No Runtime Changes**:
- Existing code continues to work unchanged
- Browser automatically selects best format
- Progressive enhancement approach

**Fallback Strategy**:
- WebP → PNG (Safari <14, but target is 26.2)
- Opus → MP3 (Safari <17, but target is 26.2)
- Subset fonts → Full fonts (automatic fallback)

---

## Section 1: Image Optimization

### Current State Analysis

**Problem**:
- 21 MB of uncompressed PNG images
- Largest files: mascot-happy.png (1.0 MB), mascot-encourage.png (981 KB)
- All 24-bit PNG with alpha channel
- No progressive loading or compression

**Impact**:
- Slow initial page load on cellular
- High bandwidth consumption
- Unnecessary storage usage

### Proposed Solution

**Technology**: WebP format with quality=85
- Modern format: 30-50% smaller than PNG at same visual quality
- Lossless alpha channel support
- Safari 14+ support (September 2020)
- iPad target: Safari 26.2 ✅ Full support

**Conversion Strategy**:
1. Convert all PNGs to WebP using Sharp library
2. Place WebP files in same location as PNGs
3. Update HTML/CSS references to WebP
4. Keep PNG files only for manifest icons (PWA requirement)
5. Archive original PNGs in `_archived/original-assets/images/`

**Quality Settings**:
- Quality: 85 (visually lossless for illustrations)
- Method: 4 (balance of speed vs compression)
- Preserve alpha channel
- No lossy compression for mascot images

**HTML Integration**:
```html
<!-- Before -->
<img src="/assets/mascot-happy.png" alt="Happy Panda">

<!-- After -->
<picture>
  <source srcset="/assets/mascot-happy.webp" type="image/webp">
  <img src="/assets/mascot-happy.png" alt="Happy Panda">
</picture>
```

**CSS Background Images**:
```css
/* Use image-set() for WebP support */
.mascot-happy {
  background-image: image-set(
    url('/assets/mascot-happy.webp') type('image/webp'),
    url('/assets/mascot-happy.png') type('image/png')
  );
}
```

**Implementation Details**:
- Build script: `scripts/optimize-images.js`
- Library: Sharp (fast, native, Node.js)
- Batch process all PNGs in `public/assets/`
- Parallel processing for speed

**Expected Results**:
- 21 MB → 9 MB (12 MB saved)
- 57% reduction
- Visually identical quality
- Faster image decode on modern devices

---

## Section 2: Audio Compression

### Current State Analysis

**Problem**:
- 2.3 MB of uncompressed WAV files
- Used for: tone player, game sounds, practice feedback
- Linear PCM encoding (no compression)
- High bitrate for simple audio

**Impact**:
- Slow audio loading during gameplay
- High bandwidth for audio features
- Unnecessary storage usage

### Proposed Solution

**Primary Format**: Opus in WebM container
- Best compression for music/speech
- Transparent quality at 96 kbps
- Safari 17.0+ support (September 2023)
- iPad target: Safari 26.2 ✅ Full support

**Fallback Format**: MP3
- Universal browser support
- 128 kbps for compatibility
- Safari all versions support

**Conversion Strategy**:
1. Convert WAV → Opus (96 kbps) using FFmpeg
2. Generate MP3 fallbacks (128 kbps)
3. Update audio player to detect format support
4. Serve Opus to Safari 17+, MP3 to older browsers
5. Archive original WAVs in `_archived/original-assets/audio/`

**Quality Settings**:
- Opus: 96 kbps VBR (Variable Bit Rate)
- MP3: 128 kbps CBR (Constant Bit Rate)
- Sample rate: 44.1 kHz (preserve original)
- Stereo preserved where present

**HTML Integration**:
```html
<audio controls>
  <source src="/audio/tone-a4.opus" type="audio/ogg; codecs=opus">
  <source src="/audio/tone-a4.mp3" type="audio/mpeg">
</audio>
```

**JavaScript Detection**:
```javascript
// In tone-player.js
const supportsOpus = (() => {
  const audio = document.createElement('audio');
  return audio.canPlayType('audio/ogg; codecs=opus') === 'probably';
})();

const audioFormat = supportsOpus ? 'opus' : 'mp3';
```

**Implementation Details**:
- Build script: `scripts/optimize-audio.js`
- Tool: FFmpeg (industry standard)
- Batch process all WAVs in `public/audio/`
- Quality testing with A/B comparison

**MediaRecorder Compatibility**:
- Already using Opus via MediaRecorder API
- Recording format unchanged (WebM/Opus)
- Only affects playback assets

**Expected Results**:
- 2.3 MB → 0.5 MB (1.8 MB saved)
- 78% reduction
- Transparent audio quality
- Faster audio loading in games

---

## Section 3: WASM Dead Code Elimination

### Current State Analysis

**Problem**:
- `panda-core.wasm` exports 49 functions
- Only ~30 functions actively used in JavaScript
- Unused exports add binary bloat
- Previous extraction work moved JSON helpers to JS

**Impact**:
- Larger WASM download
- Slower initialization
- Unused code in production

### Proposed Solution

**Strategy**: Remove unused exports from Rust source
- Keep all core functionality (progress, achievements, skills, timer)
- Remove JSON extraction helpers (now in JS)
- Remove redundant getter methods
- Rebuild with aggressive optimization flags

**Unused Exports to Remove**:
Based on `docs/reports/2026-02-16-wasm-audit.md`:
1. JSON conversion helpers (extracted to JS)
2. Legacy skill update methods (consolidated)
3. Redundant getter wrappers

**Rust Code Changes**:
```rust
// Remove from lib.rs
#[wasm_bindgen]
impl PlayerProgress {
    // Remove: to_json_value() - no longer needed
    // Remove: from_json_value() - no longer needed
    // Keep: Core methods (add_xp, log_practice, etc.)
}
```

**Build Configuration**:
```toml
# wasm-pack build --release --target web
[profile.release]
opt-level = "z"           # Optimize for size
lto = true               # Link-time optimization
codegen-units = 1        # Single codegen unit for better optimization
strip = true             # Strip debug symbols
panic = "abort"          # Smaller panic handler
```

**Implementation Details**:
- Modify: `wasm/panda-core/src/lib.rs`
- Remove unused `#[wasm_bindgen]` annotations
- Rebuild: `cd wasm/panda-core && wasm-pack build --release`
- Verify: Check `panda_core.d.ts` for exported functions

**Safety Checks**:
- Run full test suite after rebuild
- Verify all games still work
- Check tuner functionality
- Test progress tracking

**Expected Results**:
- 47 KB → 26 KB (21 KB saved)
- 45% reduction when gzipped
- Faster WASM initialization
- No functionality loss

---

## Section 4: Font Subsetting

### Current State Analysis

**Problem**:
- Nunito variable font: 28.91 KB (full Latin charset)
- Fraunces variable font: 19.75 KB (full Latin charset)
- App only uses basic Latin + numbers
- Extended character sets unused

**Impact**:
- Larger font downloads
- Unnecessary glyphs loaded
- Slower text rendering initialization

### Proposed Solution

**Technology**: Font subsetting with fonttools
- Remove unused glyphs (extended Latin, special symbols)
- Keep basic Latin, numbers, music notation
- Preserve variable font axes (weight, width)
- Maintain hinting and kerning

**Character Set Needed**:
```
ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz
0123456789
.,!?;:'"-()[]{}♩♪♫♬
```
- ~120 characters vs 600+ in full font
- English alphabet only (no accents)
- Music notation symbols
- Basic punctuation

**Subsetting Strategy**:
1. Analyze app text content for used characters
2. Create Unicode range subset definition
3. Generate subset fonts with `pyftsubset`
4. Preserve variable font features
5. Archive original fonts in `_archived/original-assets/fonts/`

**Implementation Details**:
- Build script: `scripts/subset-fonts.js`
- Tool: fonttools `pyftsubset` (Python)
- Command: `pyftsubset font.woff2 --unicodes=U+0020-007E,U+2669-266C`
- Preserve: Variable axes, kerning, hinting

**CSS Integration**:
```css
/* Subset fonts load automatically */
@font-face {
  font-family: 'Nunito';
  src: url('/assets/nunito-vf-subset.woff2') format('woff2-variations');
  font-weight: 200 1000;
  font-display: swap;
}
```

**Fallback Strategy**:
- Browser automatically uses system fonts if subset fails
- No explicit fallback needed
- Progressive enhancement

**Expected Results**:
- 48 KB → 38 KB (10 KB saved)
- 21% reduction
- Identical visual rendering
- Faster font loading

---

## Section 5: Build Pipeline Integration

### Build Script Architecture

**New Scripts**:
1. `scripts/optimize-images.js` - WebP conversion
2. `scripts/optimize-audio.js` - Opus/MP3 conversion
3. `scripts/subset-fonts.js` - Font subsetting
4. Update existing scripts for coordination

**Build Flow**:
```
npm run build
│
├─ prebuild (run optimizations)
│   ├─ build-games-html.js (existing)
│   ├─ build-songs-html.js (existing)
│   ├─ optimize-images.js (new) - if NODE_ENV=production
│   ├─ optimize-audio.js (new) - if NODE_ENV=production
│   ├─ subset-fonts.js (new) - if NODE_ENV=production
│   └─ build-sw-assets.js (existing)
│
├─ build (vite build)
│   └─ Vite bundles optimized assets
│
└─ postbuild
    └─ build-sw-assets.js --dist (update service worker)
```

**Development Mode**:
- Skip asset optimization (NODE_ENV=development)
- Use original assets for faster builds
- Only optimize for production builds

**Production Mode**:
- Run all optimizations (NODE_ENV=production)
- Generate optimized assets
- Archive originals automatically

**Package.json Updates**:
```json
{
  "scripts": {
    "predev": "node scripts/build-games-html.js && node scripts/build-songs-html.js && node scripts/build-sw-assets.js",
    "dev": "vite",
    "prebuild": "node scripts/build-games-html.js && node scripts/build-songs-html.js && node scripts/optimize-images.js && node scripts/optimize-audio.js && node scripts/subset-fonts.js && node scripts/build-sw-assets.js",
    "build": "vite build",
    "postbuild": "node scripts/build-sw-assets.js --dist"
  },
  "devDependencies": {
    "sharp": "^0.33.0",
    "fluent-ffmpeg": "^2.1.2"
  }
}
```

**Dependencies**:
- `sharp` - Image optimization (Node.js native)
- `fluent-ffmpeg` - Audio conversion (requires FFmpeg)
- `fonttools` - Font subsetting (Python, global install)

**Error Handling**:
- Graceful fallback if optimization fails
- Log warnings but don't break build
- Use original assets if optimized versions missing

**Caching Strategy**:
- Cache optimized assets in `.cache/` directory
- Only re-optimize changed files
- Speed up subsequent builds

---

## Section 6: Testing & Validation

### Quality Assurance Strategy

**Visual Regression Testing**:
1. Capture screenshots before optimization (Playwright)
2. Capture screenshots after optimization
3. Compare with pixelmatch library
4. Accept <1% pixel difference threshold

**Audio Quality Testing**:
1. A/B listen test (original WAV vs Opus)
2. Spectral analysis comparison
3. Check for clipping or distortion
4. Verify transparency at 96 kbps

**Performance Testing**:
1. Measure load time before/after (Lighthouse)
2. Track First Contentful Paint (FCP)
3. Track Largest Contentful Paint (LCP)
4. Measure bundle download time on 3G

**Safari 26.2 Compatibility**:
1. Test WebP rendering (Safari 26.2 supports)
2. Test Opus playback (Safari 26.2 supports)
3. Test font rendering (variable fonts)
4. Test on physical iPad mini (6th gen)

**Functional Testing**:
1. All games load and play correctly
2. Tuner initializes and detects pitch
3. Audio playback works (tone player)
4. Images display correctly (mascot, badges)
5. PWA installation works (manifest icons)

### Acceptance Criteria

**Bundle Size**:
- ✅ Total bundle: 22 MB → <8 MB (>60% reduction)
- ✅ Images: 21 MB → <10 MB
- ✅ Audio: 2.3 MB → <600 KB
- ✅ WASM: 47 KB → <30 KB
- ✅ Fonts: 48 KB → <40 KB

**Quality**:
- ✅ Visual quality: No perceptible difference
- ✅ Audio quality: Transparent (A/B test pass)
- ✅ Font rendering: Identical to original
- ✅ No broken images or audio

**Performance**:
- ✅ Lighthouse Performance: >90
- ✅ LCP improvement: >30% faster
- ✅ Build time increase: <10 seconds

**Compatibility**:
- ✅ Safari 26.2 / iPadOS 26.2: All features work
- ✅ PWA installation: Works correctly
- ✅ Offline mode: Assets cached by service worker

**Code Quality**:
- ✅ No runtime code changes
- ✅ Original assets preserved in `_archived/`
- ✅ Build scripts documented
- ✅ Tests pass

### Test Plan

**Phase 1: Local Testing** (30 min)
1. Run `npm run build` with optimizations
2. Check bundle sizes (verify reductions)
3. Run `npm run preview` locally
4. Visual inspection (all images load)
5. Audio playback test (all sounds work)

**Phase 2: iPad Testing** (30 min)
1. Deploy to test server (HTTPS)
2. Open on iPad mini (6th gen), Safari 26.2
3. Test all views (Home, Tuner, Games, Progress)
4. Test PWA installation
5. Test offline mode

**Phase 3: Performance Testing** (15 min)
1. Run Lighthouse audit
2. Check LCP improvement
3. Verify no new errors in console
4. Check Service Worker caching

**Phase 4: Regression Testing** (15 min)
1. Run unit tests (`npm test`)
2. Run E2E tests (`npx playwright test`)
3. Check for broken functionality
4. Verify no visual regressions

---

## Implementation Timeline

**Total Estimated Time**: 2-3 hours

### Phase 1: Setup (30 min)
- Install dependencies (Sharp, FFmpeg, fonttools)
- Create `_archived/original-assets/` structure
- Test tools locally

### Phase 2: Image Optimization (45 min)
- Write `scripts/optimize-images.js`
- Convert all PNGs to WebP
- Update HTML/CSS references
- Test visual quality

### Phase 3: Audio Optimization (30 min)
- Write `scripts/optimize-audio.js`
- Convert WAVs to Opus + MP3
- Update audio player code
- Test audio quality

### Phase 4: WASM & Fonts (30 min)
- Remove unused WASM exports
- Write `scripts/subset-fonts.js`
- Rebuild WASM and subset fonts
- Test functionality

### Phase 5: Testing & Validation (30 min)
- Run all tests (visual, audio, performance)
- Test on iPad mini
- Verify acceptance criteria
- Document results

---

## Risk Assessment

### Low Risk Items ✅
- Image optimization (reversible, fallbacks)
- Audio compression (fallbacks, no code changes)
- Font subsetting (automatic fallback to system fonts)

### Medium Risk Items ⚠️
- WASM changes (test thoroughly)
- Build pipeline changes (verify development mode works)

### Mitigation Strategies
1. **Preserve originals**: Keep all original assets in `_archived/`
2. **Fallbacks**: PNG for WebP, MP3 for Opus
3. **Testing**: Comprehensive QA before deployment
4. **Rollback plan**: Git revert + deploy previous version
5. **Progressive rollout**: Test on staging before production

---

## Success Metrics

### Primary Metrics
- **Bundle size**: 22 MB → <8 MB (>60% reduction) ✅
- **Load time**: >30% improvement on 3G
- **User satisfaction**: No quality complaints

### Secondary Metrics
- **Build time**: <10 seconds additional
- **Storage usage**: ~14 MB per installation saved
- **Bandwidth savings**: ~14 MB per user

### Long-Term Benefits
- Lower hosting costs (CDN bandwidth)
- Better user experience (faster loads)
- More accessible (cellular users)
- Easier updates (smaller deltas)

---

## Documentation Updates

**Files to Create**:
1. `docs/asset-optimization-guide.md` - How to add new assets
2. `scripts/README.md` - Build scripts documentation

**Files to Update**:
1. `README.md` - Mention optimized build
2. `docs/reports/2026-02-16-bundle-analysis.md` - Update with new sizes
3. `.gitignore` - Ignore `.cache/` directory

---

## Future Enhancements

**Post-Implementation Opportunities**:
1. **Lazy loading**: Load images on scroll (Intersection Observer)
2. **Responsive images**: Generate multiple sizes (srcset)
3. **AVIF format**: Next-gen format for even smaller sizes
4. **Progressive WebP**: Load placeholder → full image
5. **Audio streaming**: Stream long audio files vs preload

**Not in Scope** (but noted for future):
- Dynamic image resizing (CDN feature)
- Video compression (no videos yet)
- 3D model optimization (no 3D models yet)

---

## Conclusion

Asset-first optimization delivers 63% bundle reduction (22 MB → 8.2 MB) through modern formats with Safari 26.2 compatibility. Low risk, high reward approach focusing on build-time changes with no runtime code modifications. Implementation takes 2-3 hours with comprehensive testing.

**Next Steps**:
1. Review and approve this design
2. Create implementation plan with detailed tasks
3. Begin Phase 1: Setup and tooling
