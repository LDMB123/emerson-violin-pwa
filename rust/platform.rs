use std::cell::RefCell;
use std::collections::BTreeMap;

use js_sys::{Function, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::{spawn_local, JsFuture};

use crate::dom;
use crate::storage;

thread_local! {
  static WAKE_LOCK: RefCell<Option<JsValue>> = RefCell::new(None);
  static BADGE_SOURCES: RefCell<BTreeMap<String, usize>> = RefCell::new(BTreeMap::new());
}

pub fn init() {
  set_platform_flags();
  request_persistent_storage();
  handle_launch_context();
}

fn set_platform_flags() {
  let window = dom::window();
  let navigator = window.navigator();
  let ua = navigator.user_agent().unwrap_or_default();
  let platform = navigator.platform().unwrap_or_default();
  let max_touch = navigator.max_touch_points();
  let is_ios = ua.contains("iPad") || ua.contains("iPhone") || (platform == "MacIntel" && max_touch > 1);
  let is_ipad = ua.contains("iPad") || (platform == "MacIntel" && max_touch > 1);

  if let Some(root) = dom::document().document_element() {
    dom::set_attr(&root, "data-platform", if is_ios { "ios" } else { "other" });
    dom::set_attr(&root, "data-ios", if is_ios { "true" } else { "false" });
    dom::set_attr(&root, "data-ipad", if is_ipad { "true" } else { "false" });
    dom::set_attr(&root, "data-standalone", if dom::is_standalone() { "true" } else { "false" });
  }
}

fn request_persistent_storage() {
  let navigator = dom::window().navigator();
  let storage = navigator.storage();
  if let Ok(promise) = storage.persist() {
    spawn_local(async move {
      let _ = wasm_bindgen_futures::JsFuture::from(promise).await;
    });
  }
}

pub fn supports_wake_lock() -> bool {
  Reflect::has(&dom::window().navigator(), &JsValue::from_str("wakeLock")).unwrap_or(false)
}

pub fn set_badge_source(source: &str, count: usize) {
  BADGE_SOURCES.with(|cell| {
    let mut map = cell.borrow_mut();
    if count == 0 {
      map.remove(source);
    } else {
      map.insert(source.to_string(), count);
    }
    let total: usize = map.values().sum();
    apply_badge(total);
  });
}

fn apply_badge(total: usize) {
  let navigator = dom::window().navigator();
  if total == 0 {
    if call_badge_fn(&navigator, "clearAppBadge", None) {
      return;
    }
    let _ = call_badge_fn(&navigator, "clearClientBadge", None);
    return;
  }

  let payload = JsValue::from_f64(total as f64);
  if call_badge_fn(&navigator, "setAppBadge", Some(&payload)) {
    return;
  }
  let _ = call_badge_fn(&navigator, "setClientBadge", Some(&payload));
}

fn call_badge_fn(target: &JsValue, name: &str, arg: Option<&JsValue>) -> bool {
  let func = Reflect::get(target, &JsValue::from_str(name)).ok();
  let func = match func.and_then(|val| val.dyn_into::<Function>().ok()) {
    Some(func) => func,
    None => return false,
  };
  let result = match arg {
    Some(arg) => func.call1(target, arg),
    None => func.call0(target),
  };
  result.is_ok()
}

pub fn request_wake_lock() {
  if !supports_wake_lock() {
    return;
  }
  let navigator = dom::window().navigator();
  let wake_lock = match Reflect::get(&navigator, &JsValue::from_str("wakeLock")) {
    Ok(val) => val,
    Err(_) => return,
  };
  let request = match Reflect::get(&wake_lock, &JsValue::from_str("request")) {
    Ok(val) => val,
    Err(_) => return,
  };
  let request = match request.dyn_into::<Function>() {
    Ok(val) => val,
    Err(_) => return,
  };
  let promise = match request.call1(&wake_lock, &JsValue::from_str("screen")).ok().and_then(|val| val.dyn_into::<js_sys::Promise>().ok()) {
    Some(promise) => promise,
    None => return,
  };
  spawn_local(async move {
    if let Ok(lock) = JsFuture::from(promise).await {
      WAKE_LOCK.with(|cell| *cell.borrow_mut() = Some(lock));
    }
  });
}

pub fn release_wake_lock() {
  WAKE_LOCK.with(|cell| {
    if let Some(lock) = cell.borrow_mut().take() {
      if let Ok(release) = Reflect::get(&lock, &JsValue::from_str("release")) {
        if let Ok(func) = release.dyn_into::<Function>() {
          let _ = func.call0(&lock);
        }
      }
    }
  });
}

pub fn lock_orientation(mode: &str) {
  let window = dom::window();
  let screen = match Reflect::get(&window, &JsValue::from_str("screen")) {
    Ok(val) => val,
    Err(_) => return,
  };
  let orientation = match Reflect::get(&screen, &JsValue::from_str("orientation")) {
    Ok(val) => val,
    Err(_) => return,
  };
  let lock = match Reflect::get(&orientation, &JsValue::from_str("lock")) {
    Ok(val) => val,
    Err(_) => return,
  };
  let lock = match lock.dyn_into::<Function>() {
    Ok(val) => val,
    Err(_) => return,
  };
  let _ = lock.call1(&orientation, &JsValue::from_str(mode));
}

pub fn unlock_orientation() {
  let window = dom::window();
  let screen = match Reflect::get(&window, &JsValue::from_str("screen")) {
    Ok(val) => val,
    Err(_) => return,
  };
  let orientation = match Reflect::get(&screen, &JsValue::from_str("orientation")) {
    Ok(val) => val,
    Err(_) => return,
  };
  let unlock = match Reflect::get(&orientation, &JsValue::from_str("unlock")) {
    Ok(val) => val,
    Err(_) => return,
  };
  if let Ok(func) = unlock.dyn_into::<Function>() {
    let _ = func.call0(&orientation);
  }
}

pub fn request_fullscreen() {
  if let Some(root) = dom::document().document_element() {
    if let Ok(request) = Reflect::get(&root, &JsValue::from_str("requestFullscreen")) {
      if let Ok(func) = request.dyn_into::<Function>() {
        let _ = func.call0(&root);
      }
    }
  }
}

pub fn exit_fullscreen() {
  let document = dom::document();
  if let Ok(exit) = Reflect::get(&document, &JsValue::from_str("exitFullscreen")) {
    if let Ok(func) = exit.dyn_into::<Function>() {
      let _ = func.call0(&document);
    }
  }
}

fn handle_launch_context() {
  let window = dom::window();
  let location = window.location();
  let path = location.pathname().unwrap_or_default();
  let search = location.search().unwrap_or_default();

  if path.ends_with("/share-target") || path.ends_with("/open-file") {
    let _ = location.set_hash("#studio");
    return;
  }

  if path.ends_with("/handle-protocol") {
    if let Some(uri) = query_param(&search, "uri") {
      route_from_protocol(&uri);
    }
  }
}

fn query_param(search: &str, key: &str) -> Option<String> {
  let trimmed = search.strip_prefix('?').unwrap_or(search);
  for part in trimmed.split('&') {
    let mut iter = part.splitn(2, '=');
    let k = iter.next().unwrap_or_default();
    let v = iter.next().unwrap_or_default();
    if k == key {
      let decoded: String = js_sys::decode_uri_component(v).unwrap_or_else(|_| v.to_string().into()).into();
      return Some(decoded);
    }
  }
  None
}

fn route_from_protocol(uri: &str) {
  let location = dom::window().location();
  if uri.starts_with("web+emerson-game") {
    if let Some(game_type) = query_param_from_uri(uri, "type") {
      storage::local_set("launch:game-type", &game_type);
    }
    let _ = location.set_hash("#games");
    return;
  }
  if uri.starts_with("web+emerson-session") {
    let _ = location.set_hash("#overview");
    return;
  }
  if uri.starts_with("web+emerson-teacher") {
    let _ = location.set_hash("#teacher");
    return;
  }
  let _ = location.set_hash("#overview");
}

fn query_param_from_uri(uri: &str, key: &str) -> Option<String> {
  let parts: Vec<&str> = uri.splitn(2, '?').collect();
  if parts.len() < 2 {
    return None;
  }
  query_param(parts[1], key)
}
