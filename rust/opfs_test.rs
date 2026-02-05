use std::cell::RefCell;

use js_sys::{Function, Object, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;
use web_sys::{Event, MessageEvent, Worker};

use crate::dom;

thread_local! {
  static WORKER: RefCell<Option<Worker>> = RefCell::new(None);
}

pub fn init() {
  update_support_status();
  init_async_test();
  init_worker_test();
}

fn update_support_status() {
  let supported = opfs_supported();
  dom::set_text(
    "[data-opfs-support]",
    if supported { "Available" } else { "Unavailable" },
  );
}

fn init_async_test() {
  if let Some(btn) = dom::query("[data-opfs-test]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        run_async_test().await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

async fn run_async_test() {
  dom::set_text("[data-opfs-test-status]", "Running async OPFS test...");
  let start = dom::window().performance().map(|p| p.now()).unwrap_or(0.0);
  let result = opfs_async_self_test().await;
  let end = dom::window().performance().map(|p| p.now()).unwrap_or(start);
  let elapsed = (end - start).max(0.0);
  match result {
    Ok(bytes) => {
      dom::set_text(
        "[data-opfs-test-status]",
        &format!("Async OPFS OK ({} bytes) in {:.0} ms", bytes, elapsed),
      );
    }
    Err(err) => {
      dom::set_text(
        "[data-opfs-test-status]",
        &format!("Async OPFS failed: {}", err),
      );
    }
  }
}

fn init_worker_test() {
  if let Some(btn) = dom::query("[data-opfs-worker-test]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      run_worker_test();
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

fn run_worker_test() {
  dom::set_text("[data-opfs-worker-status]", "Running worker OPFS test...");
  if !opfs_supported() {
    dom::set_text("[data-opfs-worker-status]", "OPFS unavailable");
    return;
  }

  let worker = match Worker::new("./opfs-test-worker.js") {
    Ok(worker) => worker,
    Err(_) => {
      dom::set_text("[data-opfs-worker-status]", "Worker failed to start");
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
    if msg_type != "OPFS_SYNC_TEST_RESULT" {
      return;
    }

    let ok = Reflect::get(&data, &"ok".into())
      .ok()
      .and_then(|val| val.as_bool())
      .unwrap_or(false);
    if ok {
      let ms = Reflect::get(&data, &"ms".into())
        .ok()
        .and_then(|val| val.as_f64())
        .unwrap_or(0.0);
      let bytes = Reflect::get(&data, &"bytes".into())
        .ok()
        .and_then(|val| val.as_f64())
        .unwrap_or(0.0);
      dom::set_text(
        "[data-opfs-worker-status]",
        &format!("Worker OPFS OK ({} bytes) in {:.0} ms", bytes as u64, ms),
      );
    } else {
      let err = Reflect::get(&data, &"error".into())
        .ok()
        .and_then(|val| val.as_string())
        .unwrap_or_else(|| "Unknown error".to_string());
      dom::set_text(
        "[data-opfs-worker-status]",
        &format!("Worker OPFS failed: {}", err),
      );
    }

    worker_clone.terminate();
    WORKER.with(|slot| *slot.borrow_mut() = None);
  });

  worker.set_onmessage(Some(cb.as_ref().unchecked_ref()));
  cb.forget();

  let err_worker = worker.clone();
  let onerror = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
    dom::set_text("[data-opfs-worker-status]", "Worker error");
    err_worker.terminate();
    WORKER.with(|slot| *slot.borrow_mut() = None);
  });
  worker.set_onerror(Some(onerror.as_ref().unchecked_ref()));
  onerror.forget();

  let message = Object::new();
  let _ = Reflect::set(&message, &"type".into(), &JsValue::from_str("OPFS_SYNC_TEST"));
  let _ = worker.post_message(&message.into());

  WORKER.with(|slot| *slot.borrow_mut() = Some(worker));
}

fn opfs_supported() -> bool {
  let navigator = dom::window().navigator();
  let storage = Reflect::get(&navigator, &JsValue::from_str("storage")).ok();
  storage
    .and_then(|storage| Reflect::get(&storage, &JsValue::from_str("getDirectory")).ok())
    .map(|val| val.is_function())
    .unwrap_or(false)
}

async fn opfs_async_self_test() -> Result<usize, String> {
  if !opfs_supported() {
    return Err("OPFS unavailable".to_string());
  }
  let navigator = dom::window().navigator();
  let storage = Reflect::get(&navigator, &JsValue::from_str("storage")).map_err(|_| "OPFS storage unavailable".to_string())?;
  let get_dir = Reflect::get(&storage, &JsValue::from_str("getDirectory")).map_err(|_| "OPFS getDirectory missing".to_string())?;
  let get_dir = get_dir.dyn_into::<Function>().map_err(|_| "OPFS getDirectory invalid".to_string())?;
  let promise = get_dir.call0(&storage).map_err(|_| "OPFS getDirectory failed".to_string())?;
  let promise = promise.dyn_into::<js_sys::Promise>().map_err(|_| "OPFS getDirectory promise invalid".to_string())?;
  let root = wasm_bindgen_futures::JsFuture::from(promise).await.map_err(|_| "OPFS root unavailable".to_string())?;

  let dir = get_directory_handle(&root, "diagnostics", true).await?;
  let file_handle = get_file_handle(&dir, "opfs-self-test.bin", true).await?;
  let writable = call_method0(&file_handle, "createWritable").await?;

  let payload = js_sys::Uint8Array::from(&[1, 2, 3, 4, 5, 6, 7, 8][..]);
  call_method1(&writable, "write", &payload.clone().into()).await?;
  call_method0(&writable, "close").await?;

  let file = call_method0(&file_handle, "getFile").await?;
  let blob: web_sys::Blob = file.dyn_into().map_err(|_| "OPFS blob cast failed".to_string())?;
  let buffer = wasm_bindgen_futures::JsFuture::from(blob.array_buffer()).await.map_err(|_| "OPFS read failed".to_string())?;
  let array = js_sys::Uint8Array::new(&buffer);

  let mut ok = array.length() as usize == payload.length() as usize;
  if ok {
    for idx in 0..payload.length() {
      if array.get_index(idx) != payload.get_index(idx) {
        ok = false;
        break;
      }
    }
  }

  let _ = call_method2(&dir, "removeEntry", &JsValue::from_str("opfs-self-test.bin"), &JsValue::UNDEFINED).await;
  if ok {
    Ok(array.length() as usize)
  } else {
    Err("OPFS read mismatch".to_string())
  }
}

async fn get_directory_handle(parent: &JsValue, name: &str, create: bool) -> Result<JsValue, String> {
  let func = Reflect::get(parent, &JsValue::from_str("getDirectoryHandle")).map_err(|_| "OPFS getDirectoryHandle missing".to_string())?;
  let func = func.dyn_into::<Function>().map_err(|_| "OPFS getDirectoryHandle invalid".to_string())?;
  let options = Object::new();
  let _ = Reflect::set(&options, &JsValue::from_str("create"), &JsValue::from_bool(create));
  let promise = func.call2(parent, &JsValue::from_str(name), &options.into()).map_err(|_| "OPFS getDirectoryHandle failed".to_string())?;
  let promise = promise.dyn_into::<js_sys::Promise>().map_err(|_| "OPFS getDirectoryHandle promise invalid".to_string())?;
  wasm_bindgen_futures::JsFuture::from(promise).await.map_err(|_| "OPFS getDirectoryHandle await failed".to_string())
}

async fn get_file_handle(parent: &JsValue, name: &str, create: bool) -> Result<JsValue, String> {
  let func = Reflect::get(parent, &JsValue::from_str("getFileHandle")).map_err(|_| "OPFS getFileHandle missing".to_string())?;
  let func = func.dyn_into::<Function>().map_err(|_| "OPFS getFileHandle invalid".to_string())?;
  let options = Object::new();
  let _ = Reflect::set(&options, &JsValue::from_str("create"), &JsValue::from_bool(create));
  let promise = func.call2(parent, &JsValue::from_str(name), &options.into()).map_err(|_| "OPFS getFileHandle failed".to_string())?;
  let promise = promise.dyn_into::<js_sys::Promise>().map_err(|_| "OPFS getFileHandle promise invalid".to_string())?;
  wasm_bindgen_futures::JsFuture::from(promise).await.map_err(|_| "OPFS getFileHandle await failed".to_string())
}

async fn call_method0(target: &JsValue, name: &str) -> Result<JsValue, String> {
  let func = Reflect::get(target, &JsValue::from_str(name)).map_err(|_| format!("OPFS {} missing", name))?;
  let func = func.dyn_into::<Function>().map_err(|_| format!("OPFS {} invalid", name))?;
  let promise = func.call0(target).map_err(|_| format!("OPFS {} call failed", name))?;
  let promise = promise.dyn_into::<js_sys::Promise>().map_err(|_| format!("OPFS {} promise invalid", name))?;
  wasm_bindgen_futures::JsFuture::from(promise).await.map_err(|_| format!("OPFS {} await failed", name))
}

async fn call_method1(target: &JsValue, name: &str, arg: &JsValue) -> Result<JsValue, String> {
  let func = Reflect::get(target, &JsValue::from_str(name)).map_err(|_| format!("OPFS {} missing", name))?;
  let func = func.dyn_into::<Function>().map_err(|_| format!("OPFS {} invalid", name))?;
  let promise = func.call1(target, arg).map_err(|_| format!("OPFS {} call failed", name))?;
  let promise = promise.dyn_into::<js_sys::Promise>().map_err(|_| format!("OPFS {} promise invalid", name))?;
  wasm_bindgen_futures::JsFuture::from(promise).await.map_err(|_| format!("OPFS {} await failed", name))
}

async fn call_method2(target: &JsValue, name: &str, arg1: &JsValue, arg2: &JsValue) -> Result<JsValue, String> {
  let func = Reflect::get(target, &JsValue::from_str(name)).map_err(|_| format!("OPFS {} missing", name))?;
  let func = func.dyn_into::<Function>().map_err(|_| format!("OPFS {} invalid", name))?;
  let promise = func.call2(target, arg1, arg2).map_err(|_| format!("OPFS {} call failed", name))?;
  let promise = promise.dyn_into::<js_sys::Promise>().map_err(|_| format!("OPFS {} promise invalid", name))?;
  wasm_bindgen_futures::JsFuture::from(promise).await.map_err(|_| format!("OPFS {} await failed", name))
}
