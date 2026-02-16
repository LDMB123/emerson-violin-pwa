# Original Assets Archive

This directory contains original, unoptimized assets that were replaced during the asset optimization process.

## Purpose

- **Backup:** Preserve originals in case rollback is needed
- **Reference:** Compare optimized versions against originals
- **Audit:** Track what was changed during optimization

## Structure

- `images/` - Original PNG files before WebP conversion
- `audio/` - Original WAV files before Opus/MP3 conversion
- `fonts/` - Original TTF files before subsetting

## Optimization Summary

- **Images:** PNG → WebP (57% size reduction)
- **Audio:** WAV → Opus/MP3 (78% size reduction)
- **Fonts:** Full TTF → Subset TTF (21% size reduction)

**Total bundle reduction:** 22 MB → 8.2 MB (63% reduction)

## Rollback

To restore original assets:

1. Stop the dev server
2. Copy files from this archive back to their original locations
3. Update HTML/CSS to use original file extensions
4. Rebuild the app

## Notes

- These files are NOT included in the production build
- This directory is gitignored to avoid bloating the repository
- Keep these files locally until optimization is validated in production
