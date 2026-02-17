# Remove Orphaned rust/ Dead Code — Design

**Date:** 2026-02-17
**Status:** Approved

## Problem

The `rust/` directory contains 6 Rust source files (4,276 lines total) that are dead code:

| File | Lines |
|---|---|
| `rust/storage.rs` | 2,237 |
| `rust/storage_utils.rs` | 829 |
| `rust/score_following.rs` | 587 |
| `rust/ml_infer.rs` | 278 |
| `rust/db_client.rs` | 228 |
| `rust/db_worker.rs` | 117 |

**Why they are dead code:**
- No `lib.rs` exists in `rust/` — files are not part of any Cargo crate
- `wasm/Cargo.toml` workspace only has `panda-audio` and `panda-core`; `rust/` is not a member
- Files reference 8 modules (`dom`, `utils`, `state`, `db_messages`, `db_schema`, `storage_pressure`, `ml`, `pdf_render`, `score_library`) that do not exist anywhere in the project
- No JS/TS in `src/` imports from `rust/` directly
- The app's actual storage layer is `src/persistence/storage.js` (IndexedDB)

## Decision

Delete all 6 files in `rust/`. YAGNI — the storage functionality is fully implemented in JS.

## What Stays Untouched

- `wasm/panda-audio/` and `wasm/panda-core/` — both WASM crates remain as-is
- `src/persistence/storage.js` — the real storage layer
- Everything else in the project

## Verification

After deletion:
- `cargo build` in `wasm/` still succeeds
- `npm test` still passes (497 tests)
- `npm run build` still succeeds
