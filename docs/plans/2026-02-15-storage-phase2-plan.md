# Rust Storage JSON Utilities Extraction Plan (Phase 2)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract 6 pure JSON/conversion functions from storage.rs to storage_utils.rs with comprehensive unit tests

**Architecture:** Extend Phase 1 pattern - add Category 6 (JSON extraction) and Category 7 (JSON conversion) to storage_utils.rs, following TDD approach with 20 new tests

**Tech Stack:** Rust, wasm-bindgen, serde_json, serde_wasm_bindgen, web-sys

---

## Prerequisites

**Before starting:**
- Phase 1 complete: storage_utils.rs exists with 22 tests passing
- Git worktree ready: `feature/extract-storage-json-utils` branch
- Baseline verification: `cargo test` passes (22 tests)

---

## Task 1: Extract JSON Extraction Helpers

**Files:**
- Modify: `rust/storage_utils.rs` (add Category 6 functions + 6 tests)
- Modify: `rust/storage.rs` (remove `extract_string`, `extract_number`)

### Step 1: Write tests for JSON extraction helpers

Add to `rust/storage_utils.rs` in the `#[cfg(test)]` module, after existing tests:

```rust
// Category 6: JSON Extraction tests
#[test]
fn test_extract_string_valid() {
    let value = json!({"name": "test", "count": 42});
    assert_eq!(extract_string(&value, "name"), Some("test".to_string()));
}

#[test]
fn test_extract_string_missing_key() {
    let value = json!({"name": "test"});
    assert_eq!(extract_string(&value, "missing"), None);
}

#[test]
fn test_extract_string_wrong_type() {
    let value = json!({"count": 42});
    assert_eq!(extract_string(&value, "count"), None);
}

#[test]
fn test_extract_number_valid() {
    let value = json!({"count": 42.5, "name": "test"});
    assert_eq!(extract_number(&value, "count"), Some(42.5));
}

#[test]
fn test_extract_number_integer_coercion() {
    let value = json!({"count": 42});
    assert_eq!(extract_number(&value, "count"), Some(42.0));
}

#[test]
fn test_extract_number_missing_or_wrong_type() {
    let value = json!({"name": "test"});
    assert_eq!(extract_number(&value, "missing"), None);
    assert_eq!(extract_number(&value, "name"), None);
}
```

### Step 2: Run tests to verify they fail

Run: `cargo test extract_string extract_number`
Expected: 6 FAILED with "cannot find function"

### Step 3: Add Category 6 section and implementations

Add to `rust/storage_utils.rs` before the `#[cfg(test)]` module:

```rust
// ============================================================================
// Category 6: JSON Extraction
// ============================================================================

use serde_json::Value as JsonValue;

/// Extracts string value from serde_json::Value by key.
///
/// Returns Some(String) if key exists and value is a string, None otherwise.
pub fn extract_string(value: &JsonValue, key: &str) -> Option<String> {
    match value {
        JsonValue::Object(map) => map.get(key).and_then(|val| val.as_str().map(|v| v.to_string())),
        _ => None,
    }
}

/// Extracts numeric value from serde_json::Value by key.
///
/// Returns Some(f64) if key exists and value is a number, None otherwise.
/// Handles integer coercion via as_f64().
pub fn extract_number(value: &JsonValue, key: &str) -> Option<f64> {
    match value {
        JsonValue::Object(map) => map.get(key).and_then(|val| val.as_f64()),
        _ => None,
    }
}
```

Add import at top of file (after existing imports):

```rust
use serde_json::Value as JsonValue;
```

### Step 4: Run tests to verify they pass

Run: `cargo test extract_string extract_number`
Expected: 6 PASSED

Run: `cargo test` (all tests)
Expected: 28 PASSED (22 existing + 6 new)

### Step 5: Remove old definitions from storage.rs

Find and delete these function definitions in `rust/storage.rs`:

```rust
fn extract_string(value: &JsonValue, key: &str) -> Option<String> {
  match value {
    JsonValue::Object(map) => map.get(key).and_then(|val| val.as_str().map(|v| v.to_string())),
    _ => None,
  }
}

fn extract_number(value: &JsonValue, key: &str) -> Option<f64> {
  match value {
    JsonValue::Object(map) => map.get(key).and_then(|val| val.as_f64()),
    _ => None,
  }
}
```

### Step 6: Verify storage.rs imports work

Run: `cargo test`
Expected: 28 PASSED (imports from storage_utils.rs work correctly)

### Step 7: Commit

```bash
git add rust/storage_utils.rs rust/storage.rs
git commit -m "feat: extract JSON extraction helpers with tests

Extract extract_string and extract_number from storage.rs to
storage_utils.rs Category 6.

Add 6 comprehensive unit tests covering valid keys, missing keys,
wrong types, and integer coercion.

All 28 tests passing (22 existing + 6 new).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Extract JSON Conversion Helpers

**Files:**
- Modify: `rust/storage_utils.rs` (add Category 7 functions + 14 tests)
- Modify: `rust/storage.rs` (remove 4 functions)

### Step 1: Write tests for JSON conversion helpers

Add to `rust/storage_utils.rs` in the `#[cfg(test)]` module, after Category 6 tests:

```rust
// Category 7: JSON Conversion tests
#[test]
fn test_json_number_positive() {
    let num = json_number(42.5);
    assert!(matches!(num, JsonValue::Number(_)));
}

#[test]
fn test_json_number_negative_and_zero() {
    let neg = json_number(-10.0);
    assert!(matches!(neg, JsonValue::Number(_)));
    let zero = json_number(0.0);
    assert!(matches!(zero, JsonValue::Number(_)));
}

#[test]
fn test_json_number_nan() {
    let nan_result = json_number(f64::NAN);
    // Fallback to Number(0) on NaN
    assert!(matches!(nan_result, JsonValue::Number(_)));
}

#[test]
fn test_json_number_infinity() {
    let inf = json_number(f64::INFINITY);
    assert!(matches!(inf, JsonValue::Number(_)));
}

#[test]
fn test_json_from_js_string() {
    let js_str = JsValue::from_str("test");
    let json = json_from_js(&js_str);
    match json {
        JsonValue::String(s) => assert_eq!(s, "test"),
        _ => panic!("Expected JsonValue::String"),
    }
}

#[test]
fn test_json_from_js_number() {
    let js_num = JsValue::from_f64(42.0);
    let json = json_from_js(&js_num);
    match json {
        JsonValue::Number(n) => assert_eq!(n.as_f64(), Some(42.0)),
        _ => panic!("Expected JsonValue::Number"),
    }
}

#[test]
fn test_json_from_js_bool() {
    let js_bool = JsValue::from_bool(true);
    let json = json_from_js(&js_bool);
    match json {
        JsonValue::Bool(b) => assert!(b),
        _ => panic!("Expected JsonValue::Bool"),
    }
}

#[test]
fn test_json_from_js_null() {
    let js_null = JsValue::NULL;
    let json = json_from_js(&js_null);
    assert!(matches!(json, JsonValue::Null));
}

#[test]
fn test_json_to_js_object() {
    let json = json!({"name": "test"});
    let js = json_to_js(&json);
    assert!(js.is_some());
}

#[test]
fn test_json_to_js_all_types() {
    assert!(json_to_js(&json!("string")).is_some());
    assert!(json_to_js(&json!(42)).is_some());
    assert!(json_to_js(&json!(true)).is_some());
    assert!(json_to_js(&JsonValue::Null).is_some());
}

#[test]
fn test_recording_extension_mime_type() {
    use web_sys::Blob;
    let blob = Blob::new().unwrap();
    assert_eq!(recording_extension("audio/webm", &blob), "webm");
    assert_eq!(recording_extension("audio/mp4", &blob), "m4a");
}

#[test]
fn test_recording_extension_plain_ext() {
    use web_sys::Blob;
    let blob = Blob::new().unwrap();
    assert_eq!(recording_extension("webm", &blob), "webm");
    assert_eq!(recording_extension(".mp4", &blob), "mp4");
}

#[test]
fn test_recording_extension_empty_hint() {
    use web_sys::Blob;
    use js_sys::Array;

    let parts = Array::new();
    parts.push(&JsValue::from_str("test"));
    let mut options = web_sys::BlobPropertyBag::new();
    options.type_("audio/webm");
    let blob = Blob::new_with_str_sequence_and_options(&parts, &options).unwrap();

    assert_eq!(recording_extension("", &blob), "webm");
}

#[test]
fn test_recording_extension_fallback() {
    use web_sys::Blob;
    let blob = Blob::new().unwrap(); // Empty MIME type
    assert_eq!(recording_extension("", &blob), "bin");
}
```

### Step 2: Run tests to verify they fail

Run: `cargo test json_number json_from_js json_to_js recording_extension`
Expected: 14 FAILED with "cannot find function"

### Step 3: Add Category 7 section and implementations

Add to `rust/storage_utils.rs` before the `#[cfg(test)]` module:

```rust
// ============================================================================
// Category 7: JSON Conversion
// ============================================================================

/// Converts f64 to serde_json::Value::Number with NaN/Infinity fallback.
///
/// Returns JsonValue::Number(0) if value is NaN or cannot be converted.
pub fn json_number(value: f64) -> JsonValue {
    serde_json::Number::from_f64(value)
        .map(JsonValue::Number)
        .unwrap_or_else(|| JsonValue::Number(serde_json::Number::from(0)))
}

/// Converts wasm_bindgen::JsValue to serde_json::Value.
///
/// Returns JsonValue::Null on conversion failure.
/// Critical for JavaScript → Rust data flow.
pub fn json_from_js(value: &JsValue) -> JsonValue {
    serde_wasm_bindgen::from_value(value.clone()).unwrap_or(JsonValue::Null)
}

/// Converts serde_json::Value to wasm_bindgen::JsValue.
///
/// Returns None on conversion failure.
/// Critical for Rust → JavaScript data flow.
pub fn json_to_js(value: &JsonValue) -> Option<JsValue> {
    serde_wasm_bindgen::to_value(value).ok()
}

/// Determines file extension from format hint or MIME type.
///
/// Priority:
/// 1. If format_hint contains '/', treat as MIME type (use format_from_mime)
/// 2. If format_hint non-empty, treat as extension (strip leading '.')
/// 3. Fallback to blob.type_() MIME type
/// 4. If blob MIME empty, return "bin"
pub fn recording_extension(format_hint: &str, blob: &Blob) -> String {
    if !format_hint.is_empty() {
        if format_hint.contains('/') {
            return format_from_mime(format_hint);
        }
        return format_hint.trim_start_matches('.').to_string();
    }
    let mime = blob.type_();
    if mime.is_empty() {
        "bin".to_string()
    } else {
        format_from_mime(&mime)
    }
}
```

### Step 4: Run tests to verify they pass

Run: `cargo test json_number json_from_js json_to_js recording_extension`
Expected: 14 PASSED

Run: `cargo test` (all tests)
Expected: 42 PASSED (28 existing + 14 new)

### Step 5: Remove old definitions from storage.rs

Find and delete these function definitions in `rust/storage.rs`:

```rust
fn json_number(value: f64) -> JsonValue {
  serde_json::Number::from_f64(value)
    .map(JsonValue::Number)
    .unwrap_or_else(|| JsonValue::Number(serde_json::Number::from(0)))
}

fn json_from_js(value: &JsValue) -> JsonValue {
  serde_wasm_bindgen::from_value(value.clone()).unwrap_or(JsonValue::Null)
}

fn json_to_js(value: &JsonValue) -> Option<JsValue> {
  serde_wasm_bindgen::to_value(value).ok()
}

fn recording_extension(format_hint: &str, blob: &Blob) -> String {
  if !format_hint.is_empty() {
    if format_hint.contains('/') {
      return format_from_mime(format_hint);
    }
    return format_hint.trim_start_matches('.').to_string();
  }
  let mime = blob.type_();
  if mime.is_empty() {
    "bin".to_string()
  } else {
    format_from_mime(&mime)
  }
}
```

### Step 6: Verify all tests still pass

Run: `cargo test`
Expected: 42 PASSED (all imports working correctly)

### Step 7: Rebuild WASM and verify JavaScript tests

Rebuild WASM:
```bash
wasm-pack build --target web --out-dir wasm/panda-core/pkg rust/
```
Expected: Build succeeds, pkg/ directory updated

Run JavaScript tests:
```bash
npm test
```
Expected: All tests PASSED (WASM public API unchanged)

### Step 8: Verify dev build has no console errors

Run dev server:
```bash
npm run dev
```

Open browser to localhost, check console.
Expected: No errors related to storage functions

### Step 9: Run clippy

Run: `cargo clippy`
Expected: No warnings or errors

### Step 10: Commit

```bash
git add rust/storage_utils.rs rust/storage.rs
git commit -m "feat: extract JSON conversion helpers with tests

Extract json_number, json_from_js, json_to_js, and
recording_extension from storage.rs to storage_utils.rs Category 7.

Add 14 comprehensive unit tests covering:
- json_number: positive, negative, zero, NaN, infinity
- json_from_js: string, number, bool, null
- json_to_js: all JsonValue types
- recording_extension: MIME types, extensions, empty hints

All 42 tests passing (28 + 14 new).
WASM rebuild successful.
All JS tests passing.

Phase 2 extraction complete: 6 functions extracted, 20 tests added.
Reduced storage.rs from 2286 to ~2170 lines (-116 lines).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Verification Checklist

After completing both tasks:

- [ ] All 42 Rust unit tests pass (`cargo test`)
- [ ] All JavaScript tests pass (`npm test`)
- [ ] WASM builds without errors (`wasm-pack build`)
- [ ] Dev server runs with no console errors
- [ ] Lint passes (`cargo clippy`)
- [ ] `storage_utils.rs` has 7 categories (1-7), ~750 lines
- [ ] `storage.rs` reduced to ~2170 lines (from 2286)
- [ ] All 6 functions removed from storage.rs
- [ ] All 6 functions added to storage_utils.rs with pub visibility

---

## File Size Expectations

**Before Phase 2:**
- `storage.rs`: 2286 lines
- `storage_utils.rs`: 591 lines

**After Phase 2:**
- `storage.rs`: ~2170 lines (-116 lines)
- `storage_utils.rs`: ~750 lines (+159 lines)

**Total test count:** 42 tests in storage_utils.rs

---

## Common Issues & Solutions

**Issue:** Tests fail with "cannot find value `json!` in this scope"
**Solution:** Add `use serde_json::json;` to test module

**Issue:** `recording_extension` test fails with Blob creation
**Solution:** Use `web_sys::Blob::new()` for simple blobs, `Blob::new_with_str_sequence_and_options()` for MIME type testing

**Issue:** Imports not working after extraction
**Solution:** Verify `use storage_utils::*;` is still at top of storage.rs (should be from Phase 1)

**Issue:** WASM build fails
**Solution:** Check all function signatures match exactly, ensure no duplicate definitions remain in storage.rs

---

## Success Criteria

Phase 2 extraction complete when:
- ✅ 6 functions extracted (2 from Category 6, 4 from Category 7)
- ✅ 20 new unit tests added (42 total)
- ✅ storage.rs reduced by ~116 lines
- ✅ All tests passing (Rust + JavaScript)
- ✅ WASM builds successfully
- ✅ No console errors in dev build
- ✅ Both commits pushed to feature branch
