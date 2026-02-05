use std::collections::HashMap;

use serde::Serialize;
use serde_json::{Number as JsonNumber, Value as JsonValue};
use wasm_bindgen_futures::spawn_local;
use web_sys::Event;

use crate::db_client;
use crate::db_messages::DbStatement;
use crate::dom;
use crate::storage::{self, Recording};
use crate::utils;

const MIGRATION_ID: &str = "active";
const BATCH_SIZE: usize = 200;

#[derive(Debug, Default, Clone)]
struct MigrationState {
  source_version: u32,
  started_at: f64,
  updated_at: f64,
  last_store: Option<String>,
  last_index: Option<usize>,
  counts: HashMap<String, usize>,
  errors: Vec<String>,
  completed_at: Option<f64>,
}

pub fn init() {
  if let Some(btn) = dom::query("[data-db-migrate]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      dom::set_text("[data-db-migrate-status]", "Starting migration…");
      if let Some(btn) = dom::query("[data-db-migrate]") {
        let _ = btn.set_attribute("disabled", "true");
      }
      spawn_local(async move {
        let result = run_migration().await;
        if let Err(err) = result {
          dom::set_text(
            "[data-db-migrate-status]",
            &format!("Migration failed: {}", err.as_string().unwrap_or_default()),
          );
        }
        if let Some(btn) = dom::query("[data-db-migrate]") {
          let _ = btn.remove_attribute("disabled");
        }
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

async fn run_migration() -> Result<(), wasm_bindgen::JsValue> {
  db_client::init_db().await?;

  let mut state = load_state().await.unwrap_or_default();
  if state.started_at == 0.0 || state.completed_at.is_some() {
    state = MigrationState {
      source_version: storage::DB_VERSION,
      started_at: now_ms(),
      updated_at: now_ms(),
      last_store: None,
      last_index: None,
      counts: HashMap::new(),
      errors: Vec::new(),
      completed_at: None,
    };
  }

  upsert_state(&state).await?;

  migrate_sessions(&mut state).await?;
  migrate_recordings(&mut state).await?;
  migrate_json_store(
    "sync_queue",
    "sync_queue",
    storage::get_store_values("syncQueue").await.unwrap_or_default(),
    &mut state,
  )
  .await?;
  migrate_json_store(
    "share_inbox",
    "share_inbox",
    storage::get_store_values("shareInbox").await.unwrap_or_default(),
    &mut state,
  )
  .await?;
  migrate_json_store(
    "ml_traces",
    "ml_traces",
    storage::get_store_values("mlTraces").await.unwrap_or_default(),
    &mut state,
  )
  .await?;
  migrate_json_store(
    "game_scores",
    "game_scores",
    storage::get_store_values("gameScores").await.unwrap_or_default(),
    &mut state,
  )
  .await?;
  migrate_json_store(
    "score_library",
    "score_library",
    storage::get_store_values("scoreLibrary").await.unwrap_or_default(),
    &mut state,
  )
  .await?;
  migrate_json_store(
    "assignments",
    "assignments",
    storage::get_store_values("assignments").await.unwrap_or_default(),
    &mut state,
  )
  .await?;
  migrate_json_store(
    "profiles",
    "profiles",
    storage::get_store_values("profiles").await.unwrap_or_default(),
    &mut state,
  )
  .await?;
  migrate_json_store(
    "telemetry_queue",
    "telemetry_queue",
    storage::get_store_values("telemetryQueue").await.unwrap_or_default(),
    &mut state,
  )
  .await?;
  migrate_json_store(
    "error_queue",
    "error_queue",
    storage::get_store_values("errorQueue").await.unwrap_or_default(),
    &mut state,
  )
  .await?;
  migrate_json_store(
    "score_scans",
    "score_scans",
    storage::get_store_values("scoreScans").await.unwrap_or_default(),
    &mut state,
  )
  .await?;
  migrate_json_store(
    "model_cache",
    "model_cache",
    storage::get_store_values("modelCache").await.unwrap_or_default(),
    &mut state,
  )
  .await?;

  state.completed_at = Some(now_ms());
  state.updated_at = now_ms();
  state.last_store = None;
  state.last_index = None;
  upsert_state(&state).await?;

  dom::set_text("[data-db-migrate-status]", "Migration complete.");
  Ok(())
}

async fn migrate_sessions(state: &mut MigrationState) -> Result<(), wasm_bindgen::JsValue> {
  let sessions = storage::get_sessions().await.unwrap_or_default();
  migrate_typed_store(
    "sessions",
    sessions,
    state,
    |session| DbStatement {
      sql: "INSERT OR REPLACE INTO sessions (id, day_key, duration_minutes, note, created_at, payload) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
        .to_string(),
      params: vec![
        JsonValue::String(session.id.clone()),
        JsonValue::String(session.day_key.clone()),
        json_number(session.duration_minutes),
        JsonValue::String(session.note.clone()),
        json_number(session.created_at),
        JsonValue::String(json_string(session)),
      ],
    },
  )
  .await
}

async fn migrate_recordings(state: &mut MigrationState) -> Result<(), wasm_bindgen::JsValue> {
  let recordings = storage::get_recordings().await.unwrap_or_default();
  migrate_typed_store(
    "recordings",
    recordings,
    state,
    |recording| DbStatement {
      sql: "INSERT OR REPLACE INTO recordings (id, created_at, duration_seconds, mime_type, size_bytes, format, opfs_path, profile_id, payload) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
        .to_string(),
      params: vec![
        JsonValue::String(recording.id.clone()),
        json_number(recording.created_at),
        json_number(recording.duration_seconds),
        JsonValue::String(recording.mime_type.clone()),
        json_number(recording.size_bytes),
        JsonValue::String(recording.format.clone()),
        optional_string(recording.opfs_path.clone()),
        optional_string(recording.profile_id.clone()),
        JsonValue::String(recording_payload(recording)),
      ],
    },
  )
  .await
}

async fn migrate_typed_store<T, F>(
  store: &str,
  items: Vec<T>,
  state: &mut MigrationState,
  mut to_statement: F,
) -> Result<(), wasm_bindgen::JsValue>
where
  T: Clone,
  F: FnMut(&T) -> DbStatement,
{
  let total = items.len();
  let resume_index = resume_index_for(store, state);
  if resume_index >= total {
    return Ok(());
  }

  log_event(store, "info", "Migration started").await?;

  let mut processed = resume_index;
  while processed < total {
    let end = (processed + BATCH_SIZE).min(total);
    let chunk = &items[processed..end];
    let statements = chunk.iter().map(|item| to_statement(item)).collect();
    db_client::batch(statements, true).await?;
    processed = end;
    update_progress(store, processed, total, state).await?;
  }

  log_event(store, "info", "Migration complete").await?;
  Ok(())
}

async fn migrate_json_store(
  store: &str,
  table: &str,
  items: Vec<wasm_bindgen::JsValue>,
  state: &mut MigrationState,
) -> Result<(), wasm_bindgen::JsValue> {
  let total = items.len();
  let resume_index = resume_index_for(store, state);
  if resume_index >= total {
    return Ok(());
  }

  log_event(store, "info", "Migration started").await?;

  let mut processed = resume_index;
  while processed < total {
    let end = (processed + BATCH_SIZE).min(total);
    let chunk = &items[processed..end];
    let mut statements = Vec::with_capacity(chunk.len());
    for item in chunk {
      let json = js_to_json(item);
      let id = extract_string(&json, "id").unwrap_or_else(|| utils::create_id());
      let created_at = extract_number(&json, "created_at").unwrap_or(0.0);
      let payload = json_string_from_json(&json);

      let statement = match table {
        "score_library" => DbStatement {
          sql: "INSERT OR REPLACE INTO score_library (id, title, composer, created_at, payload) VALUES (?1, ?2, ?3, ?4, ?5)".to_string(),
          params: vec![
            JsonValue::String(id),
            optional_json_string(extract_string(&json, "title")),
            optional_json_string(extract_string(&json, "composer")),
            json_number(created_at),
            JsonValue::String(payload),
          ],
        },
        "profiles" => DbStatement {
          sql: "INSERT OR REPLACE INTO profiles (id, name, created_at, payload) VALUES (?1, ?2, ?3, ?4)".to_string(),
          params: vec![
            JsonValue::String(id),
            optional_json_string(extract_string(&json, "name")),
            optional_json_number(extract_number(&json, "created_at")),
            JsonValue::String(payload),
          ],
        },
        "assignments" => DbStatement {
          sql: "INSERT OR REPLACE INTO assignments (id, created_at, payload) VALUES (?1, ?2, ?3)".to_string(),
          params: vec![
            JsonValue::String(id),
            optional_json_number(extract_number(&json, "created_at")),
            JsonValue::String(payload),
          ],
        },
        "share_inbox" => DbStatement {
          sql: \"INSERT OR REPLACE INTO share_inbox (id, name, size, mime, created_at, payload) VALUES (?1, ?2, ?3, ?4, ?5, ?6)\".to_string(),
          params: vec![
            JsonValue::String(id),
            optional_json_string(extract_string(&json, \"name\")),
            json_number(extract_number(&json, \"size\").unwrap_or(0.0)),
            optional_json_string(extract_string(&json, \"mime\")),
            json_number(created_at),
            JsonValue::String(payload),
          ],
        },
        _ => DbStatement {
          sql: format!(
            "INSERT OR REPLACE INTO {} (id, created_at, payload) VALUES (?1, ?2, ?3)",
            table
          ),
          params: vec![
            JsonValue::String(id),
            json_number(created_at),
            JsonValue::String(payload),
          ],
        },
      };

      statements.push(statement);
    }
    db_client::batch(statements, true).await?;
    processed = end;
    update_progress(store, processed, total, state).await?;
  }

  log_event(store, "info", "Migration complete").await?;
  Ok(())
}

async fn update_progress(
  store: &str,
  processed: usize,
  total: usize,
  state: &mut MigrationState,
) -> Result<(), wasm_bindgen::JsValue> {
  state.last_store = Some(store.to_string());
  state.last_index = Some(processed);
  state.counts.insert(store.to_string(), processed);
  state.updated_at = now_ms();
  upsert_state(state).await?;
  dom::set_text(
    "[data-db-migrate-status]",
    &format!("Migrating {}: {}/{}", store, processed, total),
  );
  Ok(())
}

async fn load_state() -> Result<Option<MigrationState>, wasm_bindgen::JsValue> {
  let rows = db_client::query(
    "SELECT source_version, started_at, updated_at, last_store, last_index, counts_json, errors_json, completed_at FROM migration_state WHERE id = ?1",
    vec![JsonValue::String(MIGRATION_ID.to_string())],
  )
  .await?;
  let row = match rows.first() {
    Some(row) => row,
    None => return Ok(None),
  };

  let source_version = extract_number(row, "source_version").unwrap_or(storage::DB_VERSION as f64) as u32;
  let started_at = extract_number(row, "started_at").unwrap_or(0.0);
  let updated_at = extract_number(row, "updated_at").unwrap_or(0.0);
  let last_store = extract_string(row, "last_store");
  let last_index = extract_number(row, "last_index").map(|v| v as usize);
  let counts_json = extract_string(row, "counts_json").unwrap_or_else(|| "{}".to_string());
  let errors_json = extract_string(row, "errors_json").unwrap_or_else(|| "[]".to_string());
  let completed_at = extract_number(row, "completed_at");

  let counts: HashMap<String, usize> = serde_json::from_str(&counts_json).unwrap_or_default();
  let errors: Vec<String> = serde_json::from_str(&errors_json).unwrap_or_default();

  Ok(Some(MigrationState {
    source_version,
    started_at,
    updated_at,
    last_store,
    last_index,
    counts,
    errors,
    completed_at,
  }))
}

async fn upsert_state(state: &MigrationState) -> Result<(), wasm_bindgen::JsValue> {
  let counts_json = serde_json::to_string(&state.counts).unwrap_or_else(|_| "{}".to_string());
  let errors_json = serde_json::to_string(&state.errors).unwrap_or_else(|_| "[]".to_string());
  let completed_at = match state.completed_at {
    Some(value) => json_number(value),
    None => JsonValue::Null,
  };

  db_client::exec(
    "INSERT OR REPLACE INTO migration_state (id, source_version, started_at, updated_at, last_store, last_index, counts_json, errors_json, completed_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
    vec![
      JsonValue::String(MIGRATION_ID.to_string()),
      JsonValue::Number(JsonNumber::from(state.source_version as u64)),
      json_number(state.started_at),
      json_number(state.updated_at),
      optional_json_string(state.last_store.clone()),
      optional_json_number(state.last_index.map(|v| v as f64)),
      JsonValue::String(counts_json),
      JsonValue::String(errors_json),
      completed_at,
    ],
  )
  .await
}

async fn log_event(store: &str, level: &str, message: &str) -> Result<(), wasm_bindgen::JsValue> {
  db_client::exec(
    "INSERT OR REPLACE INTO migration_log (id, migration_id, store, level, message, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    vec![
      JsonValue::String(utils::create_id()),
      JsonValue::String(MIGRATION_ID.to_string()),
      JsonValue::String(store.to_string()),
      JsonValue::String(level.to_string()),
      JsonValue::String(message.to_string()),
      json_number(now_ms()),
    ],
  )
  .await
}

fn resume_index_for(store: &str, state: &MigrationState) -> usize {
  match &state.last_store {
    Some(last_store) if last_store == store => state.last_index.unwrap_or(0),
    Some(_) => 0,
    None => 0,
  }
}

fn now_ms() -> f64 {
  js_sys::Date::now()
}

fn json_number(value: f64) -> JsonValue {
  JsonNumber::from_f64(value).map(JsonValue::Number).unwrap_or(JsonValue::Null)
}

fn optional_json_number(value: Option<f64>) -> JsonValue {
  value
    .and_then(JsonNumber::from_f64)
    .map(JsonValue::Number)
    .unwrap_or(JsonValue::Null)
}

fn optional_string(value: Option<String>) -> JsonValue {
  value.map(JsonValue::String).unwrap_or(JsonValue::Null)
}

fn optional_json_string(value: Option<String>) -> JsonValue {
  value.map(JsonValue::String).unwrap_or(JsonValue::Null)
}

fn json_string<T: Serialize>(value: &T) -> String {
  serde_json::to_string(value).unwrap_or_else(|_| "{}".to_string())
}

fn recording_payload(recording: &Recording) -> String {
  serde_json::json!({
    "id": recording.id,
    "created_at": recording.created_at,
    "duration_seconds": recording.duration_seconds,
    "mime_type": recording.mime_type,
    "size_bytes": recording.size_bytes,
    "format": recording.format,
    "opfs_path": recording.opfs_path,
    "profile_id": recording.profile_id,
  })
  .to_string()
}

fn json_string_from_json(value: &JsonValue) -> String {
  serde_json::to_string(value).unwrap_or_else(|_| "{}".to_string())
}

fn js_to_json(value: &wasm_bindgen::JsValue) -> JsonValue {
  serde_wasm_bindgen::from_value(value.clone()).unwrap_or(JsonValue::Null)
}

fn extract_string(value: &JsonValue, key: &str) -> Option<String> {
  match value {
    JsonValue::Object(map) => map.get(key).and_then(|v| v.as_str()).map(|v| v.to_string()),
    _ => None,
  }
}

fn extract_number(value: &JsonValue, key: &str) -> Option<f64> {
  match value {
    JsonValue::Object(map) => map.get(key).and_then(|v| v.as_f64()),
    _ => None,
  }
}
