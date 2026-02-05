use std::cell::RefCell;
use std::rc::Rc;

use js_sys::{Array, Reflect};
use serde::{Deserialize, Serialize};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::{spawn_local, JsFuture};
use web_sys::{Event, File, FileReader};

use crate::assignments;
use crate::backup;
use crate::dom;
use crate::file_access;
use crate::score_following;
use crate::score_library;
use crate::state::AppState;
use crate::storage;
use crate::utils;

const IMPORT_LOG_KEY: &str = "shell:import-log";
const IMPORT_SNAPSHOT_KEY: &str = "shell:import-snapshot";
const IMPORT_QUEUE_KEY: &str = "shell:import-queue";

#[derive(Default)]
struct ImportSummary {
  title: String,
  counts: Vec<(String, usize)>,
  warnings: Vec<String>,
}

#[derive(Serialize, Deserialize)]
struct ImportSnapshot {
  timestamp: f64,
  sessions: Vec<storage::Session>,
  scores: serde_json::Value,
  game_scores: serde_json::Value,
  ml_traces: serde_json::Value,
  assignments: serde_json::Value,
  profiles: serde_json::Value,
}

#[derive(Serialize, Deserialize)]
struct ImportQueueItem {
  id: String,
  kind: String,
  payload: String,
  created_at: f64,
}

pub fn init(state: Rc<RefCell<AppState>>) {
  init_launch_queue(state.clone());
  render_import_log();

  let state_clone = state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
    let detail = Reflect::get(&event, &"detail".into()).ok().unwrap_or(JsValue::UNDEFINED);
    if let Ok(file) = detail.dyn_into::<File>() {
      let state_clone = state_clone.clone();
      spawn_local(async move {
        import_file(file, &state_clone).await;
      });
    }
  });
  let _ = dom::window().add_event_listener_with_callback("import-file", cb.as_ref().unchecked_ref());
  cb.forget();

  if let Some(btn) = dom::query("[data-score-open-files]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      if !file_access::supports_open_picker() {
        dom::set_text("[data-score-status]", "Open from Files not supported");
        return;
      }
      let state_clone = state_clone.clone();
      spawn_local(async move {
        if let Some(file) = file_access::open_file_with_types(
          "Score file",
          &[
            ("application/pdf", &[".pdf"]),
            ("application/xml", &[".xml", ".musicxml"]),
            ("text/xml", &[".xml", ".musicxml"]),
            ("application/vnd.recordare.musicxml+xml", &[".musicxml"]),
          ],
        )
        .await
        {
          import_file(file, &state_clone).await;
          append_import_log("Opened score from Files");
        }
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-import-files]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      if !file_access::supports_open_picker() {
        dom::set_text("[data-import-status]", "File picker unavailable");
        return;
      }
      let state_clone = state_clone.clone();
      spawn_local(async move {
        if let Some(file) = file_access::open_file_with_types(
          "Import data",
          &[
            ("application/json", &[".json"]),
            ("text/csv", &[".csv"]),
          ],
        )
        .await
        {
          import_file(file, &state_clone).await;
          append_import_log("Imported file from Files");
        } else {
          dom::set_text("[data-import-status]", "Import canceled");
        }
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-import-undo]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let state_clone = state_clone.clone();
      spawn_local(async move {
        if restore_snapshot(&state_clone).await {
          dom::set_text("[data-import-undo-status]", "Undo applied.");
          dom::toast("Import undo applied");
        } else {
          dom::set_text("[data-import-undo-status]", "No undo available.");
        }
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-import-log-export]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        export_import_log().await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-import-queue-apply]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let state_clone = state_clone.clone();
      spawn_local(async move {
        apply_import_queue(&state_clone).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  update_import_queue_status();
  update_undo_status();
}

fn init_launch_queue(state: Rc<RefCell<AppState>>) {
  let window = dom::window();
  let launch_queue = match Reflect::get(&window, &JsValue::from_str("launchQueue")) {
    Ok(val) => val,
    Err(_) => return,
  };
  let set_consumer = match Reflect::get(&launch_queue, &JsValue::from_str("setConsumer")) {
    Ok(val) => val,
    Err(_) => return,
  };
  let set_consumer = match set_consumer.dyn_into::<js_sys::Function>() {
    Ok(val) => val,
    Err(_) => return,
  };

  let state_clone = state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(JsValue)>::new(move |params: JsValue| {
    let files = Reflect::get(&params, &"files".into()).ok();
    let files = files.map(|val| Array::from(&val)).unwrap_or_else(Array::new);
    for handle in files.iter() {
      if let Ok(file) = handle.clone().dyn_into::<File>() {
        let state_clone = state_clone.clone();
        spawn_local(async move {
          import_file(file, &state_clone).await;
        });
        continue;
      }
      let get_file = Reflect::get(&handle, &"getFile".into()).ok();
      let get_file = match get_file.and_then(|val| val.dyn_into::<js_sys::Function>().ok()) {
        Some(func) => func,
        None => continue,
      };
      let promise = match get_file.call0(&handle).ok().and_then(|val| val.dyn_into::<js_sys::Promise>().ok()) {
        Some(val) => val,
        None => continue,
      };
      let state_clone = state_clone.clone();
      spawn_local(async move {
        if let Ok(file_val) = JsFuture::from(promise).await {
          if let Ok(file) = file_val.dyn_into::<File>() {
            import_file(file, &state_clone).await;
          }
        }
      });
    }
  });

  let _ = set_consumer.call1(&launch_queue, cb.as_ref().unchecked_ref());
  cb.forget();
}

async fn import_file(file: File, state: &Rc<RefCell<AppState>>) {
  let _ = dom::window().location().set_hash("#studio");
  let name = file.name();
  let lower = name.to_lowercase();

  if lower.ends_with(".musicxml") || lower.ends_with(".xml") {
    if let Some(text) = file_to_text(&file).await {
      score_following::import_musicxml_text(&name, &text);
      dom::set_text("[data-score-status]", &format!("Imported {}", name));
      dom::toast(&format!("Imported score {}", name));
    }
    return;
  }

  if lower.ends_with(".pdf") {
    score_following::import_pdf_score(&file, &name).await;
    dom::toast(&format!("Imported PDF {}", name));
    return;
  }

  if lower.ends_with(".json") {
    if let Some(text) = file_to_text(&file).await {
      import_json(&text, state).await;
    }
    return;
  }

  if lower.ends_with(".csv") {
    if let Some(text) = file_to_text(&file).await {
      import_csv(&text, state).await;
    }
    return;
  }

  if lower.ends_with(".zip") {
    let pin = dom::window().prompt_with_message("Enter PIN for backup restore").ok().flatten().unwrap_or_default();
    if pin.len() < 4 {
      dom::set_text("[data-restore-status]", "PIN required for restore");
      return;
    }
    let restore_sessions = dom::query("[data-restore-sessions]")
      .and_then(|el| el.dyn_into::<web_sys::HtmlInputElement>().ok())
      .map(|el| el.checked())
      .unwrap_or(true);
    let restore_recordings = dom::query("[data-restore-recordings]")
      .and_then(|el| el.dyn_into::<web_sys::HtmlInputElement>().ok())
      .map(|el| el.checked())
      .unwrap_or(true);
    let restore_ml = dom::query("[data-restore-ml]")
      .and_then(|el| el.dyn_into::<web_sys::HtmlInputElement>().ok())
      .map(|el| el.checked())
      .unwrap_or(true);
    let state_clone = state.clone();
    spawn_local(async move {
      let result = backup::restore_backup(&state_clone, &pin, &file, restore_sessions, true, true, restore_recordings, restore_ml).await;
      if result.is_ok() {
        dom::set_text("[data-restore-status]", "Restore complete");
        dom::toast("Backup restored");
      } else {
        dom::set_text("[data-restore-status]", "Restore failed");
      }
    });
    return;
  }

  dom::set_text("[data-import-status]", "Unsupported file type");
  append_import_log("Unsupported import file");
}

async fn file_to_text(file: &File) -> Option<String> {
  let reader = FileReader::new().ok()?;
  let reader_clone = reader.clone();
  let (tx, rx) = futures_channel::oneshot::channel::<Option<String>>();
  let sender = std::rc::Rc::new(std::cell::RefCell::new(Some(tx)));
  let onload = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::once(move |_event| {
    if let Some(tx) = sender.borrow_mut().take() {
      let text = reader_clone.result().ok().and_then(|val| val.as_string());
      let _ = tx.send(text);
    }
  });
  reader.set_onload(Some(onload.as_ref().unchecked_ref()));
  onload.forget();
  let _ = reader.read_as_text(file);
  rx.await.ok().flatten()
}

async fn import_json(text: &str, _state: &Rc<RefCell<AppState>>) {
  let parsed = js_sys::JSON::parse(text).unwrap_or(JsValue::NULL);
  if parsed.is_null() || parsed.is_undefined() {
    dom::set_text("[data-import-status]", "JSON import failed");
    append_import_log("JSON import failed");
    return;
  }

  let summary = summarize_json(&parsed);
  if !confirm_import(&summary).await {
    dom::set_text("[data-import-status]", "Import cancelled");
    append_import_log("JSON import cancelled");
    return;
  }
  if !dom::window().navigator().on_line() {
    enqueue_import("json", text);
    dom::set_text("[data-import-status]", "Offline: queued JSON import");
    append_import_log("Queued JSON import");
    update_import_queue_status();
    return;
  }
  let _ = save_snapshot().await;
  update_undo_status();

  if js_sys::Array::is_array(&parsed) {
    import_json_array(&parsed).await;
    dom::set_text("[data-import-status]", "JSON import complete");
    append_import_log("JSON array imported");
    return;
  }

  let assignments_val = Reflect::get(&parsed, &"assignments".into()).ok();
  if let Some(assignments_val) = assignments_val {
    if js_sys::Array::is_array(&assignments_val) {
      import_assignments_array(&assignments_val).await;
      dom::set_text("[data-import-status]", "Assignments imported");
      append_import_log("Assignments imported");
      return;
    }
  }

  let scores_val = Reflect::get(&parsed, &"scoreLibrary".into()).ok();
  if let Some(scores_val) = scores_val {
    if js_sys::Array::is_array(&scores_val) {
      import_scores_array(&scores_val).await;
      dom::set_text("[data-import-status]", "Scores imported");
      append_import_log("Scores imported");
      return;
    }
  }

  let game_scores_val = Reflect::get(&parsed, &"gameScores".into()).ok();
  if let Some(game_scores_val) = game_scores_val {
    if js_sys::Array::is_array(&game_scores_val) {
      import_game_scores_array(&game_scores_val).await;
      dom::set_text("[data-import-status]", "Game scores imported");
      append_import_log("Game scores imported");
      return;
    }
  }

  let ml_traces_val = Reflect::get(&parsed, &"mlTraces".into()).ok();
  if let Some(ml_traces_val) = ml_traces_val {
    if js_sys::Array::is_array(&ml_traces_val) {
      import_ml_traces_array(&ml_traces_val).await;
      dom::set_text("[data-import-status]", "ML traces imported");
      append_import_log("ML traces imported");
      return;
    }
  }

  import_json_object(&parsed).await;
  dom::set_text("[data-import-status]", "Import complete");
  append_import_log("JSON object imported");
}

async fn import_csv(text: &str, state: &Rc<RefCell<AppState>>) {
  let mut lines = text.lines();
  let mut imported = 0;
  let mut header = None;
  let mut schema_version = None;
  while let Some(line) = lines.next() {
    let trimmed = line.trim();
    if trimmed.is_empty() {
      continue;
    }
    if trimmed.starts_with('#') {
      if let Some(version) = parse_schema_version(trimmed) {
        schema_version = Some(version);
      }
      continue;
    }
    header = Some(trimmed.to_string());
    break;
  }
  let header = match header {
    Some(header) => header,
    None => {
      dom::set_text("[data-import-status]", "CSV empty");
      return;
    }
  };

  if !is_known_csv_header(&header) {
    dom::set_text("[data-import-status]", "CSV header not recognized");
    append_import_log("CSV header not recognized");
    return;
  }

  let summary = summarize_csv(&header, text, schema_version);
  if !confirm_import(&summary).await {
    dom::set_text("[data-import-status]", "Import cancelled");
    append_import_log("CSV import cancelled");
    return;
  }
  if !dom::window().navigator().on_line() {
    enqueue_import("csv", text);
    dom::set_text("[data-import-status]", "Offline: queued CSV import");
    append_import_log("Queued CSV import");
    update_import_queue_status();
    return;
  }
  let _ = save_snapshot().await;
  update_undo_status();
  let columns: Vec<&str> = header.split(',').collect();
  let total_rows = lines.clone().filter(|line| !line.trim().is_empty()).count();
  if !dom::window().confirm_with_message(&format!("Import {} rows?", total_rows)).unwrap_or(false) {
    dom::set_text("[data-import-status]", "Import cancelled");
    append_import_log("CSV import cancelled");
    return;
  }
  if columns.iter().any(|c| *c == "day_key") {
    for line in lines {
      let trimmed = line.trim();
      if trimmed.is_empty() {
        continue;
      }
      let values: Vec<String> = trimmed
        .split(',')
        .map(|val| val.trim_matches('"').to_string())
        .collect();
      let session = csv_to_session(&columns, &values);
      if let Some(session) = session {
        let _ = storage::save_session(&session).await;
        imported += 1;
      }
    }
    if imported > 0 {
      let sessions = storage::get_sessions().await.unwrap_or_default();
      state.borrow_mut().sessions = sessions;
      dom::set_text("[data-import-status]", &format!("Imported {} sessions", imported));
      append_import_log(&format!("Imported {} sessions", imported));
    } else {
      dom::set_text("[data-import-status]", "No sessions imported");
    }
    return;
  }

  if columns.iter().any(|c| *c == "game_type") {
    for line in lines {
      let trimmed = line.trim();
      if trimmed.is_empty() {
        continue;
      }
      let values: Vec<String> = trimmed
        .split(',')
        .map(|val| val.trim_matches('"').to_string())
        .collect();
      if let Some(payload) = csv_to_game_score(&columns, &values) {
        let _ = storage::save_game_score(&payload).await;
        imported += 1;
      }
    }
    dom::set_text("[data-import-status]", &format!("Imported {} game scores", imported));
    append_import_log(&format!("Imported {} game scores", imported));
    return;
  }

  if columns.iter().any(|c| *c == "pitch_cents") {
    for line in lines {
      let trimmed = line.trim();
      if trimmed.is_empty() {
        continue;
      }
      let values: Vec<String> = trimmed
        .split(',')
        .map(|val| val.trim_matches('"').to_string())
        .collect();
      if let Some(payload) = csv_to_ml_trace(&columns, &values) {
        let _ = storage::enqueue_ml_trace(&payload).await;
        imported += 1;
      }
    }
    dom::set_text("[data-import-status]", &format!("Imported {} ML traces", imported));
    append_import_log(&format!("Imported {} ML traces", imported));
    return;
  }

  if columns.iter().any(|c| *c == "assignmentId") || columns.iter().any(|c| *c == "title") {
    for line in lines {
      let trimmed = line.trim();
      if trimmed.is_empty() {
        continue;
      }
      let values: Vec<String> = trimmed
        .split(',')
        .map(|val| val.trim_matches('"').to_string())
        .collect();
      if let Some(payload) = csv_to_assignment(&columns, &values) {
        let _ = storage::save_assignment(&payload).await;
        imported += 1;
      }
    }
    dom::set_text("[data-import-status]", &format!("Imported {} assignments", imported));
    append_import_log(&format!("Imported {} assignments", imported));
    return;
  }

  if columns.iter().any(|c| *c == "profile_id") || columns.iter().any(|c| *c == "name") {
    for line in lines {
      let trimmed = line.trim();
      if trimmed.is_empty() {
        continue;
      }
      let values: Vec<String> = trimmed
        .split(',')
        .map(|val| val.trim_matches('"').to_string())
        .collect();
      if let Some(payload) = csv_to_profile(&columns, &values) {
        let _ = storage::save_profile(&payload).await;
        imported += 1;
      }
    }
    dom::set_text("[data-import-status]", &format!("Imported {} profiles", imported));
    append_import_log(&format!("Imported {} profiles", imported));
    return;
  }

  dom::set_text("[data-import-status]", "CSV format unsupported");
  append_import_log("CSV format unsupported");
  return;
}

fn csv_to_session(columns: &[&str], values: &[String]) -> Option<storage::Session> {
  let mut id = None;
  let mut day_key = None;
  let mut duration = None;
  let mut note = None;
  let mut created_at = None;
  for (idx, col) in columns.iter().enumerate() {
    let value = values.get(idx).cloned().unwrap_or_default();
    match *col {
      "id" => id = Some(value),
      "day_key" => day_key = Some(value),
      "duration_minutes" => duration = value.parse::<f64>().ok(),
      "note" => note = Some(value),
      "created_at" => created_at = value.parse::<f64>().ok(),
      _ => {}
    }
  }
  Some(storage::Session {
    id: id.unwrap_or_else(|| utils::create_id()),
    day_key: day_key.unwrap_or_else(|| "unknown".into()),
    duration_minutes: duration.unwrap_or(0.0),
    note: note.unwrap_or_default(),
    created_at: created_at.unwrap_or_else(|| js_sys::Date::now()),
  })
}

fn csv_to_game_score(columns: &[&str], values: &[String]) -> Option<JsValue> {
  let payload = js_sys::Object::new();
  for (idx, col) in columns.iter().enumerate() {
    let value = values.get(idx).cloned().unwrap_or_default();
    match *col {
      "id" => {
        let _ = js_sys::Reflect::set(&payload, &"id".into(), &JsValue::from_str(&value));
      }
      "game_type" => {
        let _ = js_sys::Reflect::set(&payload, &"game_type".into(), &JsValue::from_str(&value));
      }
      "score" | "streak" => {
        let num = value.parse::<f64>().unwrap_or(0.0);
        let _ = js_sys::Reflect::set(&payload, &JsValue::from_str(col), &JsValue::from_f64(num));
      }
      "bpm" | "duration_ms" | "ended_at" | "difficulty" => {
        let num = value.parse::<f64>().unwrap_or(0.0);
        let _ = js_sys::Reflect::set(&payload, &JsValue::from_str(col), &JsValue::from_f64(num));
      }
      "profile_id" => {
        let _ = js_sys::Reflect::set(&payload, &"profile_id".into(), &JsValue::from_str(&value));
      }
      _ => {}
    }
  }
  Some(payload.into())
}

fn csv_to_ml_trace(columns: &[&str], values: &[String]) -> Option<JsValue> {
  let payload = js_sys::Object::new();
  for (idx, col) in columns.iter().enumerate() {
    let value = values.get(idx).cloned().unwrap_or_default();
    match *col {
      "timestamp" | "pitch_cents" | "rhythm_ms" | "pose_confidence" | "bow_angle_deg" | "posture_score" | "sample_index" => {
        if let Ok(num) = value.parse::<f64>() {
          let _ = js_sys::Reflect::set(&payload, &JsValue::from_str(col), &JsValue::from_f64(num));
        }
      }
      "source" => {
        let _ = js_sys::Reflect::set(&payload, &"source".into(), &JsValue::from_str(&value));
      }
      _ => {}
    }
  }
  Some(payload.into())
}

fn csv_to_assignment(columns: &[&str], values: &[String]) -> Option<JsValue> {
  let payload = js_sys::Object::new();
  for (idx, col) in columns.iter().enumerate() {
    let value = values.get(idx).cloned().unwrap_or_default();
    match *col {
      "assignmentId" | "id" => {
        let _ = js_sys::Reflect::set(&payload, &"id".into(), &JsValue::from_str(&value));
      }
      "title" => {
        let _ = js_sys::Reflect::set(&payload, &"title".into(), &JsValue::from_str(&value));
      }
      "goals" => {
        let _ = js_sys::Reflect::set(&payload, &"goals".into(), &JsValue::from_str(&value));
      }
      "schedule" => {
        let _ = js_sys::Reflect::set(&payload, &"schedule".into(), &JsValue::from_str(&value));
      }
      _ => {}
    }
  }
  let payload_value: JsValue = payload.clone().into();
  if validate_assignment(&payload_value) { Some(payload.into()) } else { None }
}

fn csv_to_profile(columns: &[&str], values: &[String]) -> Option<JsValue> {
  let payload = js_sys::Object::new();
  for (idx, col) in columns.iter().enumerate() {
    let value = values.get(idx).cloned().unwrap_or_default();
    match *col {
      "profile_id" | "id" => {
        let _ = js_sys::Reflect::set(&payload, &"id".into(), &JsValue::from_str(&value));
      }
      "name" => {
        let _ = js_sys::Reflect::set(&payload, &"name".into(), &JsValue::from_str(&value));
      }
      _ => {}
    }
  }
  Some(payload.into())
}

fn render_import_log() {
  let list = match dom::query("[data-import-log]") {
    Some(el) => el,
    None => return,
  };
  list.set_inner_html("");
  let entries: Vec<ImportLogEntry> = storage::local_get(IMPORT_LOG_KEY)
    .and_then(|raw| serde_json::from_str(&raw).ok())
    .unwrap_or_default();
  if entries.is_empty() {
    list.set_inner_html("<li class=\"empty\">No imports yet.</li>");
    return;
  }
  for entry in entries.iter().take(12) {
    let li = dom::document().create_element("li").unwrap();
    li.set_class_name("resource-list");
    let label = dom::document().create_element("span").unwrap();
    label.set_text_content(Some(&format!("{} • {}", entry.timestamp as i64, entry.message)));
    li.append_child(&label).ok();
    list.append_child(&li).ok();
  }
}

fn append_import_log(message: &str) {
  let mut entries: Vec<ImportLogEntry> = storage::local_get(IMPORT_LOG_KEY)
    .and_then(|raw| serde_json::from_str(&raw).ok())
    .unwrap_or_default();
  entries.insert(0, ImportLogEntry { timestamp: js_sys::Date::now(), message: message.to_string() });
  entries.truncate(20);
  if let Ok(payload) = serde_json::to_string(&entries) {
    storage::local_set(IMPORT_LOG_KEY, &payload);
  }
  render_import_log();
}

#[derive(serde::Serialize, serde::Deserialize, Default)]
struct ImportLogEntry {
  timestamp: f64,
  message: String,
}

async fn import_json_array(value: &JsValue) {
  let array = Array::from(value);
  if array.length() == 0 {
    return;
  }

  let first = array.get(0);
  if Reflect::has(&first, &"xml".into()).unwrap_or(false) || Reflect::has(&first, &"measures".into()).unwrap_or(false) {
    import_scores_array(value).await;
    return;
  }
  if Reflect::has(&first, &"game_type".into()).unwrap_or(false) || Reflect::has(&first, &"score".into()).unwrap_or(false) {
    import_game_scores_array(value).await;
    return;
  }
  if Reflect::has(&first, &"pitch_cents".into()).unwrap_or(false) || Reflect::has(&first, &"rhythm_ms".into()).unwrap_or(false) {
    import_ml_traces_array(value).await;
    return;
  }
  import_assignments_array(value).await;
}

async fn import_json_object(value: &JsValue) {
  if Reflect::has(value, &"xml".into()).unwrap_or(false) {
    let payload = normalize_score_entry(value);
    let _ = storage::save_score_entry(&payload).await;
    score_library::refresh();
    dom::set_text("[data-score-status]", "Score imported");
    return;
  }
  if Reflect::has(value, &"assignmentId".into()).unwrap_or(false) || Reflect::has(value, &"title".into()).unwrap_or(false) {
    let payload = normalize_assignment(value);
    let _ = storage::save_assignment(&payload).await;
    assignments::refresh();
    dom::set_text("[data-score-status]", "Assignment imported");
    return;
  }
  if Reflect::has(value, &"game_type".into()).unwrap_or(false) || Reflect::has(value, &"score".into()).unwrap_or(false) {
    if let Some(payload) = normalize_game_score(value) {
      let _ = storage::save_game_score(&payload).await;
      dom::set_text("[data-score-status]", "Game score imported");
      return;
    }
  }
  if Reflect::has(value, &"pitch_cents".into()).unwrap_or(false) || Reflect::has(value, &"rhythm_ms".into()).unwrap_or(false) {
    if let Some(payload) = normalize_ml_trace(value) {
      let _ = storage::enqueue_ml_trace(&payload).await;
      dom::set_text("[data-score-status]", "ML trace imported");
      return;
    }
  }
}

async fn import_assignments_array(value: &JsValue) {
  let array = Array::from(value);
  for entry in array.iter() {
    if !validate_assignment(&entry) {
      continue;
    }
    let payload = normalize_assignment(&entry);
    let _ = storage::save_assignment(&payload).await;
  }
  assignments::refresh();
  dom::set_text("[data-score-status]", "Assignments imported");
}

async fn import_scores_array(value: &JsValue) {
  let array = Array::from(value);
  for entry in array.iter() {
    if !validate_score_entry(&entry) {
      continue;
    }
    let payload = normalize_score_entry(&entry);
    let _ = storage::save_score_entry(&payload).await;
  }
  score_library::refresh();
  dom::set_text("[data-score-status]", "Scores imported");
}

async fn import_game_scores_array(value: &JsValue) {
  let array = Array::from(value);
  for entry in array.iter() {
    if let Some(payload) = normalize_game_score(&entry) {
      let _ = storage::save_game_score(&payload).await;
    }
  }
  dom::set_text("[data-score-status]", "Game scores imported");
}

async fn import_ml_traces_array(value: &JsValue) {
  let array = Array::from(value);
  for entry in array.iter() {
    if let Some(payload) = normalize_ml_trace(&entry) {
      let _ = storage::enqueue_ml_trace(&payload).await;
    }
  }
  dom::set_text("[data-score-status]", "ML traces imported");
}

fn normalize_assignment(value: &JsValue) -> JsValue {
  let payload = js_sys::Object::new();
  let title = Reflect::get(value, &"title".into()).ok().and_then(|v| v.as_string()).unwrap_or_else(|| "Assignment".into());
  let goals = Reflect::get(value, &"goals".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
  let schedule = Reflect::get(value, &"schedule".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
  let id = Reflect::get(value, &"id".into()).ok().and_then(|v| v.as_string())
    .or_else(|| Reflect::get(value, &"assignmentId".into()).ok().and_then(|v| v.as_string()))
    .unwrap_or_else(|| utils::create_id());
  let _ = Reflect::set(&payload, &"id".into(), &JsValue::from_str(&id));
  let _ = Reflect::set(&payload, &"title".into(), &JsValue::from_str(&title));
  let _ = Reflect::set(&payload, &"goals".into(), &JsValue::from_str(&goals));
  let _ = Reflect::set(&payload, &"schedule".into(), &JsValue::from_str(&schedule));
  let _ = Reflect::set(&payload, &"created_at".into(), &JsValue::from_f64(js_sys::Date::now()));
  payload.into()
}

fn validate_assignment(value: &JsValue) -> bool {
  let title = Reflect::get(value, &"title".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
  let id = Reflect::get(value, &"id".into()).ok().and_then(|v| v.as_string())
    .or_else(|| Reflect::get(value, &"assignmentId".into()).ok().and_then(|v| v.as_string()))
    .unwrap_or_default();
  !(title.is_empty() && id.is_empty())
}

fn validate_score_entry(value: &JsValue) -> bool {
  Reflect::has(value, &"xml".into()).unwrap_or(false) || Reflect::has(value, &"measures".into()).unwrap_or(false)
}

fn normalize_game_score(value: &JsValue) -> Option<JsValue> {
  if !Reflect::has(value, &"game_type".into()).unwrap_or(false) {
    return None;
  }
  let payload = js_sys::Object::new();
  let id = Reflect::get(value, &"id".into()).ok().and_then(|v| v.as_string()).unwrap_or_else(|| utils::create_id());
  let _ = Reflect::set(&payload, &"id".into(), &JsValue::from_str(&id));
  if let Ok(game_type) = Reflect::get(value, &"game_type".into()) {
    let _ = Reflect::set(&payload, &"game_type".into(), &game_type);
  }
  for key in ["score", "streak", "bpm", "duration_ms", "ended_at", "difficulty"] {
    if let Ok(val) = Reflect::get(value, &JsValue::from_str(key)) {
      let num = val.as_f64().unwrap_or(0.0);
      let _ = Reflect::set(&payload, &JsValue::from_str(key), &JsValue::from_f64(num));
    }
  }
  if let Ok(profile) = Reflect::get(value, &"profile_id".into()) {
    let _ = Reflect::set(&payload, &"profile_id".into(), &profile);
  }
  Some(payload.into())
}

fn normalize_ml_trace(value: &JsValue) -> Option<JsValue> {
  if !Reflect::has(value, &"timestamp".into()).unwrap_or(false) {
    return None;
  }
  let payload = js_sys::Object::new();
  for key in ["timestamp", "pitch_cents", "rhythm_ms", "pose_confidence", "bow_angle_deg", "posture_score", "sample_index"] {
    if let Ok(val) = Reflect::get(value, &JsValue::from_str(key)) {
      if let Some(num) = val.as_f64() {
        let _ = Reflect::set(&payload, &JsValue::from_str(key), &JsValue::from_f64(num));
      }
    }
  }
  if let Ok(source) = Reflect::get(value, &"source".into()) {
    let _ = Reflect::set(&payload, &"source".into(), &source);
  }
  Some(payload.into())
}

fn normalize_score_entry(value: &JsValue) -> JsValue {
  let payload = js_sys::Object::new();
  let title = Reflect::get(value, &"title".into()).ok().and_then(|v| v.as_string()).unwrap_or_else(|| "Score".into());
  let id = Reflect::get(value, &"id".into()).ok().and_then(|v| v.as_string()).unwrap_or_else(|| utils::create_id());
  let measures = Reflect::get(value, &"measures".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
  let beats = Reflect::get(value, &"beats_per_measure".into()).ok().and_then(|v| v.as_f64()).unwrap_or(4.0);
  let tempo = Reflect::get(value, &"tempo_bpm".into()).ok().and_then(|v| v.as_f64()).unwrap_or(90.0);
  let xml = Reflect::get(value, &"xml".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
  let source = Reflect::get(value, &"source".into()).ok().and_then(|v| v.as_string()).unwrap_or_else(|| "import".into());

  let _ = Reflect::set(&payload, &"id".into(), &JsValue::from_str(&id));
  let _ = Reflect::set(&payload, &"title".into(), &JsValue::from_str(&title));
  let _ = Reflect::set(&payload, &"measures".into(), &JsValue::from_f64(measures));
  let _ = Reflect::set(&payload, &"beats_per_measure".into(), &JsValue::from_f64(beats));
  let _ = Reflect::set(&payload, &"tempo_bpm".into(), &JsValue::from_f64(tempo));
  let _ = Reflect::set(&payload, &"created_at".into(), &JsValue::from_f64(js_sys::Date::now()));
  let _ = Reflect::set(&payload, &"source".into(), &JsValue::from_str(&source));
  if !xml.is_empty() {
    let _ = Reflect::set(&payload, &"xml".into(), &JsValue::from_str(&xml));
  }
  let pdf_blob = Reflect::get(value, &"pdf_blob".into()).ok().unwrap_or(JsValue::UNDEFINED);
  if !pdf_blob.is_undefined() {
    let _ = Reflect::set(&payload, &"pdf_blob".into(), &pdf_blob);
  }
  payload.into()
}

fn parse_schema_version(line: &str) -> Option<u32> {
  if !line.starts_with("#") {
    return None;
  }
  let lower = line.to_lowercase();
  let marker = "schemaversion=";
  if let Some(idx) = lower.find(marker) {
    let value = &lower[idx + marker.len()..];
    let value = value.split(',').next().unwrap_or("").trim();
    return value.parse::<u32>().ok();
  }
  None
}

fn summarize_json(value: &JsValue) -> ImportSummary {
  let mut summary = ImportSummary::default();
  summary.title = "JSON import".into();

  if let Ok(schema) = Reflect::get(value, &"schemaVersion".into()) {
    if let Some(version) = schema.as_f64() {
      if version as u32 != 1 {
        summary.warnings.push(format!("Schema version {} detected", version as u32));
      }
    }
  }

  if js_sys::Array::is_array(value) {
    if summary.warnings.is_empty() {
      summary.warnings.push("Missing schemaVersion in JSON array.".into());
    }
    let array = Array::from(value);
    summary.counts.push(("Entries".into(), array.length() as usize));
    let first = array.get(0);
    if !first.is_undefined() && !first.is_null() {
      if Reflect::has(&first, &"game_type".into()).unwrap_or(false) {
        summary.title = "Game scores".into();
      } else if Reflect::has(&first, &"pitch_cents".into()).unwrap_or(false) {
        summary.title = "ML traces".into();
      } else if Reflect::has(&first, &"xml".into()).unwrap_or(false) || Reflect::has(&first, &"measures".into()).unwrap_or(false) {
        summary.title = "Score library".into();
      } else if Reflect::has(&first, &"goals".into()).unwrap_or(false) || Reflect::has(&first, &"schedule".into()).unwrap_or(false) {
        summary.title = "Assignments".into();
      } else if Reflect::has(&first, &"name".into()).unwrap_or(false) {
        summary.title = "Profiles".into();
      } else if Reflect::has(&first, &"duration_minutes".into()).unwrap_or(false) {
        summary.title = "Sessions".into();
      }
    }
    return summary;
  }

  if Reflect::get(value, &"schemaVersion".into()).ok().and_then(|v| v.as_f64()).is_none() {
    summary.warnings.push("Missing schemaVersion in JSON object.".into());
  }

  for (key, label) in [
    ("sessions", "Sessions"),
    ("scoreLibrary", "Scores"),
    ("gameScores", "Game scores"),
    ("mlTraces", "ML traces"),
    ("assignments", "Assignments"),
    ("profiles", "Profiles"),
  ] {
    if let Ok(val) = Reflect::get(value, &JsValue::from_str(key)) {
      if js_sys::Array::is_array(&val) {
        let array = Array::from(&val);
        summary.counts.push((label.into(), array.length() as usize));
      }
    }
  }

  if summary.counts.is_empty() {
    summary.counts.push(("Entries".into(), 1));
  }
  summary
}

fn summarize_csv(header: &str, text: &str, schema_version: Option<u32>) -> ImportSummary {
  let mut summary = ImportSummary::default();
  summary.title = "CSV import".into();
  if let Some(version) = schema_version {
    if version != 1 {
      summary.warnings.push(format!("Schema version {} detected", version));
    }
  }
  let rows = text.lines().filter(|line| {
    let trimmed = line.trim();
    !trimmed.is_empty() && !trimmed.starts_with('#') && trimmed != header
  }).count();

  if header.contains("duration_minutes") {
    summary.title = "Sessions CSV".into();
  } else if header.contains("game_type") {
    summary.title = "Game scores CSV".into();
  } else if header.contains("pitch_cents") {
    summary.title = "ML traces CSV".into();
  } else if header.contains("assignment") || header.contains("schedule") {
    summary.title = "Assignments CSV".into();
  } else if header.contains("profile") || header.contains("name") {
    summary.title = "Profiles CSV".into();
  } else if header.contains("measures") || header.contains("xml") {
    summary.title = "Score library CSV".into();
  }
  summary.counts.push(("Rows".into(), rows));
  summary
}

fn is_known_csv_header(header: &str) -> bool {
  header.contains("day_key")
    || header.contains("game_type")
    || header.contains("pitch_cents")
    || header.contains("goals")
    || header.contains("schedule")
    || header.contains("name")
    || header.contains("measures")
    || header.contains("xml")
}

async fn confirm_import(summary: &ImportSummary) -> bool {
  let dialog = dom::query("[data-import-preview-dialog]");
  if let Some(dialog) = dialog.and_then(|el| el.dyn_into::<web_sys::HtmlDialogElement>().ok()) {
    if let Some(list) = dom::query("[data-import-preview-list]") {
      list.set_inner_html("");
      for (label, count) in summary.counts.iter() {
        let li = dom::document().create_element("li").unwrap();
        li.set_class_name("resource-list");
        li.set_text_content(Some(&format!("{}: {}", label, count)));
        list.append_child(&li).ok();
      }
    }
    if let Some(notes) = dom::query("[data-import-preview-notes]") {
      if summary.warnings.is_empty() {
        dom::set_text_el(&notes, "Confirm to apply changes.");
      } else {
        dom::set_text_el(&notes, &format!("Warnings: {}", summary.warnings.join(" • ")));
      }
    }
    let (tx, rx) = futures_channel::oneshot::channel::<bool>();
    let sender = Rc::new(RefCell::new(Some(tx)));

    let sender_confirm = sender.clone();
    if let Some(btn) = dom::query("[data-import-preview-confirm]") {
      let dialog_close = dialog.clone();
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::once(move |_event| {
        if let Some(tx) = sender_confirm.borrow_mut().take() {
          let _ = tx.send(true);
        }
        let _ = dialog_close.close();
      });
      let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
      cb.forget();
    }

    for btn in dom::query_all("[data-import-preview-cancel]") {
      let dialog_close = dialog.clone();
      let sender_cancel = sender.clone();
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::once(move |_event| {
        if let Some(tx) = sender_cancel.borrow_mut().take() {
          let _ = tx.send(false);
        }
        let _ = dialog_close.close();
      });
      let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
      cb.forget();
    }

    let _ = dialog.show_modal();
    return rx.await.unwrap_or(false);
  }

  let mut message = format!("{}:\n", summary.title);
  for (label, count) in summary.counts.iter() {
    message.push_str(&format!("- {}: {}\n", label, count));
  }
  if !summary.warnings.is_empty() {
    message.push_str(&format!("Warnings: {}\n", summary.warnings.join(" • ")));
  }
  dom::window().confirm_with_message(&message).unwrap_or(false)
}

async fn save_snapshot() -> bool {
  let sessions = storage::get_sessions().await.unwrap_or_default();
  let scores = js_values_to_json(&storage::get_scores().await.unwrap_or_default());
  let game_scores = js_values_to_json(&storage::get_game_scores().await.unwrap_or_default());
  let ml_traces = js_values_to_json(&storage::get_ml_traces().await.unwrap_or_default());
  let assignments = js_values_to_json(&storage::get_assignments().await.unwrap_or_default());
  let profiles = js_values_to_json(&storage::get_profiles().await.unwrap_or_default());

  let snapshot = ImportSnapshot {
    timestamp: js_sys::Date::now(),
    sessions,
    scores,
    game_scores,
    ml_traces,
    assignments,
    profiles,
  };
  if let Ok(payload) = serde_json::to_string(&snapshot) {
    storage::local_set(IMPORT_SNAPSHOT_KEY, &payload);
    return true;
  }
  false
}

async fn restore_snapshot(state: &Rc<RefCell<AppState>>) -> bool {
  let snapshot = storage::local_get(IMPORT_SNAPSHOT_KEY)
    .and_then(|raw| serde_json::from_str::<ImportSnapshot>(&raw).ok());
  let snapshot = match snapshot {
    Some(snapshot) => snapshot,
    None => return false,
  };

  let _ = storage::clear_sessions().await;
  let _ = storage::clear_scores().await;
  let _ = storage::clear_game_scores().await;
  let _ = storage::clear_ml_traces().await;
  let _ = storage::clear_assignments().await;
  let _ = storage::clear_profiles().await;

  for session in snapshot.sessions.iter() {
    let _ = storage::save_session(session).await;
  }
  for entry in json_to_js_values(&snapshot.scores).iter() {
    let _ = storage::save_score_entry(entry).await;
  }
  for entry in json_to_js_values(&snapshot.game_scores).iter() {
    let _ = storage::save_game_score(entry).await;
  }
  for entry in json_to_js_values(&snapshot.ml_traces).iter() {
    let _ = storage::enqueue_ml_trace(entry).await;
  }
  for entry in json_to_js_values(&snapshot.assignments).iter() {
    let _ = storage::save_assignment(entry).await;
  }
  for entry in json_to_js_values(&snapshot.profiles).iter() {
    let _ = storage::save_profile(entry).await;
  }

  {
    let mut app = state.borrow_mut();
    app.sessions = snapshot.sessions;
  }
  assignments::refresh();
  score_library::refresh();
  crate::game_scores::refresh();
  crate::ml_traces::refresh();
  crate::profiles::refresh();
  crate::session::update_summary(&state.borrow());
  true
}

fn update_undo_status() {
  let status = if storage::local_get(IMPORT_SNAPSHOT_KEY).is_some() {
    "Undo available."
  } else {
    "No import undo available."
  };
  dom::set_text("[data-import-undo-status]", status);
}

fn enqueue_import(kind: &str, payload: &str) {
  let mut items = load_queue();
  items.insert(0, ImportQueueItem {
    id: utils::create_id(),
    kind: kind.to_string(),
    payload: payload.to_string(),
    created_at: js_sys::Date::now(),
  });
  items.truncate(10);
  save_queue(&items);
}

fn load_queue() -> Vec<ImportQueueItem> {
  storage::local_get(IMPORT_QUEUE_KEY)
    .and_then(|raw| serde_json::from_str(&raw).ok())
    .unwrap_or_default()
}

fn save_queue(items: &[ImportQueueItem]) {
  if let Ok(payload) = serde_json::to_string(items) {
    storage::local_set(IMPORT_QUEUE_KEY, &payload);
  }
}

fn update_import_queue_status() {
  let count = load_queue().len();
  let status = if count == 0 {
    "No queued imports.".to_string()
  } else {
    format!("{} queued import(s).", count)
  };
  dom::set_text("[data-import-queue-status]", &status);
}

async fn apply_import_queue(state: &Rc<RefCell<AppState>>) {
  if !dom::window().navigator().on_line() {
    dom::set_text("[data-import-queue-status]", "Offline: queue pending.");
    return;
  }
  let items = load_queue();
  if items.is_empty() {
    update_import_queue_status();
    return;
  }
  let mut remaining = Vec::new();
  let mut applied = 0usize;
  for item in items {
    if item.kind == "json" {
      import_json(&item.payload, state).await;
      applied += 1;
    } else if item.kind == "csv" {
      import_csv(&item.payload, state).await;
      applied += 1;
    } else {
      remaining.push(item);
      continue;
    }
  }
  save_queue(&remaining);
  update_import_queue_status();
  if applied > 0 {
    dom::set_text("[data-import-queue-status]", &format!("Applied {} queued import(s).", applied));
  }
  if !remaining.is_empty() {
    dom::set_text("[data-import-queue-status]", &format!("{} queued import(s) still pending.", remaining.len()));
  }
}

async fn export_import_log() {
  let entries: Vec<ImportLogEntry> = storage::local_get(IMPORT_LOG_KEY)
    .and_then(|raw| serde_json::from_str(&raw).ok())
    .unwrap_or_default();
  if entries.is_empty() {
    dom::set_text("[data-import-status]", "No import log entries.");
    return;
  }
  if let Ok(json) = serde_json::to_string_pretty(&entries) {
    let _ = file_access::save_or_download("emerson-import-log.json", "application/json", json.as_bytes()).await;
  }
  let mut csv = String::from("timestamp,message\n");
  for entry in entries {
    csv.push_str(&format!("{},\"{}\"\n", entry.timestamp as i64, entry.message.replace('"', "\"\"")));
  }
  let _ = file_access::save_or_download("emerson-import-log.csv", "text/csv", csv.as_bytes()).await;
  dom::set_text("[data-import-status]", "Exported import log.");
}

fn js_values_to_json(values: &[JsValue]) -> serde_json::Value {
  let array = Array::from_iter(values.iter());
  serde_wasm_bindgen::from_value(array.into()).unwrap_or_else(|_| serde_json::Value::Array(Vec::new()))
}

fn json_to_js_values(value: &serde_json::Value) -> Vec<JsValue> {
  let val = serde_wasm_bindgen::to_value(value).unwrap_or(JsValue::NULL);
  if js_sys::Array::is_array(&val) {
    Array::from(&val).iter().collect()
  } else {
    Vec::new()
  }
}
