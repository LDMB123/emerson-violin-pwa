use std::cell::RefCell;
use std::rc::Rc;

use futures_channel::oneshot;
use js_sys::{Array, JSON, Object, Reflect};
use serde::{Deserialize, Serialize};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use web_sys::{
  Blob, Event, IdbCursorWithValue, IdbDatabase, IdbKeyRange, IdbObjectStoreParameters, IdbOpenDbRequest,
  IdbRequest, IdbTransactionMode,
};

use crate::dom;

const DB_NAME: &str = "emerson-violin-db";
pub const DB_VERSION: u32 = 5;

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
  let tx = db.transaction_with_str_and_mode(store_name, IdbTransactionMode::Readonly)?;
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
  let tx = db.transaction_with_str_and_mode(store_name, IdbTransactionMode::Readonly)?;
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
  let tx = db.transaction_with_str_and_mode(store_name, IdbTransactionMode::Readonly)?;
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
