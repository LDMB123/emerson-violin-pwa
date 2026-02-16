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

// Functions will go here

// ============================================================================
// Category 3: Format Conversion
// ============================================================================

// Functions will go here

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
}
