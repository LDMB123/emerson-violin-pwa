use std::cell::RefCell;

use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use web_sys::{Event, MessageEvent, Worker, WorkerOptions, WorkerType};

use crate::db_messages::{DbRequest, DbResponse};
use crate::db_schema::{migrations, SCHEMA_SQL, SCHEMA_VERSION};
use crate::dom;
use crate::storage;
use crate::utils;

thread_local! {
  static WORKER: RefCell<Option<Worker>> = RefCell::new(None);
}

pub fn init() {
  if let Some(btn) = dom::query("[data-db-worker-init]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      start_worker();
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

fn start_worker() {
  dom::set_text("[data-db-worker-status]", "Starting…");
  dom::set_text("[data-db-worker-detail]", "Launching SQLite OPFS worker");

  if !storage::opfs_supported() {
    dom::set_text("[data-db-worker-status]", "OPFS unavailable");
    dom::set_text("[data-db-worker-detail]", "OPFS required for DB file");
    return;
  }

  let options = WorkerOptions::new();
  options.set_type(WorkerType::Module);
  options.set_name("emerson-db-worker");
  let worker = match Worker::new_with_options("./db-worker.js", &options) {
    Ok(worker) => worker,
    Err(_) => {
      dom::set_text("[data-db-worker-status]", "Worker failed");
      dom::set_text("[data-db-worker-detail]", "Unable to start worker");
      return;
    }
  };

  let worker_clone = worker.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(MessageEvent)>::new(move |event: MessageEvent| {
    let data = event.data();
    let response = serde_wasm_bindgen::from_value::<DbResponse>(data);
    let response = match response {
      Ok(response) => response,
      Err(_) => return,
    };

    match response {
      DbResponse::Ready {
        ok,
        detail,
        db_file,
        sqlite_version,
        schema_version,
        ms,
        ..
      } => {
        dom::set_text("[data-db-worker-status]", if ok { "Ready" } else { "Failed" });
        dom::set_text(
          "[data-db-worker-detail]",
          &format!("{} (schema v{}, {:.0} ms)", detail, schema_version, ms),
        );
        if ok {
          dom::set_text(
            "[data-db-worker-file]",
            &format!("{} (SQLite {})", db_file, sqlite_version),
          );
        }
      }
      DbResponse::Error { message, .. } => {
        dom::set_text("[data-db-worker-status]", "Failed");
        dom::set_text("[data-db-worker-detail]", &message);
      }
      DbResponse::ExecResult { .. } | DbResponse::QueryResult { .. } | DbResponse::BatchResult { .. } => {
        dom::set_text("[data-db-worker-status]", "Ready");
        dom::set_text("[data-db-worker-detail]", "DB worker ready");
      }
    }

    worker_clone.terminate();
    WORKER.with(|slot| *slot.borrow_mut() = None);
  });

  worker.set_onmessage(Some(cb.as_ref().unchecked_ref()));
  cb.forget();

  let err_worker = worker.clone();
  let onerror = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
    dom::set_text("[data-db-worker-status]", "Worker error");
    dom::set_text("[data-db-worker-detail]", "Unhandled worker error");
    err_worker.terminate();
    WORKER.with(|slot| *slot.borrow_mut() = None);
  });
  worker.set_onerror(Some(onerror.as_ref().unchecked_ref()));
  onerror.forget();

  let request = DbRequest::Init {
    request_id: utils::create_id(),
    schema_version: SCHEMA_VERSION,
    schema_sql: SCHEMA_SQL.to_string(),
    migrations: migrations(),
  };
  let message = serde_wasm_bindgen::to_value(&request).unwrap_or(JsValue::NULL);
  let _ = worker.post_message(&message);

  WORKER.with(|slot| *slot.borrow_mut() = Some(worker));
}
