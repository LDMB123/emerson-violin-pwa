use std::cell::RefCell;
use std::rc::Rc;

use futures_channel::oneshot;
use js_sys::{Array, JSON, Object, Reflect, Function};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;
use web_sys::{
  Blob, Event, IdbCursorWithValue, IdbDatabase, IdbKeyRange, IdbObjectStoreParameters, IdbOpenDbRequest,
  IdbRequest, IdbTransactionMode,
};

use crate::dom;
use crate::db_client;
use crate::utils;

const DB_NAME: &str = "emerson-violin-db";
pub const DB_VERSION: u32 = 5;

const SQLITE_READY_TTL_MS: f64 = 5000.0;

#[derive(Clone, Copy)]
struct SqliteGate {
  last_check: f64,
  ready: bool,
}

thread_local! {
  static SQLITE_GATE: RefCell<SqliteGate> = RefCell::new(SqliteGate {
    last_check: 0.0,
    ready: false,
  });
}


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
  let onerror = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::once(move |_event: Event| {
    if let Some(tx) = error_sender.borrow_mut().take() {
      let error = JsValue::from_str("IDB request failed");
      let _ = tx.send(Err(error));
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

    let value = cursor.value();
    values_ref.borrow_mut().push(value);
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

  rx.await.map_err(|_| JsValue::from_str("IDB cursor error"))??
}


async fn put_value(store_name: &str, value: &JsValue) -> Result<(), JsValue> {
  let db = open_db().await?;
  let tx = db.transaction_with_str_and_mode(store_name, IdbTransactionMode::Readwrite)?;
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


async fn should_use_sqlite() -> bool {
  let now = js_sys::Date::now();
  let cached = SQLITE_GATE.with(|slot| {
    let gate = slot.borrow();
    if now - gate.last_check < SQLITE_READY_TTL_MS {
      Some(gate.ready)
    } else {
      None
    }
  });
  if let Some(ready) = cached {
    return ready;
  }
  let ready = check_sqlite_ready().await;
  SQLITE_GATE.with(|slot| {
    let mut gate = slot.borrow_mut();
    gate.last_check = now;
    gate.ready = ready;
  });
  ready
}

async fn check_sqlite_ready() -> bool {
  if db_client::init_db().await.is_err() {
    return false;
  }
  let rows = match db_client::query(
    "SELECT completed_at, errors_json, checksums_json FROM migration_state WHERE id = ?1",
    vec![JsonValue::String("active".to_string())],
  )
  .await
  {
    Ok(rows) => rows,
    Err(_) => return false,
  };
  let row = match rows.first() {
    Some(row) => row,
    None => return false,
  };
  let completed_at = extract_number(row, "completed_at").unwrap_or(0.0);
  if completed_at <= 0.0 {
    return false;
  }
  let errors_json = extract_string(row, "errors_json").unwrap_or_else(|| "[]".to_string());
  let errors: Vec<String> = serde_json::from_str(&errors_json).unwrap_or_default();
  if !errors.is_empty() {
    return false;
  }
  let checksums_json = extract_string(row, "checksums_json").unwrap_or_else(|| "{}".to_string());
  if let Ok(map) = serde_json::from_str::<serde_json::Map<String, JsonValue>>(&checksums_json) {
    for value in map.values() {
      if value.get("ok").and_then(|val| val.as_bool()) == Some(false) {
        return false;
      }
    }
  }
  true
}

pub async fn get_sessions() -> Result<Vec<Session>, JsValue> {
  let values = get_all_values("sessions").await?;
  let mut sessions = Vec::new();
  for value in values {
    if let Ok(session) = serde_wasm_bindgen::from_value::<Session>(value) {
      sessions.push(session);
    }
  }
  Ok(sessions)
}

pub async fn save_session(session: &Session) -> Result<(), JsValue> {
  let value = serde_wasm_bindgen::to_value(session)?;
  put_value("sessions", &value).await
}

pub async fn clear_sessions() -> Result<(), JsValue> {
  clear_store("sessions").await
}

pub async fn get_recordings() -> Result<Vec<Recording>, JsValue> {
  let values = get_all_values("recordings").await?;
  let mut out = Vec::new();
  for value in values {
    if let Some(recording) = recording_from_value(&value) {
      out.push(recording);
    }
  }
  Ok(out)
}

pub async fn save_recording(recording: &Recording) -> Result<(), JsValue> {
  let value = recording_to_value(recording)?;
  put_value("recordings", &value).await
}

pub async fn delete_recording(id: &str) -> Result<(), JsValue> {
  delete_value("recordings", id).await
}

pub async fn clear_recordings() -> Result<(), JsValue> {
  clear_store("recordings").await
}

pub async fn add_sync_entry(entry: &SyncEntry) -> Result<(), JsValue> {
  let value = serde_wasm_bindgen::to_value(entry)?;
  put_value("syncQueue", &value).await
}

pub async fn clear_sync_queue() -> Result<(), JsValue> {
  clear_store("syncQueue").await
}

pub async fn get_share_inbox() -> Result<Vec<ShareItem>, JsValue> {
  let values = get_all_values("shareInbox").await?;
  let mut out = Vec::new();
  for value in values {
    if let Some(item) = share_item_from_value(&value) {
      out.push(item);
    }
  }
  Ok(out)
}

pub async fn clear_share_inbox() -> Result<(), JsValue> {
  clear_store("shareInbox").await
}

pub async fn delete_share_item(id: &str) -> Result<(), JsValue> {
  delete_value("shareInbox", id).await
}

fn recording_to_value(recording: &Recording) -> Result<JsValue, JsValue> {
  let obj = Object::new();
  Reflect::set(&obj, &"id".into(), &JsValue::from_str(&recording.id))?;
  Reflect::set(&obj, &"created_at".into(), &JsValue::from_f64(recording.created_at))?;
  Reflect::set(&obj, &"duration_seconds".into(), &JsValue::from_f64(recording.duration_seconds))?;
  if let Some(blob) = &recording.blob {
    Reflect::set(&obj, &"blob".into(), blob)?;
  }
  Ok(obj.into())
}

fn recording_from_value(value: &JsValue) -> Option<Recording> {
  let id = Reflect::get(value, &"id".into()).ok()?.as_string()?;
  let created_at = Reflect::get(value, &"created_at".into()).ok()?.as_f64()?;
  let duration = Reflect::get(value, &"duration_seconds".into()).ok()?.as_f64()?;
  let blob = Reflect::get(value, &"blob".into())
    .ok()
    .and_then(|val| val.dyn_into::<Blob>().ok());
  Some(Recording {
    id,
    created_at,
    duration_seconds: duration,
    blob,
  })
}

fn share_item_from_value(value: &JsValue) -> Option<ShareItem> {
  let id = Reflect::get(value, &"id".into()).ok()?.as_string()?;
  let name = Reflect::get(value, &"name".into()).ok()?.as_string()?;
  let size = Reflect::get(value, &"size".into()).ok()?.as_f64()?;
  let mime = Reflect::get(value, &"type".into())
    .ok()
    .and_then(|v| v.as_string())
    .unwrap_or_else(|| "application/octet-stream".to_string());
  let created_raw = Reflect::get(value, &"created_at".into())
    .ok()
    .or_else(|| Reflect::get(value, &"createdAt".into()).ok())
    .unwrap_or(JsValue::UNDEFINED);
  let created_at = if let Some(ts) = created_raw.as_f64() {
    ts
  } else if let Some(text) = created_raw.as_string() {
    js_sys::Date::parse(&text)
  } else {
    js_sys::Date::now()
  };
  let blob = Reflect::get(value, &"blob".into())
    .ok()
    .and_then(|val| val.dyn_into::<Blob>().ok());
  Some(ShareItem {
    id,
    name,
    size,
    mime,
    created_at,
    blob,
  })
}

fn key_to_string(key: &JsValue) -> Option<String> {
  if let Some(text) = key.as_string() {
    return Some(text);
  }
  JSON.stringify(key).ok().and_then(|val| val.as_string())
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


const OPFS_RECORDINGS_DIR: &str = "recordings";
const OPFS_SHARE_DIR: &str = "share";
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
    "SELECT id, created_at, duration_seconds, opfs_path, payload FROM recordings ORDER BY created_at DESC",
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
    let opfs_path = extract_string(&row, "opfs_path")
      .or_else(|| payload_json.as_ref().and_then(|json| extract_string(json, "opfs_path")));

    let blob = if let Some(path) = opfs_path.as_deref() {
      if is_idb_path(path) {
        idb_recording_blob(id.as_str()).await
      } else {
        load_recording_blob(path).await
      }
    } else {
      idb_recording_blob(id.as_str()).await
    };

    out.push(Recording {
      id,
      created_at,
      duration_seconds: duration,
      blob,
    });
  }
  Ok(out)
}

async fn sqlite_save_recording(recording: &Recording) -> Result<(), JsValue> {
  db_client::init_db().await?;
  let mut opfs_path = None;
  if let Some(blob) = recording.blob.as_ref() {
    opfs_path = save_recording_blob(&recording.id, blob).await;
    if opfs_path.is_none() {
      let value = recording_to_value(recording)?;
      let _ = put_value("recordings", &value).await;
      opfs_path = Some(idb_fallback_path("recordings", &recording.id));
    }
  }

  let mime_type = recording
    .blob
    .as_ref()
    .map(|b| b.type_())
    .filter(|t| !t.is_empty())
    .unwrap_or_else(|| "audio/webm".to_string());
  let size_bytes = recording
    .blob
    .as_ref()
    .map(|b| b.size() as f64)
    .unwrap_or(0.0);
  let format = format_from_mime(&mime_type);

  let payload = serde_json::json!({
    "id": &recording.id,
    "created_at": recording.created_at,
    "duration_seconds": recording.duration_seconds,
    "mime_type": &mime_type,
    "size_bytes": size_bytes,
    "format": &format,
    "opfs_path": &opfs_path,
    "profile_id": JsonValue::Null,
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
      JsonValue::Null,
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

async fn sqlite_clear_table(table: &str) -> Result<(), JsValue> {
  db_client::init_db().await?;
  db_client::exec(&format!("DELETE FROM {}", table), vec![]).await
}

pub async fn save_recording_blob(id: &str, blob: &Blob) -> Option<String> {
  let mime = blob.type_();
  let filename = recording_filename(id, &mime);
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

async fn load_recording_blob(path: &str) -> Option<Blob> {
  load_blob_from_opfs(path).await.ok()
}

async fn load_share_blob(path: &str) -> Option<Blob> {
  load_blob_from_opfs(path).await.ok()
}

async fn delete_recording_blob(path: &str) -> Result<(), JsValue> {
  delete_opfs_file(path).await
}

async fn delete_share_blob(path: &str) -> Result<(), JsValue> {
  delete_opfs_file(path).await
}

async fn clear_recording_blobs() -> Result<(), JsValue> {
  delete_opfs_dir(OPFS_RECORDINGS_DIR).await
}

async fn clear_share_blobs() -> Result<(), JsValue> {
  delete_opfs_dir(OPFS_SHARE_DIR).await
}

async fn idb_recording_blob(id: &str) -> Option<Blob> {
  let value = idb_get_value("recordings", id).await.ok()?;
  recording_from_value(&value).and_then(|rec| rec.blob)
}

async fn idb_share_blob(id: &str) -> Option<Blob> {
  let value = idb_get_value("shareInbox", id).await.ok()?;
  share_item_from_value(&value).and_then(|item| item.blob)
}

async fn idb_get_value(store_name: &str, key: &str) -> Result<JsValue, JsValue> {
  let db = open_db().await?;
  let tx = db.transaction_with_str_and_mode(store_name, IdbTransactionMode::Readonly)?;
  let store = tx.object_store(store_name)?;
  let request = store.get(&JsValue::from_str(key))?;
  let receiver = request_to_future(request);
  receiver.await.map_err(|_| JsValue::from_str("IDB get error"))??
}

fn idb_fallback_path(store: &str, id: &str) -> String {
  format!("{}{}{}", IDB_PATH_PREFIX, store, format!("/{}", id))
}

fn is_idb_path(path: &str) -> bool {
  path.starts_with(IDB_PATH_PREFIX)
}

fn idb_key_from_path(path: &str) -> Option<String> {
  if !is_idb_path(path) {
    return None;
  }
  let trimmed = path.trim_start_matches(IDB_PATH_PREFIX);
  if let Some((_, key)) = trimmed.rsplit_once('/') {
    Some(key.to_string())
  } else if !trimmed.is_empty() {
    Some(trimmed.to_string())
  } else {
    None
  }
}

async fn save_blob_to_opfs(path: &str, blob: &Blob) -> Result<(), JsValue> {
  let root = opfs_root().await?;
  let (dir, file) = split_path(path);
  let parent = match dir {
    Some(dir) => get_directory_handle(&root, dir, true).await?,
    None => root,
  };
  let file_handle = get_file_handle(&parent, file, true).await?;
  let writable = call_method0(&file_handle, "createWritable").await?;
  call_method1(&writable, "write", &blob.clone().into()).await?;
  call_method0(&writable, "close").await?;
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

fn recording_filename(id: &str, mime: &str) -> String {
  let ext = format_from_mime(mime);
  if ext.is_empty() {
    sanitize_filename(id)
  } else {
    format!("{}.{}", sanitize_filename(id), ext)
  }
}

fn share_filename(id: &str, name: &str) -> String {
  let safe = sanitize_filename(name);
  if safe.is_empty() {
    sanitize_filename(id)
  } else {
    format!("{}-{}", sanitize_filename(id), safe)
  }
}

fn sanitize_filename(name: &str) -> String {
  let mut out = String::new();
  for ch in name.chars() {
    if ch.is_ascii_alphanumeric() || ch == '.' || ch == '-' || ch == '_' {
      out.push(ch);
    } else {
      out.push('_');
    }
  }
  if out.is_empty() {
    "file".to_string()
  } else {
    out
  }
}

fn split_path(path: &str) -> (Option<&str>, &str) {
  if let Some((dir, file)) = path.rsplit_once('/') {
    (Some(dir), file)
  } else {
    (None, path)
  }
}

fn format_from_mime(mime: &str) -> String {
  let base = mime.split(';').next().unwrap_or(mime);
  let ext = base.split('/').nth(1).unwrap_or("").trim();
  if ext.is_empty() {
    "bin".to_string()
  } else {
    ext.to_string()
  }
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
    }
  }
  None
}

fn js_date_any(value: &JsValue, keys: &[&str]) -> Option<f64> {
  for key in keys {
    if let Ok(val) = Reflect::get(value, &JsValue::from_str(key)) {
      if val.is_null() || val.is_undefined() {
        continue;
      }
      if let Some(num) = val.as_f64() {
        return Some(num);
      }
      if let Some(text) = val.as_string() {
        let parsed = js_sys::Date::parse(&text);
        if !parsed.is_nan() {
          return Some(parsed);
        }
      }
    }
  }
  None
}

fn js_blob_any(value: &JsValue) -> Option<Blob> {
  Reflect::get(value, &JsValue::from_str("blob"))
    .ok()
    .and_then(|val| val.dyn_into::<Blob>().ok())
}

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

fn json_number(value: f64) -> JsonValue {
  serde_json::Number::from_f64(value)
    .map(JsonValue::Number)
    .unwrap_or_else(|| JsonValue::Number(serde_json::Number::from(0)))
}

