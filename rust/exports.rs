use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::JsCast;
use web_sys::Event;

use crate::dom;
use crate::file_access;
use crate::state::AppState;
use crate::storage;

const SCHEMA_VERSION: u32 = 1;

async fn save_json(filename: &str, payload: &str, force: bool) {
  let _ = if force {
    file_access::save_or_download_force(filename, "application/json", payload.as_bytes()).await
  } else {
    file_access::save_or_download(filename, "application/json", payload.as_bytes()).await
  };
}

async fn save_csv(filename: &str, payload: &str, force: bool) {
  let _ = if force {
    file_access::save_or_download_force(filename, "text/csv", payload.as_bytes()).await
  } else {
    file_access::save_or_download(filename, "text/csv", payload.as_bytes()).await
  };
}

fn export_envelope(value: serde_json::Value) -> serde_json::Value {
  let exported_at: String = js_sys::Date::new_0().to_string().into();
  serde_json::json!({
    "schemaVersion": SCHEMA_VERSION,
    "exportedAt": exported_at,
    "appVersion": env!("CARGO_PKG_VERSION"),
    "deviceId": storage::get_or_create_device_id(),
    "data": value
  })
}

fn csv_escape(value: &str) -> String {
  if value.contains(',') || value.contains('"') || value.contains('\n') {
    let escaped = value.replace('"', "\"\"");
    format!("\"{}\"", escaped)
  } else {
    value.to_string()
  }
}

fn sessions_to_csv(sessions: &[storage::Session]) -> String {
  let exported_at: String = js_sys::Date::new_0().to_string().into();
  let header = format!(
    "# schemaVersion={}, exportedAt={}, appVersion={}, deviceId={}",
    SCHEMA_VERSION,
    exported_at,
    env!("CARGO_PKG_VERSION"),
    storage::get_or_create_device_id()
  );
  let mut lines = vec![header, "id,day_key,duration_minutes,note,created_at".to_string()];
  for session in sessions {
    let row = format!(
      "{},{},{},{},{}",
      csv_escape(&session.id),
      csv_escape(&session.day_key),
      session.duration_minutes,
      csv_escape(&session.note),
      session.created_at
    );
    lines.push(row);
  }
  lines.join("\n")
}

pub fn init(state: Rc<RefCell<AppState>>) {
  init_section_toggle();
  if let Some(btn) = dom::query("[data-export-summary]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let state_clone = state_clone.clone();
      wasm_bindgen_futures::spawn_local(async move {
        let app = state_clone.borrow();
        let weekly: Vec<_> = app.sessions.iter().take(7).cloned().collect();
        let payload = export_envelope(serde_json::to_value(weekly).unwrap_or_default());
        if let Ok(json) = serde_json::to_string_pretty(&payload) {
          let force = file_access::prefers_save_for("weekly");
          save_json("emerson-weekly-summary.json", &json, force).await;
        }
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-export-summary-files]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let state_clone = state_clone.clone();
      wasm_bindgen_futures::spawn_local(async move {
        let app = state_clone.borrow();
        let weekly: Vec<_> = app.sessions.iter().take(7).cloned().collect();
        let payload = export_envelope(serde_json::to_value(weekly).unwrap_or_default());
        if let Ok(json) = serde_json::to_string_pretty(&payload) {
          save_json("emerson-weekly-summary.json", &json, true).await;
        }
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-export-session]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let state_clone = state_clone.clone();
      wasm_bindgen_futures::spawn_local(async move {
        let app = state_clone.borrow();
        if let Some(session) = app.sessions.first() {
          let payload = export_envelope(serde_json::to_value(session).unwrap_or_default());
          if let Ok(json) = serde_json::to_string_pretty(&payload) {
            let force = file_access::prefers_save_for("weekly");
            save_json("emerson-latest-session.json", &json, force).await;
          }
        }
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-export-session-files]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let state_clone = state_clone.clone();
      wasm_bindgen_futures::spawn_local(async move {
        let app = state_clone.borrow();
        if let Some(session) = app.sessions.first() {
          let payload = export_envelope(serde_json::to_value(session).unwrap_or_default());
          if let Ok(json) = serde_json::to_string_pretty(&payload) {
            save_json("emerson-latest-session.json", &json, true).await;
          }
        }
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-export-csv]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let state_clone = state_clone.clone();
      wasm_bindgen_futures::spawn_local(async move {
        let app = state_clone.borrow();
        let weekly: Vec<_> = app.sessions.iter().take(7).cloned().collect();
        let csv = sessions_to_csv(&weekly);
        let force = file_access::prefers_save_for("weekly");
        save_csv("emerson-weekly-summary.csv", &csv, force).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-export-csv-files]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let state_clone = state_clone.clone();
      wasm_bindgen_futures::spawn_local(async move {
        let app = state_clone.borrow();
        let weekly: Vec<_> = app.sessions.iter().take(7).cloned().collect();
        let csv = sessions_to_csv(&weekly);
        save_csv("emerson-weekly-summary.csv", &csv, true).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

fn init_section_toggle() {
  if let Some(toggle) = dom::query("[data-save-files-section=\"weekly\"]") {
    if let Ok(input) = toggle.dyn_into::<web_sys::HtmlInputElement>() {
      input.set_checked(file_access::prefers_save_for("weekly"));
      let input_clone = input.clone();
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        file_access::set_prefers_save_for("weekly", input_clone.checked());
      });
      let _ = input.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref());
      cb.forget();
    }
  }
}
