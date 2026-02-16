# Rust Storage Pure Function Extraction Design

**Date**: 2026-02-15
**Status**: Approved
**Scope**: Extract testable pure logic from `rust/storage.rs` (2504 lines)

## Overview

Extract ~20 pure functions from `rust/storage.rs` into `rust/storage_utils.rs` to maximize testability by separating pure logic from async I/O operations. Follows the same pattern proven successful in JavaScript app-wide extraction (8 modules, 383 new tests).

## Target Module

**Source**: `rust/storage.rs` (2504 lines, 102 functions)
**Destination**: `rust/storage_utils.rs` (~400-500 lines, ~20 pure functions)
**Tests**: `rust/tests/storage_utils_test.rs` (~40 unit tests)

## Architecture

### File Structure

```
rust/
├── storage.rs               # IndexedDB/SQLite operations (async, side effects)
├── storage_utils.rs         # Pure functions (NEW, sync, testable)
├── lib.rs                   # Module declarations (updated)
└── tests/
    └── storage_utils_test.rs  # Rust unit tests (NEW)
```

### Integration

- `storage.rs` imports from `storage_utils.rs`
- WASM bindings unchanged (public API identical)
- JavaScript integration tests verify WASM behavior (no changes needed)

### Hybrid Testing Strategy

**Rust Unit Tests** (`cargo test`)
- Pure logic: path manipulation, format conversion, calculations
- Fast, deterministic, no I/O dependencies
- 40+ tests covering edge cases

**JavaScript Integration Tests** (Vitest)
- WASM bindings and IndexedDB operations
- Existing test suite (no changes needed)
- Verifies end-to-end WASM behavior

## Functions to Extract

### Category 1: Path Utilities (5 functions)

**`idb_fallback_path(store: &str, id: &str) -> String`**
- Creates IDB fallback path: `"idb://{store}/{id}"`
- Pure string formatting

**`is_idb_path(path: &str) -> bool`**
- Checks if path starts with `"idb://"`
- Pure boolean logic

**`idb_key_from_path(path: &str) -> Option<String>`**
- Extracts key from IDB path
- Pure string parsing

**`split_path(path: &str) -> (Option<&str>, &str)`**
- Splits path into directory and filename
- Pure string manipulation

**`sanitize_filename(name: &str) -> String`**
- Removes invalid chars, limits length to 200
- Pure string transformation

### Category 2: Filename Generation (4 functions)

**`recording_filename(id: &str, ext: &str) -> String`**
- Format: `"rec_{id}.{ext}"`
- Pure string formatting

**`recording_extension(format_hint: &str, blob: &Blob) -> String`**
- Determines extension from format/MIME type
- Pure logic (Blob only used for MIME reading)

**`share_filename(id: &str, name: &str) -> String`**
- Format: `"share_{id}_{sanitized_name}"`
- Pure string formatting with sanitization

**`score_filename(id: &str, name: &str) -> String`**
- Format: `"score_{id}_{sanitized_name}"`
- Pure string formatting with sanitization

### Category 3: Format Conversion (5 functions)

**`format_from_mime(mime: &str) -> String`**
- Extracts format string from MIME type
- Pure string parsing

**`recording_to_value(recording: &Recording) -> Result<JsValue, JsValue>`**
- Serializes Recording to JsValue
- Pure data transformation

**`recording_from_value(value: &JsValue) -> Option<Recording>`**
- Deserializes JsValue to Recording
- Pure data parsing

**`share_item_from_value(value: &JsValue) -> Option<ShareItem>`**
- Deserializes JsValue to ShareItem
- Pure data parsing

**`key_to_string(key: &JsValue) -> Option<String>`**
- Converts JsValue key to String
- Pure type conversion

### Category 4: Calculations & Validation (2 functions)

**`sum_opfs_bytes(recordings: &[Recording]) -> f64`**
- Sums recording sizes, skips IDB paths
- Pure calculation (filters and reduces)

**`migration_ready(summary: &MigrationSummary) -> bool`**
- Checks if migration can proceed
- Pure validation logic

### Category 5: JsValue Extraction Helpers (4 functions)

**`js_string_any(value: &JsValue, keys: &[&str]) -> Option<String>`**
- Extracts string from first matching key
- Pure data extraction

**`js_number_any(value: &JsValue, keys: &[&str]) -> Option<f64>`**
- Extracts number from first matching key
- Pure data extraction

**`js_date_any(value: &JsValue, keys: &[&str]) -> Option<f64>`**
- Extracts timestamp from first matching key
- Pure data extraction

**`js_blob_any(value: &JsValue) -> Option<Blob>`**
- Extracts Blob from JsValue
- Pure type conversion

## Testing Strategy

### Rust Unit Tests (40+ tests)

**Path utilities (10 tests)**
- `idb_fallback_path`: valid inputs, empty strings, special chars
- `is_idb_path`: IDB paths, regular paths, edge cases
- `idb_key_from_path`: valid/invalid paths, malformed input
- `split_path`: various path formats (with/without directory)
- `sanitize_filename`: special chars, Unicode, length limits

**Filename generation (8 tests)**
- `recording_filename`: various IDs and extensions
- `recording_extension`: format hints, MIME types, fallbacks
- `share_filename` and `score_filename`: edge cases, sanitization
- Length limits and invalid characters

**Format conversion (10 tests)**
- `format_from_mime`: common MIME types (audio/webm, video/mp4, etc.)
- `recording_to_value` / `recording_from_value`: round-trip testing
- `share_item_from_value`: valid/invalid JsValue structures
- `key_to_string`: various JsValue types (string, number, undefined)

**Calculations (5 tests)**
- `sum_opfs_bytes`: empty vec, IDB paths only, mixed recordings
- `migration_ready`: all MigrationSummary state combinations

**JsValue helpers (7 tests)**
- All four `js_*_any` functions
- Missing keys, wrong types, null/undefined handling
- Multiple key fallback logic

### JavaScript Integration Tests

**Existing Vitest suite** (no changes needed)
- WASM bindings work end-to-end
- IndexedDB operations with real browser APIs
- Public API unchanged, tests continue to pass

### Test Patterns

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_idb_fallback_path() {
        assert_eq!(idb_fallback_path("sessions", "abc123"), "idb://sessions/abc123");
        assert_eq!(idb_fallback_path("", ""), "idb:///");
    }

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(sanitize_filename("test<>file"), "test__file");
        let long = "a".repeat(250);
        assert_eq!(sanitize_filename(&long).len(), 200);
    }
}
```

## Implementation Workflow

### Execution: Subagent-Driven Development

**Prerequisites:**
- Git worktree: `feature/extract-storage-utils` branch
- Rust toolchain: `cargo test` works
- WASM tools: `wasm-pack` available

### Tasks

**Task 1: Create storage_utils.rs skeleton**
- Create `rust/storage_utils.rs`
- Add `mod storage_utils;` to `lib.rs`
- Set up module structure with category comments

**Task 2: Extract path utilities**
- Write tests for 5 path functions
- Extract from storage.rs
- Update storage.rs imports: `use crate::storage_utils::*;`
- Verify `cargo test` passes

**Task 3: Extract filename generation**
- Write tests for 4 filename functions
- Extract and refactor
- Update storage.rs imports
- Verify tests pass

**Task 4: Extract format conversion**
- Write tests for 5 conversion functions
- Extract serialization logic
- Update storage.rs
- Verify tests pass

**Task 5: Extract calculations & JsValue helpers**
- Write tests for remaining 6 functions
- Extract pure logic
- Update all imports
- Verify complete test suite passes

**Task 6: Integration verification**
- Run `cargo test` (all 40+ tests pass)
- Rebuild WASM: `wasm-pack build --target web --out-dir wasm/panda-core/pkg`
- Run JS tests: `npm test`
- Verify no console errors in dev build

### Quality Gates

- All Rust tests pass (`cargo test`)
- All JS tests pass (`npm test`)
- WASM builds successfully (`wasm-pack build`)
- No console errors in dev build
- Lint passes (`cargo clippy`)

## Success Criteria

- [x] Design approved
- [ ] `storage_utils.rs` created (~400-500 lines)
- [ ] `tests/storage_utils_test.rs` created (40+ tests)
- [ ] All Rust tests passing
- [ ] WASM public API unchanged
- [ ] All JS tests passing
- [ ] No regressions in dev/prod builds
- [ ] Design doc committed
- [ ] Implementation plan created
