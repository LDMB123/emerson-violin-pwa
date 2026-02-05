use wasm_bindgen::JsCast;
use web_sys::Event;

use crate::dom;
use crate::file_access;
use crate::storage;

pub fn init() {
  if let Some(btn) = dom::query("[data-diagnostics-export]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      wasm_bindgen_futures::spawn_local(async move {
        export_diagnostics().await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

async fn export_diagnostics() {
  let window = dom::window();
  let navigator = window.navigator();
  let mut capabilities = Vec::new();
  for item in dom::query_all("[data-capability]") {
    let name = item.get_attribute("data-capability").unwrap_or_default();
    let state = item.get_attribute("data-state").unwrap_or_default();
    capabilities.push(serde_json::json!({ "name": name, "state": state }));
  }
  let timestamp: String = js_sys::Date::new_0().to_string().into();
  let payload = serde_json::json!({
    "appVersion": env!("CARGO_PKG_VERSION"),
    "deviceId": storage::get_or_create_device_id(),
    "userAgent": navigator.user_agent().unwrap_or_default(),
    "online": js_sys::Reflect::get(&navigator, &"onLine".into()).ok().and_then(|v| v.as_bool()).unwrap_or(true),
    "installStatus": dom::query("[data-install-status]").and_then(|el| el.text_content()).unwrap_or_default(),
    "capabilities": capabilities,
    "timestamp": timestamp,
  });
  if let Ok(json) = serde_json::to_string_pretty(&payload) {
    let ok = file_access::save_or_download("emerson-diagnostics.json", "application/json", json.as_bytes()).await;
    if ok {
      dom::set_text("[data-diagnostics-status]", "Diagnostics exported.");
    }
  }
}
