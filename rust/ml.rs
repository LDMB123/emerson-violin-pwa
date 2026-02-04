use js_sys::Reflect;
use serde::{Deserialize, Serialize};
use wasm_bindgen::JsValue;

use crate::dom;
use crate::storage;

const ML_KEY: &str = "ml-state";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MlState {
  pub pitch: Vec<f64>,
  pub rhythm: Vec<f64>,
  pub focus: Vec<f64>,
}

pub fn load_state() -> MlState {
  storage::local_get(ML_KEY)
    .and_then(|raw| serde_json::from_str(&raw).ok())
    .unwrap_or_default()
}

pub fn save_state(state: &MlState) {
  if let Ok(raw) = serde_json::to_string(state) {
    storage::local_set(ML_KEY, &raw);
  }
}

fn avg(values: &[f64]) -> Option<f64> {
  if values.is_empty() { return None; }
  Some(values.iter().sum::<f64>() / values.len() as f64)
}

fn score_from(values: &[f64], max: f64) -> Option<i32> {
  avg(values).map(|mean| {
    let score = 100.0 - (mean / max) * 100.0;
    score.clamp(0.0, 100.0).round() as i32
  })
}

pub fn push_pitch(state: &mut MlState, cents: f64) {
  state.pitch.push(cents.abs());
  state.pitch = state.pitch.iter().rev().take(120).cloned().collect::<Vec<_>>();
  state.pitch.reverse();
  save_state(state);
}

pub fn push_rhythm(state: &mut MlState, variance: f64) {
  state.rhythm.push(variance.abs());
  state.rhythm = state.rhythm.iter().rev().take(60).cloned().collect::<Vec<_>>();
  state.rhythm.reverse();
  save_state(state);
}

pub fn push_focus(state: &mut MlState, value: f64) {
  state.focus.push(value);
  state.focus = state.focus.iter().rev().take(40).cloned().collect::<Vec<_>>();
  state.focus.reverse();
  save_state(state);
}

pub fn render(state: &MlState) {
  let pitch_score = score_from(&state.pitch, 40.0);
  let rhythm_score = score_from(&state.rhythm, 40.0);
  let focus_score = avg(&state.focus).map(|v| v.round() as i32);

  if let Some(score) = pitch_score {
    dom::set_text("[data-ml-pitch]", &format!("{}%", score));
    dom::set_text("[data-insight-pitch]", &format!("{}%", score));
  }
  if let Some(score) = rhythm_score {
    dom::set_text("[data-ml-rhythm]", &format!("{}%", score));
    dom::set_text("[data-insight-rhythm]", &format!("{}%", score));
  }
  if let Some(score) = focus_score {
    dom::set_text("[data-ml-focus]", &format!("{}%", score));
    dom::set_text("[data-insight-focus-score]", &format!("{}%", score));
  }

  let status = if pitch_score.is_some() || rhythm_score.is_some() || focus_score.is_some() {
    "ML: active"
  } else {
    "ML: standing by"
  };
  dom::set_text("[data-ml-status]", status);

  let focus_label = if let Some(score) = focus_score {
    if score > 80 { "Focus: Strong" } else if score > 60 { "Focus: Steady" } else { "Focus: Build" }
  } else {
    "Focus: Balance"
  };
  dom::set_text("[data-insight-focus]", focus_label);
  dom::set_text("[data-ml-focus-label]", focus_label);

  let recommendation = if let Some(score) = pitch_score {
    if score < 65 { "Slow bow + open strings for steady pitch." }
    else { "Pitch is stable. Keep bow pressure even." }
  } else {
    "Start the tuner and metronome to unlock coaching." 
  };
  dom::set_text("[data-ml-recommendation]", recommendation);
  dom::set_text("[data-insight-message]", recommendation);

  let plan_focus = if pitch_score.unwrap_or(100) < 70 {
    "Intonation"
  } else if rhythm_score.unwrap_or(100) < 70 {
    "Rhythm"
  } else {
    "Consistency"
  };
  dom::set_text("[data-plan-focus]", plan_focus);

  if let Some(score) = pitch_score {
    let target = if score < 70 { "±10 cents" } else { "±5 cents" };
    dom::set_text("[data-ml-target-pitch]", target);
  }
  if let Some(score) = rhythm_score {
    let target = if score < 70 { "±25 ms" } else { "±15 ms" };
    dom::set_text("[data-ml-target-rhythm]", target);
  }

  dom::set_text("[data-wasm-status]", "WASM ready");
}

pub fn note_focus_from_duration(minutes: f64) -> f64 {
  let score = (minutes * 8.0).clamp(50.0, 100.0);
  score
}


pub fn ensure_accel_labels() {
  dom::set_text("[data-ml-backend]", "Heuristic coach");
  dom::set_text("[data-ml-latency]", "Local inference");
  dom::set_text("[data-ml-samples]", "Samples stored on device");
  dom::set_text("[data-ml-target-pitch]", "±10 cents");
  dom::set_text("[data-ml-target-rhythm]", "±25 ms");

  dom::set_text("[data-ml-recommendation-title]", "Next focus");

  let navigator = dom::window().navigator();
  let backend = if Reflect::has(&navigator, &JsValue::from_str("gpu")).unwrap_or(false) {
    "WebGPU ready"
  } else {
    "CPU only"
  };
  dom::set_text("[data-ml-backend]", backend);
}

pub fn reset(state: &mut MlState) {
  *state = MlState::default();
  save_state(state);
  render(state);
}

pub fn set_model_list(count: usize) {
  dom::set_text("[data-model-count]", &format!("{} models", count));
  if let Some(list) = dom::query("[data-model-list]") {
    list.set_inner_html("<li class=\"empty\">No model manifest loaded.</li>");
  }
}
