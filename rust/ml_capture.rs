use std::cell::RefCell;
use std::rc::Rc;

use js_sys::{Float32Array, Int32Array, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;
use web_sys::{AudioContext, Event, MediaStream};

use crate::dom;
use crate::ml;
use crate::ml_infer;
use crate::state::{AppState, MlCaptureMode};
use crate::storage;
use crate::utils;

const WORKLET_WINDOW: usize = 2048;

pub fn init(state: Rc<RefCell<AppState>>) {
  if dom::query("[data-ml-stream-status]").is_none() {
    return;
  }
  dom::set_text("[data-ml-stream-status]", "Idle");

  if let Some(btn) = dom::query("[data-ml-stream-start]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let state_clone = state_clone.clone();
      spawn_local(async move {
        if start_capture(&state_clone).await {
          dom::set_text("[data-ml-stream-status]", "Active");
        } else {
          dom::set_text("[data-ml-stream-status]", "Unavailable");
        }
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-ml-stream-stop]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      stop_capture(&state_clone);
      dom::set_text("[data-ml-stream-status]", "Stopped");
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

async fn start_capture(state: &Rc<RefCell<AppState>>) -> bool {
  if !state.borrow().config.features.ml {
    dom::set_text("[data-ml-stream-note]", "ML disabled in config.");
    return false;
  }
  if state.borrow().ml_capture.active {
    return true;
  }

  if has_worklet_source(state) {
    dom::set_text("[data-ml-stream-note]", "Using AudioWorklet stream.");
    return start_worklet_capture(state);
  }

  dom::set_text("[data-ml-stream-note]", "Using analyser fallback.");
  start_analyzer_capture(state).await
}

fn has_worklet_source(state: &Rc<RefCell<AppState>>) -> bool {
  let app = state.borrow();
  app.audio_worklet.active && app.audio_worklet.sab.is_some() && app.audio_worklet.context.is_some()
}

async fn start_analyzer_capture(state: &Rc<RefCell<AppState>>) -> bool {
  let stream = match request_stream().await {
    Some(stream) => stream,
    None => {
      dom::set_text("[data-ml-stream-note]", "Microphone unavailable.");
      return false;
    }
  };

  let context = match AudioContext::new() {
    Ok(ctx) => ctx,
    Err(_) => return false,
  };
  let source = match context.create_media_stream_source(&stream) {
    Ok(source) => source,
    Err(_) => return false,
  };
  let analyser = match context.create_analyser() {
    Ok(analyser) => analyser,
    Err(_) => return false,
  };
  analyser.set_fft_size(2048);
  let _ = source.connect_with_audio_node(&analyser);

  {
    let mut app = state.borrow_mut();
    app.ml_capture.stream = Some(stream);
    app.ml_capture.audio_ctx = Some(context);
    app.ml_capture.analyser = Some(analyser);
    app.ml_capture.active = true;
    app.ml_capture.mode = MlCaptureMode::Analyzer;
  }

  tick_analyzer(state.clone());
  true
}

fn start_worklet_capture(state: &Rc<RefCell<AppState>>) -> bool {
  if !has_worklet_source(state) {
    return false;
  }
  {
    let mut app = state.borrow_mut();
    app.ml_capture.active = true;
    app.ml_capture.mode = MlCaptureMode::Worklet;
  }
  tick_worklet(state.clone());
  true
}

fn stop_capture(state: &Rc<RefCell<AppState>>) {
  let mode = state.borrow().ml_capture.mode;
  match mode {
    MlCaptureMode::Analyzer => stop_analyzer(state),
    MlCaptureMode::Worklet => stop_worklet(state),
  }
  dom::set_text("[data-ml-stream-note]", "Capture stopped.");
}

fn stop_analyzer(state: &Rc<RefCell<AppState>>) {
  let mut app = state.borrow_mut();
  if !app.ml_capture.active {
    return;
  }
  app.ml_capture.active = false;
  if let Some(id) = app.ml_capture.raf_id.take() {
    let _ = dom::window().cancel_animation_frame(id);
  }
  if let Some(stream) = app.ml_capture.stream.take() {
    let tracks = stream.get_tracks();
    for idx in 0..tracks.length() {
      if let Ok(track) = tracks.get(idx).dyn_into::<web_sys::MediaStreamTrack>() {
        track.stop();
      }
    }
  }
  if let Some(context) = app.ml_capture.audio_ctx.take() {
    let _ = context.close();
  }
  app.ml_capture.analyser = None;
}

fn stop_worklet(state: &Rc<RefCell<AppState>>) {
  let mut app = state.borrow_mut();
  if !app.ml_capture.active {
    return;
  }
  app.ml_capture.active = false;
  if let Some(id) = app.ml_capture.raf_id.take() {
    let _ = dom::window().cancel_animation_frame(id);
  }
}

fn tick_analyzer(state: Rc<RefCell<AppState>>) {
  let state_clone = state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut()>::new(move || {
    sample_frame(&state_clone, MlCaptureMode::Analyzer);
  });
  let id = dom::window()
    .request_animation_frame(cb.as_ref().unchecked_ref())
    .unwrap_or(0);
  state.borrow_mut().ml_capture.raf_id = Some(id);
  cb.forget();
}

fn tick_worklet(state: Rc<RefCell<AppState>>) {
  let state_clone = state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut()>::new(move || {
    sample_frame(&state_clone, MlCaptureMode::Worklet);
  });
  let id = dom::window()
    .request_animation_frame(cb.as_ref().unchecked_ref())
    .unwrap_or(0);
  state.borrow_mut().ml_capture.raf_id = Some(id);
  cb.forget();
}

fn sample_frame(state: &Rc<RefCell<AppState>>, mode: MlCaptureMode) {
  let (samples, sample_rate) = match mode {
    MlCaptureMode::Analyzer => match analyser_samples(state) {
      Some(out) => out,
      None => return,
    },
    MlCaptureMode::Worklet => match worklet_samples(state) {
      Some(out) => out,
      None => return,
    },
  };

  handle_samples(state, &samples, sample_rate, mode);

  if state.borrow().ml_capture.active {
    match mode {
      MlCaptureMode::Analyzer => tick_analyzer(state.clone()),
      MlCaptureMode::Worklet => tick_worklet(state.clone()),
    }
  }
}

fn analyser_samples(state: &Rc<RefCell<AppState>>) -> Option<(Vec<f32>, f32)> {
  let analyser = state.borrow().ml_capture.analyser.clone()?;
  let fft_size = analyser.fft_size() as usize;
  let mut data = vec![0.0f32; fft_size];
  analyser.get_float_time_domain_data(&mut data);
  let sample_rate = analyser.context().sample_rate();
  Some((data, sample_rate))
}

fn worklet_samples(state: &Rc<RefCell<AppState>>) -> Option<(Vec<f32>, f32)> {
  let app = state.borrow();
  let sab = app.audio_worklet.sab.clone()?;
  let context = app.audio_worklet.context.clone()?;
  drop(app);

  let total = Float32Array::new(&sab).length() as usize;
  if total <= 1 {
    return None;
  }
  let buffer_len = total - 1;
  let buffer = Float32Array::new_with_byte_offset_and_length(&sab, 4, buffer_len as u32);
  let index_view = Int32Array::new_with_byte_offset_and_length(&sab, 0, 1);
  let write_index = index_view.get_index(0).max(0) as usize;
  if buffer_len == 0 {
    return None;
  }
  let window = WORKLET_WINDOW.min(buffer_len);
  let mut out = vec![0.0f32; window];
  let start = if buffer_len > 0 {
    write_index.saturating_sub(window) % buffer_len
  } else {
    0
  };
  for i in 0..window {
    let idx = (start + i) % buffer_len;
    out[i] = buffer.get_index(idx as u32);
  }
  Some((out, context.sample_rate()))
}

fn handle_samples(state: &Rc<RefCell<AppState>>, samples: &[f32], sample_rate: f32, mode: MlCaptureMode) {
  let pitch = estimate_pitch_yin(samples, sample_rate)
    .map(|cents| cents.clamp(0.0, 100.0));
  let variance = estimate_onset_variance(samples);
  let sample_count = if pitch.is_some() || variance.is_some() {
    let prev = dom::query("[data-ml-samples]")
      .and_then(|el| el.text_content())
      .and_then(|text| text.parse::<u32>().ok())
      .unwrap_or(0);
    let next = prev + 1;
    dom::set_text("[data-ml-samples]", &next.to_string());
    next
  } else {
    0
  };

  let pitch_sample = pitch;
  let variance_sample = variance;
  {
    let mut app = state.borrow_mut();
    if let Some(pitch) = pitch_sample {
      ml::push_pitch(&mut app.ml, pitch);
    }
    if let Some(variance) = variance_sample {
      ml::push_rhythm(&mut app.ml, variance);
    }
    ml::render(&app.ml);
  }
  ml_infer::maybe_run_active(state.clone());

  if pitch_sample.is_some() || variance_sample.is_some() {
    let payload = js_sys::Object::new();
    let trace_id = utils::create_id();
    let _ = Reflect::set(&payload, &"id".into(), &JsValue::from_str(&trace_id));
    if let Some(pitch) = pitch_sample {
      let _ = Reflect::set(&payload, &"pitch_cents".into(), &JsValue::from_f64(pitch));
    }
    if let Some(variance) = variance_sample {
      let _ = Reflect::set(&payload, &"rhythm_ms".into(), &JsValue::from_f64(variance));
    }
    let source = match mode {
      MlCaptureMode::Analyzer => "analyser",
      MlCaptureMode::Worklet => "worklet",
    };
    let _ = Reflect::set(&payload, &"source".into(), &JsValue::from_str(source));
    let _ = Reflect::set(&payload, &"timestamp".into(), &JsValue::from_f64(js_sys::Date::now()));
    let _ = Reflect::set(&payload, &"sample_index".into(), &JsValue::from_f64(sample_count as f64));
    let event_detail = js_sys::Object::new();
    let _ = Reflect::set(&event_detail, &"pitch_cents".into(), &JsValue::from_f64(pitch_sample.unwrap_or_default()));
    let _ = Reflect::set(&event_detail, &"rhythm_ms".into(), &JsValue::from_f64(variance_sample.unwrap_or_default()));
    let _ = Reflect::set(&event_detail, &"sample_index".into(), &JsValue::from_f64(sample_count as f64));
    let _ = Reflect::set(&event_detail, &"source".into(), &JsValue::from_str(source));
    let init = web_sys::CustomEventInit::new();
    init.set_detail(&event_detail.into());
    if let Ok(event) = web_sys::CustomEvent::new_with_event_init_dict("ml-trace", &init) {
      let _ = dom::window().dispatch_event(&event);
    }
    spawn_local(async move {
      let _ = storage::enqueue_ml_trace(&payload.into()).await;
      let _ = storage::prune_ml_traces(1200, 30.0 * 86_400_000.0).await;
    });
  }
}

async fn request_stream() -> Option<MediaStream> {
  let constraints = web_sys::MediaStreamConstraints::new();
  constraints.set_audio(&JsValue::TRUE);
  let devices = dom::window().navigator().media_devices().ok()?;
  let promise = devices.get_user_media_with_constraints(&constraints).ok()?;
  wasm_bindgen_futures::JsFuture::from(promise).await.ok()?.dyn_into::<MediaStream>().ok()
}

fn estimate_pitch_yin(samples: &[f32], sample_rate: f32) -> Option<f64> {
  let tau_max = (sample_rate / 55.0) as usize;
  let tau_min = (sample_rate / 1000.0) as usize;
  if tau_max <= tau_min || samples.len() < tau_max {
    return None;
  }
  let mut diff = vec![0.0f32; tau_max];
  for tau in 1..tau_max {
    let mut sum = 0.0f32;
    for i in 0..(samples.len() - tau_max) {
      let delta = samples[i] - samples[i + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }
  let mut cmnd = vec![0.0f32; tau_max];
  let mut running_sum = 0.0f32;
  for tau in 1..tau_max {
    running_sum += diff[tau];
    cmnd[tau] = if running_sum > 0.0 {
      diff[tau] * tau as f32 / running_sum
    } else {
      1.0
    };
  }

  let mut tau_est = None;
  for tau in tau_min..tau_max {
    if cmnd[tau] < 0.15 {
      tau_est = Some(tau);
      break;
    }
  }
  let tau = tau_est?;
  let freq = sample_rate / tau as f32;
  if !freq.is_finite() || freq <= 0.0 {
    return None;
  }
  let cents = 1200.0 * (freq as f64 / 440.0).log2();
  Some(cents.abs())
}

fn estimate_onset_variance(samples: &[f32]) -> Option<f64> {
  if samples.is_empty() {
    return None;
  }
  let mut energy = 0.0f64;
  for sample in samples {
    energy += (*sample as f64) * (*sample as f64);
  }
  let rms = (energy / samples.len() as f64).sqrt();
  if !rms.is_finite() {
    return None;
  }
  Some((rms * 1000.0).min(100.0))
}
