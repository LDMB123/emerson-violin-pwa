use std::cell::RefCell;
use std::rc::Rc;

use js_sys::Math;
use js_sys::Reflect;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;

use crate::dom;
use crate::state::AppState;
use crate::storage;

const RETRY_KEY: &str = "telemetry:retry";
const NEXT_KEY: &str = "telemetry:next";
const RETRY_BASE_MS: f64 = 5000.0;
const RETRY_MAX_MS: f64 = 300_000.0;
const FLUSH_BATCH_SIZE: usize = 50;

pub fn init(state: Rc<RefCell<AppState>>) {
  let state_clone = state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(web_sys::Event)>::new(move |_event| {
    let state_clone = state_clone.clone();
    spawn_local(async move {
      let _ = flush_with_backoff(&state_clone).await;
    });
  });
  let _ = dom::window().add_event_listener_with_callback("online", cb.as_ref().unchecked_ref());
  cb.forget();

  if dom::window().navigator().on_line() {
    let state_clone = state.clone();
    spawn_local(async move {
      let _ = flush_with_backoff(&state_clone).await;
    });
  }
}

pub fn flush_now(state: &Rc<RefCell<AppState>>) {
  let state = state.clone();
  spawn_local(async move {
    let _ = flush_with_backoff(&state).await;
  });
}

pub fn log_event(state: &Rc<RefCell<AppState>>, name: &str, payload: Option<JsValue>) {
  let device_id = storage::get_or_create_device_id();
  let obj = js_sys::Object::new();
  let _ = Reflect::set(&obj, &"name".into(), &JsValue::from_str(name));
  let _ = Reflect::set(&obj, &"timestamp".into(), &JsValue::from_f64(js_sys::Date::now()));
  let _ = Reflect::set(&obj, &"deviceId".into(), &JsValue::from_str(&device_id));
  let _ = Reflect::set(&obj, &"appVersion".into(), &JsValue::from_str(env!("CARGO_PKG_VERSION")));
  if let Some(payload) = payload {
    let _ = Reflect::set(&obj, &"payload".into(), &payload);
  }

  let state = state.clone();
  spawn_local(async move {
    let _ = storage::enqueue_telemetry(&obj.into()).await;
    if dom::window().navigator().on_line() {
      let _ = flush_with_backoff(&state).await;
    }
  });
}

async fn flush_with_backoff(state: &Rc<RefCell<AppState>>) -> bool {
  if !dom::window().navigator().on_line() {
    schedule_retry(state, next_retry_count());
    return false;
  }

  let ok = flush(state).await;
  if ok {
    storage::local_remove(RETRY_KEY);
    storage::local_remove(NEXT_KEY);
  } else {
    schedule_retry(state, next_retry_count());
  }
  ok
}

fn next_retry_count() -> u32 {
  storage::local_get(RETRY_KEY)
    .and_then(|val| val.parse::<u32>().ok())
    .unwrap_or(0)
    .saturating_add(1)
}

fn schedule_retry(state: &Rc<RefCell<AppState>>, attempt: u32) {
  let delay = next_retry_delay(attempt);
  let now = js_sys::Date::now();
  let next_at = now + delay;

  if let Some(existing_next) = read_next_retry_at() {
    if existing_next > now && existing_next <= next_at {
      return;
    }
  }

  storage::local_set(RETRY_KEY, &attempt.to_string());
  storage::local_set(NEXT_KEY, &format!("{}", next_at));
  let state = state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut()>::new(move || {
    flush_now(&state);
  });
  let _ = dom::window().set_timeout_with_callback_and_timeout_and_arguments_0(cb.as_ref().unchecked_ref(), delay as i32);
  cb.forget();
}

fn read_next_retry_at() -> Option<f64> {
  storage::local_get(NEXT_KEY).and_then(|val| val.parse::<f64>().ok())
}

fn next_retry_delay(attempt: u32) -> f64 {
  let exponent = (attempt as i32).clamp(0, 16);
  let base = (RETRY_BASE_MS * 2f64.powi(exponent)).min(RETRY_MAX_MS);
  let jitter = 0.85 + (Math::random() * 0.3);
  (base * jitter).min(RETRY_MAX_MS)
}

async fn flush(state: &Rc<RefCell<AppState>>) -> bool {
  let config = state.borrow().config.clone();
  if !config.features.telemetry {
    return false;
  }

  let mut ok = true;
  let queue = storage::get_telemetry_queue().await.unwrap_or_default();
  if !queue.is_empty() {
    ok &= flush_queue(&config.endpoints.telemetry, &queue).await;
    if ok {
      let _ = storage::clear_telemetry_queue().await;
    }
  }

  let error_queue = storage::get_error_queue().await.unwrap_or_default();
  if !error_queue.is_empty() {
    let errors_ok = flush_queue(&config.endpoints.errors, &error_queue).await;
    ok &= errors_ok;
    if errors_ok {
      let _ = storage::clear_error_queue().await;
    }
  }

  ok
}

async fn flush_queue(endpoint: &str, queue: &[JsValue]) -> bool {
  if queue.is_empty() {
    return true;
  }

  for chunk in queue.chunks(FLUSH_BATCH_SIZE) {
    if !flush_chunk(endpoint, chunk).await {
      return false;
    }
  }
  true
}

async fn flush_chunk(endpoint: &str, chunk: &[JsValue]) -> bool {
  let payload = js_sys::Array::from_iter(chunk.iter());
  let opts = web_sys::RequestInit::new();
  opts.set_method("POST");
  let headers = match web_sys::Headers::new() {
    Ok(headers) => headers,
    Err(_) => return false,
  };
  let _ = headers.set("Content-Type", "application/json");
  opts.set_headers(&headers);
  let text = match js_sys::JSON::stringify(&payload.into()) {
    Ok(text) => text,
    Err(_) => return false,
  };
  opts.set_body(&text.into());
  let request = match web_sys::Request::new_with_str_and_init(endpoint, &opts) {
    Ok(request) => request,
    Err(_) => return false,
  };

  if let Ok(resp_val) = wasm_bindgen_futures::JsFuture::from(dom::window().fetch_with_request(&request)).await {
    if let Ok(resp) = resp_val.dyn_into::<web_sys::Response>() {
      return resp.ok();
    }
  }
  false
}
