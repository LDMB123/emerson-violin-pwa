use std::cell::RefCell;
use std::rc::Rc;

use futures_channel::oneshot;
use js_sys::{Array, JSON, Object, Reflect, Function, Uint8Array};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;
use web_sys::{
  Blob, Event, IdbCursorWithValue, IdbDatabase, IdbKeyRange, IdbObjectStoreParameters, IdbOpenDbRequest,
  IdbRequest, IdbTransactionMode,
};

mod storage_utils;
use storage_utils::*;

use crate::dom;
use crate::db_client;
use crate::storage_pressure;
use crate::utils;

const DB_NAME: &str = "emerson-violin-db";
pub const DB_VERSION: u32 = 5;

const IDB_PURGE_KEY: &str = "sqlite:idb-purged-at";
const DEVICE_ID_KEY: &str = "device:id";
const ACTIVE_PROFILE_KEY: &str = "profile:active";
const ACTIVE_PROFILE_NAME_KEY: &str = "profile:active-name";
const IDB_STORES: &[&str] = &[
  "sessions",
  "recordings",
  "syncQueue",
  "shareInbox",
  "mlTraces",
  "gameScores",
  "scoreLibrary",
  "assignments",
  "profiles",
  "telemetryQueue",
  "errorQueue",
  "scoreScans",
  "modelCache",
];




#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
  pub id: String,
  pub day_key: String,
  pub duration_minutes: f64,
  pub note: String,
  pub created_at: f64,
}

#[derive(Debug, Clone)]
pub struct Recording {
  pub id: String,
  pub created_at: f64,
  pub duration_seconds: f64,
  pub mime_type: String,
  pub size_bytes: f64,
  pub format: String,
  pub opfs_path: Option<String>,
  pub profile_id: Option<String>,
  pub blob: Option<Blob>,
}

#[derive(Debug, Clone)]
pub struct ShareItem {
  pub id: String,
  pub name: String,
  pub size: f64,
  pub mime: String,
  pub created_at: f64,
  pub blob: Option<Blob>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncEntry {
  pub id: String,
  pub created_at: f64,
  pub payload: Session,
}


#[derive(Debug, Clone)]
pub struct MigrationSummary {
  pub started: bool,
  pub completed: bool,
  pub updated_at: f64,
  pub last_store: Option<String>,
  pub errors: Vec<String>,
  pub checksums_ok: bool,
}

fn request_to_future(request: IdbRequest) -> oneshot::Receiver<Result<JsValue, JsValue>> {
  let (tx, rx) = oneshot::channel();
  let sender = Rc::new(RefCell::new(Some(tx)));

  let success_sender = sender.clone();
  let onsuccess = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::once(move |event: Event| {
    if let Some(tx) = success_sender.borrow_mut().take() {
      let target = event.target().and_then(|t| t.dyn_into::<IdbRequest>().ok());
      let value = target
        .and_then(|req| req.result().ok())
        .unwrap_or(JsValue::UNDEFINED);
      let _ = tx.send(Ok(value));
    }
  });
  request.set_onsuccess(Some(onsuccess.as_ref().unchecked_ref()));
  onsuccess.forget();

  let error_sender = sender.clone();
  let onerror = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::once(move |event: Event| {
    if let Some(tx) = error_sender.borrow_mut().take() {
      let target = event.target().and_then(|t| t.dyn_into::<IdbRequest>().ok());
      if let Some(req) = target {
        if let Ok(err) = Reflect::get(req.as_ref(), &"error".into()) {
          if !err.is_null() && !err.is_undefined() {
            if storage_pressure::is_quota_error(&err) {
              storage_pressure::record_error("idb", &err);
            }
            let _ = tx.send(Err(err));
            return;
          }
        }
      }
      let _ = tx.send(Err(JsValue::from_str("IDB request failed")));
    }
  });
  request.set_onerror(Some(onerror.as_ref().unchecked_ref()));
  onerror.forget();

  rx
}

async fn open_db() -> Result<IdbDatabase, JsValue> {
  let window = dom::window();
  let idb = window
    .indexed_db()?
    .ok_or_else(|| JsValue::from_str("IndexedDB unavailable"))?;
  let request = idb.open_with_u32(DB_NAME, DB_VERSION)?;

  let upgrade = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
    let target = event
      .target()
      .and_then(|t| t.dyn_into::<IdbOpenDbRequest>().ok());
    if let Some(req) = target {
      if let Ok(db_val) = req.result() {
        if let Ok(db) = db_val.dyn_into::<IdbDatabase>() {
          let stores = db.object_store_names();
          let create_store = |name: &str| {
            let params = IdbObjectStoreParameters::new();
            params.set_key_path(&JsValue::from_str("id"));
            let _ = db.create_object_store_with_optional_parameters(name, &params);
          };
          if !stores.contains("sessions") {
            create_store("sessions");
          }
          if !stores.contains("recordings") {
            create_store("recordings");
          }
          if !stores.contains("syncQueue") {
            create_store("syncQueue");
          }
          if !stores.contains("shareInbox") {
            create_store("shareInbox");
          }
          if !stores.contains("mlTraces") {
            create_store("mlTraces");
          }
          if !stores.contains("gameScores") {
            create_store("gameScores");
          }
          if !stores.contains("scoreLibrary") {
            create_store("scoreLibrary");
          }
          if !stores.contains("assignments") {
            create_store("assignments");
          }
          if !stores.contains("profiles") {
            create_store("profiles");
          }
          if !stores.contains("telemetryQueue") {
            create_store("telemetryQueue");
          }
          if !stores.contains("errorQueue") {
            create_store("errorQueue");
          }
          if !stores.contains("scoreScans") {
            create_store("scoreScans");
          }
          if !stores.contains("modelCache") {
            create_store("modelCache");
          }
        }
      }
    }
  });
  request.set_onupgradeneeded(Some(upgrade.as_ref().unchecked_ref()));
  upgrade.forget();

  let receiver = {
    let (tx, rx) = oneshot::channel();
    let sender = Rc::new(RefCell::new(Some(tx)));

    let success_sender = sender.clone();
    let onsuccess = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::once(move |event: Event| {
      if let Some(tx) = success_sender.borrow_mut().take() {
        let target = event
          .target()
          .and_then(|t| t.dyn_into::<IdbOpenDbRequest>().ok());
        let db = target
          .and_then(|req| req.result().ok())
          .and_then(|val| val.dyn_into::<IdbDatabase>().ok())
          .ok_or_else(|| JsValue::from_str("Failed to open IndexedDB"));
        let _ = tx.send(db);
      }
    });
    request.set_onsuccess(Some(onsuccess.as_ref().unchecked_ref()));
    onsuccess.forget();

    let error_sender = sender.clone();
    let onerror = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::once(move |_event: Event| {
      if let Some(tx) = error_sender.borrow_mut().take() {
        let _ = tx.send(Err(JsValue::from_str("IndexedDB open error")));
      }
    });
    request.set_onerror(Some(onerror.as_ref().unchecked_ref()));
    onerror.forget();

    rx
  };

  match receiver.await {
    Ok(result) => result,
    Err(_) => Err(JsValue::from_str("IndexedDB open error")),
  }
}

async fn get_all_values(store_name: &str) -> Result<Vec<JsValue>, JsValue> {
  let db = open_db().await?;
  let tx = match db.transaction_with_str_and_mode(store_name, IdbTransactionMode::Readonly) {
    Ok(tx) => tx,
    Err(_) => return Ok(Vec::new()),
  };
  let store = tx.object_store(store_name)?;
  let request = store.get_all()?;
  let receiver = request_to_future(request);
  let result = receiver.await.map_err(|_| JsValue::from_str("IDB getAll error"))??;
  let array = Array::from(&result);
  Ok(array.iter().collect())
}

pub async fn get_store_values(store_name: &str) -> Result<Vec<JsValue>, JsValue> {
  get_all_values(store_name).await
}

pub async fn get_store_count(store_name: &str) -> Result<u32, JsValue> {
  let db = open_db().await?;
  let tx = match db.transaction_with_str_and_mode(store_name, IdbTransactionMode::Readonly) {
    Ok(tx) => tx,
    Err(_) => return Ok(0),
  };
  let store = tx.object_store(store_name)?;
  let request = store.count()?;
  let receiver = request_to_future(request);
  let result = receiver.await.map_err(|_| JsValue::from_str("IDB count error"))??;
  let count = result.as_f64().unwrap_or(0.0) as u32;
  Ok(count)
}

pub struct StoreBatch {
  pub values: Vec<JsValue>,
  pub last_key: Option<String>,
}

pub async fn get_store_batch(
  store_name: &str,
  start_key: Option<String>,
  limit: usize,
) -> Result<StoreBatch, JsValue> {
  let limit = limit.max(1);
  let db = open_db().await?;
  let tx = match db.transaction_with_str_and_mode(store_name, IdbTransactionMode::Readonly) {
    Ok(tx) => tx,
    Err(_) => {
      return Ok(StoreBatch {
        values: Vec::new(),
        last_key: None,
      });
    }
  };
  let store = tx.object_store(store_name)?;
  let request = match start_key {
    Some(key) => {
      let range = IdbKeyRange::lower_bound_with_open(&JsValue::from_str(&key), true)?;
      store.open_cursor_with_range(&range)?
    }
    None => store.open_cursor()?,
  };

  let (tx, rx) = oneshot::channel::<Result<StoreBatch, JsValue>>();
  let sender = Rc::new(RefCell::new(Some(tx)));
  let values = Rc::new(RefCell::new(Vec::new()));
  let last_key = Rc::new(RefCell::new(None::<String>));

  let success_sender = sender.clone();
  let values_ref = values.clone();
  let last_key_ref = last_key.clone();
  let onsuccess = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
    let sender_opt = success_sender.clone();
    let mut sender = sender_opt.borrow_mut();
    if sender.is_none() {
      return;
    }
    let target = event
      .target()
      .and_then(|t| t.dyn_into::<IdbRequest>().ok());
    let cursor_val = target
      .and_then(|req| req.result().ok())
      .unwrap_or(JsValue::NULL);

    if cursor_val.is_null() {
      if let Some(tx) = sender.take() {
        let batch = StoreBatch {
          values: values_ref.borrow().clone(),
          last_key: last_key_ref.borrow().clone(),
        };
        let _ = tx.send(Ok(batch));
      }
      return;
    }

    let cursor = match cursor_val.dyn_into::<IdbCursorWithValue>() {
      Ok(cursor) => cursor,
      Err(_) => {
        if let Some(tx) = sender.take() {
          let _ = tx.send(Err(JsValue::from_str("IDB cursor error")));
        }
        return;
      }
    };

    match cursor.value() {
      Ok(value) => {
        values_ref.borrow_mut().push(value);
      }
      Err(_) => {
        if let Some(tx) = sender.take() {
          let _ = tx.send(Err(JsValue::from_str("IDB cursor value error")));
        }
        return;
      }
    }
    if let Ok(key) = cursor.key() {
      if let Some(key_str) = key_to_string(&key) {
        *last_key_ref.borrow_mut() = Some(key_str);
      }
    }

    if values_ref.borrow().len() >= limit {
      if let Some(tx) = sender.take() {
        let batch = StoreBatch {
          values: values_ref.borrow().clone(),
          last_key: last_key_ref.borrow().clone(),
        };
        let _ = tx.send(Ok(batch));
      }
      return;
    }

    let _ = cursor.continue_();
  });
  request.set_onsuccess(Some(onsuccess.as_ref().unchecked_ref()));
  onsuccess.forget();

  let error_sender = sender.clone();
  let onerror = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::once(move |_event: Event| {
    if let Some(tx) = error_sender.borrow_mut().take() {
      let _ = tx.send(Err(JsValue::from_str("IDB cursor error")));
    }
  });
  request.set_onerror(Some(onerror.as_ref().unchecked_ref()));
  onerror.forget();

  rx.await.map_err(|_| JsValue::from_str("IDB cursor error"))?
}


async fn put_value(store_name: &str, value: &JsValue) -> Result<(), JsValue> {
  let db = open_db().await?;
  let tx = match db.transaction_with_str_and_mode(store_name, IdbTransactionMode::Readwrite) {
    Ok(tx) => tx,
    Err(_) => return Ok(()),
  };
  let store = tx.object_store(store_name)?;
  let request = store.put(value)?;
  let receiver = request_to_future(request);
  receiver.await.map_err(|_| JsValue::from_str("IDB put error"))??;
  Ok(())
}

async fn delete_value(store_name: &str, key: &str) -> Result<(), JsValue> {
  let db = open_db().await?;
  let tx = db.transaction_with_str_and_mode(store_name, IdbTransactionMode::Readwrite)?;
  let store = tx.object_store(store_name)?;
  let request = store.delete(&JsValue::from_str(key))?;
  let receiver = request_to_future(request);
  receiver.await.map_err(|_| JsValue::from_str("IDB delete error"))??;
  Ok(())
}

async fn clear_store(store_name: &str) -> Result<(), JsValue> {
  let db = open_db().await?;
  let tx = db.transaction_with_str_and_mode(store_name, IdbTransactionMode::Readwrite)?;
  let store = tx.object_store(store_name)?;
  let request = store.clear()?;
  let receiver = request_to_future(request);
  receiver.await.map_err(|_| JsValue::from_str("IDB clear error"))??;
  Ok(())
}




fn migration_ready(summary: &MigrationSummary) -> bool {
  summary.completed && summary.errors.is_empty() && summary.checksums_ok
}

async fn load_migration_summary() -> Result<MigrationSummary, JsValue> {
  db_client::init_db().await?;
  let rows = db_client::query(
    "SELECT started_at, updated_at, last_store, errors_json, checksums_json, completed_at FROM migration_state WHERE id = ?1",
    vec![JsonValue::String("active".to_string())],
  )
  .await?;

  let row = match rows.first() {
    Some(row) => row,
    None => {
      return Ok(MigrationSummary {
        started: false,
        completed: false,
        updated_at: 0.0,
        last_store: None,
        errors: Vec::new(),
        checksums_ok: false,
      });
    }
  };

  let started_at = extract_number(row, "started_at").unwrap_or(0.0);
  let updated_at = extract_number(row, "updated_at").unwrap_or(0.0);
  let last_store = extract_string(row, "last_store");
  let completed_at = extract_number(row, "completed_at").unwrap_or(0.0);

  let errors_json = extract_string(row, "errors_json").unwrap_or_else(|| "[]".to_string());
  let errors: Vec<String> = serde_json::from_str(&errors_json).unwrap_or_default();

  let checksums_json = extract_string(row, "checksums_json").unwrap_or_else(|| "{}".to_string());
  let mut checksums_ok = false;
  if let Ok(map) = serde_json::from_str::<serde_json::Map<String, JsonValue>>(&checksums_json) {
    if !map.is_empty() {
      checksums_ok = map
        .values()
        .all(|val| val.get("ok").and_then(|ok| ok.as_bool()).unwrap_or(false));
    }
  }

  Ok(MigrationSummary {
    started: started_at > 0.0,
    completed: completed_at > 0.0,
    updated_at,
    last_store,
    errors,
    checksums_ok,
  })
}

pub async fn get_migration_summary() -> Result<MigrationSummary, JsValue> {
  load_migration_summary().await
}





pub async fn is_sqlite_active() -> bool {
  true
}

pub async fn legacy_idb_has_data() -> bool {
  let db = match open_db().await {
    Ok(db) => db,
    Err(_) => return false,
  };

  for store_name in IDB_STORES {
    let tx = match db.transaction_with_str_and_mode(store_name, IdbTransactionMode::Readonly) {
      Ok(tx) => tx,
      Err(_) => continue,
    };
    let store = match tx.object_store(store_name) {
      Ok(store) => store,
      Err(_) => continue,
    };
    let request = match store.count() {
      Ok(request) => request,
      Err(_) => continue,
    };
    let receiver = request_to_future(request);
    let count = match receiver.await {
      Ok(result) => result.ok().and_then(|v| v.as_f64()).unwrap_or(0.0),
      Err(_) => 0.0,
    };
    if count > 0.0 {
      return true;
    }
  }

  false
}

pub async fn legacy_idb_total_count() -> usize {
  let mut total = 0usize;
  for store in IDB_STORES {
    if let Ok(count) = get_store_count(store).await {
      total = total.saturating_add(count as usize);
    }
  }
  total
}

// ── Integrity drill helpers ─────────────────────────────────────────

pub const DRILL_PREFIX: &str = "__drill_";

pub async fn seed_drill_data(count_per_store: usize) -> Result<usize, JsValue> {
  let mut total = 0usize;
  for store in IDB_STORES {
    for i in 0..count_per_store {
      let id = format!("{}{}-{}", DRILL_PREFIX, store, i);
      let obj = js_sys::Object::new();
      let _ = js_sys::Reflect::set(&obj, &"id".into(), &JsValue::from_str(&id));
      let _ = js_sys::Reflect::set(
        &obj,
        &"created_at".into(),
        &JsValue::from_f64(js_sys::Date::now()),
      );
      let _ = js_sys::Reflect::set(
        &obj,
        &"name".into(),
        &JsValue::from_str(&format!("drill-{}", i)),
      );
      let _ = js_sys::Reflect::set(&obj, &"payload".into(), &JsValue::from_str("{}"));
      put_value(store, &obj.into()).await?;
      total += 1;
    }
  }
  Ok(total)
}

pub async fn clear_drill_data() -> Result<usize, JsValue> {
  let mut removed = 0usize;
  for store in IDB_STORES {
    let batch = get_store_batch(store, None, 1000).await?;
    for value in batch.values.iter() {
      if let Ok(id_val) = js_sys::Reflect::get(value, &"id".into()) {
        if let Some(id) = id_val.as_string() {
          if id.starts_with(DRILL_PREFIX) {
            delete_value(store, &id).await?;
            removed += 1;
          }
        }
      }
    }
  }
  Ok(removed)
}

pub async fn clear_drill_data_sqlite(tables: &[&str]) -> Result<usize, JsValue> {
  let mut removed = 0usize;
  for table in tables {
    let pattern = format!("{}%", DRILL_PREFIX);
    let rows = db_client::query(
      &format!("SELECT COUNT(*) as cnt FROM {} WHERE id LIKE ?1", table),
      vec![JsonValue::String(pattern.clone())],
    )
    .await?;
    let count = rows
      .first()
      .and_then(|r| r.get("cnt"))
      .and_then(|v| v.as_f64())
      .unwrap_or(0.0) as usize;
    if count > 0 {
      db_client::exec(
        &format!("DELETE FROM {} WHERE id LIKE ?1", table),
        vec![JsonValue::String(pattern)],
      )
      .await?;
      removed += count;
    }
  }
  // Also clear drill migration state
  let _ = db_client::exec(
    "DELETE FROM migration_state WHERE id = ?1",
    vec![JsonValue::String("drill".to_string())],
  )
  .await;
  let _ = db_client::exec(
    "DELETE FROM migration_log WHERE migration_id = ?1",
    vec![JsonValue::String("drill".to_string())],
  )
  .await;
  Ok(removed)
}

pub async fn get_sessions() -> Result<Vec<Session>, JsValue> {
  sqlite_get_sessions().await
}



pub async fn save_session(session: &Session) -> Result<(), JsValue> {
  sqlite_save_session(session).await
}



pub async fn clear_sessions() -> Result<(), JsValue> {
  let _ = clear_store("sessions").await;
  sqlite_clear_table("sessions").await
}



pub async fn get_recordings() -> Result<Vec<Recording>, JsValue> {
  sqlite_get_recordings().await
}



pub async fn save_recording(recording: &Recording) -> Result<(), JsValue> {
  sqlite_save_recording(recording).await
}



pub async fn delete_recording(id: &str) -> Result<(), JsValue> {
  sqlite_delete_recording(id).await?;
  let _ = delete_value("recordings", id).await;
  Ok(())
}



pub async fn clear_recordings() -> Result<(), JsValue> {
  let _ = clear_store("recordings").await;
  let _ = clear_recording_blobs().await;
  sqlite_clear_table("recordings").await
}

pub async fn delete_recording_assets(recording: &Recording) -> Result<(), JsValue> {
  delete_recording(&recording.id).await
}

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

pub async fn prune_recordings(retention_days: f64) -> Result<(), JsValue> {
  let cutoff = js_sys::Date::now() - (retention_days.max(0.0) * 86_400_000.0);
  db_client::init_db().await?;
  let rows = db_client::query(
    "SELECT id, opfs_path FROM recordings WHERE created_at < ?1",
    vec![json_number(cutoff)],
  )
  .await?;
  for row in rows {
    let id = extract_string(&row, "id").unwrap_or_default();
    if id.is_empty() {
      continue;
    }
    if let Some(path) = extract_string(&row, "opfs_path") {
      if is_idb_path(&path) {
        if let Some(key) = idb_key_from_path(&path) {
          let _ = delete_value("recordings", &key).await;
        }
      } else {
        let _ = delete_recording_blob(&path).await;
      }
    }
    let _ = db_client::exec(
      "DELETE FROM recordings WHERE id = ?1",
      vec![JsonValue::String(id)],
    )
    .await;
  }
  Ok(())
}

pub async fn prune_recordings_by_size(max_bytes: f64) -> Result<(), JsValue> {
  if max_bytes <= 0.0 {
    return Ok(());
  }
  let mut recordings = get_recordings().await.unwrap_or_default();
  recordings.sort_by(|a, b| {
    a.created_at
      .partial_cmp(&b.created_at)
      .unwrap_or(std::cmp::Ordering::Equal)
  });
  let mut total = sum_opfs_bytes(&recordings);
  if total <= max_bytes {
    return Ok(());
  }
  for recording in recordings {
    if total <= max_bytes {
      break;
    }
    if let Some(path) = recording.opfs_path.as_ref() {
      if is_idb_path(path) {
        continue;
      }
    } else {
      continue;
    }
    let size = if recording.size_bytes > 0.0 {
      recording.size_bytes
    } else {
      recording.blob.as_ref().map(|b| b.size() as f64).unwrap_or(0.0)
    };
    let _ = delete_recording_assets(&recording).await;
    total = (total - size).max(0.0);
  }
  Ok(())
}



pub async fn add_sync_entry(entry: &SyncEntry) -> Result<(), JsValue> {
  sqlite_add_sync_entry(entry).await
}



pub async fn clear_sync_queue() -> Result<(), JsValue> {
  let _ = clear_store("syncQueue").await;
  sqlite_clear_table("sync_queue").await
}



pub async fn get_share_inbox() -> Result<Vec<ShareItem>, JsValue> {
  sqlite_get_share_inbox().await
}



pub async fn clear_share_inbox() -> Result<(), JsValue> {
  let _ = clear_store("shareInbox").await;
  let _ = clear_share_blobs().await;
  sqlite_clear_table("share_inbox").await
}



pub async fn delete_share_item(id: &str) -> Result<(), JsValue> {
  sqlite_delete_share_item(id).await?;
  let _ = delete_value("shareInbox", id).await;
  Ok(())
}

pub async fn get_assignments() -> Result<Vec<JsValue>, JsValue> {
  sqlite_get_assignments().await
}

pub async fn save_assignment(value: &JsValue) -> Result<(), JsValue> {
  sqlite_save_assignment(value).await
}

pub async fn delete_assignment(id: &str) -> Result<(), JsValue> {
  let _ = delete_value("assignments", id).await;
  sqlite_delete_entry("assignments", id).await
}

pub async fn clear_assignments() -> Result<(), JsValue> {
  let _ = clear_store("assignments").await;
  sqlite_clear_table("assignments").await
}

pub async fn get_profiles() -> Result<Vec<JsValue>, JsValue> {
  sqlite_get_profiles().await
}

pub async fn save_profile(value: &JsValue) -> Result<(), JsValue> {
  sqlite_save_profile(value).await
}

pub async fn delete_profile(id: &str) -> Result<(), JsValue> {
  let _ = delete_value("profiles", id).await;
  sqlite_delete_entry("profiles", id).await
}

pub async fn clear_profiles() -> Result<(), JsValue> {
  let _ = clear_store("profiles").await;
  sqlite_clear_table("profiles").await
}

pub async fn get_game_scores() -> Result<Vec<JsValue>, JsValue> {
  sqlite_get_game_scores().await
}

pub async fn save_game_score(value: &JsValue) -> Result<(), JsValue> {
  sqlite_save_game_score(value).await
}

pub async fn clear_game_scores() -> Result<(), JsValue> {
  let _ = clear_store("gameScores").await;
  sqlite_clear_table("game_scores").await
}

pub async fn get_scores() -> Result<Vec<JsValue>, JsValue> {
  sqlite_get_scores().await
}

pub async fn save_score_entry(value: &JsValue) -> Result<(), JsValue> {
  sqlite_save_score_entry(value).await
}

pub async fn delete_score_entry(id: &str) -> Result<(), JsValue> {
  sqlite_delete_score_entry(id).await
}

pub async fn clear_scores() -> Result<(), JsValue> {
  let _ = clear_store("scoreLibrary").await;
  let _ = clear_score_blobs().await;
  sqlite_clear_table("score_library").await
}

pub async fn get_ml_traces() -> Result<Vec<JsValue>, JsValue> {
  sqlite_get_ml_traces().await
}

pub async fn enqueue_ml_trace(value: &JsValue) -> Result<(), JsValue> {
  sqlite_save_ml_trace(value).await
}

pub async fn clear_ml_traces() -> Result<(), JsValue> {
  let _ = clear_store("mlTraces").await;
  sqlite_clear_table("ml_traces").await
}

pub async fn prune_ml_traces(limit: usize, max_age_ms: f64) -> Result<(), JsValue> {
  sqlite_prune_ml_traces(limit, max_age_ms).await
}

pub async fn get_telemetry_queue() -> Result<Vec<JsValue>, JsValue> {
  sqlite_get_telemetry_queue().await
}

pub async fn enqueue_telemetry(value: &JsValue) -> Result<(), JsValue> {
  sqlite_save_telemetry(value).await
}

pub async fn clear_telemetry_queue() -> Result<(), JsValue> {
  let _ = clear_store("telemetryQueue").await;
  sqlite_clear_table("telemetry_queue").await
}

pub async fn get_error_queue() -> Result<Vec<JsValue>, JsValue> {
  sqlite_get_error_queue().await
}

pub async fn enqueue_error(value: &JsValue) -> Result<(), JsValue> {
  sqlite_save_error(value).await
}

pub async fn clear_error_queue() -> Result<(), JsValue> {
  let _ = clear_store("errorQueue").await;
  sqlite_clear_table("error_queue").await
}

pub async fn get_model_cache(id: &str) -> Result<Option<JsValue>, JsValue> {
  sqlite_get_model_cache(id).await
}

pub async fn get_model_cache_all() -> Result<Vec<JsValue>, JsValue> {
  sqlite_get_model_cache_all().await
}

pub async fn save_model_cache(id: &str, value: &JsValue) -> Result<(), JsValue> {
  sqlite_save_model_cache(id, value).await
}

pub async fn ingest_share_entries(entries: Vec<JsValue>) -> Result<(), JsValue> {
  db_client::init_db().await?;
  for entry in entries {
    let id = js_string_any(&entry, &["id"]).unwrap_or_else(utils::create_id);
    let name = js_string_any(&entry, &["name"]).unwrap_or_else(|| "shared-file".to_string());
    let mime = js_string_any(&entry, &["mime", "type"])
      .unwrap_or_else(|| "application/octet-stream".to_string());
    let blob = js_blob_any(&entry);
    let size = js_number_any(&entry, &["size"]).or_else(|| blob.as_ref().map(|b| b.size() as f64)).unwrap_or(0.0);
    let created_at = js_date_any(&entry, &["created_at", "createdAt", "created"]).unwrap_or_else(js_sys::Date::now);
    let title = js_string_any(&entry, &["title"]);
    let text = js_string_any(&entry, &["text"]);
    let url = js_string_any(&entry, &["url"]);
    let last_modified = js_number_any(&entry, &["lastModified"]).unwrap_or(0.0);

    let mut opfs_path = None;
    if let Some(blob) = blob.as_ref() {
      opfs_path = save_share_blob(&id, &name, blob).await;
      if opfs_path.is_none() {
        if put_value("shareInbox", &entry).await.is_ok() {
          opfs_path = Some(idb_fallback_path("shareInbox", &id));
        }
      }
    }

    let payload = serde_json::json!({
      "id": &id,
      "name": &name,
      "size": size,
      "mime": &mime,
      "created_at": created_at,
      "title": title,
      "text": text,
      "url": url,
      "last_modified": last_modified,
      "opfs_path": &opfs_path,
    })
    .to_string();

    db_client::exec(
      "INSERT OR REPLACE INTO share_inbox (id, name, size, mime, created_at, payload) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
      vec![
        JsonValue::String(id),
        JsonValue::String(name),
        json_number(size),
        JsonValue::String(mime),
        json_number(created_at),
        JsonValue::String(payload),
      ],
    )
    .await?;
  }

  Ok(())
}

pub async fn purge_idb_after_migration() -> Result<usize, JsValue> {
  let summary = get_migration_summary().await?;
  if !migration_ready(&summary) {
    return Err(JsValue::from_str("Migration not verified"));
  }

  let mut cleared = 0usize;
  for store in IDB_STORES {
    let _ = clear_store(store).await;
    cleared += 1;
  }
  local_set(IDB_PURGE_KEY, &format!("{}", js_sys::Date::now()));
  Ok(cleared)
}

pub fn idb_purged_at() -> Option<f64> {
  local_get(IDB_PURGE_KEY).and_then(|val| val.parse::<f64>().ok())
}






pub fn local_get(key: &str) -> Option<String> {
  dom::window()
    .local_storage()
    .ok()
    .flatten()
    .and_then(|storage| storage.get_item(key).ok().flatten())
}

pub fn local_set(key: &str, value: &str) {
  if let Ok(Some(storage)) = dom::window().local_storage() {
    let _ = storage.set_item(key, value);
  }
}

pub fn local_remove(key: &str) {
  if let Ok(Some(storage)) = dom::window().local_storage() {
    let _ = storage.remove_item(key);
  }
}

pub fn get_or_create_device_id() -> String {
  if let Some(id) = local_get(DEVICE_ID_KEY).filter(|val| !val.trim().is_empty()) {
    return id;
  }
  let id = utils::create_id();
  local_set(DEVICE_ID_KEY, &id);
  id
}

pub fn get_active_profile_id() -> String {
  local_get(ACTIVE_PROFILE_KEY)
    .filter(|val| !val.trim().is_empty())
    .unwrap_or_else(|| "default".to_string())
}

pub fn get_active_profile_name() -> String {
  local_get(ACTIVE_PROFILE_NAME_KEY)
    .filter(|val| !val.trim().is_empty())
    .unwrap_or_else(|| "Default".to_string())
}

pub fn set_active_profile(id: &str, name: &str) {
  let id = if id.trim().is_empty() { "default" } else { id };
  let name = if name.trim().is_empty() { "Default" } else { name };
  local_set(ACTIVE_PROFILE_KEY, id);
  local_set(ACTIVE_PROFILE_NAME_KEY, name);
}


const OPFS_RECORDINGS_DIR: &str = "recordings";
const OPFS_SHARE_DIR: &str = "share";
const OPFS_SCORE_DIR: &str = "scores";
const OPFS_MODELS_DIR: &str = "models";
const IDB_PATH_PREFIX: &str = "idb:";

async fn sqlite_get_sessions() -> Result<Vec<Session>, JsValue> {
  db_client::init_db().await?;
  let rows = db_client::query(
    "SELECT id, day_key, duration_minutes, note, created_at, payload FROM sessions ORDER BY created_at DESC",
    vec![],
  )
  .await?;
  let mut out = Vec::new();
  for row in rows {
    if let Some(payload) = extract_string(&row, "payload") {
      if let Ok(session) = serde_json::from_str::<Session>(&payload) {
        out.push(session);
        continue;
      }
    }
    let id = extract_string(&row, "id").unwrap_or_default();
    if id.is_empty() {
      continue;
    }
    let session = Session {
      id,
      day_key: extract_string(&row, "day_key").unwrap_or_default(),
      duration_minutes: extract_number(&row, "duration_minutes").unwrap_or(0.0),
      note: extract_string(&row, "note").unwrap_or_default(),
      created_at: extract_number(&row, "created_at").unwrap_or(0.0),
    };
    out.push(session);
  }
  Ok(out)
}

async fn sqlite_save_session(session: &Session) -> Result<(), JsValue> {
  db_client::init_db().await?;
  let payload = serde_json::to_string(session).unwrap_or_else(|_| "{}".to_string());
  db_client::exec(
    "INSERT OR REPLACE INTO sessions (id, day_key, duration_minutes, note, created_at, payload) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    vec![
      JsonValue::String(session.id.clone()),
      JsonValue::String(session.day_key.clone()),
      json_number(session.duration_minutes),
      JsonValue::String(session.note.clone()),
      json_number(session.created_at),
      JsonValue::String(payload),
    ],
  )
  .await
}

async fn sqlite_get_recordings() -> Result<Vec<Recording>, JsValue> {
  db_client::init_db().await?;
  let rows = db_client::query(
    "SELECT id, created_at, duration_seconds, mime_type, size_bytes, format, opfs_path, profile_id, payload FROM recordings ORDER BY created_at DESC",
    vec![],
  )
  .await?;
  let mut out = Vec::new();
  for row in rows {
    let id = extract_string(&row, "id").unwrap_or_default();
    if id.is_empty() {
      continue;
    }
    let payload_json = extract_string(&row, "payload")
      .and_then(|payload| serde_json::from_str::<JsonValue>(&payload).ok());
    let created_at = extract_number(&row, "created_at")
      .or_else(|| payload_json.as_ref().and_then(|json| extract_number(json, "created_at")))
      .unwrap_or(0.0);
    let duration = extract_number(&row, "duration_seconds")
      .or_else(|| payload_json.as_ref().and_then(|json| extract_number(json, "duration_seconds")))
      .unwrap_or(0.0);
    let mime_type = extract_string(&row, "mime_type")
      .or_else(|| payload_json.as_ref().and_then(|json| extract_string(json, "mime_type")))
      .unwrap_or_else(|| "audio/webm".to_string());
    let mut size_bytes = extract_number(&row, "size_bytes")
      .or_else(|| payload_json.as_ref().and_then(|json| extract_number(json, "size_bytes")))
      .unwrap_or(0.0);
    let format = extract_string(&row, "format")
      .or_else(|| payload_json.as_ref().and_then(|json| extract_string(json, "format")))
      .filter(|val| !val.is_empty())
      .unwrap_or_else(|| format_from_mime(&mime_type));
    let opfs_path = extract_string(&row, "opfs_path")
      .or_else(|| payload_json.as_ref().and_then(|json| extract_string(json, "opfs_path")));
    let profile_id = extract_string(&row, "profile_id")
      .or_else(|| payload_json.as_ref().and_then(|json| extract_string(json, "profile_id")));

    let blob = if let Some(path) = opfs_path.as_deref() {
      if is_idb_path(path) {
        idb_recording_blob(id.as_str()).await
      } else {
        load_recording_blob(path).await
      }
    } else {
      idb_recording_blob(id.as_str()).await
    };

    if size_bytes <= 0.0 {
      if let Some(blob) = blob.as_ref() {
        size_bytes = blob.size() as f64;
      }
    }

    out.push(Recording {
      id,
      created_at,
      duration_seconds: duration,
      mime_type,
      size_bytes,
      format,
      opfs_path,
      profile_id,
      blob,
    });
  }
  Ok(out)
}

async fn sqlite_save_recording(recording: &Recording) -> Result<(), JsValue> {
  db_client::init_db().await?;
  let mut opfs_path = None;
  if let Some(blob) = recording.blob.as_ref() {
    opfs_path = save_recording_blob(&recording.id, &recording.format, blob).await;
    if opfs_path.is_none() {
      let value = recording_to_value(recording)?;
      if put_value("recordings", &value).await.is_ok() {
        opfs_path = Some(idb_fallback_path("recordings", &recording.id));
      }
    }
  }

  let mime_type = if !recording.mime_type.is_empty() {
    recording.mime_type.clone()
  } else {
    recording
      .blob
      .as_ref()
      .map(|b| b.type_())
      .filter(|t| !t.is_empty())
      .unwrap_or_else(|| "audio/webm".to_string())
  };
  let size_bytes = if recording.size_bytes > 0.0 {
    recording.size_bytes
  } else {
    recording
      .blob
      .as_ref()
      .map(|b| b.size() as f64)
      .unwrap_or(0.0)
  };
  let format = if !recording.format.is_empty() {
    recording.format.clone()
  } else {
    format_from_mime(&mime_type)
  };
  let profile_id = recording.profile_id.clone();

  let payload = serde_json::json!({
    "id": &recording.id,
    "created_at": recording.created_at,
    "duration_seconds": recording.duration_seconds,
    "mime_type": &mime_type,
    "size_bytes": size_bytes,
    "format": &format,
    "opfs_path": &opfs_path,
    "profile_id": &profile_id,
  })
  .to_string();

  db_client::exec(
    "INSERT OR REPLACE INTO recordings (id, created_at, duration_seconds, mime_type, size_bytes, format, opfs_path, profile_id, payload) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
    vec![
      JsonValue::String(recording.id.clone()),
      json_number(recording.created_at),
      json_number(recording.duration_seconds),
      JsonValue::String(mime_type),
      json_number(size_bytes),
      JsonValue::String(format),
      opfs_path.clone().map(JsonValue::String).unwrap_or(JsonValue::Null),
      profile_id.clone().map(JsonValue::String).unwrap_or(JsonValue::Null),
      JsonValue::String(payload),
    ],
  )
  .await
}

async fn sqlite_delete_recording(id: &str) -> Result<(), JsValue> {
  db_client::init_db().await?;
  let rows = db_client::query(
    "SELECT opfs_path FROM recordings WHERE id = ?1",
    vec![JsonValue::String(id.to_string())],
  )
  .await?;
  if let Some(row) = rows.first() {
    if let Some(path) = extract_string(row, "opfs_path") {
      if is_idb_path(&path) {
        if let Some(key) = idb_key_from_path(&path) {
          let _ = delete_value("recordings", &key).await;
        }
      } else {
        let _ = delete_recording_blob(&path).await;
      }
    }
  }
  db_client::exec(
    "DELETE FROM recordings WHERE id = ?1",
    vec![JsonValue::String(id.to_string())],
  )
  .await
}

async fn sqlite_add_sync_entry(entry: &SyncEntry) -> Result<(), JsValue> {
  db_client::init_db().await?;
  let payload = serde_json::to_string(&entry.payload).unwrap_or_else(|_| "{}".to_string());
  db_client::exec(
    "INSERT OR REPLACE INTO sync_queue (id, created_at, payload) VALUES (?1, ?2, ?3)",
    vec![
      JsonValue::String(entry.id.clone()),
      json_number(entry.created_at),
      JsonValue::String(payload),
    ],
  )
  .await
}

async fn sqlite_get_share_inbox() -> Result<Vec<ShareItem>, JsValue> {
  db_client::init_db().await?;
  let rows = db_client::query(
    "SELECT id, name, size, mime, created_at, payload FROM share_inbox ORDER BY created_at DESC",
    vec![],
  )
  .await?;
  let mut out = Vec::new();
  for row in rows {
    let id = extract_string(&row, "id").unwrap_or_default();
    if id.is_empty() {
      continue;
    }
    let name = extract_string(&row, "name").unwrap_or_default();
    let size = extract_number(&row, "size").unwrap_or(0.0);
    let mime = extract_string(&row, "mime").unwrap_or_else(|| "application/octet-stream".to_string());
    let created_at = extract_number(&row, "created_at").unwrap_or(0.0);
    let payload_json = extract_string(&row, "payload")
      .and_then(|payload| serde_json::from_str::<JsonValue>(&payload).ok());
    let opfs_path = payload_json.as_ref().and_then(|json| extract_string(json, "opfs_path"));

    let blob = if let Some(path) = opfs_path.as_deref() {
      if is_idb_path(path) {
        idb_share_blob(id.as_str()).await
      } else {
        load_share_blob(path).await
      }
    } else {
      idb_share_blob(id.as_str()).await
    };

    out.push(ShareItem {
      id,
      name,
      size,
      mime,
      created_at,
      blob,
    });
  }
  Ok(out)
}

async fn sqlite_delete_share_item(id: &str) -> Result<(), JsValue> {
  db_client::init_db().await?;
  let rows = db_client::query(
    "SELECT payload FROM share_inbox WHERE id = ?1",
    vec![JsonValue::String(id.to_string())],
  )
  .await?;
  if let Some(row) = rows.first() {
    if let Some(payload) = extract_string(row, "payload") {
      if let Ok(json) = serde_json::from_str::<JsonValue>(&payload) {
        if let Some(path) = extract_string(&json, "opfs_path") {
          if is_idb_path(&path) {
            if let Some(key) = idb_key_from_path(&path) {
              let _ = delete_value("shareInbox", &key).await;
            }
          } else {
            let _ = delete_share_blob(&path).await;
          }
        }
      }
    }
  }
  db_client::exec(
    "DELETE FROM share_inbox WHERE id = ?1",
    vec![JsonValue::String(id.to_string())],
  )
  .await
}

async fn sqlite_get_assignments() -> Result<Vec<JsValue>, JsValue> {
  db_client::init_db().await?;
  let rows = db_client::query(
    "SELECT id, created_at, payload FROM assignments ORDER BY created_at DESC",
    vec![],
  )
  .await?;
  let mut out = Vec::new();
  for row in rows {
    if let Some(payload) = extract_string(&row, "payload") {
      if let Some(val) = payload_to_js(&payload) {
        if let Some(id) = extract_string(&row, "id") {
          let _ = Reflect::set(&val, &"id".into(), &JsValue::from_str(&id));
        }
        if let Some(created_at) = extract_number(&row, "created_at") {
          let _ = Reflect::set(&val, &"created_at".into(), &JsValue::from_f64(created_at));
        }
        out.push(val);
        continue;
      }
    }
    let obj = Object::new();
    if let Some(id) = extract_string(&row, "id") {
      let _ = Reflect::set(&obj, &"id".into(), &JsValue::from_str(&id));
    }
    if let Some(created_at) = extract_number(&row, "created_at") {
      let _ = Reflect::set(&obj, &"created_at".into(), &JsValue::from_f64(created_at));
    }
    out.push(obj.into());
  }
  Ok(out)
}

async fn sqlite_save_assignment(value: &JsValue) -> Result<(), JsValue> {
  db_client::init_db().await?;
  let id = ensure_id(value);
  let created_at = ensure_created_at(value, &["created_at", "createdAt"], js_sys::Date::now());
  let payload = payload_string(value);
  db_client::exec(
    "INSERT OR REPLACE INTO assignments (id, created_at, payload) VALUES (?1, ?2, ?3)",
    vec![
      JsonValue::String(id),
      json_number(created_at),
      JsonValue::String(payload),
    ],
  )
  .await
}

async fn sqlite_get_profiles() -> Result<Vec<JsValue>, JsValue> {
  db_client::init_db().await?;
  let rows = db_client::query(
    "SELECT id, name, created_at, payload FROM profiles ORDER BY created_at DESC",
    vec![],
  )
  .await?;
  let mut out = Vec::new();
  for row in rows {
    if let Some(payload) = extract_string(&row, "payload") {
      if let Some(val) = payload_to_js(&payload) {
        if let Some(id) = extract_string(&row, "id") {
          let _ = Reflect::set(&val, &"id".into(), &JsValue::from_str(&id));
        }
        if let Some(name) = extract_string(&row, "name") {
          let _ = Reflect::set(&val, &"name".into(), &JsValue::from_str(&name));
        }
        if let Some(created_at) = extract_number(&row, "created_at") {
          let _ = Reflect::set(&val, &"created_at".into(), &JsValue::from_f64(created_at));
        }
        out.push(val);
        continue;
      }
    }
    let obj = Object::new();
    if let Some(id) = extract_string(&row, "id") {
      let _ = Reflect::set(&obj, &"id".into(), &JsValue::from_str(&id));
    }
    if let Some(name) = extract_string(&row, "name") {
      let _ = Reflect::set(&obj, &"name".into(), &JsValue::from_str(&name));
    }
    if let Some(created_at) = extract_number(&row, "created_at") {
      let _ = Reflect::set(&obj, &"created_at".into(), &JsValue::from_f64(created_at));
    }
    out.push(obj.into());
  }
  Ok(out)
}

async fn sqlite_save_profile(value: &JsValue) -> Result<(), JsValue> {
  db_client::init_db().await?;
  let id = ensure_id(value);
  let created_at = ensure_created_at(value, &["created_at", "createdAt"], js_sys::Date::now());
  let name = js_string_any(value, &["name"]).unwrap_or_default();
  let payload = payload_string(value);
  db_client::exec(
    "INSERT OR REPLACE INTO profiles (id, name, created_at, payload) VALUES (?1, ?2, ?3, ?4)",
    vec![
      JsonValue::String(id),
      if name.is_empty() { JsonValue::Null } else { JsonValue::String(name) },
      json_number(created_at),
      JsonValue::String(payload),
    ],
  )
  .await
}

async fn sqlite_get_game_scores() -> Result<Vec<JsValue>, JsValue> {
  db_client::init_db().await?;
  let rows = db_client::query(
    "SELECT id, created_at, payload FROM game_scores ORDER BY created_at DESC",
    vec![],
  )
  .await?;
  let mut out = Vec::new();
  for row in rows {
    if let Some(payload) = extract_string(&row, "payload") {
      if let Some(val) = payload_to_js(&payload) {
        if let Some(id) = extract_string(&row, "id") {
          let _ = Reflect::set(&val, &"id".into(), &JsValue::from_str(&id));
        }
        if let Some(created_at) = extract_number(&row, "created_at") {
          let _ = Reflect::set(&val, &"created_at".into(), &JsValue::from_f64(created_at));
        }
        out.push(val);
        continue;
      }
    }
    let obj = Object::new();
    if let Some(id) = extract_string(&row, "id") {
      let _ = Reflect::set(&obj, &"id".into(), &JsValue::from_str(&id));
    }
    if let Some(created_at) = extract_number(&row, "created_at") {
      let _ = Reflect::set(&obj, &"created_at".into(), &JsValue::from_f64(created_at));
    }
    out.push(obj.into());
  }
  Ok(out)
}

async fn sqlite_save_game_score(value: &JsValue) -> Result<(), JsValue> {
  db_client::init_db().await?;
  let id = ensure_id(value);
  let created_at = ensure_created_at(
    value,
    &["created_at", "createdAt", "ended_at", "endedAt"],
    js_sys::Date::now(),
  );
  let payload = payload_string(value);
  db_client::exec(
    "INSERT OR REPLACE INTO game_scores (id, created_at, payload) VALUES (?1, ?2, ?3)",
    vec![
      JsonValue::String(id),
      json_number(created_at),
      JsonValue::String(payload),
    ],
  )
  .await
}

async fn sqlite_get_scores() -> Result<Vec<JsValue>, JsValue> {
  db_client::init_db().await?;
  let rows = db_client::query(
    "SELECT id, title, composer, created_at, payload FROM score_library ORDER BY created_at DESC",
    vec![],
  )
  .await?;
  let mut out = Vec::new();
  for row in rows {
    let payload_json = extract_string(&row, "payload")
      .and_then(|payload| serde_json::from_str::<JsonValue>(&payload).ok());
    let entry = payload_json
      .as_ref()
      .and_then(|json| json_to_js(json))
      .unwrap_or_else(|| Object::new().into());

    if let Some(id) = extract_string(&row, "id") {
      let _ = Reflect::set(&entry, &"id".into(), &JsValue::from_str(&id));
    }
    if let Some(title) = extract_string(&row, "title") {
      let _ = Reflect::set(&entry, &"title".into(), &JsValue::from_str(&title));
    }
    if let Some(composer) = extract_string(&row, "composer") {
      let _ = Reflect::set(&entry, &"composer".into(), &JsValue::from_str(&composer));
    }
    if let Some(created_at) = extract_number(&row, "created_at") {
      let _ = Reflect::set(&entry, &"created_at".into(), &JsValue::from_f64(created_at));
    }

    let opfs_path = payload_json
      .as_ref()
      .and_then(|json| extract_string(json, "opfs_path"));
    let blob = if let Some(path) = opfs_path.as_deref() {
      if is_idb_path(path) {
        idb_score_blob(
          extract_string(&row, "id").as_deref().unwrap_or_default(),
        )
        .await
      } else {
        load_score_blob(path).await
      }
    } else {
      None
    };
    if let Some(blob) = blob {
      let _ = Reflect::set(&entry, &"pdf_blob".into(), &blob);
    }

    out.push(entry);
  }
  Ok(out)
}

async fn sqlite_save_score_entry(value: &JsValue) -> Result<(), JsValue> {
  db_client::init_db().await?;
  let id = ensure_id(value);
  let created_at = ensure_created_at(value, &["created_at", "createdAt"], js_sys::Date::now());
  let title = js_string_any(value, &["title"]).unwrap_or_default();
  let composer = js_string_any(value, &["composer"]).unwrap_or_default();
  let source = js_string_any(value, &["source"]).unwrap_or_default();
  let filename = js_string_any(value, &["filename"]);
  let measures = js_number_any(value, &["measures"]);
  let beats = js_number_any(value, &["beats_per_measure", "beatsPerMeasure"]);
  let tempo = js_number_any(value, &["tempo_bpm", "tempoBpm"]);
  let xml = js_string_any(value, &["xml"]);

  let pdf_blob = Reflect::get(value, &"pdf_blob".into())
    .ok()
    .and_then(|val| val.dyn_into::<Blob>().ok());
  let mut opfs_path = None;
  if let Some(blob) = pdf_blob.as_ref() {
    let name_hint = filename.clone().unwrap_or_else(|| title.clone());
    opfs_path = save_score_blob(&id, &name_hint, blob).await;
    if opfs_path.is_none() {
      if put_value("scoreLibrary", value).await.is_ok() {
        opfs_path = Some(idb_fallback_path("scoreLibrary", &id));
      }
    }
  }

  let mut map = serde_json::Map::new();
  map.insert("id".to_string(), JsonValue::String(id.clone()));
  map.insert("title".to_string(), JsonValue::String(title.clone()));
  map.insert("created_at".to_string(), json_number(created_at));
  if !composer.is_empty() {
    map.insert("composer".to_string(), JsonValue::String(composer.clone()));
  }
  if !source.is_empty() {
    map.insert("source".to_string(), JsonValue::String(source));
  }
  if let Some(filename) = filename {
    map.insert("filename".to_string(), JsonValue::String(filename));
  }
  if let Some(measures) = measures {
    map.insert("measures".to_string(), json_number(measures));
  }
  if let Some(beats) = beats {
    map.insert("beats_per_measure".to_string(), json_number(beats));
  }
  if let Some(tempo) = tempo {
    map.insert("tempo_bpm".to_string(), json_number(tempo));
  }
  if let Some(xml) = xml {
    map.insert("xml".to_string(), JsonValue::String(xml));
  }
  if let Some(path) = opfs_path.as_ref() {
    map.insert("opfs_path".to_string(), JsonValue::String(path.clone()));
  }

  let payload = serde_json::Value::Object(map);
  let payload = serde_json::to_string(&payload).unwrap_or_else(|_| "{}".to_string());

  db_client::exec(
    "INSERT OR REPLACE INTO score_library (id, title, composer, created_at, payload) VALUES (?1, ?2, ?3, ?4, ?5)",
    vec![
      JsonValue::String(id),
      if title.is_empty() { JsonValue::Null } else { JsonValue::String(title) },
      if composer.is_empty() { JsonValue::Null } else { JsonValue::String(composer) },
      json_number(created_at),
      JsonValue::String(payload),
    ],
  )
  .await
}

async fn sqlite_delete_score_entry(id: &str) -> Result<(), JsValue> {
  db_client::init_db().await?;
  let rows = db_client::query(
    "SELECT payload FROM score_library WHERE id = ?1",
    vec![JsonValue::String(id.to_string())],
  )
  .await?;
  if let Some(row) = rows.first() {
    if let Some(payload) = extract_string(row, "payload") {
      if let Ok(json) = serde_json::from_str::<JsonValue>(&payload) {
        if let Some(path) = extract_string(&json, "opfs_path") {
          if is_idb_path(&path) {
            if let Some(key) = idb_key_from_path(&path) {
              let _ = delete_value("scoreLibrary", &key).await;
            }
          } else {
            let _ = delete_score_blob(&path).await;
          }
        }
      }
    }
  }
  db_client::exec(
    "DELETE FROM score_library WHERE id = ?1",
    vec![JsonValue::String(id.to_string())],
  )
  .await
}

async fn sqlite_get_ml_traces() -> Result<Vec<JsValue>, JsValue> {
  db_client::init_db().await?;
  let rows = db_client::query(
    "SELECT id, created_at, payload FROM ml_traces ORDER BY created_at DESC",
    vec![],
  )
  .await?;
  let mut out = Vec::new();
  for row in rows {
    if let Some(payload) = extract_string(&row, "payload") {
      if let Some(val) = payload_to_js(&payload) {
        if let Some(id) = extract_string(&row, "id") {
          let _ = Reflect::set(&val, &"id".into(), &JsValue::from_str(&id));
        }
        if let Some(created_at) = extract_number(&row, "created_at") {
          let _ = Reflect::set(&val, &"created_at".into(), &JsValue::from_f64(created_at));
        }
        out.push(val);
        continue;
      }
    }
    let obj = Object::new();
    if let Some(id) = extract_string(&row, "id") {
      let _ = Reflect::set(&obj, &"id".into(), &JsValue::from_str(&id));
    }
    if let Some(created_at) = extract_number(&row, "created_at") {
      let _ = Reflect::set(&obj, &"created_at".into(), &JsValue::from_f64(created_at));
    }
    out.push(obj.into());
  }
  Ok(out)
}

async fn sqlite_save_ml_trace(value: &JsValue) -> Result<(), JsValue> {
  db_client::init_db().await?;
  let id = ensure_id(value);
  let created_at = ensure_created_at(value, &["created_at", "createdAt", "timestamp"], js_sys::Date::now());
  let payload = payload_string(value);
  db_client::exec(
    "INSERT OR REPLACE INTO ml_traces (id, created_at, payload) VALUES (?1, ?2, ?3)",
    vec![
      JsonValue::String(id),
      json_number(created_at),
      JsonValue::String(payload),
    ],
  )
  .await
}

async fn sqlite_prune_ml_traces(limit: usize, max_age_ms: f64) -> Result<(), JsValue> {
  db_client::init_db().await?;
  let cutoff = js_sys::Date::now() - max_age_ms.max(0.0);
  let _ = db_client::exec(
    "DELETE FROM ml_traces WHERE created_at < ?1",
    vec![json_number(cutoff)],
  )
  .await;

  if limit == 0 {
    return Ok(());
  }
  let rows = db_client::query(
    "SELECT id FROM ml_traces ORDER BY created_at DESC",
    vec![],
  )
  .await?;
  if rows.len() <= limit {
    return Ok(());
  }
  for row in rows.into_iter().skip(limit) {
    let id = extract_string(&row, "id").unwrap_or_default();
    if id.is_empty() {
      continue;
    }
    let _ = db_client::exec(
      "DELETE FROM ml_traces WHERE id = ?1",
      vec![JsonValue::String(id)],
    )
    .await;
  }
  Ok(())
}

async fn sqlite_get_telemetry_queue() -> Result<Vec<JsValue>, JsValue> {
  db_client::init_db().await?;
  let rows = db_client::query(
    "SELECT id, created_at, payload FROM telemetry_queue ORDER BY created_at DESC",
    vec![],
  )
  .await?;
  let mut out = Vec::new();
  for row in rows {
    if let Some(payload) = extract_string(&row, "payload") {
      if let Some(val) = payload_to_js(&payload) {
        if let Some(id) = extract_string(&row, "id") {
          let _ = Reflect::set(&val, &"id".into(), &JsValue::from_str(&id));
        }
        if let Some(created_at) = extract_number(&row, "created_at") {
          let _ = Reflect::set(&val, &"created_at".into(), &JsValue::from_f64(created_at));
        }
        out.push(val);
        continue;
      }
    }
    let obj = Object::new();
    if let Some(id) = extract_string(&row, "id") {
      let _ = Reflect::set(&obj, &"id".into(), &JsValue::from_str(&id));
    }
    if let Some(created_at) = extract_number(&row, "created_at") {
      let _ = Reflect::set(&obj, &"created_at".into(), &JsValue::from_f64(created_at));
    }
    out.push(obj.into());
  }
  Ok(out)
}

async fn sqlite_save_telemetry(value: &JsValue) -> Result<(), JsValue> {
  db_client::init_db().await?;
  let id = ensure_id(value);
  let created_at = ensure_created_at(value, &["created_at", "createdAt", "timestamp"], js_sys::Date::now());
  let payload = payload_string(value);
  db_client::exec(
    "INSERT OR REPLACE INTO telemetry_queue (id, created_at, payload) VALUES (?1, ?2, ?3)",
    vec![
      JsonValue::String(id),
      json_number(created_at),
      JsonValue::String(payload),
    ],
  )
  .await
}

async fn sqlite_get_error_queue() -> Result<Vec<JsValue>, JsValue> {
  db_client::init_db().await?;
  let rows = db_client::query(
    "SELECT id, created_at, payload FROM error_queue ORDER BY created_at DESC",
    vec![],
  )
  .await?;
  let mut out = Vec::new();
  for row in rows {
    if let Some(payload) = extract_string(&row, "payload") {
      if let Some(val) = payload_to_js(&payload) {
        if let Some(id) = extract_string(&row, "id") {
          let _ = Reflect::set(&val, &"id".into(), &JsValue::from_str(&id));
        }
        if let Some(created_at) = extract_number(&row, "created_at") {
          let _ = Reflect::set(&val, &"created_at".into(), &JsValue::from_f64(created_at));
        }
        out.push(val);
        continue;
      }
    }
    let obj = Object::new();
    if let Some(id) = extract_string(&row, "id") {
      let _ = Reflect::set(&obj, &"id".into(), &JsValue::from_str(&id));
    }
    if let Some(created_at) = extract_number(&row, "created_at") {
      let _ = Reflect::set(&obj, &"created_at".into(), &JsValue::from_f64(created_at));
    }
    out.push(obj.into());
  }
  Ok(out)
}

async fn sqlite_save_error(value: &JsValue) -> Result<(), JsValue> {
  db_client::init_db().await?;
  let id = ensure_id(value);
  let created_at = ensure_created_at(value, &["created_at", "createdAt", "timestamp"], js_sys::Date::now());
  let payload = payload_string(value);
  db_client::exec(
    "INSERT OR REPLACE INTO error_queue (id, created_at, payload) VALUES (?1, ?2, ?3)",
    vec![
      JsonValue::String(id),
      json_number(created_at),
      JsonValue::String(payload),
    ],
  )
  .await
}

async fn sqlite_get_model_cache(id: &str) -> Result<Option<JsValue>, JsValue> {
  db_client::init_db().await?;
  let rows = db_client::query(
    "SELECT payload FROM model_cache WHERE id = ?1",
    vec![JsonValue::String(id.to_string())],
  )
  .await?;
  let row = match rows.first() {
    Some(row) => row,
    None => return Ok(None),
  };
  if let Some(payload) = extract_string(row, "payload") {
    if let Some(val) = payload_to_js(&payload) {
      let _ = Reflect::set(&val, &"id".into(), &JsValue::from_str(id));
      return Ok(Some(val));
    }
  }
  let obj = Object::new();
  let _ = Reflect::set(&obj, &"id".into(), &JsValue::from_str(id));
  Ok(Some(obj.into()))
}

async fn sqlite_get_model_cache_all() -> Result<Vec<JsValue>, JsValue> {
  db_client::init_db().await?;
  let rows = db_client::query(
    "SELECT id, created_at, payload FROM model_cache ORDER BY created_at DESC",
    vec![],
  )
  .await?;
  let mut out = Vec::new();
  for row in rows {
    if let Some(payload) = extract_string(&row, "payload") {
      if let Some(val) = payload_to_js(&payload) {
        if let Some(id) = extract_string(&row, "id") {
          let _ = Reflect::set(&val, &"id".into(), &JsValue::from_str(&id));
        }
        if let Some(created_at) = extract_number(&row, "created_at") {
          let _ = Reflect::set(&val, &"created_at".into(), &JsValue::from_f64(created_at));
        }
        out.push(val);
        continue;
      }
    }
    let obj = Object::new();
    if let Some(id) = extract_string(&row, "id") {
      let _ = Reflect::set(&obj, &"id".into(), &JsValue::from_str(&id));
    }
    if let Some(created_at) = extract_number(&row, "created_at") {
      let _ = Reflect::set(&obj, &"created_at".into(), &JsValue::from_f64(created_at));
    }
    out.push(obj.into());
  }
  Ok(out)
}

async fn sqlite_save_model_cache(id: &str, value: &JsValue) -> Result<(), JsValue> {
  db_client::init_db().await?;
  let _ = ensure_id(value);
  let created_at = ensure_created_at(
    value,
    &["created_at", "createdAt", "updated_at", "updatedAt"],
    js_sys::Date::now(),
  );
  let payload = payload_string(value);
  db_client::exec(
    "INSERT OR REPLACE INTO model_cache (id, created_at, payload) VALUES (?1, ?2, ?3)",
    vec![
      JsonValue::String(id.to_string()),
      json_number(created_at),
      JsonValue::String(payload),
    ],
  )
  .await
}

async fn sqlite_delete_entry(table: &str, id: &str) -> Result<(), JsValue> {
  db_client::init_db().await?;
  db_client::exec(
    &format!("DELETE FROM {} WHERE id = ?1", table),
    vec![JsonValue::String(id.to_string())],
  )
  .await
}

async fn sqlite_clear_table(table: &str) -> Result<(), JsValue> {
  db_client::init_db().await?;
  db_client::exec(&format!("DELETE FROM {}", table), vec![]).await
}

pub async fn save_recording_blob(id: &str, format_hint: &str, blob: &Blob) -> Option<String> {
  let ext = recording_extension(format_hint, blob);
  let filename = recording_filename(id, &ext);
  let path = format!("{}/{}", OPFS_RECORDINGS_DIR, filename);
  if save_blob_to_opfs(&path, blob).await.is_ok() {
    Some(path)
  } else {
    None
  }
}

pub async fn save_share_blob(id: &str, name: &str, blob: &Blob) -> Option<String> {
  let filename = share_filename(id, name);
  let path = format!("{}/{}", OPFS_SHARE_DIR, filename);
  if save_blob_to_opfs(&path, blob).await.is_ok() {
    Some(path)
  } else {
    None
  }
}

async fn save_score_blob(id: &str, name: &str, blob: &Blob) -> Option<String> {
  let filename = score_filename(id, name);
  let path = format!("{}/{}", OPFS_SCORE_DIR, filename);
  if save_blob_to_opfs(&path, blob).await.is_ok() {
    Some(path)
  } else {
    None
  }
}

pub async fn save_model_bytes(id: &str, filename: &str, bytes: &[u8]) -> Option<String> {
  let name = if filename.trim().is_empty() {
    sanitize_filename(id)
  } else {
    sanitize_filename(filename)
  };
  let path = format!("{}/{}", OPFS_MODELS_DIR, name);
  if save_bytes_to_opfs(&path, bytes).await.is_ok() {
    Some(path)
  } else {
    None
  }
}

pub async fn load_model_bytes(path: &str) -> Option<Vec<u8>> {
  let blob = load_blob_from_opfs(path).await.ok()?;
  blob_to_bytes(&blob).await.ok()
}

pub async fn load_recording_blob(path: &str) -> Option<Blob> {
  load_blob_from_opfs(path).await.ok()
}

async fn load_share_blob(path: &str) -> Option<Blob> {
  load_blob_from_opfs(path).await.ok()
}

async fn load_score_blob(path: &str) -> Option<Blob> {
  load_blob_from_opfs(path).await.ok()
}

async fn delete_recording_blob(path: &str) -> Result<(), JsValue> {
  delete_opfs_file(path).await
}

async fn delete_share_blob(path: &str) -> Result<(), JsValue> {
  delete_opfs_file(path).await
}

async fn delete_score_blob(path: &str) -> Result<(), JsValue> {
  delete_opfs_file(path).await
}

pub async fn clear_recording_blobs() -> Result<(), JsValue> {
  delete_opfs_dir(OPFS_RECORDINGS_DIR).await
}

async fn clear_share_blobs() -> Result<(), JsValue> {
  delete_opfs_dir(OPFS_SHARE_DIR).await
}

async fn clear_score_blobs() -> Result<(), JsValue> {
  delete_opfs_dir(OPFS_SCORE_DIR).await
}

async fn idb_recording_blob(id: &str) -> Option<Blob> {
  let value = idb_get_value("recordings", id).await.ok()?;
  recording_from_value(&value).and_then(|rec| rec.blob)
}

async fn idb_share_blob(id: &str) -> Option<Blob> {
  let value = idb_get_value("shareInbox", id).await.ok()?;
  share_item_from_value(&value).and_then(|item| item.blob)
}

async fn idb_score_blob(id: &str) -> Option<Blob> {
  let value = idb_get_value("scoreLibrary", id).await.ok()?;
  Reflect::get(&value, &"pdf_blob".into())
    .ok()
    .and_then(|val| val.dyn_into::<Blob>().ok())
}

async fn idb_get_value(store_name: &str, key: &str) -> Result<JsValue, JsValue> {
  let db = open_db().await?;
  let tx = match db.transaction_with_str_and_mode(store_name, IdbTransactionMode::Readonly) {
    Ok(tx) => tx,
    Err(_) => return Err(JsValue::from_str("IDB store missing")),
  };
  let store = tx.object_store(store_name)?;
  let request = store.get(&JsValue::from_str(key))?;
  let receiver = request_to_future(request);
  receiver.await.map_err(|_| JsValue::from_str("IDB get error"))?
}


async fn save_blob_to_opfs(path: &str, blob: &Blob) -> Result<(), JsValue> {
  let root = opfs_root().await?;
  let (dir, file) = split_path(path);
  let parent = match dir {
    Some(dir) => get_directory_handle(&root, dir, true).await?,
    None => root,
  };
  let file_handle = get_file_handle(&parent, file, true).await?;
  let writable = call_method0(&file_handle, "createWritable")
    .await
    .map_err(|err| {
      storage_pressure::record_error("opfs.createWritable", &err);
      err
    })?;
  call_method1(&writable, "write", &blob.clone().into())
    .await
    .map_err(|err| {
      storage_pressure::record_error("opfs.write", &err);
      err
    })?;
  call_method0(&writable, "close")
    .await
    .map_err(|err| {
      storage_pressure::record_error("opfs.close", &err);
      err
    })?;
  Ok(())
}

async fn save_bytes_to_opfs(path: &str, bytes: &[u8]) -> Result<(), JsValue> {
  let root = opfs_root().await?;
  let (dir, file) = split_path(path);
  let parent = match dir {
    Some(dir) => get_directory_handle(&root, dir, true).await?,
    None => root,
  };
  let file_handle = get_file_handle(&parent, file, true).await?;
  let writable = call_method0(&file_handle, "createWritable")
    .await
    .map_err(|err| {
      storage_pressure::record_error("opfs.createWritable", &err);
      err
    })?;
  let array = Uint8Array::from(bytes);
  call_method1(&writable, "write", &array.into())
    .await
    .map_err(|err| {
      storage_pressure::record_error("opfs.write", &err);
      err
    })?;
  call_method0(&writable, "close")
    .await
    .map_err(|err| {
      storage_pressure::record_error("opfs.close", &err);
      err
    })?;
  Ok(())
}

async fn load_blob_from_opfs(path: &str) -> Result<Blob, JsValue> {
  let root = opfs_root().await?;
  let (dir, file) = split_path(path);
  let parent = match dir {
    Some(dir) => get_directory_handle(&root, dir, false).await?,
    None => root,
  };
  let file_handle = get_file_handle(&parent, file, false).await?;
  let file = call_method0(&file_handle, "getFile").await?;
  file.dyn_into::<Blob>().map_err(|_| JsValue::from_str("OPFS blob cast failed"))
}

async fn blob_to_bytes(blob: &Blob) -> Result<Vec<u8>, JsValue> {
  let buffer = JsFuture::from(blob.array_buffer()).await?;
  let array = Uint8Array::new(&buffer);
  Ok(array.to_vec())
}

async fn delete_opfs_file(path: &str) -> Result<(), JsValue> {
  let root = opfs_root().await?;
  let (dir, file) = split_path(path);
  let parent = match dir {
    Some(dir) => get_directory_handle(&root, dir, false).await?,
    None => root,
  };
  let _ = call_method2(&parent, "removeEntry", &JsValue::from_str(file), &JsValue::UNDEFINED).await?;
  Ok(())
}

async fn delete_opfs_dir(name: &str) -> Result<(), JsValue> {
  let root = opfs_root().await?;
  let options = Object::new();
  let _ = Reflect::set(&options, &JsValue::from_str("recursive"), &JsValue::from_bool(true));
  let _ = call_method2(&root, "removeEntry", &JsValue::from_str(name), &options.into()).await?;
  Ok(())
}


pub async fn save_blob_to_opfs_public(path: &str, blob: &Blob) -> Result<(), JsValue> {
  save_blob_to_opfs(path, blob).await
}

pub async fn delete_opfs_dir_public(name: &str) -> Result<(), JsValue> {
  delete_opfs_dir(name).await
}


pub fn opfs_supported() -> bool {
  let navigator = dom::window().navigator();
  let storage = Reflect::get(&navigator, &JsValue::from_str("storage")).ok();
  storage
    .and_then(|storage| Reflect::get(&storage, &JsValue::from_str("getDirectory")).ok())
    .map(|val| val.is_function())
    .unwrap_or(false)
}

async fn opfs_root() -> Result<JsValue, JsValue> {
  let navigator = dom::window().navigator();
  let storage = Reflect::get(&navigator, &JsValue::from_str("storage"))?;
  let get_dir = Reflect::get(&storage, &JsValue::from_str("getDirectory"))?;
  let get_dir = get_dir.dyn_into::<Function>()?;
  let promise = get_dir.call0(&storage)?;
  let promise = promise.dyn_into::<js_sys::Promise>()?;
  JsFuture::from(promise).await
}

async fn get_directory_handle(parent: &JsValue, name: &str, create: bool) -> Result<JsValue, JsValue> {
  let func = Reflect::get(parent, &JsValue::from_str("getDirectoryHandle"))?;
  let func = func.dyn_into::<Function>()?;
  let options = Object::new();
  let _ = Reflect::set(&options, &JsValue::from_str("create"), &JsValue::from_bool(create));
  let promise = func.call2(parent, &JsValue::from_str(name), &options.into())?;
  let promise = promise.dyn_into::<js_sys::Promise>()?;
  JsFuture::from(promise).await
}

async fn get_file_handle(parent: &JsValue, name: &str, create: bool) -> Result<JsValue, JsValue> {
  let func = Reflect::get(parent, &JsValue::from_str("getFileHandle"))?;
  let func = func.dyn_into::<Function>()?;
  let options = Object::new();
  let _ = Reflect::set(&options, &JsValue::from_str("create"), &JsValue::from_bool(create));
  let promise = func.call2(parent, &JsValue::from_str(name), &options.into())?;
  let promise = promise.dyn_into::<js_sys::Promise>()?;
  JsFuture::from(promise).await
}

async fn call_method0(target: &JsValue, name: &str) -> Result<JsValue, JsValue> {
  let func = Reflect::get(target, &JsValue::from_str(name))?;
  let func = func.dyn_into::<Function>()?;
  let promise = func.call0(target)?;
  let promise = promise.dyn_into::<js_sys::Promise>()?;
  JsFuture::from(promise).await
}

async fn call_method1(target: &JsValue, name: &str, arg: &JsValue) -> Result<JsValue, JsValue> {
  let func = Reflect::get(target, &JsValue::from_str(name))?;
  let func = func.dyn_into::<Function>()?;
  let promise = func.call1(target, arg)?;
  let promise = promise.dyn_into::<js_sys::Promise>()?;
  JsFuture::from(promise).await
}

async fn call_method2(
  target: &JsValue,
  name: &str,
  arg1: &JsValue,
  arg2: &JsValue,
) -> Result<JsValue, JsValue> {
  let func = Reflect::get(target, &JsValue::from_str(name))?;
  let func = func.dyn_into::<Function>()?;
  let promise = func.call2(target, arg1, arg2)?;
  let promise = promise.dyn_into::<js_sys::Promise>()?;
  JsFuture::from(promise).await
}

fn ensure_id(value: &JsValue) -> String {
  let id = js_string_any(value, &["id"]).unwrap_or_else(utils::create_id);
  let _ = Reflect::set(value, &"id".into(), &JsValue::from_str(&id));
  id
}

fn ensure_created_at(value: &JsValue, keys: &[&str], fallback: f64) -> f64 {
  if let Some(ts) = js_number_any(value, keys) {
    return ts;
  }
  let ts = fallback;
  let _ = Reflect::set(value, &"created_at".into(), &JsValue::from_f64(ts));
  ts
}

fn payload_string(value: &JsValue) -> String {
  serde_json::to_string(&json_from_js(value)).unwrap_or_else(|_| "{}".to_string())
}

fn payload_to_js(payload: &str) -> Option<JsValue> {
  serde_json::from_str::<JsonValue>(payload).ok().and_then(|json| json_to_js(&json))
}
