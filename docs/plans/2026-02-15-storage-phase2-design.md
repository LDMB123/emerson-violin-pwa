# Rust Storage JSON Utilities Extraction Design (Phase 2)

**Date**: 2026-02-15
**Status**: Approved
**Scope**: Extract 6 remaining pure functions from `rust/storage.rs` (Phase 2 of extraction)

## Overview

Extract 6 remaining pure JSON/JsValue conversion functions from `rust/storage.rs` into `rust/storage_utils.rs`. This completes the pure function extraction pattern started in Phase 1, focusing on data transformation logic that's currently untested.

**Phase 1 Completed:**
- Extracted 19 pure functions (path utilities, filename generation, format conversion, calculations, JsValue helpers)
- Created `storage_utils.rs` with 22 comprehensive tests
- Reduced `storage.rs` from 2507 to 2286 lines (-221 lines, -8.8%)

**Phase 2 Scope:**
- Extract 6 JSON/conversion functions
- Add 20 new unit tests (total: 42 tests in storage_utils.rs)
- Reduce storage.rs by ~100-120 lines (to ~2170 lines)

## Target Module

**Source**: `rust/storage.rs` (2286 lines currently, 83 functions remaining)
**Destination**: `rust/storage_utils.rs` (extend from 591 to ~750 lines)
**Tests**: Add 20 unit tests to existing inline `#[cfg(test)]` module

## Architecture

### Why Phase 2

These 6 functions are:
- Pure data transformation (no I/O, no mutations)
- Currently untested and error-prone (JSON parsing edge cases)
- Clear input/output contracts
- Used throughout storage.rs but isolated logic
- Follow exact same extraction pattern as successful Phase 1

### Integration

- `storage.rs` imports from `storage_utils.rs` (already set up in Phase 1)
- WASM bindings unchanged (public API identical)
- JavaScript integration tests unchanged (no changes needed)

## Functions to Extract

### Category 6: JSON Extraction (2 functions)

**`extract_string(value: &JsonValue, key: &str) -> Option<String>`**
- Extracts string value from `serde_json::Value` by key
- Pure pattern matching: `JsonValue::Object(map) -> map.get(key) -> as_str()`
- Returns `None` for missing keys or wrong types
- Currently used in SQLite data parsing (untested)

**`extract_number(value: &JsonValue, key: &str) -> Option<f64>`**
- Extracts numeric value from `serde_json::Value` by key
- Pure pattern matching: `JsonValue::Object(map) -> map.get(key) -> as_f64()`
- Returns `None` for missing keys or wrong types
- Handles integer coercion via `as_f64()`

### Category 7: JSON Conversion (4 functions)

**`json_number(value: f64) -> JsonValue`**
- Converts `f64` to `serde_json::Value::Number`
- Pure data transformation with fallback
- Handles NaN/Infinity edge cases (fallback to `Number(0)`)
- Uses `serde_json::Number::from_f64()` with error handling

**`json_from_js(value: &JsValue) -> JsonValue`**
- Converts `wasm_bindgen::JsValue` to `serde_json::Value`
- Pure serde conversion: `serde_wasm_bindgen::from_value()`
- Returns `JsonValue::Null` on conversion failure
- Critical for JavaScript → Rust data flow

**`json_to_js(value: &JsonValue) -> Option<JsValue>`**
- Converts `serde_json::Value` to `wasm_bindgen::JsValue`
- Pure serde conversion: `serde_wasm_bindgen::to_value()`
- Returns `None` on conversion failure
- Critical for Rust → JavaScript data flow

**`recording_extension(format_hint: &str, blob: &Blob) -> String`**
- Determines file extension from format hint or MIME type
- Uses already-extracted `format_from_mime()` function
- Pure logic (Blob only used for read-only MIME access via `blob.type_()`)
- Handles format hints as MIME types or extensions

## Testing Strategy

### Rust Unit Tests (20 new tests, 42 total)

**JSON extraction (6 tests)**
- `extract_string`: valid key, missing key, wrong type (number instead of string), nested objects
- `extract_number`: valid number, integer coercion, missing key, wrong type (string instead of number), null values

**JSON conversion (10 tests)**
- `json_number`: positive numbers, negative numbers, zero, NaN handling, infinity handling
- `json_from_js`: valid objects, arrays, primitives (string/number/bool), null/undefined, conversion errors
- `json_to_js`: all JsonValue variants (object/array/string/number/bool/null), conversion success/failure

**Recording extension (4 tests)**
- Format hint with MIME type (e.g., "audio/webm")
- Format hint as extension (e.g., "webm", "mp4")
- Empty format hint → fallback to blob MIME type
- Edge cases: unknown MIME types, empty MIME, blob.type() failure

### Test Patterns

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_extract_string() {
        let value = json!({"name": "test", "count": 42});
        assert_eq!(extract_string(&value, "name"), Some("test".to_string()));
        assert_eq!(extract_string(&value, "missing"), None);
        assert_eq!(extract_string(&value, "count"), None); // wrong type
    }

    #[test]
    fn test_extract_number() {
        let value = json!({"count": 42, "name": "test"});
        assert_eq!(extract_number(&value, "count"), Some(42.0));
        assert_eq!(extract_number(&value, "missing"), None);
        assert_eq!(extract_number(&value, "name"), None); // wrong type
    }

    #[test]
    fn test_json_number() {
        let num = json_number(42.5);
        assert!(matches!(num, JsonValue::Number(_)));

        // Edge cases
        let nan_result = json_number(f64::NAN);
        assert!(matches!(nan_result, JsonValue::Number(_))); // fallback to 0
    }

    #[test]
    fn test_json_from_js() {
        let js_obj = JsValue::from_str("test");
        let json = json_from_js(&js_obj);
        assert!(matches!(json, JsonValue::String(_)));

        let js_null = JsValue::NULL;
        let json_null = json_from_js(&js_null);
        assert!(matches!(json_null, JsonValue::Null));
    }

    #[test]
    fn test_recording_extension() {
        assert_eq!(recording_extension("audio/webm", &mock_blob()), "webm");
        assert_eq!(recording_extension("webm", &mock_blob()), "webm");
        assert_eq!(recording_extension("", &blob_with_mime("audio/mp4")), "m4a");
    }
}
```

### JavaScript Integration Tests

**Existing Vitest suite** (no changes needed)
- WASM bindings work end-to-end
- Public API unchanged
- Tests continue to pass

## Implementation Workflow

### Execution: Subagent-Driven Development

**Prerequisites:**
- Git worktree: `feature/extract-storage-json-utils` branch
- Rust toolchain: `cargo test` works
- WASM tools: `wasm-pack` available
- Phase 1 complete: `storage_utils.rs` exists with 22 tests passing

### Tasks

**Task 1: Extract JSON extraction helpers**
- Write tests for `extract_string` and `extract_number` (6 tests)
- Extract functions from storage.rs
- Add to Category 6 section in storage_utils.rs
- Update storage.rs: remove old definitions, verify imports
- Run `cargo test` → all 28 tests pass (22 existing + 6 new)
- Commit: "feat: extract JSON extraction helpers with tests"

**Task 2: Extract JSON conversion helpers**
- Write tests for `json_number`, `json_from_js`, `json_to_js`, `recording_extension` (14 tests)
- Extract functions from storage.rs
- Add to Category 7 section in storage_utils.rs
- Update storage.rs: remove old definitions
- Run `cargo test` → all 42 tests pass (28 + 14 new)
- Rebuild WASM: `wasm-pack build --target web --out-dir wasm/panda-core/pkg`
- Run JS tests: `npm test`
- Verify no console errors in dev build
- Commit: "feat: extract JSON conversion helpers with tests"

### Quality Gates

- All 42 Rust tests pass (`cargo test`)
- All JS tests pass (`npm test`)
- WASM builds successfully (`wasm-pack build`)
- No console errors in dev build
- Lint passes (`cargo clippy`)

### File Structure After Phase 2

```
rust/
├── storage.rs               # ~2170 lines (from 2286, -116 lines)
│   └── Async I/O operations, IndexedDB, SQLite
├── storage_utils.rs         # ~750 lines (from 591, +159 lines)
│   ├── Category 1: Path Utilities (5 functions)
│   ├── Category 2: Filename Generation (3 functions)
│   ├── Category 3: Format Conversion (5 functions)
│   ├── Category 4: Calculations (2 functions)
│   ├── Category 5: JsValue Helpers (4 functions)
│   ├── Category 6: JSON Extraction (2 functions) ← NEW
│   ├── Category 7: JSON Conversion (4 functions) ← NEW
│   └── #[cfg(test)] mod tests (42 tests total)
└── lib.rs                   # Module declarations (unchanged)
```

## Success Criteria

- [x] Design approved
- [ ] 6 functions extracted to storage_utils.rs
- [ ] 20 new unit tests added (42 total)
- [ ] All Rust tests passing
- [ ] WASM public API unchanged
- [ ] All JS tests passing
- [ ] No regressions in dev/prod builds
- [ ] storage.rs reduced by ~100-120 lines
- [ ] Design doc committed
- [ ] Implementation plan created

## Phase 2 vs Phase 1 Comparison

| Metric | Phase 1 | Phase 2 | Total |
|--------|---------|---------|-------|
| Functions extracted | 19 | 6 | 25 |
| Tests added | 22 | 20 | 42 |
| Lines removed from storage.rs | 221 | ~116 | ~337 |
| Lines in storage_utils.rs | 591 | ~750 | ~750 |
| Categories | 5 | 2 | 7 |

**Combined impact:** Reduce storage.rs from 2507 to ~2170 lines (-13.4%), with all pure logic fully tested.
