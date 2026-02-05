use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::JsCast;
use web_sys::Event;

use crate::dom;
use crate::ml;
use crate::state::AppState;

const CALIBRATION_MS: i32 = 15_000;

struct CalibrationState {
  active: bool,
  start_pitch: usize,
  start_rhythm: usize,
  start_focus: usize,
  interval_id: Option<i32>,
  timeout_id: Option<i32>,
  started_at: f64,
}

impl Default for CalibrationState {
  fn default() -> Self {
    Self {
      active: false,
      start_pitch: 0,
      start_rhythm: 0,
      start_focus: 0,
      interval_id: None,
      timeout_id: None,
      started_at: 0.0,
    }
  }
}

pub fn init(state: Rc<RefCell<AppState>>) {
  if dom::query("[data-ml-calibrate-start]").is_none() {
    return;
  }
  let calib_state = Rc::new(RefCell::new(CalibrationState::default()));

  if let Some(btn) = dom::query("[data-ml-calibrate-start]") {
    let state_clone = state.clone();
    let calib_clone = calib_state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      start_calibration(&state_clone, &calib_clone);
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

fn start_calibration(state: &Rc<RefCell<AppState>>, calib: &Rc<RefCell<CalibrationState>>) {
  if calib.borrow().active {
    return;
  }
  let app = state.borrow();
  let mut calib_state = calib.borrow_mut();
  calib_state.active = true;
  calib_state.start_pitch = app.ml.pitch.len();
  calib_state.start_rhythm = app.ml.rhythm.len();
  calib_state.start_focus = app.ml.focus.len();
  calib_state.started_at = js_sys::Date::now();
  dom::set_text("[data-ml-calibrate-status]", "Calibrating...");

  let calib_clone = calib.clone();
  let state_clone = state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut()>::new(move || {
    update_progress(&state_clone, &calib_clone);
  });
  let id = dom::window().set_interval_with_callback_and_timeout_and_arguments_0(cb.as_ref().unchecked_ref(), 500).unwrap_or(0);
  calib_state.interval_id = Some(id);
  cb.forget();

  let calib_clone = calib.clone();
  let state_clone = state.clone();
  let done_cb = wasm_bindgen::closure::Closure::<dyn FnMut()>::new(move || {
    finish_calibration(&state_clone, &calib_clone);
  });
  let timeout = dom::window().set_timeout_with_callback_and_timeout_and_arguments_0(done_cb.as_ref().unchecked_ref(), CALIBRATION_MS).unwrap_or(0);
  calib_state.timeout_id = Some(timeout);
  done_cb.forget();
}

fn update_progress(_state: &Rc<RefCell<AppState>>, calib: &Rc<RefCell<CalibrationState>>) {
  let calib_state = calib.borrow();
  let elapsed = (js_sys::Date::now() - calib_state.started_at).max(0.0);
  let percent = (elapsed / CALIBRATION_MS as f64 * 100.0).clamp(0.0, 100.0);
  if let Some(fill) = dom::query("[data-ml-calibrate-progress]") {
    dom::set_style(&fill, "width", &format!("{:.0}%", percent));
  }
}

fn finish_calibration(state: &Rc<RefCell<AppState>>, calib: &Rc<RefCell<CalibrationState>>) {
  let mut calib_state = calib.borrow_mut();
  if !calib_state.active {
    return;
  }
  calib_state.active = false;
  if let Some(id) = calib_state.interval_id.take() {
    let _ = dom::window().clear_interval_with_handle(id);
  }
  if let Some(id) = calib_state.timeout_id.take() {
    let _ = dom::window().clear_timeout_with_handle(id);
  }

  let app = state.borrow();
  let pitch_samples = &app.ml.pitch[calib_state.start_pitch..];
  let rhythm_samples = &app.ml.rhythm[calib_state.start_rhythm..];
  let focus_samples = &app.ml.focus[calib_state.start_focus..];

  let pitch_mean = mean(pitch_samples).unwrap_or(30.0);
  let rhythm_mean = mean(rhythm_samples).unwrap_or(30.0);
  let focus_mean = mean(focus_samples).unwrap_or(70.0);

  let mut thresholds = ml::load_thresholds();
  thresholds.pitch_max = (pitch_mean * 1.4).clamp(10.0, 80.0);
  thresholds.rhythm_max = (rhythm_mean * 1.4).clamp(10.0, 80.0);
  thresholds.focus_min = focus_mean.clamp(50.0, 95.0);
  ml::save_thresholds(&thresholds);
  ml::render(&app.ml);
  dom::set_text("[data-ml-calibrate-status]", "Calibration saved");
  if let Some(fill) = dom::query("[data-ml-calibrate-progress]") {
    dom::set_style(&fill, "width", "100%");
  }
}

fn mean(values: &[f64]) -> Option<f64> {
  if values.is_empty() {
    return None;
  }
  Some(values.iter().sum::<f64>() / values.len() as f64)
}
