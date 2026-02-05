use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::JsCast;
use wasm_bindgen_futures::spawn_local;
use web_sys::{Event, HtmlInputElement};

use crate::dom;
use crate::state::AppState;
use crate::storage;

const RETENTION_KEY: &str = "cleanup:retention-days";
const MAX_MB_KEY: &str = "cleanup:max-mb";
const AUTO_LAST_KEY: &str = "cleanup:last-run";
const PRESSURE_LAST_KEY: &str = "cleanup:pressure-last-run";
const DEFAULT_RETENTION_DAYS: f64 = 90.0;
const DEFAULT_MAX_MB: f64 = 512.0;

pub fn init(_state: Rc<RefCell<AppState>>) {
  if dom::query("[data-cleanup-run]").is_none() {
    return;
  }

  if let Some(retention) = dom::query("[data-cleanup-retention]").and_then(|el| el.dyn_into::<HtmlInputElement>().ok()) {
    if let Some(value) = storage::local_get(RETENTION_KEY) {
      retention.set_value(&value);
    }
  }
  if let Some(max_mb) = dom::query("[data-cleanup-max-mb]").and_then(|el| el.dyn_into::<HtmlInputElement>().ok()) {
    if let Some(value) = storage::local_get(MAX_MB_KEY) {
      max_mb.set_value(&value);
    }
  }

  if let Some(btn) = dom::query("[data-cleanup-run]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let retention_days = dom::query("[data-cleanup-retention]")
        .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
        .and_then(|input| input.value().parse::<f64>().ok())
        .unwrap_or(DEFAULT_RETENTION_DAYS);
      let max_mb = dom::query("[data-cleanup-max-mb]")
        .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
        .and_then(|input| input.value().parse::<f64>().ok())
        .unwrap_or(DEFAULT_MAX_MB);
      storage::local_set(RETENTION_KEY, &retention_days.to_string());
      storage::local_set(MAX_MB_KEY, &max_mb.to_string());
      dom::set_text("[data-cleanup-status]", "Pruning...");
      spawn_local(async move {
        let _ = storage::prune_recordings(retention_days).await;
        let _ = storage::prune_recordings_by_size(max_mb * 1024.0 * 1024.0).await;
        let _ = storage::prune_ml_traces(1200, 30.0 * 86_400_000.0).await;
        dom::set_text("[data-cleanup-status]", "Cleanup complete");
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

pub fn run_auto() {
  spawn_local(async move {
    let now = js_sys::Date::now();
    let last = storage::local_get(AUTO_LAST_KEY)
      .and_then(|value| value.parse::<f64>().ok())
      .unwrap_or(0.0);
    if now - last < 86_400_000.0 {
      return;
    }
    storage::local_set(AUTO_LAST_KEY, &format!("{}", now));

    let retention_days = storage::local_get(RETENTION_KEY)
      .and_then(|value| value.parse::<f64>().ok())
      .unwrap_or(DEFAULT_RETENTION_DAYS);
    let max_mb = storage::local_get(MAX_MB_KEY)
      .and_then(|value| value.parse::<f64>().ok())
      .unwrap_or(DEFAULT_MAX_MB);
    let _ = storage::prune_recordings(retention_days).await;
    let _ = storage::prune_recordings_by_size(max_mb * 1024.0 * 1024.0).await;
    let _ = storage::prune_ml_traces(1200, 30.0 * 86_400_000.0).await;
  });
}

pub fn run_pressure() {
  spawn_local(async move {
    let now = js_sys::Date::now();
    let last = storage::local_get(PRESSURE_LAST_KEY)
      .and_then(|value| value.parse::<f64>().ok())
      .unwrap_or(0.0);
    // Avoid repeated cleanup loops while Safari is under storage pressure.
    if now - last < 3_600_000.0 {
      return;
    }
    storage::local_set(PRESSURE_LAST_KEY, &format!("{}", now));

    let retention_days = storage::local_get(RETENTION_KEY)
      .and_then(|value| value.parse::<f64>().ok())
      .unwrap_or(DEFAULT_RETENTION_DAYS);
    let max_mb = storage::local_get(MAX_MB_KEY)
      .and_then(|value| value.parse::<f64>().ok())
      .unwrap_or(DEFAULT_MAX_MB);

    dom::set_text("[data-cleanup-status]", "Auto cleanup...");
    let _ = storage::prune_recordings(retention_days).await;
    let _ = storage::prune_recordings_by_size(max_mb * 1024.0 * 1024.0).await;
    let _ = storage::prune_ml_traces(1200, 30.0 * 86_400_000.0).await;
    dom::set_text("[data-cleanup-status]", "Auto cleanup complete");
  });
}
