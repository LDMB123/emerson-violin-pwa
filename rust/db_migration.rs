use std::collections::HashMap;

use js_sys::{Date, Reflect};
use serde::{Deserialize, Serialize};
use serde_json::{Number as JsonNumber, Value as JsonValue};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;
use web_sys::{Blob, Event, HtmlElement};

use crate::db_client;
use crate::db_messages::DbStatement;
use crate::dom;
use crate::file_access;
use crate::storage;
use crate::utils;

const MIGRATION_ID: &str = "active";
const BATCH_SIZE: usize = 200;
const CTA_DISMISSED_KEY: &str = "migrate:cta-dismissed";

fn cta_dismissed() -> bool {
  dom::window()
    .local_storage()
    .ok()
    .flatten()
    .and_then(|ls| ls.get_item(CTA_DISMISSED_KEY).ok().flatten())
    .is_some()
}

fn dismiss_cta() {
  if let Ok(Some(ls)) = dom::window().local_storage() {
    let _ = ls.set_item(CTA_DISMISSED_KEY, &format!("{:.0}", js_sys::Date::now()));
  }
}

#[derive(Clone, Copy)]
enum StoreKind {
  Sessions,
  Recordings,
  SyncQueue,
  ShareInbox,
  ScoreLibrary,
  Profiles,
  Assignments,
  Default,
}

#[derive(Clone, Copy)]
struct StoreSpec {
  store: &'static str,
  table: &'static str,
  kind: StoreKind,
}

const STORE_SPECS: &[StoreSpec] = &[
  StoreSpec {
    store: "sessions",
    table: "sessions",
    kind: StoreKind::Sessions,
  },
  StoreSpec {
    store: "recordings",
    table: "recordings",
    kind: StoreKind::Recordings,
  },
  StoreSpec {
    store: "syncQueue",
    table: "sync_queue",
    kind: StoreKind::SyncQueue,
  },
  StoreSpec {
    store: "shareInbox",
    table: "share_inbox",
    kind: StoreKind::ShareInbox,
  },
  StoreSpec {
    store: "mlTraces",
    table: "ml_traces",
    kind: StoreKind::Default,
  },
  StoreSpec {
    store: "gameScores",
    table: "game_scores",
    kind: StoreKind::Default,
  },
  StoreSpec {
    store: "scoreLibrary",
    table: "score_library",
    kind: StoreKind::ScoreLibrary,
  },
  StoreSpec {
    store: "assignments",
    table: "assignments",
    kind: StoreKind::Assignments,
  },
  StoreSpec {
    store: "profiles",
    table: "profiles",
    kind: StoreKind::Profiles,
  },
  StoreSpec {
    store: "telemetryQueue",
    table: "telemetry_queue",
    kind: StoreKind::Default,
  },
  StoreSpec {
    store: "errorQueue",
    table: "error_queue",
    kind: StoreKind::Default,
  },
  StoreSpec {
    store: "scoreScans",
    table: "score_scans",
    kind: StoreKind::Default,
  },
  StoreSpec {
    store: "modelCache",
    table: "model_cache",
    kind: StoreKind::Default,
  },
];

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
struct ChecksumEntry {
  idb_count: usize,
  sqlite_count: usize,
  idb_hash: String,
  sqlite_hash: String,
  ok: bool,
}

#[derive(Debug, Default, Clone)]
struct Checksum {
  count: usize,
  hash: String,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
struct MigrationState {
  source_version: u32,
  started_at: f64,
  updated_at: f64,
  last_store: Option<String>,
  last_index: Option<usize>,
  last_key: Option<String>,
  counts: HashMap<String, usize>,
  errors: Vec<String>,
  checksums: HashMap<String, ChecksumEntry>,
  completed_at: Option<f64>,
}

#[derive(Serialize)]
struct MigrationReport {
  generated_at: f64,
  state: Option<MigrationState>,
  logs: Vec<JsonValue>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MigrationSummary {
  pub started: bool,
  pub completed: bool,
  pub checksums_ok: bool,
  pub errors: Vec<String>,
}

pub async fn migration_summary() -> Result<MigrationSummary, JsValue> {
  db_client::init_db().await?;
  let state = load_state().await?;
  if let Some(state) = state {
    let started = state.started_at > 0.0;
    let completed = state.completed_at.is_some();
    let checksums_ok = state.checksums.values().all(|entry| entry.ok);
    Ok(MigrationSummary {
      started,
      completed,
      checksums_ok,
      errors: state.errors.clone(),
    })
  } else {
    Ok(MigrationSummary {
      started: false,
      completed: false,
      checksums_ok: true,
      errors: Vec::new(),
    })
  }
}

pub fn init() {
  if let Some(btn) = dom::query("[data-db-migrate]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      dom::set_text("[data-db-migrate-status]", "Starting migration...");
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
        refresh_status();
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-db-migrate-report]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      dom::set_text("[data-db-migrate-status]", "Exporting migration report...");
      if let Some(btn) = dom::query("[data-db-migrate-report]") {
        let _ = btn.set_attribute("disabled", "true");
      }
      spawn_local(async move {
        let result = export_report().await;
        if let Err(err) = result {
          dom::set_text(
            "[data-db-migrate-status]",
            &format!("Report export failed: {}", err.as_string().unwrap_or_default()),
          );
        }
        if let Some(btn) = dom::query("[data-db-migrate-report]") {
          let _ = btn.remove_attribute("disabled");
        }
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-db-migrate-cleanup]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let confirmed = dom::window()
        .confirm_with_message(
          "Purge legacy IndexedDB now? This deletes the old IDB stores after migration verification and cannot be undone. Export a backup first if you might need it.",
        )
        .unwrap_or(false);
      if !confirmed {
        dom::set_text("[data-db-migrate-status]", "Legacy IndexedDB purge canceled.");
        refresh_status();
        return;
      }
      dom::set_text("[data-db-migrate-status]", "Purging legacy IndexedDB...");
      if let Some(btn) = dom::query("[data-db-migrate-cleanup]") {
        let _ = btn.set_attribute("disabled", "true");
      }
      spawn_local(async move {
        let result = storage::purge_idb_after_migration().await;
        match result {
          Ok(count) => {
            dom::set_text("[data-db-migrate-status]", &format!("Legacy IndexedDB cleared ({} stores)", count));
          }
          Err(err) => {
            dom::set_text("[data-db-migrate-status]", &format!("Legacy IndexedDB cleanup failed: {}", err.as_string().unwrap_or_default()));
          }
        }
        refresh_status();
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  // Migration CTA banner actions
  if let Some(btn) = dom::query("[data-migrate-banner-action]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      show_banner(false);
      if let Some(migrate_btn) = dom::query("[data-db-migrate]") {
        let _ = migrate_btn.dyn_ref::<HtmlElement>().map(|el| el.click());
      }
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-migrate-banner-dismiss]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      dismiss_cta();
      show_banner(false);
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  refresh_status();
}

pub fn check_migration_cta() {
  spawn_local(async move {
    if cta_dismissed() {
      return;
    }

    if !storage::legacy_idb_has_data().await {
      return;
    }

    if let Ok(summary) = storage::get_migration_summary().await {
      if summary.completed && summary.checksums_ok && summary.errors.is_empty() {
        return;
      }
    }

    let total = storage::legacy_idb_total_count().await;
    if total == 0 {
      return;
    }

    let est_seconds = (total as f64 / 50.0).ceil().max(1.0);
    let estimate = if est_seconds < 60.0 {
      format!("{:.0} seconds", est_seconds)
    } else {
      format!("{:.0} minutes", (est_seconds / 60.0).ceil())
    };

    let copy = format!(
      "{} practice records can be upgraded to a faster local database. Estimated time: {}.",
      total, estimate
    );
    dom::set_text("[data-migrate-banner-copy]", &copy);
    show_banner(true);
  });
}

fn show_banner(visible: bool) {
  if let Some(el) = dom::query("[data-migrate-banner]") {
    if visible {
      let _ = el.remove_attribute("hidden");
    } else {
      let _ = el.set_attribute("hidden", "");
    }
  }
}

fn refresh_status() {
  spawn_local(async move {
    match storage::get_migration_summary().await {
      Ok(summary) => {
        let sqlite_active = storage::is_sqlite_active().await;
        let legacy_has_data = storage::legacy_idb_has_data().await;
        render_summary(&summary, legacy_has_data, sqlite_active);
      }
      Err(_) => {
        dom::set_text("[data-db-migrate-state]", "Migration: Unavailable");
        dom::set_text("[data-db-migrate-checksums]", "Checksums: Unavailable");
        dom::set_text("[data-db-migrate-idb]", "Legacy IDB: Unavailable");
        dom::set_text("[data-db-mode]", "Unknown");
        set_cleanup_enabled(false);
      }
    }
  });
}

fn render_summary(summary: &storage::MigrationSummary, legacy_has_data: bool, sqlite_active: bool) {
  let ready = summary.completed && summary.errors.is_empty() && summary.checksums_ok;
  let mode = if ready {
    "SQLite (verified)".to_string()
  } else if sqlite_active {
    if legacy_has_data {
      "SQLite (primary)".to_string()
    } else {
      "SQLite (primary, no legacy)".to_string()
    }
  } else if summary.started {
    "IDB fallback (migration pending)".to_string()
  } else if legacy_has_data {
    "IDB fallback (legacy active)".to_string()
  } else {
    "IDB fallback (SQLite unavailable)".to_string()
  };
  dom::set_text("[data-db-mode]", &mode);

  let status = if !summary.started {
    "Not started".to_string()
  } else if summary.completed {
    if ready {
      "Complete (verified)".to_string()
    } else {
      "Complete (issues)".to_string()
    }
  } else {
    let last = summary
      .last_store
      .as_deref()
      .unwrap_or("in progress");
    format!("In progress ({})", last)
  };
  dom::set_text("[data-db-migrate-state]", &format!("Migration: {}", status));

  let checks = if !summary.started {
    "Checksums: n/a".to_string()
  } else if summary.checksums_ok {
    "Checksums: OK".to_string()
  } else {
    "Checksums: Failed".to_string()
  };
  dom::set_text("[data-db-migrate-checksums]", &checks);

  let purged_at = storage::idb_purged_at();
  let idb_status = if let Some(ts) = purged_at {
    format!("Legacy IDB: Purged {}", format_timestamp(ts))
  } else if ready {
    if legacy_has_data {
      "Legacy IDB: Ready to purge".to_string()
    } else {
      "Legacy IDB: Empty (no purge needed)".to_string()
    }
  } else if summary.started {
    "Legacy IDB: Blocked until verified".to_string()
  } else {
    if legacy_has_data {
      "Legacy IDB: Active".to_string()
    } else {
      "Legacy IDB: Empty".to_string()
    }
  };
  dom::set_text("[data-db-migrate-idb]", &idb_status);

  set_cleanup_enabled(ready && purged_at.is_none() && legacy_has_data);
}

fn set_cleanup_enabled(enabled: bool) {
  if let Some(btn) = dom::query("[data-db-migrate-cleanup]") {
    if enabled {
      let _ = btn.remove_attribute("disabled");
    } else {
      let _ = btn.set_attribute("disabled", "true");
    }
  }
}

fn format_timestamp(ts: f64) -> String {
  if ts <= 0.0 {
    return "Unknown".to_string();
  }
  Date::new(&JsValue::from_f64(ts))
    .to_iso_string()
    .as_string()
    .unwrap_or_else(|| "Unknown".to_string())
}
async fn run_migration() -> Result<(), wasm_bindgen::JsValue> {
  db_client::init_db().await?;

  let mut state = load_state().await?.unwrap_or_default();
  if state.started_at == 0.0 || state.completed_at.is_some() {
    state = MigrationState {
      source_version: storage::DB_VERSION,
      started_at: now_ms(),
      updated_at: now_ms(),
      last_store: None,
      last_index: None,
      last_key: None,
      counts: HashMap::new(),
      errors: Vec::new(),
      checksums: HashMap::new(),
      completed_at: None,
    };
  }

  upsert_state(&state).await?;

  for spec in STORE_SPECS {
    migrate_store(*spec, &mut state).await?;
  }

  verify_counts_and_checksums(&mut state).await?;

  state.completed_at = Some(now_ms());
  state.updated_at = now_ms();
  state.last_store = None;
  state.last_index = None;
  state.last_key = None;
  upsert_state(&state).await?;

  if state.errors.is_empty() {
    dom::set_text("[data-db-migrate-status]", "Migration complete.");
  } else {
    dom::set_text(
      "[data-db-migrate-status]",
      "Migration complete with warnings. Export report for details.",
    );
  }
  Ok(())
}

async fn export_report() -> Result<(), wasm_bindgen::JsValue> {
  db_client::init_db().await?;
  let state = load_state().await?;
  let logs = db_client::query(
    "SELECT store, level, message, created_at FROM migration_log WHERE migration_id = ?1 ORDER BY created_at",
    vec![JsonValue::String(MIGRATION_ID.to_string())],
  )
  .await?;
  let report = MigrationReport {
    generated_at: now_ms(),
    state,
    logs,
  };
  let bytes = serde_json::to_vec_pretty(&report).unwrap_or_else(|_| b"{}".to_vec());
  let ok = file_access::save_or_download("emerson-migration-report.json", "application/json", &bytes).await;
  if ok {
    dom::set_text("[data-db-migrate-status]", "Migration report exported.");
  } else {
    dom::set_text("[data-db-migrate-status]", "Migration report export failed.");
  }
  Ok(())
}

async fn migrate_store(spec: StoreSpec, state: &mut MigrationState) -> Result<(), wasm_bindgen::JsValue> {
  let total = storage::get_store_count(spec.store).await.unwrap_or(0) as usize;
  if total == 0 {
    state.counts.insert(spec.store.to_string(), 0);
    return Ok(());
  }

  let resume_key = resume_key_for(spec.store, state);
  if resume_key.is_none() && state.last_store.as_deref() == Some(spec.store) && state.last_index.is_some() {
    log_event(spec.store, "warn", "Legacy resume index present; restarting store").await?;
  }

  log_event(spec.store, "info", "Migration started").await?;

  let mut processed = state.counts.get(spec.store).copied().unwrap_or(0);
  let mut last_key = resume_key;
  loop {
    let batch = storage::get_store_batch(spec.store, last_key.clone(), BATCH_SIZE).await?;
    if batch.values.is_empty() {
      break;
    }

    let mut statements = Vec::with_capacity(batch.values.len());
    for value in batch.values.iter() {
      let statement = match spec.kind {
        StoreKind::Sessions => session_statement(value),
        StoreKind::Recordings => recording_statement_with_blob(value).await,
        StoreKind::SyncQueue => sync_queue_statement(value),
        StoreKind::ShareInbox => share_inbox_statement_with_blob(value).await,
        StoreKind::ScoreLibrary => score_library_statement(value),
        StoreKind::Profiles => profiles_statement(value),
        StoreKind::Assignments => assignments_statement(value),
        StoreKind::Default => default_statement(spec.table, value),
      };
      statements.push(statement);
    }

    if !statements.is_empty() {
      db_client::batch(statements, true).await?;
    }

    processed = processed.saturating_add(batch.values.len());
    last_key = batch.last_key.clone();
    update_progress(spec.store, processed, total, last_key.clone(), state).await?;

    if processed >= total || last_key.is_none() {
      break;
    }
  }

  log_event(spec.store, "info", "Migration complete").await?;
  Ok(())
}

async fn verify_counts_and_checksums(state: &mut MigrationState) -> Result<(), wasm_bindgen::JsValue> {
  let mut report = HashMap::new();

  for spec in STORE_SPECS {
    dom::set_text(
      "[data-db-migrate-status]",
      &format!("Verifying {}...", spec.store),
    );
    let idb = checksum_idb(*spec).await?;
    let sqlite = checksum_sqlite(spec.table).await?;
    let ok = idb.count == sqlite.count && idb.hash == sqlite.hash;
    let entry = ChecksumEntry {
      idb_count: idb.count,
      sqlite_count: sqlite.count,
      idb_hash: idb.hash.clone(),
      sqlite_hash: sqlite.hash.clone(),
      ok,
    };
    report.insert(spec.store.to_string(), entry);

    if ok {
      log_event(spec.store, "info", "Verification ok").await?;
    } else {
      let message = format!(
        "Checksum mismatch: idb {}:{} vs sqlite {}:{}",
        idb.count, idb.hash, sqlite.count, sqlite.hash
      );
      state.errors.push(format!("{}: {}", spec.store, message));
      log_event(spec.store, "error", &message).await?;
    }
  }

  state.checksums = report;
  state.updated_at = now_ms();
  upsert_state(state).await?;
  Ok(())
}

async fn checksum_idb(spec: StoreSpec) -> Result<Checksum, wasm_bindgen::JsValue> {
  let mut hasher = Fnv1a::new();
  let mut count = 0usize;
  let mut last_key = None;

  loop {
    let batch = storage::get_store_batch(spec.store, last_key.clone(), BATCH_SIZE).await?;
    if batch.values.is_empty() {
      break;
    }

    for value in batch.values.iter() {
      let (id, created_at) = identity_from_js(spec.kind, value);
      hasher.update_record(&id, created_at);
      count = count.saturating_add(1);
    }

    last_key = batch.last_key.clone();
    if last_key.is_none() {
      break;
    }
  }

  Ok(Checksum {
    count,
    hash: hasher.finish_hex(),
  })
}

async fn checksum_sqlite(table: &str) -> Result<Checksum, wasm_bindgen::JsValue> {
  let mut hasher = Fnv1a::new();
  let mut count = 0usize;
  let mut last_id: Option<String> = None;

  loop {
    let (sql, params) = match &last_id {
      Some(id) => (
        format!(
          "SELECT id, created_at, payload FROM {} WHERE id > ?1 ORDER BY id LIMIT ?2",
          table
        ),
        vec![
          JsonValue::String(id.clone()),
          JsonValue::Number(JsonNumber::from(BATCH_SIZE as u64)),
        ],
      ),
      None => (
        format!("SELECT id, created_at, payload FROM {} ORDER BY id LIMIT ?1", table),
        vec![JsonValue::Number(JsonNumber::from(BATCH_SIZE as u64))],
      ),
    };

    let rows = db_client::query(&sql, params).await?;
    if rows.is_empty() {
      break;
    }

    for row in rows.iter() {
      let (id, created_at) = identity_from_row(row);
      hasher.update_record(&id, created_at);
      count = count.saturating_add(1);
      last_id = Some(id);
    }

    if rows.len() < BATCH_SIZE {
      break;
    }
  }

  Ok(Checksum {
    count,
    hash: hasher.finish_hex(),
  })
}

async fn update_progress(
  store: &str,
  processed: usize,
  total: usize,
  last_key: Option<String>,
  state: &mut MigrationState,
) -> Result<(), wasm_bindgen::JsValue> {
  state.last_store = Some(store.to_string());
  state.last_index = None;
  state.last_key = last_key;
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
    "SELECT source_version, started_at, updated_at, last_store, last_index, last_key, counts_json, errors_json, checksums_json, completed_at FROM migration_state WHERE id = ?1",
    vec![JsonValue::String(MIGRATION_ID.to_string())],
  )
  .await?;
  let row = match rows.first() {
    Some(row) => row,
    None => return Ok(None),
  };

  let source_version =
    extract_number(row, "source_version").unwrap_or(storage::DB_VERSION as f64) as u32;
  let started_at = extract_number(row, "started_at").unwrap_or(0.0);
  let updated_at = extract_number(row, "updated_at").unwrap_or(0.0);
  let last_store = extract_string(row, "last_store");
  let last_index = extract_number(row, "last_index").map(|v| v as usize);
  let last_key = extract_string(row, "last_key");
  let counts_json = extract_string(row, "counts_json").unwrap_or_else(|| "{}".to_string());
  let errors_json = extract_string(row, "errors_json").unwrap_or_else(|| "[]".to_string());
  let checksums_json = extract_string(row, "checksums_json").unwrap_or_else(|| "{}".to_string());
  let completed_at = extract_number(row, "completed_at");

  let counts: HashMap<String, usize> = serde_json::from_str(&counts_json).unwrap_or_default();
  let errors: Vec<String> = serde_json::from_str(&errors_json).unwrap_or_default();
  let checksums: HashMap<String, ChecksumEntry> =
    serde_json::from_str(&checksums_json).unwrap_or_default();

  Ok(Some(MigrationState {
    source_version,
    started_at,
    updated_at,
    last_store,
    last_index,
    last_key,
    counts,
    errors,
    checksums,
    completed_at,
  }))
}

async fn upsert_state(state: &MigrationState) -> Result<(), wasm_bindgen::JsValue> {
  let counts_json = serde_json::to_string(&state.counts).unwrap_or_else(|_| "{}".to_string());
  let errors_json = serde_json::to_string(&state.errors).unwrap_or_else(|_| "[]".to_string());
  let checksums_json =
    serde_json::to_string(&state.checksums).unwrap_or_else(|_| "{}".to_string());
  let completed_at = match state.completed_at {
    Some(value) => json_number(value),
    None => JsonValue::Null,
  };

  db_client::exec(
    "INSERT OR REPLACE INTO migration_state (id, source_version, started_at, updated_at, last_store, last_index, last_key, counts_json, errors_json, checksums_json, completed_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
    vec![
      JsonValue::String(MIGRATION_ID.to_string()),
      JsonValue::Number(JsonNumber::from(state.source_version as u64)),
      json_number(state.started_at),
      json_number(state.updated_at),
      optional_json_string(state.last_store.clone()),
      JsonValue::Null,
      optional_json_string(state.last_key.clone()),
      JsonValue::String(counts_json),
      JsonValue::String(errors_json),
      JsonValue::String(checksums_json),
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

fn resume_key_for(store: &str, state: &MigrationState) -> Option<String> {
  match &state.last_store {
    Some(last_store) if last_store == store => state.last_key.clone(),
    Some(_) => None,
    None => None,
  }
}

fn session_statement(value: &JsValue) -> DbStatement {
  let json = js_to_json(value);
  let id = extract_id(&json);
  let day_key = extract_string_any(&json, &["day_key", "dayKey"]).unwrap_or_default();
  let duration = extract_number_any(&json, &["duration_minutes", "durationMinutes"]).unwrap_or(0.0);
  let note = extract_string_any(&json, &["note"]).unwrap_or_default();
  let created_at = extract_created_at(&json);
  let payload = json_string_from_json(&json);

  DbStatement {
    sql: "INSERT OR REPLACE INTO sessions (id, day_key, duration_minutes, note, created_at, payload) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
      .to_string(),
    params: vec![
      JsonValue::String(id),
      JsonValue::String(day_key),
      json_number(duration),
      JsonValue::String(note),
      json_number(created_at),
      JsonValue::String(payload),
    ],
  }
}

fn recording_statement(value: &JsValue) -> DbStatement {
  let json = js_to_json(value);
  let id = js_string_any(value, &["id"]).unwrap_or_else(|| extract_id(&json));
  let created_at = js_number_any(value, &["created_at", "createdAt"]).unwrap_or_else(|| extract_created_at(&json));
  let duration = js_number_any(value, &["duration_seconds", "durationSeconds"]).unwrap_or(0.0);
  let mime_type = js_string_any(value, &["mime_type", "mimeType"]).unwrap_or_else(|| "audio/webm".to_string());
  let size_bytes = js_number_any(value, &["size_bytes", "sizeBytes"]).unwrap_or(0.0);
  let format = js_string_any(value, &["format"]).unwrap_or_else(|| "unknown".to_string());
  let opfs_path = js_string_any(value, &["opfs_path", "opfsPath"]);
  let profile_id = js_string_any(value, &["profile_id", "profileId"]);

  let payload = serde_json::json!({
    "id": &id,
    "created_at": created_at,
    "duration_seconds": duration,
    "mime_type": &mime_type,
    "size_bytes": size_bytes,
    "format": &format,
    "opfs_path": &opfs_path,
    "profile_id": &profile_id,
  })
  .to_string();

  DbStatement {
    sql: "INSERT OR REPLACE INTO recordings (id, created_at, duration_seconds, mime_type, size_bytes, format, opfs_path, profile_id, payload) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
      .to_string(),
    params: vec![
      JsonValue::String(id),
      json_number(created_at),
      json_number(duration),
      JsonValue::String(mime_type),
      json_number(size_bytes),
      JsonValue::String(format),
      optional_json_string(opfs_path),
      optional_json_string(profile_id),
      JsonValue::String(payload),
    ],
  }
}

async fn recording_statement_with_blob(value: &JsValue) -> DbStatement {
  let json = js_to_json(value);
  let id = js_string_any(value, &["id"]).unwrap_or_else(|| extract_id(&json));
  let created_at = js_number_any(value, &["created_at", "createdAt"]).unwrap_or_else(|| extract_created_at(&json));
  let duration = js_number_any(value, &["duration_seconds", "durationSeconds"]).unwrap_or(0.0);
  let blob = Reflect::get(value, &"blob".into())
    .ok()
    .and_then(|val| val.dyn_into::<Blob>().ok());

  let mime_type = js_string_any(value, &["mime_type", "mimeType"]).or_else(|| {
    blob.as_ref().and_then(|b| {
      let t = b.type_();
      if t.is_empty() {
        None
      } else {
        Some(t)
      }
    })
  }).unwrap_or_else(|| "audio/webm".to_string());
  let size_bytes = js_number_any(value, &["size_bytes", "sizeBytes"]).or_else(|| {
    blob.as_ref().map(|b| b.size() as f64)
  }).unwrap_or(0.0);
  let format = js_string_any(value, &["format"]).unwrap_or_else(|| "webm".to_string());
  let profile_id = js_string_any(value, &["profile_id", "profileId"]);

  let opfs_path = match blob.as_ref() {
    Some(blob) => storage::save_recording_blob(&id, &format, blob).await,
    None => None,
  };

  let payload = serde_json::json!({
    "id": &id,
    "created_at": created_at,
    "duration_seconds": duration,
    "mime_type": &mime_type,
    "size_bytes": size_bytes,
    "format": &format,
    "opfs_path": &opfs_path,
    "profile_id": &profile_id,
  })
  .to_string();

  DbStatement {
    sql: "INSERT OR REPLACE INTO recordings (id, created_at, duration_seconds, mime_type, size_bytes, format, opfs_path, profile_id, payload) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
      .to_string(),
    params: vec![
      JsonValue::String(id),
      json_number(created_at),
      json_number(duration),
      JsonValue::String(mime_type),
      json_number(size_bytes),
      JsonValue::String(format),
      optional_json_string(opfs_path),
      optional_json_string(profile_id),
      JsonValue::String(payload),
    ],
  }
}

fn sync_queue_statement(value: &JsValue) -> DbStatement {
  let json = js_to_json(value);
  let id = extract_id(&json);
  let created_at = extract_created_at(&json);
  let payload = payload_from_json(&json, "payload");

  DbStatement {
    sql: "INSERT OR REPLACE INTO sync_queue (id, created_at, payload) VALUES (?1, ?2, ?3)".to_string(),
    params: vec![
      JsonValue::String(id),
      json_number(created_at),
      JsonValue::String(payload),
    ],
  }
}

fn share_inbox_statement(value: &JsValue) -> DbStatement {
  let json = js_to_json(value);
  let id = js_string_any(value, &["id"]).unwrap_or_else(|| extract_id(&json));
  let name = js_string_any(value, &["name"]).unwrap_or_default();
  let size = js_number_any(value, &["size"]).unwrap_or(0.0);
  let mime = js_string_any(value, &["mime", "type"]).unwrap_or_else(|| "application/octet-stream".to_string());
  let created_at = js_number_any(value, &["created_at", "createdAt"]).unwrap_or_else(|| extract_created_at(&json));
  let payload = serde_json::json!({
    "id": &id,
    "name": &name,
    "size": size,
    "mime": &mime,
    "created_at": created_at,
  })
  .to_string();

  DbStatement {
    sql: "INSERT OR REPLACE INTO share_inbox (id, name, size, mime, created_at, payload) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
      .to_string(),
    params: vec![
      JsonValue::String(id),
      JsonValue::String(name),
      json_number(size),
      JsonValue::String(mime),
      json_number(created_at),
      JsonValue::String(payload),
    ],
  }
}

async fn share_inbox_statement_with_blob(value: &JsValue) -> DbStatement {
  let json = js_to_json(value);
  let id = js_string_any(value, &["id"]).unwrap_or_else(|| extract_id(&json));
  let name = js_string_any(value, &["name"]).unwrap_or_default();
  let size = js_number_any(value, &["size"]).unwrap_or(0.0);
  let mime = js_string_any(value, &["mime", "type"]).unwrap_or_else(|| "application/octet-stream".to_string());
  let created_at = js_number_any(value, &["created_at", "createdAt"]).unwrap_or_else(|| extract_created_at(&json));
  let blob = Reflect::get(value, &"blob".into())
    .ok()
    .and_then(|val| val.dyn_into::<Blob>().ok());
  let opfs_path = match blob.as_ref() {
    Some(blob) => storage::save_share_blob(&id, &name, blob).await,
    None => None,
  };
  let payload = serde_json::json!({
    "id": &id,
    "name": &name,
    "size": size,
    "mime": &mime,
    "created_at": created_at,
    "opfs_path": &opfs_path,
  })
  .to_string();

  DbStatement {
    sql: "INSERT OR REPLACE INTO share_inbox (id, name, size, mime, created_at, payload) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
      .to_string(),
    params: vec![
      JsonValue::String(id),
      JsonValue::String(name),
      json_number(size),
      JsonValue::String(mime),
      json_number(created_at),
      JsonValue::String(payload),
    ],
  }
}

fn score_library_statement(value: &JsValue) -> DbStatement {
  let json = js_to_json(value);
  let id = extract_id(&json);
  let created_at = extract_created_at_optional(&json);
  let title = extract_string_any(&json, &["title"]);
  let composer = extract_string_any(&json, &["composer"]);
  let payload = json_string_from_json(&json);

  DbStatement {
    sql: "INSERT OR REPLACE INTO score_library (id, title, composer, created_at, payload) VALUES (?1, ?2, ?3, ?4, ?5)"
      .to_string(),
    params: vec![
      JsonValue::String(id),
      optional_json_string(title),
      optional_json_string(composer),
      optional_json_number(created_at),
      JsonValue::String(payload),
    ],
  }
}

fn profiles_statement(value: &JsValue) -> DbStatement {
  let json = js_to_json(value);
  let id = extract_id(&json);
  let created_at = extract_created_at_optional(&json);
  let name = extract_string_any(&json, &["name"]);
  let payload = json_string_from_json(&json);

  DbStatement {
    sql: "INSERT OR REPLACE INTO profiles (id, name, created_at, payload) VALUES (?1, ?2, ?3, ?4)"
      .to_string(),
    params: vec![
      JsonValue::String(id),
      optional_json_string(name),
      optional_json_number(created_at),
      JsonValue::String(payload),
    ],
  }
}

fn assignments_statement(value: &JsValue) -> DbStatement {
  let json = js_to_json(value);
  let id = extract_id(&json);
  let created_at = extract_created_at_optional(&json);
  let payload = json_string_from_json(&json);

  DbStatement {
    sql: "INSERT OR REPLACE INTO assignments (id, created_at, payload) VALUES (?1, ?2, ?3)".to_string(),
    params: vec![
      JsonValue::String(id),
      optional_json_number(created_at),
      JsonValue::String(payload),
    ],
  }
}

fn default_statement(table: &str, value: &JsValue) -> DbStatement {
  let json = js_to_json(value);
  let id = extract_id(&json);
  let created_at = extract_created_at(&json);
  let payload = json_string_from_json(&json);

  DbStatement {
    sql: format!(
      "INSERT OR REPLACE INTO {} (id, created_at, payload) VALUES (?1, ?2, ?3)",
      table
    ),
    params: vec![
      JsonValue::String(id),
      json_number(created_at),
      JsonValue::String(payload),
    ],
  }
}

fn identity_from_js(kind: StoreKind, value: &JsValue) -> (String, f64) {
  match kind {
    StoreKind::Recordings | StoreKind::ShareInbox => {
      let json = js_to_json(value);
      let id = js_string_any(value, &["id"]).unwrap_or_else(|| extract_id(&json));
      let created_at = js_number_any(value, &["created_at", "createdAt"]).unwrap_or_else(|| extract_created_at(&json));
      (id, created_at)
    }
    _ => {
      let json = js_to_json(value);
      (extract_id(&json), extract_created_at(&json))
    }
  }
}

fn identity_from_row(row: &JsonValue) -> (String, f64) {
  let id = extract_string_any(row, &["id"]).unwrap_or_default();
  let created_at = extract_number_any(row, &["created_at"]).unwrap_or(0.0);
  (id, created_at)
}

fn payload_from_json(value: &JsonValue, key: &str) -> String {
  match value {
    JsonValue::Object(map) => match map.get(key) {
      Some(JsonValue::String(text)) => text.clone(),
      Some(other) => serde_json::to_string(other).unwrap_or_else(|_| "{}".to_string()),
      None => json_string_from_json(value),
    },
    _ => json_string_from_json(value),
  }
}

fn extract_id(value: &JsonValue) -> String {
  extract_string_any(value, &["id"]).unwrap_or_else(|| fallback_id(value))
}

fn fallback_id(value: &JsonValue) -> String {
  let payload = json_string_from_json(value);
  format!("missing-{}", fnv_hash_hex(payload.as_bytes()))
}

fn extract_created_at(value: &JsonValue) -> f64 {
  extract_created_at_optional(value).unwrap_or(0.0)
}

fn extract_created_at_optional(value: &JsonValue) -> Option<f64> {
  if let Some(number) = extract_number_any(value, &["created_at", "createdAt", "created"]) {
    return Some(number);
  }
  if let Some(text) = extract_string_any(value, &["created_at", "createdAt", "created"]) {
    if let Ok(parsed) = text.parse::<f64>() {
      return Some(parsed);
    }
    let parsed = Date::parse(&text);
    if parsed.is_finite() {
      return Some(parsed);
    }
  }
  None
}

fn extract_string_any(value: &JsonValue, keys: &[&str]) -> Option<String> {
  for key in keys {
    if let Some(found) = extract_string(value, key) {
      return Some(found);
    }
  }
  None
}

fn extract_number_any(value: &JsonValue, keys: &[&str]) -> Option<f64> {
  for key in keys {
    if let Some(found) = extract_number(value, key) {
      return Some(found);
    }
    if let Some(text) = extract_string(value, key) {
      if let Ok(parsed) = text.parse::<f64>() {
        return Some(parsed);
      }
    }
  }
  None
}

fn js_string_any(value: &JsValue, keys: &[&str]) -> Option<String> {
  for key in keys {
    if let Ok(val) = Reflect::get(value, &JsValue::from_str(key)) {
      if let Some(text) = val.as_string() {
        return Some(text);
      }
    }
  }
  None
}

fn js_number_any(value: &JsValue, keys: &[&str]) -> Option<f64> {
  for key in keys {
    if let Ok(val) = Reflect::get(value, &JsValue::from_str(key)) {
      if let Some(num) = val.as_f64() {
        return Some(num);
      }
      if let Some(text) = val.as_string() {
        if let Ok(parsed) = text.parse::<f64>() {
          return Some(parsed);
        }
      }
    }
  }
  None
}

fn now_ms() -> f64 {
  js_sys::Date::now()
}

fn json_number(value: f64) -> JsonValue {
  JsonNumber::from_f64(value).map(JsonValue::Number).unwrap_or(JsonValue::Null)
}

fn optional_json_number(value: Option<f64>) -> JsonValue {
  value.and_then(JsonNumber::from_f64).map(JsonValue::Number).unwrap_or(JsonValue::Null)
}

fn optional_json_string(value: Option<String>) -> JsonValue {
  value.map(JsonValue::String).unwrap_or(JsonValue::Null)
}

fn json_string_from_json(value: &JsonValue) -> String {
  serde_json::to_string(value).unwrap_or_else(|_| "{}".to_string())
}

fn js_to_json(value: &JsValue) -> JsonValue {
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

struct Fnv1a {
  state: u64,
}

impl Fnv1a {
  fn new() -> Self {
    Self { state: 0xcbf29ce484222325 }
  }

  fn update_record(&mut self, id: &str, created_at: f64) {
    self.update_str(id);
    self.update_str("|");
    self.update_f64(created_at);
    self.update_str(";");
  }

  fn update_f64(&mut self, value: f64) {
    let text = format!("{:.3}", value);
    self.update_str(&text);
  }

  fn update_str(&mut self, value: &str) {
    self.update_bytes(value.as_bytes());
  }

  fn update_bytes(&mut self, bytes: &[u8]) {
    for byte in bytes {
      self.state ^= *byte as u64;
      self.state = self.state.wrapping_mul(0x100000001b3);
    }
  }

  fn finish_hex(&self) -> String {
    format!("{:016x}", self.state)
  }
}

fn fnv_hash_hex(bytes: &[u8]) -> String {
  let mut hasher = Fnv1a::new();
  hasher.update_bytes(bytes);
  hasher.finish_hex()
}
