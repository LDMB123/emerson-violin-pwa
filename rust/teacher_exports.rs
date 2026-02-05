use std::cell::RefCell;
use std::rc::Rc;

use serde_json::json;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;
use web_sys::Event;

use crate::backup;
use crate::dom;
use crate::file_access;
use crate::state::AppState;
use crate::storage;

const TEACHER_SCHEMA_VERSION: u32 = 1;

pub fn init(state: Rc<RefCell<AppState>>) {
  init_section_toggle();
  if dom::query("[data-teacher-export]").is_none() {
    return;
  }

  if let Some(btn) = dom::query("[data-teacher-export]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let state_clone = state_clone.clone();
      spawn_local(async move {
        let force = file_access::prefers_save_for("teacher");
        export_report(&state_clone, force).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-teacher-export-files]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let state_clone = state_clone.clone();
      spawn_local(async move {
        export_report(&state_clone, true).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-teacher-zip]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let state_clone = state_clone.clone();
      spawn_local(async move {
        let force = file_access::prefers_save_for("teacher");
        export_zip(&state_clone, force).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-teacher-zip-files]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let state_clone = state_clone.clone();
      spawn_local(async move {
        export_zip(&state_clone, true).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

fn init_section_toggle() {
  if let Some(toggle) = dom::query("[data-save-files-section=\"teacher\"]") {
    if let Ok(input) = toggle.dyn_into::<web_sys::HtmlInputElement>() {
      input.set_checked(file_access::prefers_save_for("teacher"));
      let input_clone = input.clone();
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        file_access::set_prefers_save_for("teacher", input_clone.checked());
      });
      let _ = input.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref());
      cb.forget();
    }
  }
}

async fn export_report(state: &Rc<RefCell<AppState>>, force: bool) {
  let report = build_report(state).await;
  if let Ok(json) = serde_json::to_string_pretty(&report) {
    let _ = if force {
      file_access::save_or_download_force("emerson-teacher-report.json", "application/json", json.as_bytes()).await
    } else {
      file_access::save_or_download("emerson-teacher-report.json", "application/json", json.as_bytes()).await
    };
    dom::set_text("[data-teacher-export-status]", "Exported report.");
  }
}

async fn export_zip(state: &Rc<RefCell<AppState>>, force: bool) {
  let report = build_report(state).await;
  let report_bytes = serde_json::to_vec_pretty(&report).unwrap_or_default();

  let sessions_bytes = serde_json::to_vec_pretty(&state.borrow().sessions).unwrap_or_default();
  let ml_bytes = serde_json::to_vec_pretty(&state.borrow().ml).unwrap_or_default();

  let game_scores = storage::get_game_scores().await.unwrap_or_default();
  let ml_traces = storage::get_ml_traces().await.unwrap_or_default();
  let assignments = storage::get_assignments().await.unwrap_or_default();
  let profiles = storage::get_profiles().await.unwrap_or_default();
  let scores = storage::get_scores().await.unwrap_or_default();

  let game_scores_bytes = json_bytes_from_js(&game_scores);
  let ml_traces_bytes = json_bytes_from_js(&ml_traces);
  let assignments_bytes = json_bytes_from_js(&assignments);
  let profiles_bytes = json_bytes_from_js(&profiles);
  let scores_bytes = json_bytes_from_js(&scores);

  let entries = vec![
    backup::ZipEntry::new("teacher-report.json", report_bytes),
    backup::ZipEntry::new("sessions.json", sessions_bytes),
    backup::ZipEntry::new("ml-state.json", ml_bytes),
    backup::ZipEntry::new("game-scores.json", game_scores_bytes),
    backup::ZipEntry::new("ml-traces.json", ml_traces_bytes),
    backup::ZipEntry::new("assignments.json", assignments_bytes),
    backup::ZipEntry::new("profiles.json", profiles_bytes),
    backup::ZipEntry::new("score-library.json", scores_bytes),
  ];
  let zip_bytes = backup::build_zip(entries);
  let _ = if force {
    file_access::save_or_download_force("emerson-teacher-export.zip", "application/zip", &zip_bytes).await;
    Ok(())
  } else {
    backup::download_bytes("emerson-teacher-export.zip", "application/zip", &zip_bytes).await
  };
  dom::set_text("[data-teacher-export-status]", "Exported ZIP.");
}

async fn build_report(state: &Rc<RefCell<AppState>>) -> serde_json::Value {
  let app = state.borrow();
  let sessions = app.sessions.clone();
  let ml_state = app.ml.clone();
  drop(app);

  let game_scores = storage::get_game_scores().await.unwrap_or_default();
  let ml_traces = storage::get_ml_traces().await.unwrap_or_default();
  let assignments = storage::get_assignments().await.unwrap_or_default();
  let profiles = storage::get_profiles().await.unwrap_or_default();
  let scores = storage::get_scores().await.unwrap_or_default();
  let generated_at: String = js_sys::Date::new_0().to_string().into();

  json!({
    "schemaVersion": TEACHER_SCHEMA_VERSION,
    "generatedAt": generated_at,
    "appVersion": env!("CARGO_PKG_VERSION"),
    "deviceId": storage::get_or_create_device_id(),
    "sessions": sessions,
    "mlState": ml_state,
    "gameScores": json_value_from_js(&game_scores),
    "mlTraces": json_value_from_js(&ml_traces),
    "assignments": json_value_from_js(&assignments),
    "profiles": json_value_from_js(&profiles),
    "scoreLibrary": json_value_from_js(&scores),
  })
}

fn json_value_from_js(values: &[JsValue]) -> serde_json::Value {
  let array = js_sys::Array::from_iter(values.iter());
  serde_wasm_bindgen::from_value(array.into()).unwrap_or_else(|_| serde_json::Value::Array(Vec::new()))
}

fn json_bytes_from_js(values: &[JsValue]) -> Vec<u8> {
  let value = json_value_from_js(values);
  serde_json::to_vec_pretty(&value).unwrap_or_default()
}
