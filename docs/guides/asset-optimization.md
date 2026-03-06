# Asset Optimization Guide

## Overview

Automatic asset optimization during production builds:
- **Audio**: WAV → Opus (primary) + MP3 (fallback) using FFmpeg
- **Fonts**: Subset variable fonts to Basic Latin + music notation using pyftsubset
- **Images**: Badge and illustration PNG source imports become WebP-only runtime assets, and legacy root-level PNG assets are archived and replaced via Sharp

## Running Optimizations

### Production Build (Automatic)
```bash
NODE_ENV=production npm run build
```

Optimizations run during `prebuild` phase:
1. `optimize-images.js` - Generate WebP assets
2. `optimize-audio.js` - Convert WAV to Opus/MP3
3. `optimize-fonts.js` - Subset WOFF2 fonts

### Development Mode
Optimizations skip in dev mode to speed up builds:
```bash
npm run dev  # No optimizations
```

## Prerequisites

### FFmpeg (Audio)
```bash
brew install ffmpeg  # macOS
```

### pyftsubset (Fonts)
```bash
pipx install fonttools
pipx inject fonttools brotli
```

### Sharp (Images)
```bash
npm install  # Included in package.json
```

## How It Works

### Audio Optimization
**Script**: `scripts/optimize-audio.js`
**Source**: `public/assets/audio/*.wav`
**Output**: `public/assets/audio/*.{opus,mp3}`
**Archive**: `_archived/original-assets/audio/`

Process:
1. Find all WAV files
2. Convert to Opus (96 kbps VBR, best for music)
3. Convert to MP3 (128 kbps CBR, broad compatibility)
4. Archive originals
5. Savings depend on clip length, but uncompressed WAV sources usually shrink substantially

### Font Optimization
**Script**: `scripts/optimize-fonts.js`
**Source**: `src/assets/fonts/*.woff2`
**Output**: Same location (in-place replacement)
**Archive**: `_archived/original-assets/fonts/`

Process:
1. Archive original variable fonts
2. Subset to Unicode ranges:
   - U+0020-007E: Basic Latin (space through tilde)
   - U+2669-266C: Music notation (♩♪♫♬)
3. Maintain variable font features
4. Savings depend on the source font and which Unicode ranges you keep

### Image Optimization
**Script**: `scripts/optimize-images.js`
**Targets**:
- `public/assets/badges/badge_*.png` → `.webp` replacement
- `public/assets/illustrations/*.png` → `.webp` replacement
- `public/assets/*.png` → `.webp` replacement plus archived original for legacy root-level assets
- `public/assets/icons/*.png` remain PNG
**Archive**: `_archived/original-assets/images/` for legacy top-level PNGs only

Process:
1. Convert badge PNGs to WebP and remove the PNG runtime files
2. Convert illustration PNGs under `public/assets/illustrations/` to WebP and remove the PNG runtime files
3. Convert any legacy top-level `public/assets/*.png` files to WebP, archive the original PNG, and remove the source file
4. Leave icons and other non-matching PNGs untouched
5. If you add a new image family, extend `scripts/optimize-images.js` instead of assuming recursive conversion

## Adding New Assets

### New Audio File
1. Add `filename.wav` to `public/assets/audio/`
2. Run production build: `NODE_ENV=production npm run build`
3. Opus and MP3 versions generated automatically
4. Update audio loading code to try Opus first:
```javascript
const audio = new Audio();
if (audio.canPlayType('audio/ogg; codecs=opus')) {
  audio.src = '/assets/audio/filename.opus';
} else {
  audio.src = '/assets/audio/filename.mp3';
}
```

### New Font
1. Add `fontname.woff2` to `src/assets/fonts/`
2. Add to FONTS array in `scripts/optimize-fonts.js`
3. Run production build
4. Subset version replaces original

### New Image
1. Add badge or illustration PNG source files under `public/assets/badges/` or `public/assets/illustrations/`
2. Run production build
3. Matching WebP files replace the PNG runtime assets
4. Keep `public/assets/icons/*.png` as PNG for manifest and platform icon flows
5. Reference the WebP asset directly in runtime markup:
```html
<img src="/assets/illustrations/mascot-happy.webp" alt="Description">
```
6. If an existing template already uses `<picture>`, keep the wrapper but point both `srcset` and `src` at the WebP asset
7. Treat badge and illustration PNGs as import inputs, not shipped runtime files; the optimizer removes them after conversion
8. If you add a different PNG family under `public/assets/`, update `scripts/optimize-images.js` so the build knows to convert and remove it

## Rollback Procedure

### Restore Original Audio
```bash
cp _archived/original-assets/audio/*.wav public/assets/audio/
rm public/assets/audio/*.{opus,mp3}
```

### Restore Original Fonts
```bash
cp _archived/original-assets/fonts/*.woff2 src/assets/fonts/
```

### Restore Original Images
```bash
# Restore archived legacy top-level PNG assets, if any were processed
mkdir -p public/assets
cp _archived/original-assets/images/*.png public/assets/ 2>/dev/null || true

# Remove generated WebP files
find public/assets -maxdepth 1 -name '*.webp' -delete
find public/assets/badges -name '*.webp' -delete
find public/assets/illustrations -name '*.webp' -delete
```

Badge and illustration PNG source files are not archived by the optimizer. Restore those from git history or from your original design/source files if you need editable PNG inputs again.

### Full Restore
```bash
# Restore all assets
cp -r _archived/original-assets/audio/* public/assets/audio/
cp -r _archived/original-assets/fonts/* src/assets/fonts/
mkdir -p public/assets
cp -r _archived/original-assets/images/* public/assets/ 2>/dev/null || true

# Remove optimized versions
rm public/assets/audio/*.{opus,mp3}
find public/assets -maxdepth 1 -name '*.webp' -delete
find public/assets/badges -name '*.webp' -delete
find public/assets/illustrations -name '*.webp' -delete

# Rebuild
npm run build
```

If you need badge or illustration PNG inputs after a full restore, recover them from git history or re-export them from the original artwork before rerunning the optimizer.

## Troubleshooting

### FFmpeg Not Found
**Error**: `zsh: command not found: ffmpeg`
**Solution**: Install FFmpeg via Homebrew
```bash
brew install ffmpeg
```

### pyftsubset Not Found
**Error**: `pyftsubset not found`
**Solution**: Install fonttools with brotli support
```bash
pipx install fonttools
pipx inject fonttools brotli
```

### Brotli Missing
**Error**: `ImportError: No module named brotli`
**Solution**: Add brotli to fonttools environment
```bash
pipx inject fonttools brotli
```

### Optimizations Not Running
**Cause**: NODE_ENV not set to production
**Solution**: Use production build command
```bash
NODE_ENV=production npm run build
```

### Audio Playback Issues
**Cause**: Browser doesn't support Opus
**Solution**: Ensure MP3 fallback is present
- Current Chromium, Firefox, and Safari builds generally support Opus
- Older or limited-support Safari builds may require the MP3 fallback
- All modern browsers support MP3

### Font Display Issues
**Cause**: Missing glyphs after subsetting
**Solution**: Add Unicode ranges to `scripts/optimize-fonts.js`
```javascript
const UNICODE_RANGE = 'U+0020-007E,U+2669-266C,U+YOUR-RANGE';
```

### Large Bundle Size
**Check**: Verify optimizations ran
```bash
# Check audio formats (should have both)
find public/assets/audio -maxdepth 1 \( -name '*.opus' -o -name '*.mp3' \) | sort

# Check font sizes (should be ~3 KB total)
ls -lh src/assets/fonts/*.woff2

# Check generated WebP assets
find public/assets -type f -name '*.webp' | sort
```

## Performance Impact

### Audio
- Large savings are typical when uncompressed WAV sources are replaced with Opus and MP3 outputs
- Original WAVs are archived out of `public/assets/audio/` during production optimization
- First paint impact is low because audio is loaded on demand

### Fonts
- Source variable fonts are replaced in place with subset WOFF2 files
- Savings depend on the original font files and retained Unicode ranges
- First paint improves because less font data sits on the critical path

### Images
- The current script replaces badge and illustration PNG runtime assets with WebP files
- App icons intentionally stay PNG for manifest and platform compatibility
- If you add a new image family, update `scripts/optimize-images.js` so the build includes it

## Browser Compatibility

### Opus Audio
- Supported: Current target Chromium, Firefox, Edge, and Safari builds
- Fallback: MP3 where Opus support is unavailable
- Implementation: `<audio>` with source detection

### WebP Images
- Supported: All current target browsers
- Runtime format: Badge and illustration assets ship as WebP only
- `<picture>` wrappers may still appear in templates, but they are not used for PNG fallback in the current app

### WOFF2 Fonts
- Supported: All current target browsers
- No fallback needed for target browsers
- Subset maintains variable font features
