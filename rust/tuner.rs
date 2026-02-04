use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use web_sys::{AudioContext, Event, MediaStream, MediaStreamTrack};

use crate::dom;
use crate::ml;
use crate::state::AppState;

fn note_from_pitch(freq: f64) -> (String, i32, i32) {
  let note_num = 12.0 * (freq / 440.0).log2() + 69.0;
  let rounded = note_num.round() as i32;
  let notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  let idx = (rounded % 12 + 12) % 12;
  let octave = (rounded + 3) / 12 - 1;
  (notes[idx as usize].to_string(), octave, rounded)
}

fn frequency_from_note(note_num: i32) -> f64 {
  440.0 * 2.0_f64.powf((note_num as f64 - 69.0) / 12.0)
}

fn auto_correlate(buffer: &[f32], sample_rate: f64) -> Option<f64> {
  let size = buffer.len();
  let mut rms = 0.0;
  for val in buffer {
    rms += (*val as f64) * (*val as f64);
  }
  rms = (rms / size as f64).sqrt();
  if rms < 0.01 { return None; }

  let mut r1 = 0;
  let mut r2 = size - 1;
  let threshold = 0.2;
  while r1 < size / 2 && buffer[r1].abs() < threshold {
    r1 += 1;
  }
  while r2 > size / 2 && buffer[r2].abs() < threshold {
    r2 -= 1;
  }

  let trimmed = &buffer[r1..r2];
  let trimmed_size = trimmed.len();
  let mut c = vec![0.0f64; trimmed_size];
  for i in 0..trimmed_size {
    for j in 0..(trimmed_size - i) {
      c[i] += (trimmed[j] as f64) * (trimmed[j + i] as f64);
    }
  }
  let mut d = 0;
  while d + 1 < trimmed_size && c[d] > c[d + 1] {
    d += 1;
  }
  let mut max_value = -1.0;
  let mut max_index = -1;
  for i in d..trimmed_size {
    if c[i] > max_value {
      max_value = c[i];
      max_index = i as i32;
    }
  }
  if max_index <= 0 { return None; }
  Some(sample_rate / max_index as f64)
}

// placeholder for shared streams if needed later

pub fn init(state: Rc<RefCell<AppState>>) {
  for button in dom::query_all("[data-tuner-toggle]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      if state_clone.borrow().tuner.active {
        stop(&state_clone);
      } else {
        start(&state_clone);
      }
    });
    let _ = button.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(calibrate) = dom::query("[data-tuner-calibrate]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      dom::set_text("[data-tuner-status]", "Calibrated");
    });
    let _ = calibrate.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  for target in dom::query_all("[data-tuner-target]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
      if let Some(el) = event.target().and_then(|t| t.dyn_into::<web_sys::Element>().ok()) {
        if let Some(note) = el.get_attribute("data-tuner-target") {
          dom::set_text("[data-tuner-note]", &note);
        }
      }
    });
    let _ = target.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

pub fn start(state: &Rc<RefCell<AppState>>) {
  let mut app = state.borrow_mut();
  if app.tuner.active {
    return;
  }
  app.tuner.active = true;
  dom::set_text("[data-tuner-status]", "Listening...");
  set_toggle_label(true);

  let window = dom::window();
  let navigator = window.navigator();
  let media_devices = match navigator.media_devices() {
    Ok(dev) => dev,
    Err(_) => {
      dom::set_text("[data-tuner-status]", "Microphone unavailable");
      app.tuner.active = false;
      set_toggle_label(false);
      return;
    }
  };

  let constraints = web_sys::MediaStreamConstraints::new();
  constraints.set_audio(&JsValue::TRUE);
  let stream_promise = media_devices.get_user_media_with_constraints(&constraints).unwrap();

  let state_clone = state.clone();
  wasm_bindgen_futures::spawn_local(async move {
    let stream = match wasm_bindgen_futures::JsFuture::from(stream_promise).await {
      Ok(val) => val.dyn_into::<MediaStream>().unwrap(),
      Err(_) => {
        dom::set_text("[data-tuner-status]", "Microphone blocked");
        state_clone.borrow_mut().tuner.active = false;
        set_toggle_label(false);
        return;
      }
    };

    let mut app = state_clone.borrow_mut();
    let audio_ctx = AudioContext::new().unwrap();
    let source = audio_ctx.create_media_stream_source(&stream).unwrap();
    let analyser = audio_ctx.create_analyser().unwrap();
    analyser.set_fft_size(2048);
    source.connect_with_audio_node(&analyser).ok();

    app.tuner.audio_ctx = Some(audio_ctx);
    app.tuner.analyser = Some(analyser);
    app.tuner.stream = Some(stream);

    let state_loop = state_clone.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut()>::new(move || {
      update_loop(&state_loop);
    });
    let id = dom::window()
      .request_animation_frame(cb.as_ref().unchecked_ref())
      .unwrap_or(0);
    state_clone.borrow_mut().tuner.raf_id = Some(id);
    cb.forget();
  });
}

pub fn stop(state: &Rc<RefCell<AppState>>) {
  let mut app = state.borrow_mut();
  if !app.tuner.active {
    return;
  }
  app.tuner.active = false;
  if let Some(id) = app.tuner.raf_id.take() {
    let _ = dom::window().cancel_animation_frame(id);
  }
  if let Some(stream) = app.tuner.stream.take() {
    let tracks = stream.get_tracks();
    for idx in 0..tracks.length() {
      let track_val = tracks.get(idx);
      if track_val.is_undefined() || track_val.is_null() {
        continue;
      }
      if let Ok(track) = track_val.dyn_into::<MediaStreamTrack>() {
        track.stop();
      }
    }
  }
  if let Some(ctx) = app.tuner.audio_ctx.take() {
    let _ = ctx.close();
  }
  app.tuner.analyser = None;
  dom::set_text("[data-tuner-status]", "Idle");
  dom::set_text("[data-tuner-note]", "--");
  dom::set_text("[data-tuner-cents]", "0");
  if let Some(meter) = dom::query("[data-tuner-meter]") {
    dom::set_style(&meter, "--offset", "50%");
  }
  set_toggle_label(false);
}

fn update_loop(state: &Rc<RefCell<AppState>>) {
  let mut app = state.borrow_mut();
  if !app.tuner.active {
    return;
  }
  let analyser = match app.tuner.analyser.as_ref() {
    Some(a) => a,
    None => return,
  };
  let mut buffer = vec![0.0f32; analyser.fft_size() as usize];
  analyser.get_float_time_domain_data(&mut buffer);
  if let Some(freq) = auto_correlate(&buffer, analyser.context().sample_rate() as f64) {
    let (note, octave, note_num) = note_from_pitch(freq);
    let target = frequency_from_note(note_num);
    let cents = (1200.0 * (freq / target).log2()).round();

    dom::set_text("[data-tuner-note]", &format!("{}{}", note, octave));
    dom::set_text("[data-tuner-cents]", &format!("{}", cents));

    if let Some(meter) = dom::query("[data-tuner-meter]") {
      let offset = ((cents + 50.0) / 100.0 * 100.0).clamp(0.0, 100.0);
      dom::set_style(&meter, "--offset", &format!("{}%", offset));
    }

    ml::push_pitch(&mut app.ml, cents);
    ml::render(&app.ml);
  }

  let state_clone = state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut()>::new(move || {
    update_loop(&state_clone);
  });
  let id = dom::window()
    .request_animation_frame(cb.as_ref().unchecked_ref())
    .unwrap_or(0);
  app.tuner.raf_id = Some(id);
  cb.forget();
}

fn set_toggle_label(active: bool) {
  let label = if active { "Stop tuner" } else { "Start tuner" };
  for button in dom::query_all("[data-tuner-toggle]") {
    dom::set_text_el(&button, label);
  }
}
