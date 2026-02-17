# Repo Cleanup — Design

**Date:** 2026-02-17
**Status:** Approved

## Goal

Remove all stale/generated/completed artifacts from the repo and restructure docs/ into a clean evergreen reference folder.

## What Gets Deleted

### Root-level clutter
- 13 PNG screenshots (4.5 MB total): `current-ui-state.png`, `games-bottom-nav.png`, `games-view-fixed.png`, `games-view.png`, `home-bottom-nav.png`, `home-with-fixes.png`, `pitch-quest-bottom.png`, `pitch-quest-clean.png`, `pitch-quest-final.png`, `pitch-quest-game.png`, `pitch-quest-view.png`, `slim-css-nav-test.png`, `slim-css-test.png`
- `firebase-debug.log` (39 KB runtime artifact)

### Scripts
- `scripts/cleanup-organization.sh` — unused legacy script, not referenced in any npm script

### docs/plans/ (all 25 files — completed work, preserved in git history)

### docs/reports/ (all files)
- 17 root report files (2026-02-16 completion reports)
- 4 qa/ subdirectory files

### Stale/superseded docs/
- `docs/api-native-tools-audit.md`
- `docs/chromium-only-files.md`
- `docs/css-dead-code-analysis.md`
- `docs/ui-ux-polish-summary.md`
- `docs/safari-ipad-optimizations-summary.md`
- `docs/safari-26.2-compatibility-audit.md` (duplicate of a report)

## What Stays / Moves

### docs/ final structure
```
docs/
└── guides/
    ├── asset-optimization.md       (keep in place)
    ├── safari-ipad-test-guide.md   (move from docs/ root)
    └── xcode-simulator-testing.md  (move from docs/ root)
```

## .gitignore Additions
- `firebase-debug.log`
- `.playwright-mcp/`

## Verification
- `git status` clean after commit
- `npm test` still passes (497 tests)
- `npm run lint` passes
- `npm run build` succeeds
