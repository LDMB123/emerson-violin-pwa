use std::cell::RefCell;

use js_sys::{Object, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use web_sys::{Event, MessageEvent, Worker};

use crate::dom;
use crate::storage;

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
  dom::set_text("[data-db-worker-detail]", "Launching DB worker");

  if !storage::opfs_supported() {
    dom::set_text("[data-db-worker-status]", "OPFS unavailable");
    dom::set_text("[data-db-worker-detail]", "OPFS required for DB file");
    return;
  }

  let worker = match Worker::new("./db-worker.js") {
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
    let msg_type = Reflect::get(&data, &"type".into())
      .ok()
      .and_then(|val| val.as_string())
      .unwrap_or_default();

    if msg_type != "DB_WORKER_STATUS" {
      return;
    }

    let ok = Reflect::get(&data, &"ok".into())
      .ok()
      .and_then(|val| val.as_bool())
      .unwrap_or(false);
    let status = Reflect::get(&data, &"status".into())
      .ok()
      .and_then(|val| val.as_string())
      .unwrap_or_else(|| "Unknown".to_string());
    let detail = Reflect::get(&data, &"detail".into())
      .ok()
      .and_then(|val| val.as_string())
      .unwrap_or_default();
    let bytes = Reflect::get(&data, &"bytes".into())
      .ok()
      .and_then(|val| val.as_f64())
      .unwrap_or(0.0);
    let ms = Reflect::get(&data, &"ms".into())
      .ok()
      .and_then(|val| val.as_f64())
      .unwrap_or(0.0);

    dom::set_text("[data-db-worker-status]", &status);
    dom::set_text("[data-db-worker-detail]", &detail);
    if ok {
      dom::set_text(
        "[data-db-worker-file]",
        &format!("emerson.db ({} bytes, {:.0} ms)", bytes as u64, ms),
      );
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

  let message = Object::new();
  let _ = Reflect::set(&message, &"type".into(), &JsValue::from_str("DB_WORKER_INIT"));
  let _ = worker.post_message(&message.into());

  WORKER.with(|slot| *slot.borrow_mut() = Some(worker));
}
