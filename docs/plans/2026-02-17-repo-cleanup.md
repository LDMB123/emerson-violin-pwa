# Repo Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove all stale/generated/completed artifacts and restructure docs/ into a clean evergreen guides folder.

**Architecture:** Pure deletion + 2 file moves + .gitignore update. No code changes. No tests needed — verification is `npm test` + `npm run lint` + `npm run build` passing unchanged.

**Tech Stack:** git, npm

---

## Background

**Design doc:** `docs/plans/2026-02-17-repo-cleanup-design.md`

**What we're doing:**
1. Delete 13 root PNG screenshots (4.5 MB)
2. Delete `firebase-debug.log` and `scripts/cleanup-organization.sh`
3. Delete all `docs/plans/` (25 files) and `docs/reports/` (21 files)
4. Delete 6 stale root-level docs
5. Move 2 test guides into `docs/guides/`
6. Update `.gitignore` to cover `firebase-debug.log` and `.playwright-mcp/`

**Final docs/ structure:**
```
docs/
└── guides/
    ├── asset-optimization.md
    ├── safari-ipad-test-guide.md
    └── xcode-simulator-testing.md
```

---

## Task 1: Verify baseline

**Files:** None (read-only verification)

**Step 1: Run tests**

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa
npm test
```

Expected: 497 tests pass, 0 fail.

**Step 2: Note what's currently tracked**

```bash
git ls-files | grep -E "^(.*\.png|firebase-debug\.log|scripts/cleanup|docs/)" | sort
```

Expected: Shows the files we're about to delete. Note the count for reference.

If tests fail: STOP. Report and do not proceed.

---

## Task 2: Delete root-level clutter

**Files:**
- Delete: `current-ui-state.png`
- Delete: `games-bottom-nav.png`
- Delete: `games-view-fixed.png`
- Delete: `games-view.png`
- Delete: `home-bottom-nav.png`
- Delete: `home-with-fixes.png`
- Delete: `pitch-quest-bottom.png`
- Delete: `pitch-quest-clean.png`
- Delete: `pitch-quest-final.png`
- Delete: `pitch-quest-game.png`
- Delete: `pitch-quest-view.png`
- Delete: `slim-css-nav-test.png`
- Delete: `slim-css-test.png`
- Delete: `firebase-debug.log`
- Delete: `scripts/cleanup-organization.sh`

**Step 1: Delete the PNG screenshots**

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa
rm current-ui-state.png games-bottom-nav.png games-view-fixed.png games-view.png \
   home-bottom-nav.png home-with-fixes.png pitch-quest-bottom.png pitch-quest-clean.png \
   pitch-quest-final.png pitch-quest-game.png pitch-quest-view.png \
   slim-css-nav-test.png slim-css-test.png
```

Expected: No output (silent success).

**Step 2: Delete the log file and legacy script**

```bash
rm firebase-debug.log scripts/cleanup-organization.sh
```

Expected: No output.

**Step 3: Verify**

```bash
ls *.png 2>&1
ls firebase-debug.log scripts/cleanup-organization.sh 2>&1
```

Expected: Both show "No such file or directory".

**Step 4: Stage and commit**

```bash
git add -u
git status
```

Expected: 15 deleted files staged (13 PNGs + firebase-debug.log + cleanup-organization.sh). Nothing else.

```bash
git commit -m "$(cat <<'EOF'
chore: remove root PNG screenshots, firebase log, legacy script

Deleted 13 UI test screenshots (4.5 MB), firebase-debug.log runtime
artifact, and scripts/cleanup-organization.sh (unused legacy script).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Delete docs/plans/ and docs/reports/

**Files:**
- Delete: all 25 files in `docs/plans/` (completed implementation plans)
- Delete: all files in `docs/reports/` and `docs/reports/qa/`

**Step 1: Delete docs/plans/**

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa
rm -r docs/plans/
```

Expected: No output.

**Step 2: Delete docs/reports/**

```bash
rm -r docs/reports/
```

Expected: No output.

**Step 3: Verify**

```bash
ls docs/plans/ docs/reports/ 2>&1
```

Expected: Both show "No such file or directory".

**Step 4: Stage and commit**

```bash
git add -u docs/
git status
```

Expected: ~46 deleted files staged (25 plans + 21 reports). Nothing else.

```bash
git commit -m "$(cat <<'EOF'
chore: delete completed docs/plans and docs/reports

All implementation plans and completion reports are preserved in git
history. Removing from working tree to keep docs/ lean.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Delete stale root-level docs and move guides

**Files:**
- Delete: `docs/api-native-tools-audit.md`
- Delete: `docs/chromium-only-files.md`
- Delete: `docs/css-dead-code-analysis.md`
- Delete: `docs/ui-ux-polish-summary.md`
- Delete: `docs/safari-ipad-optimizations-summary.md`
- Delete: `docs/safari-26.2-compatibility-audit.md`
- Move: `docs/safari-ipad-test-guide.md` → `docs/guides/safari-ipad-test-guide.md`
- Move: `docs/xcode-simulator-testing.md` → `docs/guides/xcode-simulator-testing.md`

**Step 1: Delete the stale audit/summary docs**

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa
rm docs/api-native-tools-audit.md \
   docs/chromium-only-files.md \
   docs/css-dead-code-analysis.md \
   docs/ui-ux-polish-summary.md \
   docs/safari-ipad-optimizations-summary.md \
   docs/safari-26.2-compatibility-audit.md
```

Expected: No output.

**Step 2: Move test guides into docs/guides/**

```bash
git mv docs/safari-ipad-test-guide.md docs/guides/safari-ipad-test-guide.md
git mv docs/xcode-simulator-testing.md docs/guides/xcode-simulator-testing.md
```

Expected: No output. Using `git mv` so git tracks the rename (not delete + add).

**Step 3: Verify final docs/ structure**

```bash
find docs/ -type f | sort
```

Expected exactly:
```
docs/guides/asset-optimization.md
docs/guides/safari-ipad-test-guide.md
docs/guides/xcode-simulator-testing.md
```

**Step 4: Stage and commit**

```bash
git add -u docs/
git add docs/guides/
git status
```

Expected: 6 deleted, 2 renamed files. Nothing else.

```bash
git commit -m "$(cat <<'EOF'
chore: clean up docs/ — delete stale audits, move guides

Deleted 6 superseded audit/summary docs. Moved safari-ipad-test-guide.md
and xcode-simulator-testing.md into docs/guides/ alongside asset-optimization.md.

Final docs/ structure: guides/ only (3 evergreen reference files).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Update .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Add missing patterns to .gitignore**

Open `.gitignore` and add these two lines at the end:

```
.playwright-mcp/
firebase-debug.log
```

**Step 2: Verify the additions**

```bash
cat .gitignore
```

Expected: Shows the existing 19 patterns plus the 2 new ones at the bottom.

**Step 3: Test that the patterns work**

```bash
echo "test" > firebase-debug.log
git status
```

Expected: `firebase-debug.log` does NOT appear in untracked files (it's now ignored).

```bash
rm firebase-debug.log
```

**Step 4: Stage and commit**

```bash
git add .gitignore
git status
```

Expected: Only `.gitignore` modified.

```bash
git commit -m "$(cat <<'EOF'
chore: add firebase-debug.log and .playwright-mcp/ to .gitignore

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Final verification

**Files:** None (read-only)

**Step 1: Run tests**

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa
npm test
```

Expected: 497 tests pass, 0 fail.

**Step 2: Run lint**

```bash
npm run lint
```

Expected: No errors.

**Step 3: Verify clean git status**

```bash
git status
```

Expected: "nothing to commit, working tree clean"

**Step 4: Verify docs/ structure**

```bash
find docs/ -type f | sort
```

Expected:
```
docs/guides/asset-optimization.md
docs/guides/safari-ipad-test-guide.md
docs/guides/xcode-simulator-testing.md
```

**Step 5: Verify no PNGs at root**

```bash
ls *.png 2>&1
```

Expected: "No such file or directory"

**Step 6: Check git log**

```bash
git log --oneline -5
```

Expected: Shows the 4 cleanup commits from this plan.

---

## Verification Checklist

- [ ] `npm test` passes (497 tests)
- [ ] `npm run lint` passes
- [ ] `git status` clean
- [ ] No `*.png` files at project root
- [ ] `docs/` contains only `guides/` with 3 files
- [ ] `.gitignore` covers `firebase-debug.log` and `.playwright-mcp/`
