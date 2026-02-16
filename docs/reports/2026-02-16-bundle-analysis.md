# Bundle Analysis

## Sizes
- Total dist/: 22 MB
- Main JS: 304 KB (55 files)
- panda-core.wasm: 46 KB (gzipped: 20 KB)
- panda-audio.wasm: Not in dist (lazy loaded from public/wasm/)
- Assets: 21.5 MB (images: 21 MB, audio: 2.3 MB, fonts: 48 KB)

## Largest Files
1. mascot-happy.png - 1.0 MB
2. mascot-encourage.png - 981 KB
3. mascot-celebrate.png - 886 KB
4. mascot-focus.png - 884 KB
5. badge_ear_training.png - 774 KB

## Optimization Opportunities
- Code splitting: Already implemented effectively via Vite (55 small chunks, largest 12 KB)
- WASM optimization: Remove unused exports (~21 KB savings, see wasm-audit.md)
- Asset compression: Convert PNG to WebP (~12 MB savings), convert WAV to MP3/Opus (~1.8 MB savings)
- Tree shaking: Already working well (many 100-byte chunks, good granularity)
