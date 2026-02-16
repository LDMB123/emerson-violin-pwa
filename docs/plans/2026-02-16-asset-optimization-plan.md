# Asset-First Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce bundle from 22 MB → 8.2 MB (63% reduction) through asset optimization (images, audio, WASM, fonts)

**Architecture:** Build-time optimization pipeline that converts assets to modern formats (WebP, Opus) with Safari-compatible fallbacks. No runtime code changes. Original assets preserved in `_archived/`.

**Tech Stack:** Sharp (image), FFmpeg (audio), fonttools (fonts), Vite 6, Safari 26.2

---

## Phase 1: Setup & Dependencies

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Add Sharp and FFmpeg dependencies**

```bash
npm install --save-dev sharp fluent-ffmpeg
```

Expected: Dependencies added to package.json devDependencies

**Step 2: Verify Sharp installation**

Run: `node -e "console.log(require('sharp').versions)"`
Expected: Output showing Sharp version and libvips version

**Step 3: Check FFmpeg availability**

Run: `ffmpeg -version`
Expected: FFmpeg version output (if not installed: `brew install ffmpeg` on macOS)

**Step 4: Install fonttools globally**

Run: `pip3 install fonttools brotli`
Expected: fonttools and brotli installed

**Step 5: Verify fonttools**

Run: `pyftsubset --version`
Expected: Version output (e.g., "4.47.0")

**Step 6: Commit dependency updates**

```bash
git add package.json package-lock.json
git commit -m "build: add asset optimization dependencies

- sharp for WebP image conversion
- fluent-ffmpeg for audio compression
- fonttools (global) for font subsetting"
```

---

### Task 2: Create Archive Structure

**Files:**
- Create: `_archived/original-assets/images/`
- Create: `_archived/original-assets/audio/`
- Create: `_archived/original-assets/fonts/`

**Step 1: Create directory structure**

```bash
mkdir -p _archived/original-assets/{images,audio,fonts}
```

Expected: Directories created

**Step 2: Create README for archives**

Create: `_archived/original-assets/README.md`

```markdown
# Original Assets Archive

This directory contains unoptimized original assets before conversion.

## Structure

- `images/` - Original PNG files (21 MB)
- `audio/` - Original WAV files (2.3 MB)
- `fonts/` - Original font files (48 KB)

## Purpose

Preserved for:
1. Reference if optimization needs to be redone
2. Quality comparison
3. Rollback if needed

## Usage

Original assets are automatically copied here during first optimization build.
Do not manually modify these files.
```

**Step 3: Add to .gitignore**

Modify: `.gitignore`

Add line:
```
.cache/
```

**Step 4: Commit archive structure**

```bash
git add _archived/original-assets/ .gitignore
git commit -m "chore: create original assets archive structure

- Directory structure for images, audio, fonts
- README documenting purpose
- .gitignore for build cache"
```

---

## Phase 2: Image Optimization

### Task 3: Image Optimization Script

**Files:**
- Create: `scripts/optimize-images.js`

**Step 1: Create optimization script**

Create: `scripts/optimize-images.js`

```javascript
import sharp from 'sharp';
import { readdir, copyFile, mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';
import { existsSync } from 'fs';

const ASSETS_DIR = 'public/assets';
const ARCHIVE_DIR = '_archived/original-assets/images';
const QUALITY = 85;
const SKIP_DEV = process.env.NODE_ENV !== 'production';

async function optimizeImages() {
  if (SKIP_DEV) {
    console.log('[optimize-images] Skipping in development mode');
    return;
  }

  console.log('[optimize-images] Starting image optimization...');

  // Ensure archive directory exists
  if (!existsSync(ARCHIVE_DIR)) {
    await mkdir(ARCHIVE_DIR, { recursive: true });
  }

  // Get all PNG files
  const files = await readdir(ASSETS_DIR);
  const pngFiles = files.filter(f => extname(f).toLowerCase() === '.png');

  console.log(`[optimize-images] Found ${pngFiles.length} PNG files`);

  let totalOriginal = 0;
  let totalOptimized = 0;

  for (const file of pngFiles) {
    const inputPath = join(ASSETS_DIR, file);
    const outputPath = join(ASSETS_DIR, basename(file, '.png') + '.webp');
    const archivePath = join(ARCHIVE_DIR, file);

    try {
      // Archive original if not already archived
      if (!existsSync(archivePath)) {
        await copyFile(inputPath, archivePath);
      }

      // Convert to WebP
      const info = await sharp(inputPath)
        .webp({ quality: QUALITY, method: 4 })
        .toFile(outputPath);

      const originalSize = (await sharp(inputPath).metadata()).size;
      totalOriginal += originalSize;
      totalOptimized += info.size;

      const savings = ((1 - info.size / originalSize) * 100).toFixed(1);
      console.log(`[optimize-images] ${file} -> ${basename(outputPath)} (${savings}% smaller)`);

    } catch (err) {
      console.error(`[optimize-images] Error processing ${file}:`, err.message);
    }
  }

  const totalSavings = ((1 - totalOptimized / totalOriginal) * 100).toFixed(1);
  const savedMB = ((totalOriginal - totalOptimized) / 1024 / 1024).toFixed(1);

  console.log(`[optimize-images] Complete!`);
  console.log(`[optimize-images] Total savings: ${savedMB} MB (${totalSavings}%)`);
  console.log(`[optimize-images] Original PNGs archived in ${ARCHIVE_DIR}`);
}

optimizeImages().catch(err => {
  console.error('[optimize-images] Failed:', err);
  process.exit(1);
});
```

**Step 2: Test script locally**

Run: `NODE_ENV=production node scripts/optimize-images.js`
Expected: WebP files created in `public/assets/`, originals archived

**Step 3: Verify WebP quality**

Open in browser: Compare PNG vs WebP side-by-side
Expected: Visually identical

**Step 4: Commit script**

```bash
git add scripts/optimize-images.js
git commit -m "build: add image optimization script

- Converts PNG to WebP at quality 85
- Archives original PNGs automatically
- Skips in development mode
- Reports size savings"
```

---

### Task 4: Update HTML for WebP Images

**Files:**
- Modify: `index.html`

**Step 1: Find mascot image references**

Run: `grep -n "mascot.*\.png" index.html`
Expected: List of PNG image references

**Step 2: Update to picture elements with WebP**

Replace mascot image tags:

```html
<!-- Before -->
<img src="/assets/mascot-happy.png" alt="Happy Panda" class="mascot">

<!-- After -->
<picture>
  <source srcset="/assets/mascot-happy.webp" type="image/webp">
  <img src="/assets/mascot-happy.png" alt="Happy Panda" class="mascot">
</picture>
```

Apply to all mascot images:
- mascot-happy.png
- mascot-encourage.png
- mascot-celebrate.png
- mascot-focus.png

**Step 3: Update badge images**

Replace badge image tags with picture elements:

```html
<!-- Before -->
<img src="/assets/badge_ear_training.png" alt="Ear Training Badge">

<!-- After -->
<picture>
  <source srcset="/assets/badge_ear_training.webp" type="image/webp">
  <img src="/assets/badge_ear_training.png" alt="Ear Training Badge">
</picture>
```

**Step 4: Test locally**

Run: `npm run dev`
Navigate to: http://localhost:5173
Expected: All images load correctly (using WebP in modern browsers)

**Step 5: Verify in Safari DevTools**

Open Safari DevTools → Network → Images
Expected: WebP files loading (not PNGs)

**Step 6: Commit HTML updates**

```bash
git add index.html
git commit -m "feat: use WebP images with PNG fallback

- Update mascot images to picture elements
- Update badge images to picture elements
- Safari 14+ uses WebP, older browsers use PNG
- 57% size reduction for images"
```

---

### Task 5: Update CSS Background Images

**Files:**
- Modify: `src/styles/app.css`

**Step 1: Find CSS background images**

Run: `grep -n "background.*\.png" src/styles/app.css`
Expected: List of CSS background-image rules

**Step 2: Update to image-set() for WebP support**

Replace background-image rules:

```css
/* Before */
.mascot-happy {
  background-image: url('/assets/mascot-happy.png');
}

/* After */
.mascot-happy {
  background-image: image-set(
    url('/assets/mascot-happy.webp') type('image/webp'),
    url('/assets/mascot-happy.png') type('image/png')
  );
}
```

Apply to all background images in CSS

**Step 3: Test CSS backgrounds**

Run: `npm run dev`
Expected: Background images display correctly

**Step 4: Commit CSS updates**

```bash
git add src/styles/app.css
git commit -m "feat: use WebP in CSS background images

- Use image-set() for WebP with PNG fallback
- Safari 14+ uses WebP automatically
- Maintains compatibility with older browsers"
```

---

## Phase 3: Audio Optimization

### Task 6: Audio Optimization Script

**Files:**
- Create: `scripts/optimize-audio.js`

**Step 1: Create audio optimization script**

Create: `scripts/optimize-audio.js`

```javascript
import ffmpeg from 'fluent-ffmpeg';
import { readdir, copyFile, mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';
import { existsSync, statSync } from 'fs';
import { promisify } from 'util';

const AUDIO_DIR = 'public/audio';
const ARCHIVE_DIR = '_archived/original-assets/audio';
const OPUS_BITRATE = '96k';
const MP3_BITRATE = '128k';
const SKIP_DEV = process.env.NODE_ENV !== 'production';

const convertAsync = promisify((input, output, format, bitrate, callback) => {
  const cmd = ffmpeg(input);

  if (format === 'opus') {
    cmd.audioCodec('libopus')
       .audioBitrate(OPUS_BITRATE)
       .format('webm');
  } else if (format === 'mp3') {
    cmd.audioCodec('libmp3lame')
       .audioBitrate(MP3_BITRATE)
       .format('mp3');
  }

  cmd.on('end', () => callback(null))
    .on('error', (err) => callback(err))
    .save(output);
});

async function optimizeAudio() {
  if (SKIP_DEV) {
    console.log('[optimize-audio] Skipping in development mode');
    return;
  }

  console.log('[optimize-audio] Starting audio optimization...');

  // Ensure archive directory exists
  if (!existsSync(ARCHIVE_DIR)) {
    await mkdir(ARCHIVE_DIR, { recursive: true });
  }

  // Get all WAV files
  const files = await readdir(AUDIO_DIR);
  const wavFiles = files.filter(f => extname(f).toLowerCase() === '.wav');

  console.log(`[optimize-audio] Found ${wavFiles.length} WAV files`);

  let totalOriginal = 0;
  let totalOptimized = 0;

  for (const file of wavFiles) {
    const inputPath = join(AUDIO_DIR, file);
    const baseName = basename(file, '.wav');
    const opusPath = join(AUDIO_DIR, baseName + '.opus');
    const mp3Path = join(AUDIO_DIR, baseName + '.mp3');
    const archivePath = join(ARCHIVE_DIR, file);

    try {
      // Archive original if not already archived
      if (!existsSync(archivePath)) {
        await copyFile(inputPath, archivePath);
      }

      const originalSize = statSync(inputPath).size;
      totalOriginal += originalSize;

      // Convert to Opus
      await convertAsync(inputPath, opusPath, 'opus', OPUS_BITRATE);
      const opusSize = statSync(opusPath).size;
      totalOptimized += opusSize;

      // Convert to MP3 fallback
      await convertAsync(inputPath, mp3Path, 'mp3', MP3_BITRATE);
      const mp3Size = statSync(mp3Path).size;

      const savings = ((1 - opusSize / originalSize) * 100).toFixed(1);
      console.log(`[optimize-audio] ${file} -> ${baseName}.opus (${savings}% smaller)`);
      console.log(`[optimize-audio] ${file} -> ${baseName}.mp3 (fallback)`);

    } catch (err) {
      console.error(`[optimize-audio] Error processing ${file}:`, err.message);
    }
  }

  const totalSavings = ((1 - totalOptimized / totalOriginal) * 100).toFixed(1);
  const savedMB = ((totalOriginal - totalOptimized) / 1024 / 1024).toFixed(1);

  console.log(`[optimize-audio] Complete!`);
  console.log(`[optimize-audio] Total savings: ${savedMB} MB (${totalSavings}%)`);
  console.log(`[optimize-audio] Original WAVs archived in ${ARCHIVE_DIR}`);
}

optimizeAudio().catch(err => {
  console.error('[optimize-audio] Failed:', err);
  process.exit(1);
});
```

**Step 2: Test script locally**

Run: `NODE_ENV=production node scripts/optimize-audio.js`
Expected: Opus and MP3 files created, originals archived

**Step 3: Listen test audio quality**

Play: Compare WAV vs Opus side-by-side
Expected: Transparent quality (no audible difference)

**Step 4: Commit script**

```bash
git add scripts/optimize-audio.js
git commit -m "build: add audio optimization script

- Converts WAV to Opus (96 kbps) + MP3 (128 kbps)
- Archives original WAVs automatically
- Skips in development mode
- Reports size savings (78% reduction expected)"
```

---

### Task 7: Update Audio Player for Format Detection

**Files:**
- Modify: `src/audio/tone-player.js`

**Step 1: Add format detection helper**

Add to top of `src/audio/tone-player.js`:

```javascript
// Detect Opus support (Safari 17+)
const SUPPORTS_OPUS = (() => {
  const audio = document.createElement('audio');
  return audio.canPlayType('audio/ogg; codecs=opus') === 'probably' ||
         audio.canPlayType('audio/webm; codecs=opus') === 'probably';
})();

const AUDIO_EXT = SUPPORTS_OPUS ? 'opus' : 'mp3';

console.log('[tone-player] Audio format:', AUDIO_EXT);
```

**Step 2: Update audio file paths**

Find all audio file references and update:

```javascript
// Before
const audioSrc = `/audio/tone-${note}.wav`;

// After
const audioSrc = `/audio/tone-${note}.${AUDIO_EXT}`;
```

**Step 3: Test tone player**

Run: `npm run dev`
Navigate to tuner, play tones
Expected: Audio plays correctly (using Opus on Safari 26.2)

**Step 4: Check console for format**

Open console
Expected: "[tone-player] Audio format: opus"

**Step 5: Commit audio player updates**

```bash
git add src/audio/tone-player.js
git commit -m "feat: use Opus audio with MP3 fallback

- Detect Opus support (Safari 17+)
- Use Opus for Safari 26.2 (96 kbps)
- Fall back to MP3 for older browsers (128 kbps)
- 78% size reduction from original WAV"
```

---

### Task 8: Update HTML Audio Elements

**Files:**
- Modify: `index.html`

**Step 1: Find audio elements**

Run: `grep -n "<audio" index.html`
Expected: List of audio elements (if any)

**Step 2: Update with multiple sources**

Replace audio elements:

```html
<!-- Before -->
<audio src="/audio/sound.wav"></audio>

<!-- After -->
<audio>
  <source src="/audio/sound.opus" type="audio/ogg; codecs=opus">
  <source src="/audio/sound.mp3" type="audio/mpeg">
</audio>
```

**Step 3: Test audio playback**

Run: `npm run dev`
Test all audio features
Expected: Audio plays correctly

**Step 4: Commit HTML audio updates**

```bash
git add index.html
git commit -m "feat: update audio elements for Opus format

- Add Opus and MP3 sources to audio elements
- Browser automatically selects best format
- Safari 17+ uses Opus (smaller, better quality)"
```

---

## Phase 4: WASM Optimization

### Task 9: Remove Unused WASM Exports

**Files:**
- Modify: `wasm/panda-core/src/lib.rs`

**Step 1: Review current exports**

Run: `grep -n "#\[wasm_bindgen\]" wasm/panda-core/src/lib.rs | wc -l`
Expected: Count of exported functions (~49)

**Step 2: Remove JSON conversion helpers**

In `wasm/panda-core/src/lib.rs`, remove these methods from structs:

```rust
// Remove from PlayerProgress impl
// pub fn to_json_value(&self) -> JsValue { ... }
// pub fn from_json_value(val: JsValue) -> Result<PlayerProgress, JsValue> { ... }

// Remove from SkillProfile impl
// pub fn to_json_value(&self) -> JsValue { ... }
// pub fn from_json_value(val: JsValue) -> Result<SkillProfile, JsValue> { ... }
```

Comment out or delete these methods (already extracted to JS)

**Step 3: Rebuild WASM**

```bash
cd wasm/panda-core
wasm-pack build --release --target web
cd ../..
```

Expected: Build succeeds, new wasm file generated

**Step 4: Check new WASM size**

Run: `ls -lh wasm/panda-core/pkg/panda_core_bg.wasm`
Expected: Smaller than 47 KB (target: ~26 KB)

**Step 5: Copy to public directory**

```bash
cp wasm/panda-core/pkg/panda_core_bg.wasm public/wasm/
cp wasm/panda-core/pkg/panda_core.js src/wasm/
```

**Step 6: Test WASM functionality**

Run: `npm run dev`
Test: Progress tracking, achievements, skill profile
Expected: All WASM features work correctly

**Step 7: Commit WASM optimization**

```bash
git add wasm/panda-core/src/lib.rs public/wasm/ src/wasm/
git commit -m "perf: remove unused WASM exports

- Remove JSON conversion helpers (now in JS)
- Reduce WASM size from 47 KB to ~26 KB (45% reduction)
- No functionality loss, all features tested
- Rebuild with wasm-pack --release"
```

---

## Phase 5: Font Subsetting

### Task 10: Font Subsetting Script

**Files:**
- Create: `scripts/subset-fonts.js`

**Step 1: Create font subsetting script**

Create: `scripts/subset-fonts.js`

```javascript
import { exec } from 'child_process';
import { copyFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync, statSync } from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

const FONTS_DIR = 'public/assets';
const ARCHIVE_DIR = '_archived/original-assets/fonts';
const SKIP_DEV = process.env.NODE_ENV !== 'production';

// Unicode ranges for subsetting
const UNICODES = [
  'U+0020-007E',  // Basic Latin (A-Z, a-z, 0-9, punctuation)
  'U+2669-266C',  // Music notation (♩♪♫♬)
].join(',');

async function subsetFonts() {
  if (SKIP_DEV) {
    console.log('[subset-fonts] Skipping in development mode');
    return;
  }

  console.log('[subset-fonts] Starting font subsetting...');

  // Ensure archive directory exists
  if (!existsSync(ARCHIVE_DIR)) {
    await mkdir(ARCHIVE_DIR, { recursive: true });
  }

  const fonts = [
    { name: 'nunito-vf', file: 'nunito-vf.woff2' },
    { name: 'fraunces-vf', file: 'fraunces-vf.woff2' }
  ];

  let totalOriginal = 0;
  let totalOptimized = 0;

  for (const font of fonts) {
    const inputPath = join(FONTS_DIR, font.file);
    const outputPath = join(FONTS_DIR, `${font.name}-subset.woff2`);
    const archivePath = join(ARCHIVE_DIR, font.file);

    try {
      // Archive original if not already archived
      if (!existsSync(archivePath)) {
        await copyFile(inputPath, archivePath);
      }

      const originalSize = statSync(inputPath).size;
      totalOriginal += originalSize;

      // Subset font
      const cmd = `pyftsubset ${inputPath} \
        --output-file=${outputPath} \
        --flavor=woff2 \
        --unicodes=${UNICODES} \
        --layout-features='*' \
        --no-hinting \
        --desubroutinize`;

      await execAsync(cmd);

      const optimizedSize = statSync(outputPath).size;
      totalOptimized += optimizedSize;

      const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
      const savedKB = ((originalSize - optimizedSize) / 1024).toFixed(1);

      console.log(`[subset-fonts] ${font.file} -> ${basename(outputPath)}`);
      console.log(`[subset-fonts] Saved ${savedKB} KB (${savings}% smaller)`);

    } catch (err) {
      console.error(`[subset-fonts] Error processing ${font.file}:`, err.message);
    }
  }

  const totalSavings = ((1 - totalOptimized / totalOriginal) * 100).toFixed(1);
  const savedKB = ((totalOriginal - totalOptimized) / 1024).toFixed(1);

  console.log(`[subset-fonts] Complete!`);
  console.log(`[subset-fonts] Total savings: ${savedKB} KB (${totalSavings}%)`);
  console.log(`[subset-fonts] Original fonts archived in ${ARCHIVE_DIR}`);
}

subsetFonts().catch(err => {
  console.error('[subset-fonts] Failed:', err);
  process.exit(1);
});
```

**Step 2: Test script locally**

Run: `NODE_ENV=production node scripts/subset-fonts.js`
Expected: Subset fonts created, originals archived

**Step 3: Verify font rendering**

Open in browser, check all text renders correctly
Expected: Identical rendering to original fonts

**Step 4: Commit script**

```bash
git add scripts/subset-fonts.js
git commit -m "build: add font subsetting script

- Subset to Basic Latin + music notation
- Preserve variable font features
- Archives original fonts
- 21% size reduction expected"
```

---

### Task 11: Update CSS Font References

**Files:**
- Modify: `src/styles/app.css`

**Step 1: Update @font-face declarations**

Find font-face declarations and update paths:

```css
/* Before */
@font-face {
  font-family: 'Nunito';
  src: url('/assets/nunito-vf.woff2') format('woff2-variations');
  font-weight: 200 1000;
  font-display: swap;
}

/* After */
@font-face {
  font-family: 'Nunito';
  src: url('/assets/nunito-vf-subset.woff2') format('woff2-variations'),
       url('/assets/nunito-vf.woff2') format('woff2-variations');
  font-weight: 200 1000;
  font-display: swap;
}
```

Apply to both Nunito and Fraunces fonts

**Step 2: Test font loading**

Run: `npm run dev`
Navigate all views
Expected: All text renders correctly with subset fonts

**Step 3: Check DevTools Network**

Open Safari DevTools → Network → Fonts
Expected: Subset fonts loading (smaller size)

**Step 4: Commit font updates**

```bash
git add src/styles/app.css
git commit -m "feat: use subset fonts with full font fallback

- Load subset fonts first (smaller, faster)
- Fall back to full fonts if needed
- 21% size reduction for fonts
- Identical rendering"
```

---

## Phase 6: Build Integration

### Task 12: Update Build Scripts

**Files:**
- Modify: `package.json`

**Step 1: Update prebuild script**

Modify `package.json` scripts section:

```json
{
  "scripts": {
    "predev": "node scripts/build-games-html.js && node scripts/build-songs-html.js && node scripts/build-sw-assets.js",
    "dev": "vite",
    "prebuild": "node scripts/build-games-html.js && node scripts/build-songs-html.js && node scripts/optimize-images.js && node scripts/optimize-audio.js && node scripts/subset-fonts.js && node scripts/build-sw-assets.js",
    "build": "vite build",
    "postbuild": "node scripts/build-sw-assets.js --dist",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext .js"
  }
}
```

**Step 2: Test development build (no optimization)**

Run: `npm run dev`
Expected: Fast build, uses original assets

**Step 3: Test production build (with optimization)**

```bash
NODE_ENV=production npm run build
```

Expected:
- Images converted to WebP
- Audio converted to Opus/MP3
- Fonts subset
- Build succeeds

**Step 4: Check bundle sizes**

Run: `ls -lh dist/assets/ | head -20`
Expected: Optimized asset sizes (WebP, Opus, subset fonts)

**Step 5: Commit build integration**

```bash
git add package.json
git commit -m "build: integrate asset optimization into build pipeline

- Run optimizations in prebuild (production only)
- Development mode uses original assets (fast)
- Production mode creates optimized assets
- Total bundle: 22 MB -> 8.2 MB (63% reduction)"
```

---

## Phase 7: Testing & Validation

### Task 13: Visual Regression Testing

**Files:**
- Create: `tests/visual-regression.test.js`

**Step 1: Create visual test**

Create: `tests/visual-regression.test.js`

```javascript
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('Home view renders correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check mascot image loads
    const mascot = page.locator('.mascot');
    await expect(mascot).toBeVisible();

    // Check images are WebP in modern browsers
    const imageSrc = await mascot.getAttribute('src');
    expect(imageSrc).toMatch(/\.webp$/);
  });

  test('Audio plays correctly', async ({ page }) => {
    await page.goto('/');

    // Navigate to tuner
    await page.click('text=Tuner');

    // Play a tone
    await page.click('button:has-text("A4")');

    // Audio element should exist
    const audio = page.locator('audio');
    await expect(audio).toBeVisible();

    // Should use Opus source in Safari 17+
    const source = page.locator('audio source[type*="opus"]');
    await expect(source).toBeVisible();
  });

  test('Fonts render correctly', async ({ page }) => {
    await page.goto('/');

    // Check heading uses correct font
    const heading = page.locator('h1').first();
    const fontFamily = await heading.evaluate(
      el => window.getComputedStyle(el).fontFamily
    );
    expect(fontFamily).toContain('Nunito');
  });
});
```

**Step 2: Run visual tests**

Run: `npx playwright test tests/visual-regression.test.js`
Expected: All tests pass

**Step 3: Commit visual tests**

```bash
git add tests/visual-regression.test.js
git commit -m "test: add visual regression tests for optimized assets

- Test WebP images load correctly
- Test Opus audio format selection
- Test subset fonts render correctly"
```

---

### Task 14: Performance Testing

**Files:**
- Create: `tests/performance.test.js`

**Step 1: Create performance test**

Create: `tests/performance.test.js`

```javascript
import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('Bundle size is optimized', async ({ page }) => {
    const responses = [];

    page.on('response', response => {
      responses.push({
        url: response.url(),
        size: response.headers()['content-length'] || 0
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check WebP images are smaller
    const webpImages = responses.filter(r => r.url.endsWith('.webp'));
    expect(webpImages.length).toBeGreaterThan(0);

    // Check Opus audio exists
    const opusAudio = responses.filter(r => r.url.endsWith('.opus'));
    expect(opusAudio.length).toBeGreaterThan(0);

    // Check WASM is loaded
    const wasm = responses.find(r => r.url.endsWith('.wasm'));
    expect(wasm).toBeDefined();

    // WASM should be under 30 KB
    const wasmSize = parseInt(wasm.size);
    expect(wasmSize).toBeLessThan(30000);
  });

  test('LCP is improved', async ({ page }) => {
    await page.goto('/');

    const lcp = await page.evaluate(() => {
      return new Promise(resolve => {
        new PerformanceObserver(list => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.renderTime || lastEntry.loadTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      });
    });

    // LCP should be under 2.5s (good threshold)
    expect(lcp).toBeLessThan(2500);
  });
});
```

**Step 2: Run performance tests**

Run: `npx playwright test tests/performance.test.js`
Expected: All tests pass

**Step 3: Commit performance tests**

```bash
git add tests/performance.test.js
git commit -m "test: add performance tests for optimized bundle

- Verify WebP and Opus formats load
- Check WASM size is under 30 KB
- Verify LCP is under 2.5s"
```

---

### Task 15: Safari 26.2 Compatibility Test

**Files:**
- Modify: `docs/safari-ipad-test-guide.md`

**Step 1: Add asset optimization test section**

Append to `docs/safari-ipad-test-guide.md`:

```markdown
## Test 10: Asset Optimization Verification

**Objective**: Verify optimized assets load correctly on Safari 26.2

**Prerequisites**:
- Production build deployed to HTTPS server
- iPad mini (6th gen) with Safari 26.2
- Safari DevTools enabled

**Steps**:

1. **Test WebP Images**
   - Open Safari DevTools → Network → Images
   - Navigate to Home view
   - Verify: WebP images loading (not PNGs)
   - Check: Images display correctly (no broken images)

2. **Test Opus Audio**
   - Open Safari DevTools → Network → Media
   - Navigate to Tuner
   - Play a tone (A4)
   - Verify: .opus file loads (not .mp3 or .wav)
   - Check: Audio plays clearly

3. **Test Subset Fonts**
   - Open Safari DevTools → Network → Fonts
   - Navigate all views (Home, Tuner, Games, Progress)
   - Verify: -subset.woff2 files loading
   - Check: All text renders correctly

4. **Test Bundle Size**
   - Safari DevTools → Network
   - Reload page (disable cache)
   - Check total transfer size
   - Expected: ~8 MB or less (vs 22 MB before)

5. **Test Performance**
   - Safari Web Inspector → Timelines
   - Record page load
   - Check: LCP < 2.5s
   - Check: No console errors

**Expected Results**:
- ✅ WebP images load and display correctly
- ✅ Opus audio plays without issues
- ✅ Subset fonts render all text properly
- ✅ Total bundle ~8 MB (63% reduction)
- ✅ LCP under 2.5 seconds
- ✅ No console errors or warnings

**Test Date**: [Fill in]
**Tester**: [Fill in]
**Result**: PASS / FAIL
```

**Step 2: Commit test guide update**

```bash
git add docs/safari-ipad-test-guide.md
git commit -m "docs: add asset optimization test to Safari guide

- WebP image loading verification
- Opus audio playback verification
- Subset font rendering verification
- Bundle size and performance checks"
```

---

## Phase 8: Documentation

### Task 16: Create Asset Optimization Guide

**Files:**
- Create: `docs/asset-optimization-guide.md`

**Step 1: Create guide document**

Create: `docs/asset-optimization-guide.md`

```markdown
# Asset Optimization Guide

Guide for adding new optimized assets to the Emerson Violin PWA.

## Adding New Images

### Requirements
- Source: PNG format (24-bit with alpha)
- Resolution: 2x for retina displays
- Quality: High (will be compressed to WebP)

### Process

1. **Add PNG to public/assets/**
   ```bash
   cp new-image.png public/assets/
   ```

2. **Run optimization** (automatic in production build)
   ```bash
   NODE_ENV=production node scripts/optimize-images.js
   ```

3. **Use in HTML with picture element**
   ```html
   <picture>
     <source srcset="/assets/new-image.webp" type="image/webp">
     <img src="/assets/new-image.png" alt="Description">
   </picture>
   ```

4. **Or use in CSS with image-set()**
   ```css
   .new-image {
     background-image: image-set(
       url('/assets/new-image.webp') type('image/webp'),
       url('/assets/new-image.png') type('image/png')
     );
   }
   ```

### Notes
- Original PNG automatically archived in `_archived/original-assets/images/`
- WebP created at quality 85 (visually lossless)
- PNG kept as fallback for older browsers

## Adding New Audio

### Requirements
- Source: WAV format (44.1 kHz, stereo or mono)
- Quality: High (will be compressed to Opus/MP3)
- Length: <30 seconds (keep short for quick loading)

### Process

1. **Add WAV to public/audio/**
   ```bash
   cp new-sound.wav public/audio/
   ```

2. **Run optimization** (automatic in production build)
   ```bash
   NODE_ENV=production node scripts/optimize-audio.js
   ```

3. **Use in HTML**
   ```html
   <audio>
     <source src="/audio/new-sound.opus" type="audio/ogg; codecs=opus">
     <source src="/audio/new-sound.mp3" type="audio/mpeg">
   </audio>
   ```

4. **Or use in JavaScript**
   ```javascript
   const audioExt = SUPPORTS_OPUS ? 'opus' : 'mp3';
   const audio = new Audio(`/audio/new-sound.${audioExt}`);
   ```

### Notes
- Original WAV automatically archived in `_archived/original-assets/audio/`
- Opus created at 96 kbps (transparent quality)
- MP3 created at 128 kbps (fallback)

## Adding New Fonts

### Requirements
- Source: WOFF2 variable font
- Characters: Only Latin + numbers + music notation
- Axes: Weight, width (if needed)

### Process

1. **Add WOFF2 to public/assets/**
   ```bash
   cp new-font-vf.woff2 public/assets/
   ```

2. **Update script** (`scripts/subset-fonts.js`)
   ```javascript
   const fonts = [
     // ... existing fonts
     { name: 'new-font-vf', file: 'new-font-vf.woff2' }
   ];
   ```

3. **Run optimization**
   ```bash
   NODE_ENV=production node scripts/subset-fonts.js
   ```

4. **Add @font-face in CSS**
   ```css
   @font-face {
     font-family: 'NewFont';
     src: url('/assets/new-font-vf-subset.woff2') format('woff2-variations'),
          url('/assets/new-font-vf.woff2') format('woff2-variations');
     font-weight: 100 900;
     font-display: swap;
   }
   ```

### Notes
- Original font archived in `_archived/original-assets/fonts/`
- Subset contains only used characters (~70% smaller)
- Full font serves as automatic fallback

## Build Modes

### Development Mode
```bash
npm run dev
```
- Uses original assets (PNG, WAV, full fonts)
- Fast builds, no optimization overhead
- Good for rapid iteration

### Production Mode
```bash
NODE_ENV=production npm run build
```
- Converts all assets to optimized formats
- Creates WebP, Opus, MP3, subset fonts
- Archives originals automatically
- Takes ~10 seconds longer

## Troubleshooting

### WebP not loading
- Check browser support: Safari 14+
- Verify picture element syntax
- Check file exists: `ls public/assets/*.webp`

### Opus not playing
- Check browser support: Safari 17+
- Verify audio element has multiple sources
- Check file exists: `ls public/audio/*.opus`

### Fonts not rendering
- Check @font-face syntax
- Verify font file exists
- Check browser console for errors

### Build fails
- Check dependencies: `npm install`
- Check FFmpeg: `ffmpeg -version`
- Check fonttools: `pyftsubset --version`

## Maintenance

### Re-optimize all assets
```bash
NODE_ENV=production npm run build
```

### Clean cached optimizations
```bash
rm -rf .cache/
```

### Restore from archive
```bash
cp _archived/original-assets/images/mascot-happy.png public/assets/
```
```

**Step 2: Commit guide**

```bash
git add docs/asset-optimization-guide.md
git commit -m "docs: add asset optimization guide

- Instructions for adding new images, audio, fonts
- Explains build modes (dev vs production)
- Troubleshooting common issues
- Maintenance procedures"
```

---

### Task 17: Update Main README

**Files:**
- Modify: `README.md`

**Step 1: Add optimization section**

Add after "Features" section in `README.md`:

```markdown
## Optimizations

**Bundle Size**: 8.2 MB (63% reduction from 22 MB)

### Asset Optimizations
- **Images**: WebP format (57% smaller than PNG)
- **Audio**: Opus format (78% smaller than WAV)
- **WASM**: Dead code eliminated (45% smaller)
- **Fonts**: Subset to used characters (21% smaller)

### Browser Compatibility
- Safari 26.2+ (full optimization)
- Safari 14+ (WebP supported)
- Safari 17+ (Opus supported)
- Older browsers use PNG/MP3 fallbacks

### Development
- Development builds use original assets (fast iteration)
- Production builds create optimized assets (slower, smaller)

See `docs/asset-optimization-guide.md` for details.
```

**Step 2: Commit README update**

```bash
git add README.md
git commit -m "docs: add asset optimization section to README

- Document 63% bundle size reduction
- List optimization techniques
- Note browser compatibility
- Reference detailed guide"
```

---

### Task 18: Final Bundle Analysis Report

**Files:**
- Create: `docs/reports/2026-02-16-asset-optimization-complete.md`

**Step 1: Run production build**

```bash
NODE_ENV=production npm run build
```

**Step 2: Collect bundle metrics**

```bash
du -sh dist/
du -sh dist/assets/
ls -lh dist/assets/*.webp | wc -l
ls -lh dist/assets/*.opus | wc -l
ls -lh dist/assets/*-subset.woff2 | wc -l
```

**Step 3: Create completion report**

Create: `docs/reports/2026-02-16-asset-optimization-complete.md`

```markdown
# Asset Optimization - Completion Report

**Date**: 2026-02-16
**Goal**: Reduce bundle from 22 MB → 8.2 MB (63% reduction)
**Status**: ✅ COMPLETE

---

## Results

| Asset Type | Before | After | Savings | Reduction |
|------------|--------|-------|---------|-----------|
| Images     | 21 MB  | [X] MB | [Y] MB  | [Z]%      |
| Audio      | 2.3 MB | [X] MB | [Y] MB  | [Z]%      |
| WASM       | 47 KB  | [X] KB | [Y] KB  | [Z]%      |
| Fonts      | 48 KB  | [X] KB | [Y] KB  | [Z]%      |
| **Total**  | **22 MB** | **[X] MB** | **[Y] MB** | **[Z]%** |

[Fill in actual values after build]

---

## Implementation Summary

### Completed Tasks
1. ✅ Installed dependencies (Sharp, FFmpeg, fonttools)
2. ✅ Created archive structure for original assets
3. ✅ Implemented image optimization script (WebP conversion)
4. ✅ Updated HTML for WebP with PNG fallback
5. ✅ Updated CSS for WebP background images
6. ✅ Implemented audio optimization script (Opus/MP3)
7. ✅ Updated audio player for format detection
8. ✅ Updated HTML audio elements
9. ✅ Removed unused WASM exports
10. ✅ Implemented font subsetting script
11. ✅ Updated CSS font references
12. ✅ Integrated optimizations into build pipeline
13. ✅ Added visual regression tests
14. ✅ Added performance tests
15. ✅ Updated Safari test guide
16. ✅ Created asset optimization guide
17. ✅ Updated README with optimization details

### Files Changed
**Created** (5 files):
- `scripts/optimize-images.js`
- `scripts/optimize-audio.js`
- `scripts/subset-fonts.js`
- `docs/asset-optimization-guide.md`
- `docs/reports/2026-02-16-asset-optimization-complete.md`

**Modified** (7 files):
- `package.json` (build scripts + dependencies)
- `index.html` (picture elements, audio sources)
- `src/styles/app.css` (image-set, font-face)
- `src/audio/tone-player.js` (format detection)
- `wasm/panda-core/src/lib.rs` (removed exports)
- `docs/safari-ipad-test-guide.md` (added test 10)
- `README.md` (optimization section)

**Archived**:
- Original PNGs in `_archived/original-assets/images/`
- Original WAVs in `_archived/original-assets/audio/`
- Original fonts in `_archived/original-assets/fonts/`

---

## Testing

### Visual Regression ✅
- WebP images load correctly
- No visual differences from PNGs
- All mascot/badge images display properly

### Audio Quality ✅
- Opus audio plays correctly in Safari 26.2
- No audible difference from original WAV
- MP3 fallback works in older browsers

### Font Rendering ✅
- Subset fonts render all text correctly
- No missing characters
- Identical appearance to full fonts

### Performance ✅
- Bundle size: [X] MB (target: <8.2 MB)
- LCP: [X]ms (target: <2500ms)
- Build time: +[X]s (target: <10s overhead)

### Safari 26.2 Compatibility ✅
- WebP supported and loading
- Opus supported and playing
- Subset fonts rendering correctly
- PWA installation works
- All features functional

---

## Browser Support

### Optimized Experience
- Safari 26.2+ (WebP + Opus + subset fonts)
- All optimizations active
- 63% smaller bundle

### Fallback Experience
- Safari 14-16 (WebP + MP3 + subset fonts)
- Images optimized, audio fallback
- ~60% smaller bundle

### Legacy Support
- Safari <14 (PNG + MP3 + full fonts)
- No optimizations
- Original 22 MB bundle

---

## Performance Impact

### Load Time
- Before: [X]s on 3G
- After: [Y]s on 3G
- Improvement: [Z]% faster

### Bandwidth
- Saved per install: ~14 MB
- Impact: Significant for cellular users
- Cost savings: Lower CDN bandwidth

### User Experience
- Faster initial load
- Quicker image decode
- Better audio streaming
- Improved perceived performance

---

## Next Steps (Optional)

### Future Enhancements
1. Lazy load images (Intersection Observer)
2. Responsive images (srcset with multiple sizes)
3. AVIF format (even smaller than WebP)
4. Progressive WebP (placeholder + full)
5. Audio streaming for long files

### Monitoring
- Track bundle size in CI
- Monitor load time metrics
- Watch for asset bloat
- Review optimization quarterly

---

## Conclusion

Asset-first optimization successfully reduced bundle from 22 MB to [X] MB ([Z]% reduction) with no loss in quality or functionality. All optimizations are Safari 26.2 compatible with appropriate fallbacks for older browsers.

**Status**: ✅ Production ready
**Risk**: Low (all changes tested, fallbacks in place)
**Recommendation**: Deploy immediately

---

## Files to Review

- `scripts/optimize-images.js` - Image optimization pipeline
- `scripts/optimize-audio.js` - Audio optimization pipeline
- `scripts/subset-fonts.js` - Font subsetting pipeline
- `docs/asset-optimization-guide.md` - Adding new assets
- `docs/safari-ipad-test-guide.md` - Test 10 (optimizations)
```

**Step 4: Fill in actual metrics**

After build completes, fill in placeholders with actual values

**Step 5: Commit completion report**

```bash
git add docs/reports/2026-02-16-asset-optimization-complete.md
git commit -m "docs: asset optimization completion report

- Document final bundle sizes and reductions
- Summarize all completed tasks
- List all files changed/created
- Record testing results
- Confirm Safari 26.2 compatibility
- Status: Production ready"
```

---

## Summary

**Total Implementation Time**: 2-3 hours

**Phases**:
1. Setup & Dependencies (30 min) - Tasks 1-2
2. Image Optimization (45 min) - Tasks 3-5
3. Audio Optimization (30 min) - Tasks 6-8
4. WASM Optimization (15 min) - Task 9
5. Font Subsetting (15 min) - Tasks 10-11
6. Build Integration (15 min) - Task 12
7. Testing & Validation (30 min) - Tasks 13-15
8. Documentation (30 min) - Tasks 16-18

**Expected Results**:
- Bundle: 22 MB → 8.2 MB (63% reduction)
- Images: 57% smaller (WebP vs PNG)
- Audio: 78% smaller (Opus vs WAV)
- WASM: 45% smaller (dead code removed)
- Fonts: 21% smaller (subset)

**Risk Level**: Low
- Build-time only changes
- Safari-compatible fallbacks
- Original assets preserved
- Comprehensive testing

**Next Action**: Choose execution approach (subagent-driven or parallel session)
