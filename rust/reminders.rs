use std::cell::RefCell;
use std::rc::Rc;

use js_sys::{Function, Object, Promise, Reflect, Uint8Array};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;
use web_sys::{Event, HtmlInputElement, HtmlSelectElement, ServiceWorkerRegistration};

use crate::dom;
use crate::state::AppState;
use crate::storage;

const ENABLED_KEY: &str = "reminders:enabled";
const TIME_KEY: &str = "reminders:time";
const DAYS_KEY: &str = "reminders:days";
const PENDING_KEY: &str = "reminders:pending";

pub fn init(state: Rc<RefCell<AppState>>) {
  if dom::query("[data-reminder-enable]").is_none() {
    return;
  }

  hydrate_controls_from_storage();
  update_status_from_storage();

  if let Some(btn) = dom::query("[data-reminder-enable]") {
    let state = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let state = state.clone();
      spawn_local(async move {
        enable_flow(state).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-reminder-disable]") {
    let state = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let state = state.clone();
      spawn_local(async move {
        disable_flow(state).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(input) = dom::query("[data-reminder-time]").and_then(|el| el.dyn_into::<HtmlInputElement>().ok()) {
    let input_el = input.clone();
    let state = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      storage::local_set(TIME_KEY, &input_el.value());
      if is_enabled() {
        let state = state.clone();
        spawn_local(async move {
          if try_schedule_now(state).await {
            set_pending(false);
          } else {
            set_pending(true);
            update_status_from_storage();
          }
        });
      }
    });
    let _ = input.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(select) = dom::query("[data-reminder-days]").and_then(|el| el.dyn_into::<HtmlSelectElement>().ok()) {
    let select_el = select.clone();
    let state = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      storage::local_set(DAYS_KEY, &select_el.value());
      if is_enabled() {
        let state = state.clone();
        spawn_local(async move {
          if try_schedule_now(state).await {
            set_pending(false);
          } else {
            set_pending(true);
            update_status_from_storage();
          }
        });
      }
    });
    let _ = select.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  // Safari does not support Background Sync; reschedule only when the app is active.
  {
    let state = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      if is_enabled() && is_pending() {
        let state = state.clone();
        spawn_local(async move {
          if try_schedule_now(state).await {
            set_pending(false);
            update_status_from_storage();
          }
        });
      }
    });
    let _ = dom::window().add_event_listener_with_callback("online", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  {
    let state = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      if document_visibility_state() == "visible" && is_enabled() && is_pending() {
        let state = state.clone();
        spawn_local(async move {
          if try_schedule_now(state).await {
            set_pending(false);
            update_status_from_storage();
          }
        });
      }
    });
    let _ = dom::document().add_event_listener_with_callback("visibilitychange", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

fn document_visibility_state() -> String {
  let doc = dom::document();
  Reflect::get(doc.as_ref(), &JsValue::from_str("visibilityState"))
    .ok()
    .and_then(|val| val.as_string())
    .unwrap_or_default()
}

fn hydrate_controls_from_storage() {
  if let Some(value) = storage::local_get(TIME_KEY) {
    if let Some(input) = dom::query("[data-reminder-time]").and_then(|el| el.dyn_into::<HtmlInputElement>().ok()) {
      input.set_value(&value);
    }
  }
  if let Some(value) = storage::local_get(DAYS_KEY) {
    if let Some(select) = dom::query("[data-reminder-days]").and_then(|el| el.dyn_into::<HtmlSelectElement>().ok()) {
      select.set_value(&value);
    }
  }
}

fn update_status_from_storage() {
  let enabled = is_enabled();
  let pending = is_pending();
  let status = if enabled {
    if pending {
      "Reminders pending (open the app online to schedule)"
    } else {
      "Reminders enabled"
    }
  } else {
    "Reminders off"
  };
  dom::set_text("[data-reminder-status]", status);
}

fn is_enabled() -> bool {
  storage::local_get(ENABLED_KEY).map(|v| v == "true").unwrap_or(false)
}

fn set_enabled(value: bool) {
  storage::local_set(ENABLED_KEY, if value { "true" } else { "false" });
}

fn is_pending() -> bool {
  storage::local_get(PENDING_KEY).map(|v| v == "true").unwrap_or(false)
}

fn set_pending(value: bool) {
  storage::local_set(PENDING_KEY, if value { "true" } else { "false" });
}

async fn enable_flow(state: Rc<RefCell<AppState>>) {
  if !dom::is_standalone() {
    dom::toast("Install the web app (Add to Home Screen) to enable push reminders.");
    dom::set_text("[data-reminder-status]", "Install required for push reminders");
    return;
  }

  let perm = match request_notification_permission().await {
    Some(val) => val,
    None => {
      dom::toast("Notifications not available on this device.");
      dom::set_text("[data-reminder-status]", "Notifications unavailable");
      return;
    }
  };
  if perm != "granted" {
    dom::toast("Notifications permission not granted.");
    dom::set_text("[data-reminder-status]", "Notifications blocked");
    return;
  }

  set_enabled(true);
  update_status_from_storage();

  if try_schedule_now(state.clone()).await {
    set_pending(false);
    update_status_from_storage();
    dom::toast("Reminders scheduled.");
    return;
  }
  set_pending(true);
  update_status_from_storage();
  dom::toast("Reminders enabled but not scheduled yet. Open the app online to finish setup.");
}

async fn disable_flow(state: Rc<RefCell<AppState>>) {
  set_enabled(false);
  set_pending(false);
  update_status_from_storage();

  // Best-effort: disable server schedule and unsubscribe.
  let _ = send_schedule(state.clone(), false).await;
  let _ = unsubscribe().await;
  dom::toast("Reminders disabled.");
}

async fn try_schedule_now(state: Rc<RefCell<AppState>>) -> bool {
  let navigator = dom::window().navigator();
  let online = Reflect::get(&navigator, &JsValue::from_str("onLine"))
    .ok()
    .and_then(|val| val.as_bool())
    .unwrap_or(true);
  if !online {
    return false;
  }
  ensure_subscription(state.clone()).await.is_some() && send_schedule(state, true).await
}

async fn request_notification_permission() -> Option<String> {
  let window = dom::window();
  let notification = Reflect::get(&window, &JsValue::from_str("Notification")).ok()?;
  let request = Reflect::get(&notification, &JsValue::from_str("requestPermission")).ok()?;
  let request = request.dyn_into::<Function>().ok()?;
  let promise = request.call0(&notification).ok()?.dyn_into::<Promise>().ok()?;
  let result = wasm_bindgen_futures::JsFuture::from(promise).await.ok()?;
  result.as_string()
}

async fn ensure_subscription(state: Rc<RefCell<AppState>>) -> Option<JsValue> {
  let reg = sw_ready().await?;
  let push_manager = Reflect::get(&reg, &JsValue::from_str("pushManager")).ok()?;
  let get_sub = Reflect::get(&push_manager, &JsValue::from_str("getSubscription"))
    .ok()
    .and_then(|val| val.dyn_into::<Function>().ok())?;
  let promise = get_sub.call0(&push_manager).ok()?.dyn_into::<Promise>().ok()?;
  let existing = wasm_bindgen_futures::JsFuture::from(promise).await.ok()?;
  if !existing.is_null() && !existing.is_undefined() {
    let _ = send_subscribe(state, &existing).await;
    return Some(existing);
  }

  let key = fetch_public_key(&state.borrow().config.endpoints.push_public_key).await?;
  let key_bytes = decode_vapid_key(&key)?;

  let options = Object::new();
  let _ = Reflect::set(&options, &"userVisibleOnly".into(), &JsValue::from_bool(true));
  let _ = Reflect::set(&options, &"applicationServerKey".into(), &key_bytes.into());

  let subscribe = Reflect::get(&push_manager, &JsValue::from_str("subscribe"))
    .ok()
    .and_then(|val| val.dyn_into::<Function>().ok())?;
  let promise = subscribe.call1(&push_manager, &options).ok()?.dyn_into::<Promise>().ok()?;
  let subscription = wasm_bindgen_futures::JsFuture::from(promise).await.ok()?;
  if subscription.is_null() || subscription.is_undefined() {
    return None;
  }

  let _ = send_subscribe(state, &subscription).await;
  Some(subscription)
}

async fn unsubscribe() -> bool {
  let reg = match sw_ready().await {
    Some(reg) => reg,
    None => return false,
  };
  let push_manager = match Reflect::get(&reg, &JsValue::from_str("pushManager")) {
    Ok(val) => val,
    Err(_) => return false,
  };
  let get_sub = match Reflect::get(&push_manager, &JsValue::from_str("getSubscription"))
    .ok()
    .and_then(|val| val.dyn_into::<Function>().ok()) {
      Some(func) => func,
      None => return false,
    };
  let promise = match get_sub.call0(&push_manager).ok().and_then(|val| val.dyn_into::<Promise>().ok()) {
    Some(promise) => promise,
    None => return false,
  };
  let sub = match wasm_bindgen_futures::JsFuture::from(promise).await {
    Ok(val) => val,
    Err(_) => return false,
  };
  if sub.is_null() || sub.is_undefined() {
    return true;
  }
  let unsubscribe = match Reflect::get(&sub, &JsValue::from_str("unsubscribe"))
    .ok()
    .and_then(|val| val.dyn_into::<Function>().ok()) {
      Some(func) => func,
      None => return false,
    };
  let promise = match unsubscribe.call0(&sub).ok().and_then(|val| val.dyn_into::<Promise>().ok()) {
    Some(promise) => promise,
    None => return false,
  };
  wasm_bindgen_futures::JsFuture::from(promise).await.ok();
  true
}

async fn sw_ready() -> Option<ServiceWorkerRegistration> {
  let navigator = dom::window().navigator();
  let sw = navigator.service_worker();
  let ready = Reflect::get(&sw, &"ready".into()).ok()?.dyn_into::<Promise>().ok()?;
  let reg_val = wasm_bindgen_futures::JsFuture::from(ready).await.ok()?;
  reg_val.dyn_into::<ServiceWorkerRegistration>().ok()
}

async fn fetch_public_key(endpoint: &str) -> Option<String> {
  let window = dom::window();
  let fetch = window.fetch_with_str(endpoint);
  let resp_val = wasm_bindgen_futures::JsFuture::from(fetch).await.ok()?;
  let resp: web_sys::Response = resp_val.dyn_into().ok()?;
  if !resp.ok() {
    return None;
  }
  let text = resp.text().ok()?;
  let raw = wasm_bindgen_futures::JsFuture::from(text).await.ok()?.as_string().unwrap_or_default();
  let trimmed = raw.trim();
  if trimmed.starts_with('{') {
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(trimmed) {
      if let Some(key) = val.get("publicKey").and_then(|v| v.as_str()) {
        return Some(key.to_string());
      }
      if let Some(key) = val.get("key").and_then(|v| v.as_str()) {
        return Some(key.to_string());
      }
    }
  }
  if trimmed.is_empty() { None } else { Some(trimmed.to_string()) }
}

fn decode_vapid_key(key: &str) -> Option<Uint8Array> {
  let mut b64 = key.trim().to_string();
  if b64.is_empty() {
    return None;
  }
  b64 = b64.replace('-', "+").replace('_', "/");
  while b64.len() % 4 != 0 {
    b64.push('=');
  }
  let window = dom::window();
  let atob = Reflect::get(&window, &JsValue::from_str("atob")).ok()?.dyn_into::<Function>().ok()?;
  let binary = atob.call1(&window, &JsValue::from_str(&b64)).ok()?.as_string().unwrap_or_default();
  let bytes = Uint8Array::new_with_length(binary.chars().count() as u32);
  for (i, ch) in binary.chars().enumerate() {
    let code = ch as u32;
    bytes.set_index(i as u32, (code & 0xff) as u8);
  }
  Some(bytes)
}

async fn send_subscribe(state: Rc<RefCell<AppState>>, subscription: &JsValue) -> bool {
  let endpoint = state.borrow().config.endpoints.push_subscribe.clone();
  let device_id = storage::get_or_create_device_id();

  let payload = Object::new();
  let _ = Reflect::set(&payload, &"deviceId".into(), &device_id.into());
  let _ = Reflect::set(&payload, &"subscription".into(), subscription);
  post_json(&endpoint, &payload.into()).await
}

async fn send_schedule(state: Rc<RefCell<AppState>>, enabled: bool) -> bool {
  let endpoint = state.borrow().config.endpoints.push_schedule.clone();
  let device_id = storage::get_or_create_device_id();
  let time = storage::local_get(TIME_KEY).unwrap_or_else(|| "17:00".into());
  let days = storage::local_get(DAYS_KEY).unwrap_or_else(|| "weekdays".into());
  if days == "custom" {
    dom::toast("Custom days are not implemented yet. Using Daily.");
  }
  let resolved_days = if days == "custom" { "daily" } else { days.as_str() };

  let tz_offset = js_sys::Date::new_0().get_timezone_offset();
  let payload = serde_json::json!({
    "deviceId": device_id,
    "enabled": enabled,
    "time": time,
    "days": resolved_days,
    "tzOffsetMinutes": tz_offset,
  });
  let text = serde_json::to_string(&payload).unwrap_or_default();
  post_json_body(&endpoint, &JsValue::from_str(&text)).await
}

async fn post_json(endpoint: &str, payload: &JsValue) -> bool {
  let body = match js_sys::JSON::stringify(payload) {
    Ok(val) => val,
    Err(_) => return false,
  };
  post_json_body(endpoint, &body.into()).await
}

async fn post_json_body(endpoint: &str, body: &JsValue) -> bool {
  let opts = web_sys::RequestInit::new();
  opts.set_method("POST");
  let headers = web_sys::Headers::new().unwrap();
  let _ = headers.set("Content-Type", "application/json");
  opts.set_headers(&headers);
  opts.set_body(body);
  let request = web_sys::Request::new_with_str_and_init(endpoint, &opts).ok();
  let request = match request {
    Some(req) => req,
    None => return false,
  };
  let resp_val = wasm_bindgen_futures::JsFuture::from(dom::window().fetch_with_request(&request)).await;
  let resp_val = match resp_val {
    Ok(val) => val,
    Err(_) => return false,
  };
  let resp: web_sys::Response = match resp_val.dyn_into() {
    Ok(resp) => resp,
    Err(_) => return false,
  };
  resp.ok()
}
