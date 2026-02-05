use js_sys::Reflect;
use wasm_bindgen::JsValue;

use crate::dom;

const LAST_ERROR_AT_KEY: &str = "storage:last-error-at";
const LAST_ERROR_KIND_KEY: &str = "storage:last-error-kind";
const LAST_ERROR_SOURCE_KEY: &str = "storage:last-error-source";
const LAST_ERROR_NAME_KEY: &str = "storage:last-error-name";
const LAST_ERROR_MESSAGE_KEY: &str = "storage:last-error-message";

fn local_set(key: &str, value: &str) {
  if let Ok(Some(storage)) = dom::window().local_storage() {
    let _ = storage.set_item(key, value);
  }
}

fn js_error_name(err: &JsValue) -> Option<String> {
  Reflect::get(err, &"name".into()).ok().and_then(|val| val.as_string())
}

fn js_error_message(err: &JsValue) -> Option<String> {
  Reflect::get(err, &"message".into()).ok().and_then(|val| val.as_string())
}

pub fn is_quota_error(err: &JsValue) -> bool {
  let name = js_error_name(err).unwrap_or_default();
  if name == "QuotaExceededError" || name == "NS_ERROR_DOM_QUOTA_REACHED" || name == "QUOTA_EXCEEDED_ERR" {
    return true;
  }
  let message = js_error_message(err).unwrap_or_else(|| format!("{:?}", err));
  message.to_lowercase().contains("quota")
}

pub fn record_error(source: &str, err: &JsValue) {
  let name = js_error_name(err).unwrap_or_default();
  let message = js_error_message(err).unwrap_or_else(|| format!("{:?}", err));
  let kind = if is_quota_error(err) { "quota" } else { "error" };

  local_set(LAST_ERROR_AT_KEY, &format!("{}", js_sys::Date::now()));
  local_set(LAST_ERROR_KIND_KEY, kind);
  local_set(LAST_ERROR_SOURCE_KEY, source);
  if !name.is_empty() {
    local_set(LAST_ERROR_NAME_KEY, &name);
  }
  if !message.is_empty() {
    let clipped = if message.len() > 240 { &message[..240] } else { &message };
    local_set(LAST_ERROR_MESSAGE_KEY, clipped);
  }

  if kind == "quota" {
    dom::set_text("[data-storage-pressure]", "Critical");
    dom::toast("Storage full. Run cleanup or export a backup.");
  }
}

pub fn record_quota_message(source: &str, name: Option<&str>, message: &str) {
  local_set(LAST_ERROR_AT_KEY, &format!("{}", js_sys::Date::now()));
  local_set(LAST_ERROR_KIND_KEY, "quota");
  local_set(LAST_ERROR_SOURCE_KEY, source);
  if let Some(name) = name.filter(|val| !val.is_empty()) {
    local_set(LAST_ERROR_NAME_KEY, name);
  }
  if !message.is_empty() {
    let clipped = if message.len() > 240 { &message[..240] } else { message };
    local_set(LAST_ERROR_MESSAGE_KEY, clipped);
  }

  dom::set_text("[data-storage-pressure]", "Critical");
  dom::toast("Storage full. Run cleanup or export a backup.");
}
