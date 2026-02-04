use js_sys::Reflect;
use wasm_bindgen::JsValue;

use crate::dom;

pub fn init() {
  let mut ready = true;
  let mut mic_ready = false;
  let mut storage_ready = false;
  for item in dom::query_all("[data-capability]") {
    let key = item.get_attribute("data-capability").unwrap_or_default();
    let navigator = dom::window().navigator();
    let supported = match key.as_str() {
      "wasm" => true,
      "webgpu" => Reflect::has(&navigator, &JsValue::from_str("gpu")).unwrap_or(false),
      "mic" => {
        let ok = navigator.media_devices().is_ok();
        mic_ready = ok;
        ok
      }
      "storage" => {
        let ok = Reflect::has(&navigator, &JsValue::from_str("storage")).unwrap_or(true);
        storage_ready = ok;
        ok
      }
      _ => false,
    };
    let state = if supported { "on" } else { "off" };
    if !supported {
      ready = false;
    }
    dom::set_dataset(&item, "state", state);
    item.set_text_content(Some(if supported { "Ready" } else { "Unavailable" }));
  }

  if let Some(status) = dom::query("[data-platform-status]") {
    let label = if ready && mic_ready { "Device: Ready" } else if storage_ready { "Device: Limited" } else { "Device: Offline only" };
    dom::set_text_el(&status, label);
  }
}
