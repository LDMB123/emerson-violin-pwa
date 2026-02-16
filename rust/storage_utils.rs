// rust/storage_utils.rs

use serde_json::Value as JsonValue;
use wasm_bindgen::JsValue;
use web_sys::Blob;

// Re-export types from storage.rs that utils need
use super::{MigrationSummary, Recording, ShareItem};

// ============================================================================
// Category 1: Path Utilities
// ============================================================================

/// Generate IDB fallback path: "idb://store/id"
pub fn idb_fallback_path(store: &str, id: &str) -> String {
    format!("idb://{}/{}", store, id)
}

/// Check if path starts with "idb://"
pub fn is_idb_path(path: &str) -> bool {
    path.starts_with("idb://")
}

/// Extract key from IDB path: "idb://store/key" → Some("key")
pub fn idb_key_from_path(path: &str) -> Option<String> {
    if !path.starts_with("idb://") {
        return None;
    }
    let after_prefix = &path[6..]; // Skip "idb://"
    let slash_idx = after_prefix.find('/')?;
    let key = &after_prefix[slash_idx + 1..];
    if key.is_empty() {
        return None;
    }
    Some(key.to_string())
}

/// Split path into (directory, filename)
pub fn split_path(path: &str) -> (Option<&str>, &str) {
    match path.rfind('/') {
        Some(idx) => (Some(&path[..idx]), &path[idx + 1..]),
        None => (None, path),
    }
}

/// Replace invalid filename characters with underscores
///
/// Replaces: / \ : * ? " < > |
pub fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => c,
        })
        .collect()
}

// ============================================================================
// Category 2: Filename Generation
// ============================================================================

/// Generate recording filename: "rec_{id}.{ext}"
pub fn recording_filename(id: &str, ext: &str) -> String {
    format!("rec_{}.{}", id, ext)
}

/// Generate share filename: "share_{id}_{sanitized_name}"
pub fn share_filename(id: &str, name: &str) -> String {
    let sanitized = sanitize_filename(name);
    format!("share_{}_{}", id, sanitized)
}

/// Generate score filename: "score_{id}_{sanitized_name}"
pub fn score_filename(id: &str, name: &str) -> String {
    let sanitized = sanitize_filename(name);
    format!("score_{}_{}", id, sanitized)
}

// ============================================================================
// Category 3: Format Conversion
// ============================================================================

/// Extract file extension from MIME type
pub fn format_from_mime(mime: &str) -> String {
    if mime.contains("webm") {
        "webm"
    } else if mime.contains("mp4") {
        if mime.starts_with("audio/") {
            "m4a"
        } else {
            "mp4"
        }
    } else if mime.contains("mpeg") {
        "mp3"
    } else if mime.contains("wav") {
        "wav"
    } else if mime.contains("ogg") {
        "ogg"
    } else {
        "bin"
    }
    .to_string()
}

/// Convert Recording to JsValue object
///
/// # Errors
///
/// Returns `Err(JsValue)` if any `Reflect::set` operation fails,
/// which can occur if the object is frozen or property definition fails.
pub fn recording_to_value(recording: &Recording) -> Result<JsValue, JsValue> {
    let obj = js_sys::Object::new();
    js_sys::Reflect::set(&obj, &"id".into(), &recording.id.clone().into())?;
    js_sys::Reflect::set(&obj, &"createdAt".into(), &recording.created_at.into())?;
    js_sys::Reflect::set(
        &obj,
        &"durationSeconds".into(),
        &recording.duration_seconds.into(),
    )?;
    js_sys::Reflect::set(
        &obj,
        &"mimeType".into(),
        &recording.mime_type.clone().into(),
    )?;
    js_sys::Reflect::set(&obj, &"sizeBytes".into(), &recording.size_bytes.into())?;
    js_sys::Reflect::set(&obj, &"format".into(), &recording.format.clone().into())?;

    if let Some(ref path) = recording.opfs_path {
        js_sys::Reflect::set(&obj, &"opfsPath".into(), &path.clone().into())?;
    }
    if let Some(ref profile_id) = recording.profile_id {
        js_sys::Reflect::set(&obj, &"profileId".into(), &profile_id.clone().into())?;
    }
    if let Some(ref blob) = recording.blob {
        js_sys::Reflect::set(&obj, &"blob".into(), blob)?;
    }

    Ok(obj.into())
}

/// Convert JsValue object to Recording
pub fn recording_from_value(value: &JsValue) -> Option<Recording> {
    let id = js_string_any(value, &["id"])?;
    let created_at = js_number_any(value, &["createdAt", "created_at"])?;
    let duration_seconds =
        js_number_any(value, &["durationSeconds", "duration_seconds"]).unwrap_or(0.0);
    let mime_type = js_string_any(value, &["mimeType", "mime_type"])
        .unwrap_or_else(|| "audio/webm".to_string());
    let size_bytes = js_number_any(value, &["sizeBytes", "size_bytes"]).unwrap_or(0.0);
    let format = js_string_any(value, &["format"]).unwrap_or_else(|| "webm".to_string());
    let opfs_path = js_string_any(value, &["opfsPath", "opfs_path"]);
    let profile_id = js_string_any(value, &["profileId", "profile_id"]);
    let blob = js_blob_any(value);

    Some(Recording {
        id,
        created_at,
        duration_seconds,
        mime_type,
        size_bytes,
        format,
        opfs_path,
        profile_id,
        blob,
    })
}

/// Convert JsValue object to ShareItem
pub fn share_item_from_value(value: &JsValue) -> Option<ShareItem> {
    let id = js_string_any(value, &["id"])?;
    let name = js_string_any(value, &["name"]).unwrap_or_else(|| "Shared File".to_string());
    let size = js_number_any(value, &["size"]).unwrap_or(0.0);
    let mime = js_string_any(value, &["type", "mime"])
        .unwrap_or_else(|| "application/octet-stream".to_string());
    let created_at =
        js_date_any(value, &["lastModified", "created_at"]).unwrap_or_else(|| js_sys::Date::now());
    let blob = js_blob_any(value);

    Some(ShareItem {
        id,
        name,
        size,
        mime,
        created_at,
        blob,
    })
}

/// Convert JsValue key to String
pub fn key_to_string(key: &JsValue) -> Option<String> {
    if let Some(s) = key.as_string() {
        return Some(s);
    }
    if let Some(n) = key.as_f64() {
        return Some(n.to_string());
    }
    None
}

// ============================================================================
// Category 4: Calculations & Validation
// ============================================================================

/// Sum size bytes for recordings with OPFS paths (excluding IDB)
pub fn sum_opfs_bytes(recordings: &[Recording]) -> f64 {
    recordings
        .iter()
        .filter_map(|rec| {
            let path = rec.opfs_path.as_ref()?;
            if is_idb_path(path) {
                return None;
            }
            let size = if rec.size_bytes > 0.0 {
                rec.size_bytes
            } else {
                rec.blob.as_ref().map(|b| b.size() as f64).unwrap_or(0.0)
            };
            Some(size)
        })
        .sum()
}

/// Check if migration is in progress
///
/// Returns true only when migration has started but not yet completed.
/// This is useful for determining if migration operations should continue.
///
/// # Arguments
///
/// * `summary` - The migration summary to check
///
/// # Returns
///
/// * `true` - Migration is actively in progress (started=true, completed=false)
/// * `false` - Migration hasn't started or is already completed
pub fn is_migration_in_progress(summary: &MigrationSummary) -> bool {
    summary.started && !summary.completed
}

// ============================================================================
// Category 5: JsValue Extraction Helpers
// ============================================================================

/// Extract string from JsValue by trying multiple keys
///
/// Iterates through the provided keys in order, attempting to extract a string
/// value from each field. Returns the first successful match.
///
/// # Arguments
///
/// * `value` - The JsValue object to extract from
/// * `keys` - Array of field names to try (e.g., `&["camelCase", "snake_case"]`)
///
/// # Returns
///
/// * `Some(String)` - First non-null, non-undefined string field found
/// * `None` - If all keys are missing, null, undefined, or not strings
///
/// # Example
///
/// ```rust
/// // Try both camelCase and snake_case variants
/// let id = js_string_any(value, &["profileId", "profile_id"]);
/// ```
pub fn js_string_any(value: &JsValue, keys: &[&str]) -> Option<String> {
    for key in keys {
        if let Ok(field) = js_sys::Reflect::get(value, &(*key).into()) {
            if !field.is_null() && !field.is_undefined() {
                if let Some(s) = field.as_string() {
                    return Some(s);
                }
            }
        }
    }
    None
}

/// Extract number from JsValue by trying multiple keys
///
/// Iterates through the provided keys in order, attempting to extract a numeric
/// value from each field. Returns the first successful match.
///
/// # Arguments
///
/// * `value` - The JsValue object to extract from
/// * `keys` - Array of field names to try (e.g., `&["sizeBytes", "size_bytes"]`)
///
/// # Returns
///
/// * `Some(f64)` - First non-null, non-undefined numeric field found
/// * `None` - If all keys are missing, null, undefined, or not numbers
///
/// # Example
///
/// ```rust
/// // Try both camelCase and snake_case variants
/// let size = js_number_any(value, &["sizeBytes", "size_bytes"]).unwrap_or(0.0);
/// ```
pub fn js_number_any(value: &JsValue, keys: &[&str]) -> Option<f64> {
    for key in keys {
        if let Ok(field) = js_sys::Reflect::get(value, &(*key).into()) {
            if !field.is_null() && !field.is_undefined() {
                if let Some(n) = field.as_f64() {
                    return Some(n);
                }
            }
        }
    }
    None
}

/// Extract date (as timestamp) from JsValue by trying multiple keys
///
/// Iterates through the provided keys in order, attempting to extract a timestamp
/// or Date object from each field. Handles both numeric timestamps (f64) and
/// JavaScript Date objects, converting Date objects to milliseconds since epoch.
///
/// # Arguments
///
/// * `value` - The JsValue object to extract from
/// * `keys` - Array of field names to try (e.g., `&["createdAt", "created_at"]`)
///
/// # Returns
///
/// * `Some(f64)` - First timestamp found (either as number or Date.getTime())
/// * `None` - If all keys are missing, null, undefined, or not dates/numbers
///
/// # Example
///
/// ```rust
/// // Try both camelCase and snake_case variants, with Date fallback
/// let created = js_date_any(value, &["createdAt", "created_at"])
///     .unwrap_or_else(|| js_sys::Date::now());
/// ```
pub fn js_date_any(value: &JsValue, keys: &[&str]) -> Option<f64> {
    for key in keys {
        if let Ok(field) = js_sys::Reflect::get(value, &(*key).into()) {
            if !field.is_null() && !field.is_undefined() {
                if let Some(n) = field.as_f64() {
                    return Some(n);
                }
                if field.is_instance_of::<js_sys::Date>() {
                    if let Ok(date) = field.dyn_into::<js_sys::Date>() {
                        return Some(date.get_time());
                    }
                }
            }
        }
    }
    None
}

/// Extract Blob from JsValue "blob" field
///
/// Attempts to extract a Blob object from the "blob" field of a JsValue.
/// This is commonly used when deserializing Recording or ShareItem objects
/// that contain binary data.
///
/// # Arguments
///
/// * `value` - The JsValue object to extract from
///
/// # Returns
///
/// * `Some(Blob)` - If "blob" field exists and is a valid Blob object
/// * `None` - If "blob" field is missing, null, undefined, or not a Blob
///
/// # Example
///
/// ```rust
/// // Extract blob from recording object
/// let blob = js_blob_any(value);
/// ```
pub fn js_blob_any(value: &JsValue) -> Option<Blob> {
    if let Ok(blob_field) = js_sys::Reflect::get(value, &"blob".into()) {
        if !blob_field.is_null() && !blob_field.is_undefined() {
            if let Ok(blob) = blob_field.dyn_into::<Blob>() {
                return Some(blob);
            }
        }
    }
    None
}

// ============================================================================
// Category 6: JSON Extraction
// ============================================================================

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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_idb_fallback_path_basic() {
        let path = idb_fallback_path("recordings", "rec123");
        assert_eq!(path, "idb://recordings/rec123");
    }

    #[test]
    fn test_idb_fallback_path_special_chars() {
        let path = idb_fallback_path("my-store", "id/with/slashes");
        assert_eq!(path, "idb://my-store/id/with/slashes");
    }

    #[test]
    fn test_is_idb_path_true() {
        assert!(is_idb_path("idb://recordings/123"));
    }

    #[test]
    fn test_is_idb_path_false() {
        assert!(!is_idb_path("opfs://path"));
        assert!(!is_idb_path(""));
    }

    #[test]
    fn test_idb_key_from_path_valid() {
        assert_eq!(
            idb_key_from_path("idb://recordings/rec123"),
            Some("rec123".to_string())
        );
        assert_eq!(
            idb_key_from_path("idb://store/key/with/slashes"),
            Some("key/with/slashes".to_string())
        );
    }

    #[test]
    fn test_idb_key_from_path_invalid() {
        assert_eq!(idb_key_from_path("opfs://path"), None); // Wrong scheme (guard 1)
        assert_eq!(idb_key_from_path("idb://store"), None); // No slash (guard 2)
        assert_eq!(idb_key_from_path("idb://store/"), None); // Empty key (guard 3)
    }

    #[test]
    fn test_split_path_with_directory() {
        assert_eq!(split_path("dir/file.txt"), (Some("dir"), "file.txt"));
    }

    #[test]
    fn test_split_path_without_directory() {
        assert_eq!(split_path("file.txt"), (None, "file.txt"));
        assert_eq!(split_path(""), (None, ""));
    }

    #[test]
    fn test_sanitize_filename_valid() {
        assert_eq!(sanitize_filename("normal.txt"), "normal.txt");
        assert_eq!(
            sanitize_filename("under_score-dash.ext"),
            "under_score-dash.ext"
        );
    }

    #[test]
    fn test_sanitize_filename_invalid_chars() {
        assert_eq!(
            sanitize_filename("file/with/slashes.txt"),
            "file_with_slashes.txt"
        );
        assert_eq!(
            sanitize_filename("colons:asterisks*.txt"),
            "colons_asterisks_.txt"
        );
    }

    #[test]
    fn test_sanitize_filename_multiple_replacements() {
        assert_eq!(sanitize_filename("a<b>c|d.txt"), "a_b_c_d.txt");
    }

    #[test]
    fn test_recording_filename() {
        assert_eq!(recording_filename("abc123", "webm"), "rec_abc123.webm");
        assert_eq!(recording_filename("xyz", "mp3"), "rec_xyz.mp3");
    }

    #[test]
    fn test_share_filename() {
        assert_eq!(share_filename("123", "My File"), "share_123_My File");
        assert_eq!(share_filename("abc", "test<>"), "share_abc_test__");
    }

    #[test]
    fn test_score_filename() {
        assert_eq!(score_filename("456", "Score"), "score_456_Score");
        assert_eq!(score_filename("xyz", "a/b"), "score_xyz_a_b");
    }

    #[test]
    fn test_format_from_mime() {
        assert_eq!(format_from_mime("audio/webm"), "webm");
        assert_eq!(format_from_mime("audio/mp4"), "m4a");
        assert_eq!(format_from_mime("video/mp4"), "mp4");
        assert_eq!(format_from_mime("audio/mpeg"), "mp3");
        assert_eq!(format_from_mime("audio/wav"), "wav");
        assert_eq!(format_from_mime("audio/ogg"), "ogg");
        assert_eq!(format_from_mime("unknown"), "bin");
    }

    #[test]
    fn test_format_from_mime_edge_cases() {
        assert_eq!(format_from_mime("audio/webm; codecs=opus"), "webm");
        assert_eq!(format_from_mime(""), "bin");
        assert_eq!(format_from_mime("AUDIO/MPEG"), "mp3");
    }

    #[test]
    fn test_sum_opfs_bytes_empty() {
        let recordings: Vec<Recording> = vec![];
        assert_eq!(sum_opfs_bytes(&recordings), 0.0);
    }

    #[test]
    fn test_sum_opfs_bytes_mixed() {
        let rec1 = Recording {
            id: "1".to_string(),
            created_at: 0.0,
            duration_seconds: 0.0,
            mime_type: "audio/webm".to_string(),
            size_bytes: 100.0,
            format: "webm".to_string(),
            opfs_path: Some("/opfs/file1.webm".to_string()),
            profile_id: None,
            blob: None,
        };
        let rec2 = Recording {
            id: "2".to_string(),
            created_at: 0.0,
            duration_seconds: 0.0,
            mime_type: "audio/webm".to_string(),
            size_bytes: 200.0,
            format: "webm".to_string(),
            opfs_path: Some("idb://recordings/2".to_string()),
            profile_id: None,
            blob: None,
        };
        let recordings = vec![rec1, rec2];
        assert_eq!(sum_opfs_bytes(&recordings), 100.0); // Skip IDB path
    }

    #[test]
    fn test_sum_opfs_bytes_blob_fallback() {
        // Test that when size_bytes=0, blob is checked (but returns 0 when blob=None)
        let rec = Recording {
            id: "3".to_string(),
            created_at: 0.0,
            duration_seconds: 0.0,
            mime_type: "audio/webm".to_string(),
            size_bytes: 0.0, // Triggers blob fallback path
            format: "webm".to_string(),
            opfs_path: Some("/opfs/file3.webm".to_string()),
            profile_id: None,
            blob: None, // Would use blob.size() if present, falls back to 0.0
        };
        let recordings = vec![rec];
        assert_eq!(sum_opfs_bytes(&recordings), 0.0);

        // Note: Full blob.size() test requires wasm_bindgen_test with real Blob
        // This test verifies the code path exists and handles None correctly
    }

    #[test]
    fn test_is_migration_in_progress_true() {
        let summary = MigrationSummary {
            started: true,
            completed: false,
            updated_at: 1000.0,
            last_store: Some("sessions".to_string()),
            errors: vec![],
            checksums_ok: true,
        };
        assert!(is_migration_in_progress(&summary));
    }

    #[test]
    fn test_is_migration_in_progress_false_not_started() {
        let summary = MigrationSummary {
            started: false,
            completed: false,
            updated_at: 0.0,
            last_store: None,
            errors: vec![],
            checksums_ok: false,
        };
        assert!(!is_migration_in_progress(&summary));
    }

    #[test]
    fn test_is_migration_in_progress_false_completed() {
        let summary = MigrationSummary {
            started: true,
            completed: true,
            updated_at: 2000.0,
            last_store: Some("recordings".to_string()),
            errors: vec![],
            checksums_ok: true,
        };
        assert!(!is_migration_in_progress(&summary));
    }

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
}
