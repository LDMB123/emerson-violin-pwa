use wasm_bindgen::JsCast;
use web_sys::{Event, HtmlTextAreaElement};

use crate::dom;
use crate::storage;

const STORAGE_PREFIX: &str = "session-reflection";

pub fn init() {
  let selector = "[data-reflection-input]";
  let input = match dom::query(selector).and_then(|el| el.dyn_into::<HtmlTextAreaElement>().ok()) {
    Some(input) => input,
    None => return,
  };

  if let Some(saved) = storage::local_get(&storage_key()) {
    input.set_value(&saved);
  }

  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
    if let Some(target) = event.target().and_then(|t| t.dyn_into::<HtmlTextAreaElement>().ok()) {
      storage::local_set(&storage_key(), &target.value());
    }
  });
  let _ = input.add_event_listener_with_callback("input", cb.as_ref().unchecked_ref());
  cb.forget();
}

pub fn current_text() -> Option<String> {
  dom::query("[data-reflection-input]")
    .and_then(|el| el.dyn_into::<HtmlTextAreaElement>().ok())
    .map(|input| input.value())
    .filter(|value| !value.trim().is_empty())
}

pub fn clear() {
  if let Some(input) = dom::query("[data-reflection-input]")
    .and_then(|el| el.dyn_into::<HtmlTextAreaElement>().ok()) {
    input.set_value("");
  }
  storage::local_remove(&storage_key());
}

fn storage_key() -> String {
  format!("{}:{}", STORAGE_PREFIX, day_key())
}

fn day_key() -> String {
  let date = js_sys::Date::new_0();
  let tz_offset = date.get_timezone_offset() * 60000.0;
  let ms = date.get_time() - tz_offset;
  let local = js_sys::Date::new(&wasm_bindgen::JsValue::from_f64(ms));
  local.to_iso_string().as_string().unwrap_or_else(|| "1970-01-01".to_string())[..10].to_string()
}
