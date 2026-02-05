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
struct GameScoreRow {
  id: String,
  game_type: String,
  score: i32,
  streak: i32,
  bpm: f64,
  duration_ms: f64,
  ended_at: f64,
  profile_id: String,
  difficulty: f64,
}

pub fn init(_state: Rc<RefCell<AppState>>) {
  init_section_toggle();
  if dom::query("[data-game-score-list]").is_none() {
    return;
  }
  refresh();

  if let Some(btn) = dom::query("[data-game-score-refresh]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      refresh();
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  for input in dom::query_all("[data-game-score-filter-start], [data-game-score-filter-end], [data-game-score-profile-only]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      refresh();
    });
    let _ = input.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-game-score-clear]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        let _ = storage::clear_game_scores().await;
        refresh();
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-game-score-export]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        let force = file_access::prefers_save_for("game-scores");
        export_json(force).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-game-score-export-files]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        export_json(true).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-game-score-export-selected]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        export_selected_json().await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-game-score-export-csv]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        let force = file_access::prefers_save_for("game-scores");
        export_csv(force).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-game-score-export-csv-files]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        export_csv(true).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-game-score-export-selected-csv]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        export_selected_csv().await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-game-score-select-all]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        let scores = storage::get_game_scores().await.unwrap_or_default();
        let filtered = match filter_scores(&scores) {
          Ok(values) => values,
          Err(message) => {
            dom::set_text("[data-game-score-status]", message);
            return;
          }
        };
        let ids: HashSet<String> = filtered
          .iter()
          .filter_map(|score| js_sys::Reflect::get(score, &"id".into()).ok().and_then(|v| v.as_string()))
          .collect();
        SELECTED.with(|set| {
          set.borrow_mut().clear();
          set.borrow_mut().extend(ids);
        });
        render(&scores);
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-game-score-clear-selection]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      SELECTED.with(|set| set.borrow_mut().clear());
      refresh();
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

fn init_section_toggle() {
  if let Some(toggle) = dom::query("[data-save-files-section=\"game-scores\"]") {
    if let Ok(input) = toggle.dyn_into::<web_sys::HtmlInputElement>() {
      input.set_checked(file_access::prefers_save_for("game-scores"));
      let input_clone = input.clone();
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        file_access::set_prefers_save_for("game-scores", input_clone.checked());
      });
      let _ = input.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref());
      cb.forget();
    }
  }
}

pub fn refresh() {
  spawn_local(async move {
    let scores = storage::get_game_scores().await.unwrap_or_default();
    render(&scores);
    crate::game_map::refresh();
  });
}

fn render(scores: &[JsValue]) {
  let list = match dom::query("[data-game-score-list]") {
    Some(el) => el,
    None => return,
  };
  list.set_inner_html("");
  let filtered = match filter_scores(scores) {
    Ok(values) => values,
    Err(message) => {
      list.set_inner_html(&format!("<li class=\"empty\">{}</li>", message));
      dom::set_text("[data-game-score-count]", &format!("0 of {}", scores.len()));
      dom::set_text("[data-game-score-status]", message);
      update_filter_badge(Some(message.into()));
      return;
    }
  };
  if filtered.is_empty() {
    let message = if scores.is_empty() { "No game scores yet." } else { "No game scores in range." };
    list.set_inner_html(&format!("<li class=\"empty\">{}</li>", message));
    dom::set_text("[data-game-score-count]", &format!("0 of {}", scores.len()));
    dom::set_text("[data-game-score-status]", "No matches in selected range.");
    update_filter_badge(None);
    return;
  }

  if scores.len() == filtered.len() {
    dom::set_text("[data-game-score-count]", &format!("{} scores", filtered.len()));
  } else {
    dom::set_text("[data-game-score-count]", &format!("{} of {} scores", filtered.len(), scores.len()));
  }
  update_filter_badge(active_filter_label());
  let mut sorted: Vec<&JsValue> = filtered.iter().collect();
  sorted.sort_by(|a, b| {
    let a_ts = js_sys::Reflect::get(a, &"ended_at".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
    let b_ts = js_sys::Reflect::get(b, &"ended_at".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
    b_ts.partial_cmp(&a_ts).unwrap_or(std::cmp::Ordering::Equal)
  });
  let max = sorted.len().min(12);
  for score in sorted.into_iter().take(max) {
    let ended = js_sys::Reflect::get(score, &"ended_at".into())
      .ok()
      .and_then(|v| v.as_f64())
      .unwrap_or(0.0);
    let game_type = js_sys::Reflect::get(score, &"game_type".into())
      .ok()
      .and_then(|v| v.as_string())
      .unwrap_or_else(|| "unknown".into());
    let score_val = js_sys::Reflect::get(score, &"score".into())
      .ok()
      .and_then(|v| v.as_f64())
      .unwrap_or(0.0);
    let streak = js_sys::Reflect::get(score, &"streak".into())
      .ok()
      .and_then(|v| v.as_f64())
      .unwrap_or(0.0);
    let profile = js_sys::Reflect::get(score, &"profile_id".into())
      .ok()
      .and_then(|v| v.as_string())
      .unwrap_or_else(|| "default".into());
    let li = dom::document().create_element("li").unwrap();
    li.set_class_name("resource-list");
    let label = dom::document().create_element("span").unwrap();
    label.set_text_content(Some(&format!(
      "{} • {} • score {} • streak {} • {}",
      ended as i64,
      game_type,
      score_val as i32,
      streak as i32,
      profile,
    )));
    let checkbox = dom::document().create_element("input").unwrap();
    let _ = checkbox.set_attribute("type", "checkbox");
    checkbox.set_class_name("selection-toggle");
    if let Ok(input) = checkbox.clone().dyn_into::<HtmlInputElement>() {
      let score_id = js_sys::Reflect::get(score, &"id".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
      let checked = SELECTED.with(|set| set.borrow().contains(&score_id));
      input.set_checked(checked);
      let input_clone = input.clone();
      let score_id_clone = score_id.clone();
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        let checked = input_clone.checked();
        SELECTED.with(|set| {
          if checked {
            set.borrow_mut().insert(score_id_clone.clone());
          } else {
            set.borrow_mut().remove(&score_id_clone);
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
  let scores = storage::get_game_scores().await.unwrap_or_default();
  let filtered = match filter_scores(&scores) {
    Ok(values) => values,
    Err(message) => {
      dom::set_text("[data-game-score-status]", message);
      return;
    }
  };
  let rows = scores_to_rows(&filtered);
  if rows.is_empty() {
    dom::set_text("[data-game-score-status]", "No game scores in selected range.");
    return;
  }
  let exported_at: String = js_sys::Date::new_0().to_string().into();
  let envelope = serde_json::json!({
    "schemaVersion": 1,
    "exportedAt": exported_at,
    "gameScores": rows,
  });
  if let Ok(json) = serde_json::to_string_pretty(&envelope) {
    let _ = if force {
      file_access::save_or_download_force("emerson-game-scores.json", "application/json", json.as_bytes()).await
    } else {
      file_access::save_or_download("emerson-game-scores.json", "application/json", json.as_bytes()).await
    };
    dom::set_text(
      "[data-game-score-status]",
      if force { "Saved JSON to Files." } else { "Downloaded JSON export." },
    );
  }
}

async fn export_csv(force: bool) {
  let scores = storage::get_game_scores().await.unwrap_or_default();
  let filtered = match filter_scores(&scores) {
    Ok(values) => values,
    Err(message) => {
      dom::set_text("[data-game-score-status]", message);
      return;
    }
  };
  let rows = scores_to_rows(&filtered);
  if rows.is_empty() {
    dom::set_text("[data-game-score-status]", "No game scores in selected range.");
    return;
  }
  let meta = csv_meta(rows.len(), active_filter_label().as_deref());
  let mut output = format!("{}\n", meta);
  output.push_str("id,game_type,score,streak,bpm,duration_ms,ended_at,profile_id,difficulty\n");
  for row in rows {
    output.push_str(&format!(
      "{},{},{},{},{},{},{},{},{}\n",
      row.id,
      row.game_type,
      row.score,
      row.streak,
      row.bpm,
      row.duration_ms,
      row.ended_at,
      row.profile_id,
      row.difficulty
    ));
  }
  let _ = if force {
    file_access::save_or_download_force("emerson-game-scores.csv", "text/csv", output.as_bytes()).await
  } else {
    file_access::save_or_download("emerson-game-scores.csv", "text/csv", output.as_bytes()).await
  };
  dom::set_text(
    "[data-game-score-status]",
    if force { "Saved CSV to Files." } else { "Downloaded CSV export." },
  );
}

async fn export_selected_json() {
  let scores = storage::get_game_scores().await.unwrap_or_default();
  let filtered = match filter_scores(&scores) {
    Ok(values) => values,
    Err(message) => {
      dom::set_text("[data-game-score-status]", message);
      return;
    }
  };
  let selected = SELECTED.with(|set| set.borrow().clone());
  let rows: Vec<GameScoreRow> = filtered
    .iter()
    .filter(|score| {
      js_sys::Reflect::get(score, &"id".into()).ok().and_then(|v| v.as_string()).map(|id| selected.contains(&id)).unwrap_or(false)
    })
    .filter_map(|score| {
      Some(GameScoreRow {
        id: js_sys::Reflect::get(score, &"id".into()).ok()?.as_string().unwrap_or_default(),
        game_type: js_sys::Reflect::get(score, &"game_type".into())
          .ok()
          .and_then(|v| v.as_string())
          .unwrap_or_else(|| "unknown".into()),
        score: js_sys::Reflect::get(score, &"score".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0) as i32,
        streak: js_sys::Reflect::get(score, &"streak".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0) as i32,
        bpm: js_sys::Reflect::get(score, &"bpm".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0),
        duration_ms: js_sys::Reflect::get(score, &"duration_ms".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0),
        ended_at: js_sys::Reflect::get(score, &"ended_at".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0),
        profile_id: js_sys::Reflect::get(score, &"profile_id".into())
          .ok()
          .and_then(|v| v.as_string())
          .unwrap_or_else(|| "default".into()),
        difficulty: js_sys::Reflect::get(score, &"difficulty".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0),
      })
    })
    .collect();
  if rows.is_empty() {
    dom::set_text("[data-game-score-status]", "No scores selected.");
    return;
  }
  let exported_at: String = js_sys::Date::new_0().to_string().into();
  let envelope = serde_json::json!({
    "schemaVersion": 1,
    "exportedAt": exported_at,
    "gameScores": rows,
  });
  if let Ok(json) = serde_json::to_string_pretty(&envelope) {
    let force = file_access::prefers_save_for("game-scores");
    let _ = if force {
      file_access::save_or_download_force("emerson-game-scores-selected.json", "application/json", json.as_bytes()).await
    } else {
      file_access::save_or_download("emerson-game-scores-selected.json", "application/json", json.as_bytes()).await
    };
    dom::set_text(
      "[data-game-score-status]",
      if force { "Saved selected JSON to Files." } else { "Downloaded selected JSON." },
    );
  }
}

async fn export_selected_csv() {
  let scores = storage::get_game_scores().await.unwrap_or_default();
  let filtered = match filter_scores(&scores) {
    Ok(values) => values,
    Err(message) => {
      dom::set_text("[data-game-score-status]", message);
      return;
    }
  };
  let selected = SELECTED.with(|set| set.borrow().clone());
  let mut output = String::new();
  let mut count = 0;
  for score in filtered.iter() {
    let score_id = js_sys::Reflect::get(score, &"id".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
    if !selected.contains(&score_id) {
      continue;
    }
    let row = GameScoreRow {
      id: js_sys::Reflect::get(score, &"id".into()).ok().and_then(|v| v.as_string()).unwrap_or_default(),
      game_type: js_sys::Reflect::get(score, &"game_type".into())
        .ok()
        .and_then(|v| v.as_string())
        .unwrap_or_else(|| "unknown".into()),
      score: js_sys::Reflect::get(score, &"score".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0) as i32,
      streak: js_sys::Reflect::get(score, &"streak".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0) as i32,
      bpm: js_sys::Reflect::get(score, &"bpm".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0),
      duration_ms: js_sys::Reflect::get(score, &"duration_ms".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0),
      ended_at: js_sys::Reflect::get(score, &"ended_at".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0),
      profile_id: js_sys::Reflect::get(score, &"profile_id".into())
        .ok()
        .and_then(|v| v.as_string())
        .unwrap_or_else(|| "default".into()),
      difficulty: js_sys::Reflect::get(score, &"difficulty".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0),
    };
    output.push_str(&format!(
      "{},{},{},{},{},{},{},{},{}\n",
      row.id,
      row.game_type,
      row.score,
      row.streak,
      row.bpm,
      row.duration_ms,
      row.ended_at,
      row.profile_id,
      row.difficulty
    ));
    count += 1;
  }
  if count == 0 {
    dom::set_text("[data-game-score-status]", "No scores selected.");
    return;
  }
  let mut with_meta = format!("{}\n", csv_meta(count, active_filter_label().as_deref()));
  with_meta.push_str("id,game_type,score,streak,bpm,duration_ms,ended_at,profile_id,difficulty\n");
  with_meta.push_str(&output);
  let force = file_access::prefers_save_for("game-scores");
  let _ = if force {
    file_access::save_or_download_force("emerson-game-scores-selected.csv", "text/csv", with_meta.as_bytes()).await
  } else {
    file_access::save_or_download("emerson-game-scores-selected.csv", "text/csv", with_meta.as_bytes()).await
  };
  dom::set_text(
    "[data-game-score-status]",
    if force { "Saved selected CSV to Files." } else { "Downloaded selected CSV." },
  );
}

fn scores_to_rows(scores: &[JsValue]) -> Vec<GameScoreRow> {
  scores
    .iter()
    .filter_map(|score| {
      Some(GameScoreRow {
        id: js_sys::Reflect::get(score, &"id".into()).ok()?.as_string().unwrap_or_default(),
        game_type: js_sys::Reflect::get(score, &"game_type".into())
          .ok()
          .and_then(|v| v.as_string())
          .unwrap_or_else(|| "unknown".into()),
        score: js_sys::Reflect::get(score, &"score".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0) as i32,
        streak: js_sys::Reflect::get(score, &"streak".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0) as i32,
        bpm: js_sys::Reflect::get(score, &"bpm".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0),
        duration_ms: js_sys::Reflect::get(score, &"duration_ms".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0),
        ended_at: js_sys::Reflect::get(score, &"ended_at".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0),
        profile_id: js_sys::Reflect::get(score, &"profile_id".into())
          .ok()
          .and_then(|v| v.as_string())
          .unwrap_or_else(|| "default".into()),
        difficulty: js_sys::Reflect::get(score, &"difficulty".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0),
      })
    })
    .collect()
}

fn csv_meta(count: usize, filter: Option<&str>) -> String {
  let exported_at: String = js_sys::Date::new_0().to_string().into();
  let filter_text = filter.unwrap_or("all");
  format!("# exportedAt={}, count={}, filter={}", exported_at, count, filter_text)
}

fn active_filter_label() -> Option<String> {
  let start_value = dom::query("[data-game-score-filter-start]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .map(|input| input.value())
    .unwrap_or_default();
  let end_value = dom::query("[data-game-score-filter-end]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .map(|input| input.value())
    .unwrap_or_default();
  let profile_only = dom::query("[data-game-score-profile-only]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .map(|input| input.checked())
    .unwrap_or(false);
  let mut parts = Vec::new();
  if !(start_value.is_empty() && end_value.is_empty()) {
    let start_label = if start_value.is_empty() { "start".into() } else { start_value };
    let end_label = if end_value.is_empty() { "now".into() } else { end_value };
    parts.push(format!("{} to {}", start_label, end_label));
  }
  if profile_only {
    parts.push(format!("profile {}", storage::get_active_profile_name()));
  }
  if parts.is_empty() {
    None
  } else {
    Some(parts.join(" • "))
  }
}

fn update_filter_badge(label: Option<String>) {
  if let Some(badge) = dom::query("[data-game-score-filter-badge]") {
    let text = label.unwrap_or_else(|| "All scores".into());
    dom::set_text_el(&badge, &text);
  }
}

fn filter_scores(scores: &[JsValue]) -> Result<Vec<JsValue>, &'static str> {
  let range = match date_range_ms() {
    Ok(value) => value,
    Err(message) => return Err(message),
  };
  let profile_only = dom::query("[data-game-score-profile-only]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .map(|input| input.checked())
    .unwrap_or(false);
  let active_profile = if profile_only {
    Some(storage::get_active_profile_id())
  } else {
    None
  };

  Ok(scores
    .iter()
    .filter(|score| {
      let ended = js_sys::Reflect::get(score, &"ended_at".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
      if let Some((start, end)) = range {
        if ended < start || ended > end {
          return false;
        }
      }
      if let Some(active) = active_profile.as_ref() {
        let profile = js_sys::Reflect::get(score, &"profile_id".into())
          .ok()
          .and_then(|v| v.as_string())
          .unwrap_or_else(|| "default".into());
        if &profile != active {
          return false;
        }
      }
      true
    })
    .cloned()
    .collect())
}

fn date_range_ms() -> Result<Option<(f64, f64)>, &'static str> {
  let start_value = dom::query("[data-game-score-filter-start]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .map(|input| input.value())
    .unwrap_or_default();
  let end_value = dom::query("[data-game-score-filter-end]")
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
