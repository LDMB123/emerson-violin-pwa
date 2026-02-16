# Asset Optimization Guide

## Overview

Automatic asset optimization during production builds:
- **Audio**: WAV → Opus (primary) + MP3 (fallback) using FFmpeg
- **Fonts**: Subset variable fonts to Basic Latin + music notation using pyftsubset
- **Images**: PNG → WebP conversion (when needed) using Sharp

## Running Optimizations

### Production Build (Automatic)
```bash
NODE_ENV=production npm run build
```

Optimizations run during `prebuild` phase:
1. `optimize-images.js` - Convert PNG to WebP
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
5. Expected savings: ~86% (2.1 MB → 290 KB for 7 files)

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
4. Expected savings: ~94% (48 KB → 3 KB for 2 fonts)

### Image Optimization
**Script**: `scripts/optimize-images.js`
**Source**: `public/assets/**/*.png`
**Output**: `public/assets/**/*.webp`
**Archive**: `_archived/original-assets/images/`

Process:
1. Find all PNG files
2. Convert to WebP (quality 85)
3. Archive originals
4. Update references in code
5. Expected savings: ~60% (varies by image)

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
1. Add `image.png` to `public/assets/images/`
2. Run production build
3. WebP version generated automatically
4. Use `<picture>` element for fallback:
```html
<picture>
  <source srcset="/assets/images/image.webp" type="image/webp">
  <img src="/assets/images/image.png" alt="Description">
</picture>
```

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
cp _archived/original-assets/images/*.png public/assets/images/
rm public/assets/images/*.webp
```

### Full Restore
```bash
# Restore all assets
cp -r _archived/original-assets/audio/* public/assets/audio/
cp -r _archived/original-assets/fonts/* src/assets/fonts/
cp -r _archived/original-assets/images/* public/assets/images/

# Remove optimized versions
rm public/assets/audio/*.{opus,mp3}
rm public/assets/images/*.webp

# Rebuild
npm run build
```

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
- Safari 17+: Supports Opus
- Safari 14-16: Requires MP3 fallback
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
ls public/assets/audio/*.{opus,mp3}

# Check font sizes (should be ~3 KB total)
ls -lh src/assets/fonts/*.woff2

# Check image formats (should have WebP)
ls public/assets/images/*.webp
```

## Performance Impact

### Audio
- Original: 7 WAV files @ 2.1 MB
- Optimized: 7 Opus + 7 MP3 @ 684 KB
- Savings: 1.4 MB (67%)
- First paint: No impact (lazy loaded)

### Fonts
- Original: 2 variable fonts @ 48 KB
- Optimized: 2 subset fonts @ 3 KB
- Savings: 45 KB (94%)
- First paint: -45 KB critical path

### Images
- Original: Already optimized PNGs
- Optimized: N/A (no PNG sources found)
- Savings: 0 KB (images pre-optimized)

## Browser Compatibility

### Opus Audio
- Supported: Chrome, Firefox, Edge, Safari 17+
- Fallback: MP3 for Safari 14-16
- Implementation: `<audio>` with source detection

### WebP Images
- Supported: All modern browsers (Safari 14+)
- Fallback: PNG via `<picture>` element
- Progressive enhancement

### WOFF2 Fonts
- Supported: All modern browsers (Safari 10+)
- No fallback needed for target browsers
- Subset maintains variable font features
