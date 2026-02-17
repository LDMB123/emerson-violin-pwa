# Remove Orphaned rust/ Dead Code Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Delete 6 orphaned Rust files in `rust/` that are dead code never compiled by any Cargo crate.

**Architecture:** Pure deletion — no code changes required anywhere else. The files reference modules that don't exist, are not part of the Cargo workspace, and are fully superseded by `src/persistence/storage.js`. Verification confirms existing WASM crates and JS tests are unaffected.

**Tech Stack:** npm, Cargo (wasm workspace), git

---

## Background (read before starting)

The `rust/` directory contains 6 `.rs` files (4,276 lines total). They are dead code:
- No `lib.rs` exists in `rust/` — they belong to no Cargo crate
- `wasm/Cargo.toml` workspace only has `panda-audio` and `panda-core` — `rust/` is not a member
- They reference 8 modules that do not exist (`dom`, `utils`, `state`, `db_messages`, `db_schema`, `storage_pressure`, `ml`, `pdf_render`, `score_library`)
- Nothing in `src/` imports them
- Real storage layer: `src/persistence/storage.js`

**Design doc:** `docs/plans/2026-02-17-remove-orphaned-rust-storage-design.md`

---

## Task 1: Verify baseline — tests and build pass before touching anything

**Files:** None (verification only)

**Step 1: Run the full unit test suite**

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa
npm test
```

Expected: All tests pass. Should see output like `497 tests passed`.

If tests fail: STOP. Do not proceed until tests pass. Investigate failures.

**Step 2: Verify WASM workspace compiles**

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/wasm
cargo build
```

Expected: Compiles successfully with no errors. May show warnings — that's fine.

If cargo is not installed or build fails: STOP and report to user.

---

## Task 2: Delete the orphaned rust/ files

**Files:**
- Delete: `rust/storage.rs`
- Delete: `rust/storage_utils.rs`
- Delete: `rust/db_client.rs`
- Delete: `rust/db_worker.rs`
- Delete: `rust/ml_infer.rs`
- Delete: `rust/score_following.rs`

**Step 1: Delete all 6 files**

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa
rm rust/storage.rs rust/storage_utils.rs rust/db_client.rs rust/db_worker.rs rust/ml_infer.rs rust/score_following.rs
```

Expected: No output (silent success).

**Step 2: Check if rust/ directory is now empty**

```bash
ls rust/
```

Expected: Empty output (no files remaining). If any `.rs` files remain, delete them too.

**Step 3: Remove the now-empty rust/ directory**

```bash
rmdir rust/
```

Expected: No output. If `rmdir` fails because the directory is not empty, use `ls rust/` to see what's left and investigate before deleting.

---

## Task 3: Verify nothing broke

**Files:** None (verification only)

**Step 1: Run unit tests again**

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa
npm test
```

Expected: Same number of tests pass as in Task 1. Zero failures.

**Step 2: Verify WASM still compiles**

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa/wasm
cargo build
```

Expected: Compiles successfully. Same result as Task 1.

**Step 3: Run lint**

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa
npm run lint
```

Expected: No lint errors.

---

## Task 4: Commit

**Files:**
- Commit: deleted `rust/storage.rs`, `rust/storage_utils.rs`, `rust/db_client.rs`, `rust/db_worker.rs`, `rust/ml_infer.rs`, `rust/score_following.rs`

**Step 1: Stage the deletions**

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa
git add -u rust/
```

The `-u` flag stages deletions of tracked files.

**Step 2: Verify what's staged**

```bash
git status
```

Expected: 6 deleted files staged. Nothing else modified.

**Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore: remove orphaned rust/ dead code

6 Rust files in rust/ were never compiled by any Cargo crate and
reference 8 modules that don't exist. Storage is handled by
src/persistence/storage.js. See docs/plans/2026-02-17-remove-orphaned-rust-storage-design.md.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

Expected: Commit succeeds, shows 6 files deleted.

---

## Verification Checklist

- [ ] `npm test` passes (same count as before)
- [ ] `cargo build` in `wasm/` succeeds
- [ ] `npm run lint` passes
- [ ] `git log --oneline -1` shows the commit
- [ ] `ls rust/` returns "No such file or directory"
