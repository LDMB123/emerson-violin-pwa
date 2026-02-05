use js_sys::Reflect;
use serde::{Deserialize, Serialize};
use wasm_bindgen::JsValue;

use crate::dom;
use crate::ml_api;
use crate::storage;

const ML_KEY: &str = "ml-state";
const ML_THRESHOLDS_KEY: &str = "ml-thresholds";
const COACH_LAST_KEY: &str = "coach:last";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MlState {
  pub pitch: Vec<f64>,
  pub rhythm: Vec<f64>,
  pub focus: Vec<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Thresholds {
  pub pitch_max: f64,
  pub rhythm_max: f64,
  pub focus_min: f64,
}

impl Default for Thresholds {
  fn default() -> Self {
    Self {
      pitch_max: 40.0,
      rhythm_max: 40.0,
      focus_min: 70.0,
    }
  }
}

pub fn load_thresholds() -> Thresholds {
  let key = thresholds_key();
  storage::local_get(&key)
    .and_then(|raw| serde_json::from_str(&raw).ok())
    .unwrap_or_default()
}

pub fn save_thresholds(thresholds: &Thresholds) {
  if let Ok(raw) = serde_json::to_string(thresholds) {
    let key = thresholds_key();
    storage::local_set(&key, &raw);
  }
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

fn thresholds_key() -> String {
  let profile = storage::get_active_profile_id();
  if profile == "default" {
    ML_THRESHOLDS_KEY.to_string()
  } else {
    format!("{}:{}", ML_THRESHOLDS_KEY, profile)
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
  let thresholds = load_thresholds();
  let pitch_score = score_from(&state.pitch, thresholds.pitch_max);
  let rhythm_score = score_from(&state.rhythm, thresholds.rhythm_max);
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
    if score > thresholds.focus_min as i32 { "Focus: Strong" } else if score > 60 { "Focus: Steady" } else { "Focus: Build" }
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
  let coach_tip = coach_tip(state, &thresholds, pitch_score, rhythm_score, focus_score, recommendation);
  dom::set_text("[data-ml-recommendation]", &coach_tip);
  dom::set_text("[data-insight-message]", &coach_tip);

  let plan_focus = if pitch_score.unwrap_or(100) < 70 {
    "Intonation"
  } else if rhythm_score.unwrap_or(100) < 70 {
    "Rhythm"
  } else {
    "Consistency"
  };
  dom::set_text("[data-plan-focus]", plan_focus);

  let mut pitch_target = "";
  if let Some(score) = pitch_score {
    let target = if score < 70 { "±10 cents" } else { "±5 cents" };
    dom::set_text("[data-ml-target-pitch]", target);
    pitch_target = target;
  }
  let mut rhythm_target = "";
  if let Some(score) = rhythm_score {
    let target = if score < 70 { "±25 ms" } else { "±15 ms" };
    dom::set_text("[data-ml-target-rhythm]", target);
    rhythm_target = target;
  }

  dom::set_text("[data-wasm-status]", "WASM ready");
  emit_update(
    pitch_score,
    rhythm_score,
    focus_score,
    focus_label,
    &coach_tip,
    plan_focus,
    pitch_target,
    rhythm_target,
    status,
  );
}

fn emit_update(
  pitch_score: Option<i32>,
  rhythm_score: Option<i32>,
  focus_score: Option<i32>,
  focus_label: &str,
  recommendation: &str,
  plan_focus: &str,
  pitch_target: &str,
  rhythm_target: &str,
  status: &str,
) {
  let payload = js_sys::Object::new();
  let _ = js_sys::Reflect::set(&payload, &"pitch_score".into(), &JsValue::from_f64(pitch_score.unwrap_or(0) as f64));
  let _ = js_sys::Reflect::set(&payload, &"rhythm_score".into(), &JsValue::from_f64(rhythm_score.unwrap_or(0) as f64));
  let _ = js_sys::Reflect::set(&payload, &"focus_score".into(), &JsValue::from_f64(focus_score.unwrap_or(0) as f64));
  let _ = js_sys::Reflect::set(&payload, &"focus_label".into(), &JsValue::from_str(focus_label));
  let _ = js_sys::Reflect::set(&payload, &"recommendation".into(), &JsValue::from_str(recommendation));
  let _ = js_sys::Reflect::set(&payload, &"plan_focus".into(), &JsValue::from_str(plan_focus));
  let _ = js_sys::Reflect::set(&payload, &"pitch_target".into(), &JsValue::from_str(pitch_target));
  let _ = js_sys::Reflect::set(&payload, &"rhythm_target".into(), &JsValue::from_str(rhythm_target));
  let _ = js_sys::Reflect::set(&payload, &"status".into(), &JsValue::from_str(status));
  ml_api::emit_event("ml_update", &payload.into());
}

fn coach_tip(
  state: &MlState,
  thresholds: &Thresholds,
  pitch_score: Option<i32>,
  rhythm_score: Option<i32>,
  focus_score: Option<i32>,
  fallback: &str,
) -> String {
  if state.pitch.is_empty() && state.rhythm.is_empty() && state.focus.is_empty() {
    return fallback.to_string();
  }
  let key = coach_last_key();
  let now = js_sys::Date::now();
  let last = storage::local_get(&key).and_then(|val| val.parse::<f64>().ok()).unwrap_or(0.0);
  if now - last < 12_000.0 {
    return fallback.to_string();
  }

  storage::local_set(&key, &format!("{}", now));

  if let Some(score) = pitch_score {
    if score < 60 {
      return "Coach: reset the left hand, then play slow open strings.".into();
    }
  }
  if let Some(score) = rhythm_score {
    if score < 60 {
      return "Coach: count out loud and tap the bow change before each beat.".into();
    }
  }
  if let Some(score) = focus_score {
    if score < thresholds.focus_min as i32 {
      return "Coach: soften your shoulders and breathe through each phrase.".into();
    }
  }
  "Coach: keep the bow straight and relax the right hand.".into()
}

fn coach_last_key() -> String {
  let profile = storage::get_active_profile_id();
  if profile == "default" {
    COACH_LAST_KEY.to_string()
  } else {
    format!("{}:{}", COACH_LAST_KEY, profile)
  }
}

pub fn note_focus_from_duration(minutes: f64) -> f64 {
  let score = (minutes * 8.0).clamp(50.0, 100.0);
  score
}


pub fn ensure_accel_labels() {
  dom::set_text("[data-ml-backend]", "Heuristic coach");
  dom::set_text("[data-ml-latency]", "Local inference");
  dom::set_text("[data-ml-samples]", "0");
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
