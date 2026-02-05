use std::cell::RefCell;
use std::rc::Rc;

use js_sys::{Array, Function, Object, Reflect, Uint8Array};
use serde::{Deserialize, Serialize};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::{spawn_local, JsFuture};
use web_sys::{Blob, BlobPropertyBag, Event, HtmlInputElement};

use crate::dom;
use crate::file_access;
use crate::ml;
use crate::session;
use crate::state::AppState;
use crate::storage;

const BACKUP_SCHEMA_VERSION: u32 = 1;
const PBKDF2_ITERATIONS: u32 = 100_000;

#[derive(Serialize, Deserialize, Clone)]
struct RecordingMeta {
  id: String,
  created_at: f64,
  duration_seconds: f64,
  mime_type: String,
  size_bytes: f64,
  format: String,
  opfs_path: Option<String>,
  profile_id: Option<String>,
  encrypted_file: Option<String>,
  encrypted_iv_hex: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct BackupEnvelope {
  #[serde(alias = "schemaVersion")]
  schema_version: u32,
  #[serde(alias = "exportedAt")]
  exported_at: String,
  #[serde(alias = "appVersion")]
  app_version: String,
  #[serde(alias = "deviceId")]
  device_id: String,
  sessions: Vec<storage::Session>,
  recordings: Vec<RecordingMeta>,
  ml: crate::ml::MlState,
  #[serde(default)]
  assignments: serde_json::Value,
  #[serde(default)]
  profiles: serde_json::Value,
}

#[derive(Deserialize)]
struct BackupManifest {
  #[serde(alias = "schemaVersion")]
  schema_version: u32,
  #[serde(alias = "saltHex")]
  salt_hex: String,
  #[serde(alias = "ivHex")]
  iv_hex: String,
  iterations: u32,
  algorithm: String,
  file: String,
}

pub fn init(state: Rc<RefCell<AppState>>) {
  init_section_toggle();
  if dom::query("[data-backup-export]").is_none() {
    return;
  }
  if let Some(button) = dom::query("[data-backup-export]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let pin = dom::query("[data-backup-pin]")
        .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
        .map(|el| el.value())
        .unwrap_or_default();
      let confirm = dom::query("[data-backup-confirm]")
        .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
        .map(|el| el.value())
        .unwrap_or_default();
      if pin.len() < 4 || pin != confirm {
        dom::set_text("[data-backup-status]", "PIN mismatch");
        return;
      }
      dom::set_text("[data-backup-status]", "Encrypting...");
      let state_clone = state_clone.clone();
      spawn_local(async move {
        let force = file_access::prefers_save_for("backup");
        let result = if force {
          export_backup_force(&state_clone, &pin).await
        } else {
          export_backup(&state_clone, &pin).await
        };
        match result {
          Ok(_) => dom::set_text("[data-backup-status]", "Backup saved"),
          Err(_) => dom::set_text("[data-backup-status]", "Backup failed"),
        }
      });
    });
    let _ = button.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(button) = dom::query("[data-backup-export-files]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let pin = dom::query("[data-backup-pin]")
        .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
        .map(|el| el.value())
        .unwrap_or_default();
      let confirm = dom::query("[data-backup-confirm]")
        .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
        .map(|el| el.value())
        .unwrap_or_default();
      if pin.len() < 4 || pin != confirm {
        dom::set_text("[data-backup-status]", "PIN mismatch");
        return;
      }
      dom::set_text("[data-backup-status]", "Encrypting...");
      let state_clone = state_clone.clone();
      spawn_local(async move {
        match export_backup_force(&state_clone, &pin).await {
          Ok(_) => dom::set_text("[data-backup-status]", "Backup saved"),
          Err(_) => dom::set_text("[data-backup-status]", "Backup failed"),
        }
      });
    });
    let _ = button.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(button) = dom::query("[data-restore-run]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let pin = dom::query("[data-restore-pin]")
        .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
        .map(|el| el.value())
        .unwrap_or_default();
      if pin.len() < 4 {
        dom::set_text("[data-restore-status]", "PIN required");
        dom::set_text("[data-restore-status-note]", "PIN required.");
        return;
      }
      if let Some(file) = read_restore_file() {
        run_restore(state_clone.clone(), pin, file);
      } else {
        dom::set_text("[data-restore-status]", "Select a ZIP backup");
        dom::set_text("[data-restore-status-note]", "Select a backup file.");
      }
    });
    let _ = button.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(button) = dom::query("[data-restore-open-files]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      if !file_access::supports_open_picker() {
        dom::set_text("[data-restore-status]", "File picker unavailable");
        dom::set_text("[data-restore-status-note]", "Picker unavailable.");
        return;
      }
      let pin = dom::query("[data-restore-pin]")
        .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
        .map(|el| el.value())
        .unwrap_or_default();
      if pin.len() < 4 {
        dom::set_text("[data-restore-status]", "PIN required");
        dom::set_text("[data-restore-status-note]", "PIN required.");
        return;
      }
      let state_clone = state_clone.clone();
      spawn_local(async move {
        if let Some(file) = file_access::open_file_with_types("Backup ZIP", &[("application/zip", &[".zip"])]).await {
          run_restore(state_clone, pin, file);
        } else {
          dom::set_text("[data-restore-status]", "Backup pick canceled");
          dom::set_text("[data-restore-status-note]", "Backup selection canceled.");
        }
      });
    });
    let _ = button.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

async fn export_backup(state: &Rc<RefCell<AppState>>, pin: &str) -> Result<(), JsValue> {
  let app = state.borrow();
  let recordings_state = app.recordings.clone();
  let mut recordings_meta = recordings_state
    .iter()
    .map(|rec| RecordingMeta {
      id: rec.id.clone(),
      created_at: rec.created_at,
      duration_seconds: rec.duration_seconds,
      mime_type: rec.mime_type.clone(),
      size_bytes: rec.size_bytes,
      format: rec.format.clone(),
      opfs_path: rec.opfs_path.clone(),
      profile_id: rec.profile_id.clone(),
      encrypted_file: None,
      encrypted_iv_hex: None,
    })
    .collect::<Vec<_>>();

  let assignments = storage::get_assignments().await.unwrap_or_default();
  let profiles = storage::get_profiles().await.unwrap_or_default();
  let envelope = BackupEnvelope {
    schema_version: BACKUP_SCHEMA_VERSION,
    exported_at: js_sys::Date::new_0().to_string().into(),
    app_version: env!("CARGO_PKG_VERSION").to_string(),
    device_id: storage::get_or_create_device_id(),
    sessions: app.sessions.clone(),
    recordings: recordings_meta.clone(),
    ml: app.ml.clone(),
    assignments: json_value_from_js(&assignments),
    profiles: json_value_from_js(&profiles),
  };
  drop(app);

  let salt = random_bytes(16).ok_or_else(|| JsValue::from_str("salt failed"))?;
  let key = derive_key(pin, &salt, PBKDF2_ITERATIONS).await.ok_or_else(|| JsValue::from_str("key failed"))?;

  let mut recording_entries: Vec<ZipEntry> = Vec::new();
  for (idx, rec) in recordings_state.iter().enumerate() {
    if let Some(bytes) = recording_to_bytes(rec).await {
      if let Some((ciphertext, iv)) = encrypt_with_key(&key, &bytes).await {
        let file_name = format!("recordings/{}.{}.enc", rec.id, rec.format);
        recordings_meta[idx].encrypted_file = Some(file_name.clone());
        recordings_meta[idx].encrypted_iv_hex = Some(to_hex(&iv));
        recording_entries.push(ZipEntry::new(&file_name, ciphertext));
      }
    }
  }

  let envelope = BackupEnvelope {
    recordings: recordings_meta,
    ..envelope
  };

  let payload = serde_json::to_vec(&envelope).map_err(|_| JsValue::from_str("encode failed"))?;
  let (ciphertext, iv) = encrypt_with_key(&key, &payload)
    .await
    .ok_or_else(|| JsValue::from_str("encrypt failed"))?;
  let encrypted = EncryptedPayload {
    ciphertext,
    salt: uint8_to_vec(&salt),
    iv,
  };

  let manifest = serde_json::json!({
    "schema_version": BACKUP_SCHEMA_VERSION,
    "created_at": envelope.exported_at,
    "app_version": envelope.app_version,
    "device_id": envelope.device_id,
    "algorithm": "AES-GCM",
    "iterations": PBKDF2_ITERATIONS,
    "salt_hex": to_hex(&encrypted.salt),
    "iv_hex": to_hex(&encrypted.iv),
    "file": "backup.enc",
    "size_bytes": payload.len()
  });
  let manifest_bytes = serde_json::to_vec_pretty(&manifest).unwrap_or_default();

  let zip_bytes = build_zip(vec![
    ZipEntry::new("manifest.json", manifest_bytes),
    ZipEntry::new("backup.enc", encrypted.ciphertext),
  ].into_iter().chain(recording_entries.into_iter()).collect());

  download_bytes("emerson-backup.zip", "application/zip", &zip_bytes).await?;
  Ok(())
}

async fn export_backup_force(state: &Rc<RefCell<AppState>>, pin: &str) -> Result<(), JsValue> {
  let app = state.borrow();
  let recordings_state = app.recordings.clone();
  let mut recordings_meta = recordings_state
    .iter()
    .map(|rec| RecordingMeta {
      id: rec.id.clone(),
      created_at: rec.created_at,
      duration_seconds: rec.duration_seconds,
      mime_type: rec.mime_type.clone(),
      size_bytes: rec.size_bytes,
      format: rec.format.clone(),
      opfs_path: rec.opfs_path.clone(),
      profile_id: rec.profile_id.clone(),
      encrypted_file: None,
      encrypted_iv_hex: None,
    })
    .collect::<Vec<_>>();
  drop(app);

  let salt = random_bytes(16).ok_or_else(|| JsValue::from_str("salt failed"))?;
  let key = derive_key(pin, &salt, PBKDF2_ITERATIONS).await.ok_or_else(|| JsValue::from_str("key failed"))?;

  let mut recording_entries: Vec<ZipEntry> = Vec::new();
  for (idx, rec) in recordings_state.iter().enumerate() {
    if let Some(bytes) = recording_to_bytes(rec).await {
      if let Some((ciphertext, iv)) = encrypt_with_key(&key, &bytes).await {
        let file_name = format!("recordings/{}.{}.enc", rec.id, rec.format);
        recordings_meta[idx].encrypted_file = Some(file_name.clone());
        recordings_meta[idx].encrypted_iv_hex = Some(to_hex(&iv));
        recording_entries.push(ZipEntry::new(&file_name, ciphertext));
      }
    }
  }

  let assignments = storage::get_assignments().await.unwrap_or_default();
  let profiles = storage::get_profiles().await.unwrap_or_default();
  let envelope = BackupEnvelope {
    schema_version: BACKUP_SCHEMA_VERSION,
    exported_at: js_sys::Date::new_0().to_string().into(),
    app_version: env!("CARGO_PKG_VERSION").to_string(),
    device_id: storage::get_or_create_device_id(),
    sessions: storage::get_sessions().await.unwrap_or_default(),
    recordings: recordings_meta,
    ml: crate::ml::load_state(),
    assignments: json_value_from_js(&assignments),
    profiles: json_value_from_js(&profiles),
  };

  let payload = serde_json::to_vec(&envelope).map_err(|_| JsValue::from_str("encode failed"))?;
  let (ciphertext, iv) = encrypt_with_key(&key, &payload)
    .await
    .ok_or_else(|| JsValue::from_str("encrypt failed"))?;
  let encrypted = EncryptedPayload {
    ciphertext,
    salt: uint8_to_vec(&salt),
    iv,
  };

  let manifest = serde_json::json!({
    "schema_version": BACKUP_SCHEMA_VERSION,
    "created_at": envelope.exported_at,
    "app_version": envelope.app_version,
    "device_id": envelope.device_id,
    "algorithm": "AES-GCM",
    "iterations": PBKDF2_ITERATIONS,
    "salt_hex": to_hex(&encrypted.salt),
    "iv_hex": to_hex(&encrypted.iv),
    "file": "backup.enc",
    "size_bytes": payload.len()
  });
  let manifest_bytes = serde_json::to_vec_pretty(&manifest).unwrap_or_default();

  let zip_bytes = build_zip(vec![
    ZipEntry::new("manifest.json", manifest_bytes),
    ZipEntry::new("backup.enc", encrypted.ciphertext),
  ].into_iter().chain(recording_entries.into_iter()).collect());

  if file_access::save_or_download_force("emerson-backup.zip", "application/zip", &zip_bytes).await {
    Ok(())
  } else {
    Err(JsValue::from_str("export failed"))
  }
}

fn read_restore_file() -> Option<web_sys::File> {
  dom::query("[data-restore-file]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .and_then(|input| input.files())
    .and_then(|list| list.get(0))
}

fn run_restore(state: Rc<RefCell<AppState>>, pin: String, file: web_sys::File) {
  let restore_sessions = dom::query("[data-restore-sessions]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .map(|el| el.checked())
    .unwrap_or(true);
  let restore_recordings = dom::query("[data-restore-recordings]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .map(|el| el.checked())
    .unwrap_or(true);
  let restore_assignments = dom::query("[data-restore-assignments]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .map(|el| el.checked())
    .unwrap_or(true);
  let restore_profiles = dom::query("[data-restore-profiles]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .map(|el| el.checked())
    .unwrap_or(true);
  let restore_ml = dom::query("[data-restore-ml]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .map(|el| el.checked())
    .unwrap_or(true);
  dom::set_text("[data-restore-status]", "Restoring...");
  dom::set_text("[data-restore-status-note]", "Restoring data...");
  spawn_local(async move {
    match restore_backup(&state, &pin, &file, restore_sessions, restore_assignments, restore_profiles, restore_recordings, restore_ml).await {
      Ok(_) => {
        dom::set_text("[data-restore-status]", "Restore complete");
        dom::set_text("[data-restore-status-note]", "Restore complete.");
      }
      Err(_) => {
        dom::set_text("[data-restore-status]", "Restore failed");
        dom::set_text("[data-restore-status-note]", "Restore failed.");
      }
    }
  });
}

fn init_section_toggle() {
  if let Some(toggle) = dom::query("[data-save-files-section=\"backup\"]") {
    if let Ok(input) = toggle.dyn_into::<HtmlInputElement>() {
      input.set_checked(file_access::prefers_save_for("backup"));
      let input_clone = input.clone();
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        file_access::set_prefers_save_for("backup", input_clone.checked());
      });
      let _ = input.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref());
      cb.forget();
    }
  }
}

struct EncryptedPayload {
  ciphertext: Vec<u8>,
  salt: Vec<u8>,
  iv: Vec<u8>,
}

async fn encrypt_with_key(key: &JsValue, payload: &[u8]) -> Option<(Vec<u8>, Vec<u8>)> {
  let iv = random_bytes(12)?;

  let alg = Object::new();
  let _ = Reflect::set(&alg, &JsValue::from_str("name"), &JsValue::from_str("AES-GCM"));
  let _ = Reflect::set(&alg, &JsValue::from_str("iv"), &iv.clone().into());

  let data = Uint8Array::from(payload);
  let encrypted = subtle_call("encrypt", &[alg.into(), key.clone(), data.into()]).await?;
  let buffer = encrypted.dyn_into::<js_sys::ArrayBuffer>().ok()?;
  let output = Uint8Array::new(&buffer);
  let mut ciphertext = vec![0u8; output.length() as usize];
  output.copy_to(&mut ciphertext);

  Some((ciphertext, uint8_to_vec(&iv)))
}

async fn recording_to_bytes(rec: &storage::Recording) -> Option<Vec<u8>> {
  if let Some(blob) = &rec.blob {
    blob_to_bytes(blob).await
  } else if let Some(path) = &rec.opfs_path {
    let blob = storage::load_recording_blob(path).await?;
    blob_to_bytes(&blob).await
  } else {
    None
  }
}

pub async fn restore_backup(
  state: &Rc<RefCell<AppState>>,
  pin: &str,
  file: &web_sys::File,
  restore_sessions: bool,
  restore_assignments: bool,
  restore_profiles: bool,
  restore_recordings: bool,
  restore_ml: bool,
) -> Result<(), JsValue> {
  let bytes = file_to_bytes(file).await.ok_or_else(|| JsValue::from_str("read failed"))?;
  let entries = parse_zip(&bytes)?;

  let manifest_entry = entries
    .iter()
    .find(|entry| entry.name == "manifest.json")
    .ok_or_else(|| JsValue::from_str("manifest missing"))?;
  let manifest: BackupManifest = serde_json::from_slice(&manifest_entry.data)
    .map_err(|_| JsValue::from_str("manifest parse failed"))?;
  if manifest.schema_version != BACKUP_SCHEMA_VERSION {
    return Err(JsValue::from_str("unsupported backup version"));
  }
  if manifest.algorithm != "AES-GCM" {
    return Err(JsValue::from_str("unsupported algorithm"));
  }

  let backup_entry = entries
    .iter()
    .find(|entry| entry.name == manifest.file)
    .ok_or_else(|| JsValue::from_str("backup payload missing"))?;
  let salt = hex_to_bytes(&manifest.salt_hex).ok_or_else(|| JsValue::from_str("salt decode failed"))?;
  let iv = hex_to_bytes(&manifest.iv_hex).ok_or_else(|| JsValue::from_str("iv decode failed"))?;
  let salt_arr = Uint8Array::from(salt.as_slice());
  let key = derive_key(pin, &salt_arr, manifest.iterations)
    .await
    .ok_or_else(|| JsValue::from_str("key failed"))?;
  let payload = decrypt_with_key(&key, &iv, &backup_entry.data)
    .await
    .ok_or_else(|| JsValue::from_str("decrypt failed"))?;

  let envelope: BackupEnvelope = serde_json::from_slice(&payload)
    .map_err(|_| JsValue::from_str("backup parse failed"))?;
  if envelope.schema_version != BACKUP_SCHEMA_VERSION {
    return Err(JsValue::from_str("backup version mismatch"));
  }

  let preview = format!(
    "Preview: {} sessions, {} assignments, {} profiles, {} recordings, {} ML samples",
    envelope.sessions.len(),
    json_array_len(&envelope.assignments),
    json_array_len(&envelope.profiles),
    envelope.recordings.len(),
    envelope.ml.pitch.len() + envelope.ml.rhythm.len() + envelope.ml.focus.len()
  );
  dom::set_text("[data-restore-preview]", &preview);
  let confirm = dom::window()
    .confirm_with_message(&format!(
      "Restore selected data?\\n{}\\nSessions: {}\\nAssignments: {}\\nProfiles: {}\\nRecordings: {}\\nML: {}",
      preview,
      restore_sessions,
      restore_assignments,
      restore_profiles,
      restore_recordings,
      restore_ml
    ))
    .unwrap_or(false);
  if !confirm {
    return Err(JsValue::from_str("restore cancelled"));
  }

  if restore_sessions {
    let _ = storage::clear_sessions().await;
  }
  if restore_assignments {
    let _ = storage::clear_assignments().await;
  }
  if restore_profiles {
    let _ = storage::clear_profiles().await;
  }
  if restore_recordings {
    let _ = storage::clear_recordings().await;
    let _ = storage::clear_recording_blobs().await;
  }

  if restore_sessions {
    for session_entry in envelope.sessions.iter() {
      let _ = storage::save_session(session_entry).await;
    }
  }

  if restore_assignments {
    for payload in json_array_to_js(&envelope.assignments) {
      let _ = storage::save_assignment(&payload).await;
    }
  }

  if restore_profiles {
    for payload in json_array_to_js(&envelope.profiles) {
      let _ = storage::save_profile(&payload).await;
    }
  }

  let mut restored_recordings = Vec::new();
  if restore_recordings {
    for meta in envelope.recordings.iter() {
      let mut recording = storage::Recording {
        id: meta.id.clone(),
        created_at: meta.created_at,
        duration_seconds: meta.duration_seconds,
        blob: None,
        mime_type: meta.mime_type.clone(),
        size_bytes: meta.size_bytes,
        format: meta.format.clone(),
        opfs_path: None,
        profile_id: meta.profile_id.clone(),
      };
      if let (Some(file_name), Some(iv_hex)) = (&meta.encrypted_file, &meta.encrypted_iv_hex) {
        if let Some(entry) = entries.iter().find(|entry| entry.name == *file_name) {
          if let Some(iv) = hex_to_bytes(iv_hex) {
            if let Some(bytes) = decrypt_with_key(&key, &iv, &entry.data).await {
              if let Some(blob) = bytes_to_blob(&bytes, &recording.mime_type) {
                if storage::opfs_supported() {
                  if let Some(path) = storage::save_recording_blob(&recording.id, &recording.format, &blob).await {
                    recording.opfs_path = Some(path);
                  } else {
                    recording.blob = Some(blob);
                  }
                } else {
                  recording.blob = Some(blob);
                }
              }
            }
          }
        }
      }
      let _ = storage::save_recording(&recording).await;
      restored_recordings.push(recording);
    }
  }

  {
    let mut app = state.borrow_mut();
    if restore_sessions {
      app.sessions = envelope.sessions.clone();
    }
    if restore_recordings {
      app.recordings = restored_recordings;
    }
    if restore_ml {
      app.ml = envelope.ml.clone();
    }
  }
  if restore_ml {
    ml::render(&state.borrow().ml);
  }
  session::update_summary(&state.borrow());
  Ok(())
}

async fn decrypt_with_key(key: &JsValue, iv: &[u8], ciphertext: &[u8]) -> Option<Vec<u8>> {
  let iv_arr = Uint8Array::from(iv);

  let alg = Object::new();
  let _ = Reflect::set(&alg, &JsValue::from_str("name"), &JsValue::from_str("AES-GCM"));
  let _ = Reflect::set(&alg, &JsValue::from_str("iv"), &iv_arr.clone().into());

  let data = Uint8Array::from(ciphertext);
  let decrypted = subtle_call("decrypt", &[alg.into(), key.clone(), data.into()]).await?;
  let buffer = decrypted.dyn_into::<js_sys::ArrayBuffer>().ok()?;
  let output = Uint8Array::new(&buffer);
  let mut plaintext = vec![0u8; output.length() as usize];
  output.copy_to(&mut plaintext);
  Some(plaintext)
}

async fn derive_key(pin: &str, salt: &Uint8Array, iterations: u32) -> Option<JsValue> {
  let pin_bytes = Uint8Array::from(pin.as_bytes());
  let usage = Array::new();
  usage.push(&JsValue::from_str("deriveKey"));

  let import = subtle_call(
    "importKey",
    &[
      JsValue::from_str("raw"),
      pin_bytes.into(),
      JsValue::from_str("PBKDF2"),
      JsValue::FALSE,
      usage.into(),
    ],
  ).await?;

  let params = Object::new();
  let _ = Reflect::set(&params, &JsValue::from_str("name"), &JsValue::from_str("PBKDF2"));
  let _ = Reflect::set(&params, &JsValue::from_str("salt"), &salt.clone().into());
  let _ = Reflect::set(&params, &JsValue::from_str("iterations"), &JsValue::from_f64(iterations as f64));
  let _ = Reflect::set(&params, &JsValue::from_str("hash"), &JsValue::from_str("SHA-256"));

  let derived = Object::new();
  let _ = Reflect::set(&derived, &JsValue::from_str("name"), &JsValue::from_str("AES-GCM"));
  let _ = Reflect::set(&derived, &JsValue::from_str("length"), &JsValue::from_f64(256.0));

  let usages = Array::new();
  usages.push(&JsValue::from_str("encrypt"));
  usages.push(&JsValue::from_str("decrypt"));

  subtle_call(
    "deriveKey",
    &[
      params.into(),
      import,
      derived.into(),
      JsValue::FALSE,
      usages.into(),
    ],
  ).await
}

async fn subtle_call(name: &str, args: &[JsValue]) -> Option<JsValue> {
  let subtle = dom::window().crypto().ok()?.subtle();
  let subtle = JsValue::from(subtle);
  let func = Reflect::get(&subtle, &JsValue::from_str(name)).ok()?.dyn_into::<Function>().ok()?;
  let array = Array::new();
  for arg in args {
    array.push(arg);
  }
  let promise = func.apply(&subtle, &array).ok()?.dyn_into::<js_sys::Promise>().ok()?;
  JsFuture::from(promise).await.ok()
}

fn random_bytes(len: u32) -> Option<Uint8Array> {
  let crypto = dom::window().crypto().ok()?;
  let mut data = vec![0u8; len as usize];
  crypto.get_random_values_with_u8_array(&mut data).ok()?;
  Some(Uint8Array::from(data.as_slice()))
}

fn uint8_to_vec(value: &Uint8Array) -> Vec<u8> {
  let mut out = vec![0u8; value.length() as usize];
  value.copy_to(&mut out);
  out
}

async fn file_to_bytes(file: &web_sys::File) -> Option<Vec<u8>> {
  let array_buffer = Reflect::get(file, &JsValue::from_str("arrayBuffer")).ok()?.dyn_into::<Function>().ok()?;
  let promise = array_buffer.call0(file).ok()?.dyn_into::<js_sys::Promise>().ok()?;
  let buffer = JsFuture::from(promise).await.ok()?.dyn_into::<js_sys::ArrayBuffer>().ok()?;
  let uint = Uint8Array::new(&buffer);
  let mut data = vec![0u8; uint.length() as usize];
  uint.copy_to(&mut data);
  Some(data)
}

async fn blob_to_bytes(blob: &Blob) -> Option<Vec<u8>> {
  let array_buffer = Reflect::get(blob, &JsValue::from_str("arrayBuffer")).ok()?.dyn_into::<Function>().ok()?;
  let promise = array_buffer.call0(blob).ok()?.dyn_into::<js_sys::Promise>().ok()?;
  let buffer = JsFuture::from(promise).await.ok()?.dyn_into::<js_sys::ArrayBuffer>().ok()?;
  let uint = Uint8Array::new(&buffer);
  let mut data = vec![0u8; uint.length() as usize];
  uint.copy_to(&mut data);
  Some(data)
}

fn bytes_to_blob(bytes: &[u8], mime: &str) -> Option<Blob> {
  let array = Array::new();
  let data = Uint8Array::from(bytes);
  array.push(&data.buffer());
  let bag = BlobPropertyBag::new();
  bag.set_type(mime);
  Blob::new_with_u8_array_sequence_and_options(&array, &bag).ok()
}

pub async fn download_bytes(filename: &str, mime: &str, bytes: &[u8]) -> Result<(), JsValue> {
  if file_access::save_or_download(filename, mime, bytes).await {
    Ok(())
  } else {
    Err(JsValue::from_str("Download failed"))
  }
}

fn to_hex(bytes: &[u8]) -> String {
  let mut out = String::with_capacity(bytes.len() * 2);
  for byte in bytes {
    out.push_str(&format!("{:02x}", byte));
  }
  out
}

fn hex_to_bytes(value: &str) -> Option<Vec<u8>> {
  if value.len() % 2 != 0 {
    return None;
  }
  let mut out = Vec::with_capacity(value.len() / 2);
  let chars: Vec<char> = value.chars().collect();
  let mut idx = 0;
  while idx < chars.len() {
    let hex = format!("{}{}", chars[idx], chars[idx + 1]);
    if let Ok(byte) = u8::from_str_radix(&hex, 16) {
      out.push(byte);
    } else {
      return None;
    }
    idx += 2;
  }
  Some(out)
}

fn json_value_from_js(values: &[JsValue]) -> serde_json::Value {
  let array = js_sys::Array::from_iter(values.iter());
  serde_wasm_bindgen::from_value(array.into()).unwrap_or_else(|_| serde_json::Value::Array(Vec::new()))
}

fn json_array_len(value: &serde_json::Value) -> usize {
  match value {
    serde_json::Value::Array(arr) => arr.len(),
    _ => 0,
  }
}

fn json_array_to_js(value: &serde_json::Value) -> Vec<JsValue> {
  match value {
    serde_json::Value::Array(arr) => arr
      .iter()
      .filter_map(|item| serde_wasm_bindgen::to_value(item).ok())
      .collect(),
    _ => Vec::new(),
  }
}

pub struct ZipEntry {
  name: String,
  data: Vec<u8>,
}

impl ZipEntry {
  pub fn new(name: &str, data: Vec<u8>) -> Self {
    Self {
      name: name.to_string(),
      data,
    }
  }
}

pub fn build_zip(entries: Vec<ZipEntry>) -> Vec<u8> {
  let mut out = Vec::new();
  let mut central = Vec::new();
  let mut offset = 0u32;

  for entry in entries.iter() {
    let name_bytes = entry.name.as_bytes();
    let crc = crc32(&entry.data);
    let size = entry.data.len() as u32;

    write_u32(&mut out, 0x04034b50);
    write_u16(&mut out, 20);
    write_u16(&mut out, 0);
    write_u16(&mut out, 0);
    write_u16(&mut out, 0);
    write_u16(&mut out, 0);
    write_u32(&mut out, crc);
    write_u32(&mut out, size);
    write_u32(&mut out, size);
    write_u16(&mut out, name_bytes.len() as u16);
    write_u16(&mut out, 0);
    out.extend_from_slice(name_bytes);
    out.extend_from_slice(&entry.data);

    write_u32(&mut central, 0x02014b50);
    write_u16(&mut central, 20);
    write_u16(&mut central, 20);
    write_u16(&mut central, 0);
    write_u16(&mut central, 0);
    write_u16(&mut central, 0);
    write_u16(&mut central, 0);
    write_u32(&mut central, crc);
    write_u32(&mut central, size);
    write_u32(&mut central, size);
    write_u16(&mut central, name_bytes.len() as u16);
    write_u16(&mut central, 0);
    write_u16(&mut central, 0);
    write_u16(&mut central, 0);
    write_u16(&mut central, 0);
    write_u32(&mut central, 0);
    write_u32(&mut central, offset);
    central.extend_from_slice(name_bytes);

    offset = out.len() as u32;
  }

  let central_offset = out.len() as u32;
  out.extend_from_slice(&central);
  let central_size = central.len() as u32;

  write_u32(&mut out, 0x06054b50);
  write_u16(&mut out, 0);
  write_u16(&mut out, 0);
  write_u16(&mut out, entries.len() as u16);
  write_u16(&mut out, entries.len() as u16);
  write_u32(&mut out, central_size);
  write_u32(&mut out, central_offset);
  write_u16(&mut out, 0);

  out
}

fn parse_zip(bytes: &[u8]) -> Result<Vec<ZipEntry>, JsValue> {
  let mut entries = Vec::new();
  let mut offset = 0usize;
  while offset + 4 <= bytes.len() {
    let signature = read_u32(bytes, offset);
    if signature != 0x04034b50 {
      break;
    }
    if offset + 30 > bytes.len() {
      break;
    }
    let name_len = read_u16(bytes, offset + 26) as usize;
    let extra_len = read_u16(bytes, offset + 28) as usize;
    let data_len = read_u32(bytes, offset + 18) as usize;
    let header_end = offset + 30;
    let name_start = header_end;
    let name_end = name_start + name_len;
    let extra_end = name_end + extra_len;
    let data_end = extra_end + data_len;
    if data_end > bytes.len() {
      break;
    }
    let name = String::from_utf8(bytes[name_start..name_end].to_vec()).unwrap_or_default();
    let data = bytes[extra_end..data_end].to_vec();
    entries.push(ZipEntry { name, data });
    offset = data_end;
  }
  Ok(entries)
}

fn write_u16(buf: &mut Vec<u8>, val: u16) {
  buf.extend_from_slice(&val.to_le_bytes());
}

fn write_u32(buf: &mut Vec<u8>, val: u32) {
  buf.extend_from_slice(&val.to_le_bytes());
}

fn read_u16(buf: &[u8], offset: usize) -> u16 {
  let bytes = [buf[offset], buf[offset + 1]];
  u16::from_le_bytes(bytes)
}

fn read_u32(buf: &[u8], offset: usize) -> u32 {
  let bytes = [buf[offset], buf[offset + 1], buf[offset + 2], buf[offset + 3]];
  u32::from_le_bytes(bytes)
}

fn crc32(data: &[u8]) -> u32 {
  let mut crc = 0xffffffffu32;
  for &byte in data {
    let mut c = (crc ^ byte as u32) & 0xff;
    for _ in 0..8 {
      c = if c & 1 != 0 { 0xedb88320 ^ (c >> 1) } else { c >> 1 };
    }
    crc = (crc >> 8) ^ c;
  }
  !crc
}
