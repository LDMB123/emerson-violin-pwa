use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::JsCast;
use web_sys::{AudioContext, Event};

use crate::dom;
use crate::ml;
use crate::state::AppState;

fn play_click(audio_ctx: &AudioContext, accent: bool) {
  let osc = audio_ctx.create_oscillator().unwrap();
  let gain = audio_ctx.create_gain().unwrap();
  osc.frequency().set_value(if accent { 1100.0 } else { 750.0 });
  gain.gain().set_value_at_time(0.0001, audio_ctx.current_time()).ok();
  gain.gain().exponential_ramp_to_value_at_time(0.8, audio_ctx.current_time() + 0.01).ok();
  gain.gain().exponential_ramp_to_value_at_time(0.0001, audio_ctx.current_time() + 0.08).ok();
  osc.connect_with_audio_node(&gain).ok();
  gain.connect_with_audio_node(&audio_ctx.destination()).ok();
  osc.start().ok();
  osc.stop_with_when(audio_ctx.current_time() + 0.1).ok();
}

fn update_bpm_display(bpm: f64) {
  dom::set_text("[data-metronome-bpm]", &format!("{}", bpm.round()));
}

pub fn init(state: Rc<RefCell<AppState>>) {
  let bpm_range = dom::query("[data-metronome-range]");
  if let Some(range) = bpm_range {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
      if let Some(input) = event.target().and_then(|t| t.dyn_into::<web_sys::HtmlInputElement>().ok()) {
        let bpm = input.value_as_number();
        state_clone.borrow_mut().metronome.bpm = bpm;
        update_bpm_display(bpm);
        if state_clone.borrow().metronome.active {
          stop(&state_clone);
          start(&state_clone);
        }
      }
    });
    let _ = range.add_event_listener_with_callback("input", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(toggle) = dom::query("[data-metronome-toggle]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event: Event| {
      if state_clone.borrow().metronome.active {
        stop(&state_clone);
      } else {
        start(&state_clone);
      }
    });
    let _ = toggle.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(tap) = dom::query("[data-metronome-tap]") {
    let state_clone = state.clone();
    let taps: Vec<f64> = Vec::new();
    let taps_rc = Rc::new(RefCell::new(taps));
    let taps_shared = taps_rc.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event: Event| {
      let now = js_sys::Date::now();
      let mut taps = taps_shared.borrow_mut();
      taps.push(now);
      if taps.len() > 6 { taps.remove(0); }
      if taps.len() >= 4 {
        let mut intervals = Vec::new();
        for i in 1..taps.len() {
          intervals.push(taps[i] - taps[i - 1]);
        }
        let avg = intervals.iter().sum::<f64>() / intervals.len() as f64;
        let bpm = (60000.0 / avg).clamp(60.0, 140.0).round();
        state_clone.borrow_mut().metronome.bpm = bpm;
        update_bpm_display(bpm);
        dom::set_text("[data-metronome-status]", &format!("Tap tempo set: {} BPM", bpm));
        let variance = intervals.iter().map(|v| (v - avg).abs()).sum::<f64>() / intervals.len() as f64;
        ml::push_rhythm(&mut state_clone.borrow_mut().ml, variance / 10.0);
        ml::render(&state_clone.borrow().ml);
      } else {
        dom::set_text("[data-metronome-status]", "Keep tapping...");
      }
    });
    let _ = tap.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  update_bpm_display(state.borrow().metronome.bpm.max(60.0));
  set_toggle_label(false);
}

pub fn start(state: &Rc<RefCell<AppState>>) {
  let mut app = state.borrow_mut();
  if app.metronome.active {
    return;
  }
  app.metronome.active = true;
  app.metronome.beat = 0;
  let bpm = if app.metronome.bpm <= 0.0 { 90.0 } else { app.metronome.bpm };
  let interval = (60.0 / bpm) * 1000.0;
  let _audio_ctx = app.metronome.audio_ctx.get_or_insert_with(|| AudioContext::new().unwrap());

  let state_clone = state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut()>::new(move || {
    let mut app = state_clone.borrow_mut();
    app.metronome.beat += 1;
    let accent = app.metronome.accent.max(1);
    let play_accent = app.metronome.beat % accent == 1;
    if let Some(ctx) = &app.metronome.audio_ctx {
      play_click(ctx, play_accent);
    }
  });
  let id = dom::window()
    .set_interval_with_callback_and_timeout_and_arguments_0(cb.as_ref().unchecked_ref(), interval as i32)
    .unwrap_or(0);
  app.metronome.interval_id = Some(id);
  dom::set_text("[data-metronome-status]", "Running");
  set_toggle_label(true);
  cb.forget();
}

pub fn stop(state: &Rc<RefCell<AppState>>) {
  let mut app = state.borrow_mut();
  if !app.metronome.active {
    return;
  }
  app.metronome.active = false;
  if let Some(id) = app.metronome.interval_id.take() {
    let _ = dom::window().clear_interval_with_handle(id);
  }
  dom::set_text("[data-metronome-status]", "Stopped");
  set_toggle_label(false);
}

fn set_toggle_label(active: bool) {
  let label = if active { "Stop metronome" } else { "Start metronome" };
  for button in dom::query_all("[data-metronome-toggle]") {
    dom::set_text_el(&button, label);
  }
}
