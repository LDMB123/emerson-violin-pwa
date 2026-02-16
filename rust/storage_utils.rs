// rust/storage_utils.rs

use wasm_bindgen::JsValue;
use web_sys::Blob;

// Re-export types from storage.rs that utils need
use super::{Recording, ShareItem, MigrationSummary};

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
        "mp4"
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
    js_sys::Reflect::set(&obj, &"durationSeconds".into(), &recording.duration_seconds.into())?;
    js_sys::Reflect::set(&obj, &"mimeType".into(), &recording.mime_type.clone().into())?;
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

// Forward declarations - implemented in Category 5 (Task 5)
// Temporary stub implementations - will be replaced in Task 5
fn js_string_any(_value: &JsValue, _keys: &[&str]) -> Option<String> {
    todo!("Will be implemented in Task 5")
}

fn js_number_any(_value: &JsValue, _keys: &[&str]) -> Option<f64> {
    todo!("Will be implemented in Task 5")
}

fn js_date_any(_value: &JsValue, _keys: &[&str]) -> Option<f64> {
    todo!("Will be implemented in Task 5")
}

fn js_blob_any(_value: &JsValue) -> Option<Blob> {
    todo!("Will be implemented in Task 5")
}

/// Convert JsValue object to Recording
pub fn recording_from_value(value: &JsValue) -> Option<Recording> {
    let id = js_string_any(value, &["id"])?;
    let created_at = js_number_any(value, &["createdAt", "created_at"])?;
    let duration_seconds = js_number_any(value, &["durationSeconds", "duration_seconds"]).unwrap_or(0.0);
    let mime_type = js_string_any(value, &["mimeType", "mime_type"]).unwrap_or_else(|| "audio/webm".to_string());
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
    let mime = js_string_any(value, &["type", "mime"]).unwrap_or_else(|| "application/octet-stream".to_string());
    let created_at = js_date_any(value, &["lastModified", "created_at"]).unwrap_or_else(|| js_sys::Date::now());
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

// Functions will go here

// ============================================================================
// Category 5: JsValue Extraction Helpers
// ============================================================================

// Functions will go here

#[cfg(test)]
mod tests {
    use super::*;

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
        assert_eq!(idb_key_from_path("idb://recordings/rec123"), Some("rec123".to_string()));
        assert_eq!(idb_key_from_path("idb://store/key/with/slashes"), Some("key/with/slashes".to_string()));
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
        assert_eq!(sanitize_filename("under_score-dash.ext"), "under_score-dash.ext");
    }

    #[test]
    fn test_sanitize_filename_invalid_chars() {
        assert_eq!(sanitize_filename("file/with/slashes.txt"), "file_with_slashes.txt");
        assert_eq!(sanitize_filename("colons:asterisks*.txt"), "colons_asterisks_.txt");
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
}
