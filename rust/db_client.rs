use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

use futures_channel::oneshot;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use web_sys::{Event, MessageEvent, Worker, WorkerOptions, WorkerType};

use crate::db_messages::{DbRequest, DbResponse, DbStatement};
use crate::db_schema::{migrations, SCHEMA_SQL, SCHEMA_VERSION};
use crate::storage_pressure;
use crate::utils;

struct DbClient {
  worker: Worker,
  pending: Rc<RefCell<HashMap<String, oneshot::Sender<DbResponse>>>>,
}

thread_local! {
  static CLIENT: RefCell<Option<DbClient>> = RefCell::new(None);
}

fn ensure_client() -> Result<(Worker, Rc<RefCell<HashMap<String, oneshot::Sender<DbResponse>>>>), JsValue> {
  CLIENT.with(|slot| -> Result<_, JsValue> {
    if slot.borrow().is_none() {
      let pending: Rc<RefCell<HashMap<String, oneshot::Sender<DbResponse>>>> =
        Rc::new(RefCell::new(HashMap::new()));
      let mut options = WorkerOptions::new();
      options.set_type(WorkerType::Module);
      options.set_name("emerson-db-core");
      let worker = Worker::new_with_options("./db-worker.js", &options)?;

      let pending_messages = pending.clone();
      let onmessage = wasm_bindgen::closure::Closure::<dyn FnMut(MessageEvent)>::new(
        move |event: MessageEvent| {
          let data = event.data();
          let response = serde_wasm_bindgen::from_value::<DbResponse>(data);
          let response = match response {
            Ok(response) => response,
            Err(_) => return,
          };
          let request_id = response.request_id().to_string();
          if let Some(sender) = pending_messages.borrow_mut().remove(&request_id) {
            let _ = sender.send(response);
          }
        },
      );
      worker.set_onmessage(Some(onmessage.as_ref().unchecked_ref()));
      onmessage.forget();

      let pending_errors = pending.clone();
      let onerror = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        pending_errors.borrow_mut().clear();
      });
      worker.set_onerror(Some(onerror.as_ref().unchecked_ref()));
      onerror.forget();

      *slot.borrow_mut() = Some(DbClient {
        worker: worker.clone(),
        pending: pending.clone(),
      });
    }

    let client = slot.borrow();
    let client = client.as_ref().ok_or_else(|| JsValue::from_str("DB client unavailable"))?;
    Ok((client.worker.clone(), client.pending.clone()))
  })
}

async fn send_request(request: DbRequest) -> Result<DbResponse, JsValue> {
  let (worker, pending) = ensure_client()?;
  let request_id = request.request_id().to_string();
  let (tx, rx) = oneshot::channel();
  pending.borrow_mut().insert(request_id.clone(), tx);

  let message = serde_wasm_bindgen::to_value(&request).unwrap_or(JsValue::NULL);
  if worker.post_message(&message).is_err() {
    pending.borrow_mut().remove(&request_id);
    return Err(JsValue::from_str("Failed to post DB request"));
  }

  match rx.await {
    Ok(response) => Ok(response),
    Err(_) => Err(JsValue::from_str("DB response dropped")),
  }
}

pub async fn init_db() -> Result<(), JsValue> {
  let request = DbRequest::Init {
    request_id: utils::create_id(),
    schema_version: SCHEMA_VERSION,
    schema_sql: SCHEMA_SQL.to_string(),
    migrations: migrations(),
  };
  match send_request(request).await? {
    DbResponse::Ready { ok, detail, .. } => {
      if ok {
        Ok(())
      } else {
        Err(JsValue::from_str(&detail))
      }
    }
    DbResponse::Error { message, quota, name, .. } => {
      if quota {
        storage_pressure::record_quota_message("sqlite", name.as_deref(), &message);
      }
      Err(JsValue::from_str(&message))
    }
    _ => Err(JsValue::from_str("Unexpected DB response")),
  }
}

pub async fn exec(sql: &str, params: Vec<serde_json::Value>) -> Result<(), JsValue> {
  let request = DbRequest::Exec {
    request_id: utils::create_id(),
    sql: sql.to_string(),
    params,
  };
  match send_request(request).await? {
    DbResponse::ExecResult { ok, .. } => {
      if ok {
        Ok(())
      } else {
        Err(JsValue::from_str("DB exec failed"))
      }
    }
    DbResponse::Error { message, quota, name, .. } => {
      if quota {
        storage_pressure::record_quota_message("sqlite", name.as_deref(), &message);
      }
      Err(JsValue::from_str(&message))
    }
    _ => Err(JsValue::from_str("Unexpected DB exec response")),
  }
}

pub async fn query(sql: &str, params: Vec<serde_json::Value>) -> Result<Vec<serde_json::Value>, JsValue> {
  let request = DbRequest::Query {
    request_id: utils::create_id(),
    sql: sql.to_string(),
    params,
  };
  match send_request(request).await? {
    DbResponse::QueryResult { rows, .. } => Ok(rows),
    DbResponse::Error { message, quota, name, .. } => {
      if quota {
        storage_pressure::record_quota_message("sqlite", name.as_deref(), &message);
      }
      Err(JsValue::from_str(&message))
    }
    _ => Err(JsValue::from_str("Unexpected DB query response")),
  }
}

pub async fn batch(statements: Vec<DbStatement>, transaction: bool) -> Result<(), JsValue> {
  if statements.is_empty() {
    return Ok(());
  }
  let request = DbRequest::Batch {
    request_id: utils::create_id(),
    statements,
    transaction,
  };
  match send_request(request).await? {
    DbResponse::BatchResult { ok, .. } => {
      if ok {
        Ok(())
      } else {
        Err(JsValue::from_str("DB batch failed"))
      }
    }
    DbResponse::Error { message, quota, name, .. } => {
      if quota {
        storage_pressure::record_quota_message("sqlite", name.as_deref(), &message);
      }
      Err(JsValue::from_str(&message))
    }
    _ => Err(JsValue::from_str("Unexpected DB batch response")),
  }
}
