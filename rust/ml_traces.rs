use std::cell::RefCell;
use std::collections::HashSet;
use std::rc::Rc;

use serde::Serialize;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;
use web_sys::{Event, HtmlInputElement};

use crate::dom;
use crate::file_access;
use crate::state::AppState;
use crate::storage;

thread_local! {
  static SELECTED: RefCell<HashSet<String>> = RefCell::new(HashSet::new());
}

#[derive(Serialize)]
struct TraceRow {
  timestamp: f64,
  pitch_cents: Option<f64>,
  rhythm_ms: Option<f64>,
  pose_confidence: Option<f64>,
  bow_angle_deg: Option<f64>,
  posture_score: Option<f64>,
  sample_index: Option<f64>,
  source: Option<String>,
}

pub fn init(_state: Rc<RefCell<AppState>>) {
  init_section_toggle();
  if dom::query("[data-ml-trace-list]").is_none() {
    return;
  }
  refresh();

  if let Some(btn) = dom::query("[data-ml-trace-refresh]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      refresh();
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  for input in dom::query_all("[data-ml-trace-filter-start], [data-ml-trace-filter-end]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      refresh();
    });
    let _ = input.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-ml-trace-clear]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        let _ = storage::clear_ml_traces().await;
        refresh();
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-ml-trace-export]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        let force = file_access::prefers_save_for("ml-traces");
        export_json(force).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-ml-trace-export-files]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        export_json(true).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-ml-trace-export-selected]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        export_selected_json().await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-ml-trace-export-csv]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        let force = file_access::prefers_save_for("ml-traces");
        export_csv(force).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-ml-trace-export-csv-files]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        export_csv(true).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-ml-trace-export-selected-csv]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        export_selected_csv().await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-ml-trace-select-all]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        let traces = storage::get_ml_traces().await.unwrap_or_default();
        let filtered = match filter_traces(&traces) {
          Ok(values) => values,
          Err(message) => {
            dom::set_text("[data-ml-trace-status]", message);
            return;
          }
        };
        let keys: HashSet<String> = filtered.iter().map(trace_key).collect();
        SELECTED.with(|set| {
          set.borrow_mut().clear();
          set.borrow_mut().extend(keys);
        });
        render(&traces);
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-ml-trace-clear-selection]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      SELECTED.with(|set| set.borrow_mut().clear());
      refresh();
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

fn init_section_toggle() {
  if let Some(toggle) = dom::query("[data-save-files-section=\"ml-traces\"]") {
    if let Ok(input) = toggle.dyn_into::<web_sys::HtmlInputElement>() {
      input.set_checked(file_access::prefers_save_for("ml-traces"));
      let input_clone = input.clone();
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        file_access::set_prefers_save_for("ml-traces", input_clone.checked());
      });
      let _ = input.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref());
      cb.forget();
    }
  }
}

pub fn refresh() {
  spawn_local(async move {
    let traces = storage::get_ml_traces().await.unwrap_or_default();
    render(&traces);
  });
}

fn render(traces: &[JsValue]) {
  let list = match dom::query("[data-ml-trace-list]") {
    Some(el) => el,
    None => return,
  };
  list.set_inner_html("");
  let filtered = match filter_traces(traces) {
    Ok(values) => values,
    Err(message) => {
      list.set_inner_html(&format!("<li class=\"empty\">{}</li>", message));
      dom::set_text("[data-ml-trace-count]", &format!("0 of {}", traces.len()));
      dom::set_text("[data-ml-trace-status]", message);
      update_filter_badge(Some(message.into()));
      return;
    }
  };
  if filtered.is_empty() {
    let message = if traces.is_empty() { "No traces yet." } else { "No traces in range." };
    list.set_inner_html(&format!("<li class=\"empty\">{}</li>", message));
    dom::set_text("[data-ml-trace-count]", &format!("0 of {}", traces.len()));
    dom::set_text("[data-ml-trace-status]", "No matches in selected range.");
    update_filter_badge(None);
    return;
  }

  let max = filtered.len().min(20);
  if traces.len() == filtered.len() {
    dom::set_text("[data-ml-trace-count]", &format!("{} traces", filtered.len()));
  } else {
    dom::set_text("[data-ml-trace-count]", &format!("{} of {} traces", filtered.len(), traces.len()));
  }
  update_filter_badge(active_range_label());
  for trace in filtered.iter().take(max) {
    let timestamp = js_sys::Reflect::get(trace, &"timestamp".into())
      .ok()
      .and_then(|v| v.as_f64())
      .unwrap_or(0.0);
    let pitch = js_sys::Reflect::get(trace, &"pitch_cents".into())
      .ok()
      .and_then(|v| v.as_f64());
    let rhythm = js_sys::Reflect::get(trace, &"rhythm_ms".into())
      .ok()
      .and_then(|v| v.as_f64());
    let pose = js_sys::Reflect::get(trace, &"pose_confidence".into())
      .ok()
      .and_then(|v| v.as_f64());
    let bow_angle = js_sys::Reflect::get(trace, &"bow_angle_deg".into())
      .ok()
      .and_then(|v| v.as_f64());
    let posture = js_sys::Reflect::get(trace, &"posture_score".into())
      .ok()
      .and_then(|v| v.as_f64());
    let source = js_sys::Reflect::get(trace, &"source".into())
      .ok()
      .and_then(|v| v.as_string());
    let li = dom::document().create_element("li").unwrap();
    li.set_class_name("resource-list");
    let label = dom::document().create_element("span").unwrap();
    label.set_text_content(Some(&format!(
      "{} • pitch {} • rhythm {} • pose {} • bow {} • posture {}{}",
      timestamp as i64,
      pitch.map(|v| format!("{:.1}c", v)).unwrap_or_else(|| "--".into()),
      rhythm.map(|v| format!("{:.1}ms", v)).unwrap_or_else(|| "--".into()),
      pose.map(|v| format!("{:.2}", v)).unwrap_or_else(|| "--".into()),
      bow_angle.map(|v| format!("{:.1}°", v)).unwrap_or_else(|| "--".into()),
      posture.map(|v| format!("{:.0}", v)).unwrap_or_else(|| "--".into()),
      source.map(|s| format!(" • {}", s)).unwrap_or_default(),
    )));
    let checkbox = dom::document().create_element("input").unwrap();
    let _ = checkbox.set_attribute("type", "checkbox");
    checkbox.set_class_name("selection-toggle");
    if let Ok(input) = checkbox.clone().dyn_into::<HtmlInputElement>() {
      let key = trace_key(trace);
      let checked = SELECTED.with(|set| set.borrow().contains(&key));
      input.set_checked(checked);
      let input_clone = input.clone();
      let key_clone = key.clone();
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        let checked = input_clone.checked();
        SELECTED.with(|set| {
          if checked {
            set.borrow_mut().insert(key_clone.clone());
          } else {
            set.borrow_mut().remove(&key_clone);
          }
        });
      });
      input.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref()).ok();
      cb.forget();
    }
    li.append_child(&checkbox).ok();
    li.append_child(&label).ok();
    list.append_child(&li).ok();
  }
}

async fn export_json(force: bool) {
  let traces = storage::get_ml_traces().await.unwrap_or_default();
  let filtered = match filter_traces(&traces) {
    Ok(values) => values,
    Err(message) => {
      dom::set_text("[data-ml-trace-status]", message);
      return;
    }
  };
  let rows = traces_to_rows(&filtered);
  if rows.is_empty() {
    dom::set_text("[data-ml-trace-status]", "No traces in selected range.");
    return;
  }
  let exported_at: String = js_sys::Date::new_0().to_string().into();
  let envelope = serde_json::json!({
    "schemaVersion": 1,
    "exportedAt": exported_at,
    "mlTraces": rows,
  });
  if let Ok(json) = serde_json::to_string_pretty(&envelope) {
    let _ = if force {
      file_access::save_or_download_force("emerson-ml-traces.json", "application/json", json.as_bytes()).await
    } else {
      file_access::save_or_download("emerson-ml-traces.json", "application/json", json.as_bytes()).await
    };
    dom::set_text(
      "[data-ml-trace-status]",
      if force { "Saved JSON to Files." } else { "Downloaded JSON export." },
    );
  }
}

async fn export_csv(force: bool) {
  let traces = storage::get_ml_traces().await.unwrap_or_default();
  let filtered = match filter_traces(&traces) {
    Ok(values) => values,
    Err(message) => {
      dom::set_text("[data-ml-trace-status]", message);
      return;
    }
  };
  let rows = traces_to_rows(&filtered);
  if rows.is_empty() {
    dom::set_text("[data-ml-trace-status]", "No traces in selected range.");
    return;
  }
  let meta = csv_meta(rows.len(), active_range_label().as_deref());
  let mut output = format!("{}\n", meta);
  output.push_str("timestamp,pitch_cents,rhythm_ms,pose_confidence,bow_angle_deg,posture_score,sample_index,source\n");
  for row in rows {
    output.push_str(&format!(
      "{},{},{},{},{},{},{},{}\n",
      row.timestamp,
      row.pitch_cents.map(|v| v.to_string()).unwrap_or_default(),
      row.rhythm_ms.map(|v| v.to_string()).unwrap_or_default(),
      row.pose_confidence.map(|v| v.to_string()).unwrap_or_default(),
      row.bow_angle_deg.map(|v| v.to_string()).unwrap_or_default(),
      row.posture_score.map(|v| v.to_string()).unwrap_or_default(),
      row.sample_index.map(|v| v.to_string()).unwrap_or_default(),
      row.source.unwrap_or_default(),
    ));
  }
  let _ = if force {
    file_access::save_or_download_force("emerson-ml-traces.csv", "text/csv", output.as_bytes()).await
  } else {
    file_access::save_or_download("emerson-ml-traces.csv", "text/csv", output.as_bytes()).await
  };
  dom::set_text(
    "[data-ml-trace-status]",
    if force { "Saved CSV to Files." } else { "Downloaded CSV export." },
  );
}

fn traces_to_rows(traces: &[JsValue]) -> Vec<TraceRow> {
  traces
    .iter()
    .map(|trace| TraceRow {
      timestamp: js_sys::Reflect::get(trace, &"timestamp".into())
        .ok()
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0),
      pitch_cents: js_sys::Reflect::get(trace, &"pitch_cents".into())
        .ok()
        .and_then(|v| v.as_f64()),
      rhythm_ms: js_sys::Reflect::get(trace, &"rhythm_ms".into())
        .ok()
        .and_then(|v| v.as_f64()),
      pose_confidence: js_sys::Reflect::get(trace, &"pose_confidence".into())
        .ok()
        .and_then(|v| v.as_f64()),
      bow_angle_deg: js_sys::Reflect::get(trace, &"bow_angle_deg".into())
        .ok()
        .and_then(|v| v.as_f64()),
      posture_score: js_sys::Reflect::get(trace, &"posture_score".into())
        .ok()
        .and_then(|v| v.as_f64()),
      sample_index: js_sys::Reflect::get(trace, &"sample_index".into())
        .ok()
        .and_then(|v| v.as_f64()),
      source: js_sys::Reflect::get(trace, &"source".into())
        .ok()
        .and_then(|v| v.as_string()),
    })
    .collect()
}

async fn export_selected_json() {
  let traces = storage::get_ml_traces().await.unwrap_or_default();
  let filtered = match filter_traces(&traces) {
    Ok(values) => values,
    Err(message) => {
      dom::set_text("[data-ml-trace-status]", message);
      return;
    }
  };
  let selected = SELECTED.with(|set| set.borrow().clone());
  let rows: Vec<TraceRow> = filtered
    .iter()
    .filter(|trace| selected.contains(&trace_key(trace)))
    .map(|trace| TraceRow {
      timestamp: js_sys::Reflect::get(trace, &"timestamp".into())
        .ok()
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0),
      pitch_cents: js_sys::Reflect::get(trace, &"pitch_cents".into())
        .ok()
        .and_then(|v| v.as_f64()),
      rhythm_ms: js_sys::Reflect::get(trace, &"rhythm_ms".into())
        .ok()
        .and_then(|v| v.as_f64()),
      pose_confidence: js_sys::Reflect::get(trace, &"pose_confidence".into())
        .ok()
        .and_then(|v| v.as_f64()),
      bow_angle_deg: js_sys::Reflect::get(trace, &"bow_angle_deg".into())
        .ok()
        .and_then(|v| v.as_f64()),
      posture_score: js_sys::Reflect::get(trace, &"posture_score".into())
        .ok()
        .and_then(|v| v.as_f64()),
      sample_index: js_sys::Reflect::get(trace, &"sample_index".into())
        .ok()
        .and_then(|v| v.as_f64()),
      source: js_sys::Reflect::get(trace, &"source".into())
        .ok()
        .and_then(|v| v.as_string()),
    })
    .collect();
  if rows.is_empty() {
    dom::set_text("[data-ml-trace-status]", "No traces selected.");
    return;
  }
  let exported_at: String = js_sys::Date::new_0().to_string().into();
  let envelope = serde_json::json!({
    "schemaVersion": 1,
    "exportedAt": exported_at,
    "mlTraces": rows,
  });
  if let Ok(json) = serde_json::to_string_pretty(&envelope) {
    let force = file_access::prefers_save_for("ml-traces");
    let _ = if force {
      file_access::save_or_download_force("emerson-ml-traces-selected.json", "application/json", json.as_bytes()).await
    } else {
      file_access::save_or_download("emerson-ml-traces-selected.json", "application/json", json.as_bytes()).await
    };
    dom::set_text(
      "[data-ml-trace-status]",
      if force { "Saved selected JSON to Files." } else { "Downloaded selected JSON." },
    );
  }
}

async fn export_selected_csv() {
  let traces = storage::get_ml_traces().await.unwrap_or_default();
  let filtered = match filter_traces(&traces) {
    Ok(values) => values,
    Err(message) => {
      dom::set_text("[data-ml-trace-status]", message);
      return;
    }
  };
  let selected = SELECTED.with(|set| set.borrow().clone());
  let mut output = String::new();
  let mut count = 0;
  for trace in filtered.iter() {
    if !selected.contains(&trace_key(trace)) {
      continue;
    }
    let row = TraceRow {
      timestamp: js_sys::Reflect::get(trace, &"timestamp".into())
        .ok()
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0),
      pitch_cents: js_sys::Reflect::get(trace, &"pitch_cents".into())
        .ok()
        .and_then(|v| v.as_f64()),
      rhythm_ms: js_sys::Reflect::get(trace, &"rhythm_ms".into())
        .ok()
        .and_then(|v| v.as_f64()),
      pose_confidence: js_sys::Reflect::get(trace, &"pose_confidence".into())
        .ok()
        .and_then(|v| v.as_f64()),
      bow_angle_deg: js_sys::Reflect::get(trace, &"bow_angle_deg".into())
        .ok()
        .and_then(|v| v.as_f64()),
      posture_score: js_sys::Reflect::get(trace, &"posture_score".into())
        .ok()
        .and_then(|v| v.as_f64()),
      sample_index: js_sys::Reflect::get(trace, &"sample_index".into())
        .ok()
        .and_then(|v| v.as_f64()),
      source: js_sys::Reflect::get(trace, &"source".into())
        .ok()
        .and_then(|v| v.as_string()),
    };
    output.push_str(&format!(
      "{},{},{},{},{},{},{},{}\n",
      row.timestamp,
      row.pitch_cents.map(|v| v.to_string()).unwrap_or_default(),
      row.rhythm_ms.map(|v| v.to_string()).unwrap_or_default(),
      row.pose_confidence.map(|v| v.to_string()).unwrap_or_default(),
      row.bow_angle_deg.map(|v| v.to_string()).unwrap_or_default(),
      row.posture_score.map(|v| v.to_string()).unwrap_or_default(),
      row.sample_index.map(|v| v.to_string()).unwrap_or_default(),
      row.source.unwrap_or_default(),
    ));
    count += 1;
  }
  if count == 0 {
    dom::set_text("[data-ml-trace-status]", "No traces selected.");
    return;
  }
  let mut with_meta = format!("{}\n", csv_meta(count, active_range_label().as_deref()));
  with_meta.push_str("timestamp,pitch_cents,rhythm_ms,pose_confidence,bow_angle_deg,posture_score,sample_index,source\n");
  with_meta.push_str(&output);
  let force = file_access::prefers_save_for("ml-traces");
  let _ = if force {
    file_access::save_or_download_force("emerson-ml-traces-selected.csv", "text/csv", with_meta.as_bytes()).await
  } else {
    file_access::save_or_download("emerson-ml-traces-selected.csv", "text/csv", with_meta.as_bytes()).await
  };
  dom::set_text(
    "[data-ml-trace-status]",
    if force { "Saved selected CSV to Files." } else { "Downloaded selected CSV." },
  );
}

fn trace_key(trace: &JsValue) -> String {
  let ts = js_sys::Reflect::get(trace, &"timestamp".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
  let sample = js_sys::Reflect::get(trace, &"sample_index".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
  let source = js_sys::Reflect::get(trace, &"source".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
  format!("{}:{}:{}", ts as i64, sample as i64, source)
}

fn csv_meta(count: usize, range: Option<&str>) -> String {
  let exported_at: String = js_sys::Date::new_0().to_string().into();
  let range_text = range.unwrap_or("all");
  format!("# exportedAt={}, count={}, range={}", exported_at, count, range_text)
}

fn active_range_label() -> Option<String> {
  let start_value = dom::query("[data-ml-trace-filter-start]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .map(|input| input.value())
    .unwrap_or_default();
  let end_value = dom::query("[data-ml-trace-filter-end]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .map(|input| input.value())
    .unwrap_or_default();
  if start_value.is_empty() && end_value.is_empty() {
    return None;
  }
  let start_label = if start_value.is_empty() { "start".into() } else { start_value };
  let end_label = if end_value.is_empty() { "now".into() } else { end_value };
  Some(format!("{} to {}", start_label, end_label))
}

fn update_filter_badge(label: Option<String>) {
  if let Some(badge) = dom::query("[data-ml-trace-filter-badge]") {
    let text = label.unwrap_or_else(|| "All traces".into());
    dom::set_text_el(&badge, &text);
  }
}

fn filter_traces(traces: &[JsValue]) -> Result<Vec<JsValue>, &'static str> {
  let range = match date_range_ms() {
    Ok(value) => value,
    Err(message) => return Err(message),
  };
  Ok(traces
    .iter()
    .filter(|trace| {
      let ts = js_sys::Reflect::get(trace, &"timestamp".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
      if let Some((start, end)) = range {
        ts >= start && ts <= end
      } else {
        true
      }
    })
    .cloned()
    .collect())
}

fn date_range_ms() -> Result<Option<(f64, f64)>, &'static str> {
  let start_value = dom::query("[data-ml-trace-filter-start]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .map(|input| input.value())
    .unwrap_or_default();
  let end_value = dom::query("[data-ml-trace-filter-end]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .map(|input| input.value())
    .unwrap_or_default();

  if start_value.is_empty() && end_value.is_empty() {
    return Ok(None);
  }

  let start_ms = if start_value.is_empty() {
    0.0
  } else {
    js_sys::Date::new(&JsValue::from_str(&start_value)).get_time()
  };
  let end_ms = if end_value.is_empty() {
    f64::MAX
  } else {
    js_sys::Date::new(&JsValue::from_str(&end_value)).get_time() + 86_400_000.0
  };

  if start_ms.is_nan() || end_ms.is_nan() {
    return Err("Invalid date range.");
  }
  if end_ms < start_ms {
    return Err("End date is before start date.");
  }

  Ok(Some((start_ms, end_ms)))
}
