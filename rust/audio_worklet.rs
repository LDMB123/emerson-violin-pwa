use std::cell::RefCell;
use std::rc::Rc;

use js_sys::{Array, Function, Object, Reflect, Uint8Array};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Blob, BlobPropertyBag, Event, MediaStream};

use crate::dom;
use crate::state::AppState;

const WORKLET_NAME: &str = "emerson-audio-processor";
const SAB_SAMPLES: u32 = 48_000;

const WORKLET_CODE: &str = r#"
class EmersonAudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const sab = options?.processorOptions?.sab;
    this.indexView = sab ? new Int32Array(sab, 0, 1) : null;
    this.buffer = sab ? new Float32Array(sab, 4) : null;
    this.index = 0;
  }
  process(inputs, outputs) {
    const input = inputs[0] || [];
    const channel = input[0];
    if (channel && this.buffer) {
      for (let i = 0; i < channel.length; i++) {
        this.buffer[this.index % this.buffer.length] = channel[i];
        this.index++;
      }
      if (this.indexView) {
        if (typeof Atomics !== 'undefined') {
          Atomics.store(this.indexView, 0, this.index);
        } else {
          this.indexView[0] = this.index;
        }
      }
    }
    const output = outputs[0] || [];
    if (output[0] && channel) {
      output[0].set(channel);
    }
    return true;
  }
}
registerProcessor("emerson-audio-processor", EmersonAudioProcessor);
"#;

pub fn init(state: Rc<RefCell<AppState>>) {
  if dom::query("[data-audio-worklet-status]").is_none() {
    return;
  }
  if supports_audio_worklet() {
    update_status("Idle");
  } else {
    update_status("Unavailable");
  }

  if let Some(start) = dom::query("[data-audio-worklet-start]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let state_clone = state_clone.clone();
      wasm_bindgen_futures::spawn_local(async move {
        if start_pipeline(&state_clone).await {
          update_status("Active");
          dom::set_text("[data-ml-backend]", "Backend: AudioWorklet");
          dom::set_text("[data-ml-latency]", "Worklet active");
        } else {
          update_status("Unavailable");
        }
      });
    });
    let _ = start.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(stop) = dom::query("[data-audio-worklet-stop]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      stop_pipeline(&state_clone);
      update_status("Stopped");
      dom::set_text("[data-ml-backend]", "Backend: --");
      dom::set_text("[data-ml-latency]", "--");
    });
    let _ = stop.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

fn update_status(label: &str) {
  dom::set_text("[data-audio-worklet-status]", label);
}

fn supports_audio_worklet() -> bool {
  let window = dom::window();
  let has_worklet = Reflect::has(&window, &JsValue::from_str("AudioWorkletNode")).unwrap_or(false);
  let has_sab = Reflect::has(&window, &JsValue::from_str("SharedArrayBuffer")).unwrap_or(false);
  has_worklet && has_sab
}

async fn start_pipeline(state: &Rc<RefCell<AppState>>) -> bool {
  if !supports_audio_worklet() {
    return false;
  }
  if !state.borrow().config.features.audio_worklet {
    return false;
  }
  if state.borrow().audio_worklet.active {
    return true;
  }

  let stream = match request_stream().await {
    Some(stream) => stream,
    None => return false,
  };

  let context = match web_sys::AudioContext::new() {
    Ok(ctx) => ctx,
    Err(_) => return false,
  };
  let source = match context.create_media_stream_source(&stream) {
    Ok(node) => node,
    Err(_) => return false,
  };

  let sab = create_shared_buffer(SAB_SAMPLES)
    .unwrap_or_else(|| Uint8Array::new_with_length((SAB_SAMPLES + 1) * 4).buffer().into());
  let module_url = match create_worklet_module_url() {
    Some(url) => url,
    None => return false,
  };
  let audio_worklet = match Reflect::get(&context, &JsValue::from_str("audioWorklet")) {
    Ok(val) => val,
    Err(_) => return false,
  };
  let add_module = match Reflect::get(&audio_worklet, &JsValue::from_str("addModule"))
    .ok()
    .and_then(|val| val.dyn_into::<Function>().ok()) {
    Some(func) => func,
    None => return false,
  };
  let promise = match add_module.call1(&audio_worklet, &JsValue::from_str(&module_url)) {
    Ok(val) => val,
    Err(_) => return false,
  };
  if let Ok(promise) = promise.dyn_into::<js_sys::Promise>() {
    let _ = JsFuture::from(promise).await;
  }
  let _ = web_sys::Url::revoke_object_url(&module_url);

  let node = match create_worklet_node(&context, &sab) {
    Some(node) => node,
    None => return false,
  };

  let _ = call_method1(&source.clone().into(), "connect", &node);
  let destination = context.destination();
  let _ = call_method1(&node, "connect", &destination.into());

  {
    let mut app = state.borrow_mut();
    app.audio_worklet.active = true;
    app.audio_worklet.context = Some(context);
    app.audio_worklet.stream = Some(stream);
    app.audio_worklet.source = Some(source);
    app.audio_worklet.node = Some(node);
    app.audio_worklet.sab = Some(sab);
  }

  update_sample_status(state);
  true
}

fn stop_pipeline(state: &Rc<RefCell<AppState>>) {
  let mut app = state.borrow_mut();
  if !app.audio_worklet.active {
    return;
  }
  app.audio_worklet.active = false;
  if let Some(node) = app.audio_worklet.node.take() {
    let _ = call_method0(&node, "disconnect");
  }
  if let Some(source) = app.audio_worklet.source.take() {
    let _ = call_method0(&source.into(), "disconnect");
  }
  if let Some(stream) = app.audio_worklet.stream.take() {
    let tracks = stream.get_tracks();
    for idx in 0..tracks.length() {
      let track_val = tracks.get(idx);
      if let Ok(track) = track_val.dyn_into::<web_sys::MediaStreamTrack>() {
        track.stop();
      }
    }
  }
  if let Some(context) = app.audio_worklet.context.take() {
    let _ = context.close();
  }
  app.audio_worklet.sab = None;
  if app.ml_capture.active && matches!(app.ml_capture.mode, crate::state::MlCaptureMode::Worklet) {
    app.ml_capture.active = false;
    app.ml_capture.raf_id = None;
    dom::set_text("[data-ml-stream-status]", "Idle");
  }
  dom::set_text("[data-ml-samples]", "0");
}

async fn request_stream() -> Option<MediaStream> {
  let constraints = web_sys::MediaStreamConstraints::new();
  constraints.set_audio(&JsValue::TRUE);
  let devices = dom::window().navigator().media_devices().ok()?;
  let promise = devices.get_user_media_with_constraints(&constraints).ok()?;
  JsFuture::from(promise).await.ok()?.dyn_into::<MediaStream>().ok()
}

fn create_shared_buffer(len: u32) -> Option<JsValue> {
  let constructor = Reflect::get(&dom::window(), &JsValue::from_str("SharedArrayBuffer")).ok()?;
  let constructor = constructor.dyn_into::<Function>().ok()?;
  let args = Array::new();
  args.push(&JsValue::from_f64(((len + 1) * 4) as f64));
  Reflect::construct(&constructor, &args).ok()
}

fn create_worklet_module_url() -> Option<String> {
  let array = Array::new();
  array.push(&JsValue::from_str(WORKLET_CODE));
  let bag = BlobPropertyBag::new();
  bag.set_type("application/javascript");
  let blob = Blob::new_with_str_sequence_and_options(&array, &bag).ok()?;
  web_sys::Url::create_object_url_with_blob(&blob).ok()
}

fn create_worklet_node(context: &web_sys::AudioContext, sab: &JsValue) -> Option<JsValue> {
  let constructor = Reflect::get(&dom::window(), &JsValue::from_str("AudioWorkletNode")).ok()?;
  let constructor = constructor.dyn_into::<Function>().ok()?;
  let options = Object::new();
  let processor = Object::new();
  let _ = Reflect::set(&processor, &JsValue::from_str("sab"), sab);
  let _ = Reflect::set(&options, &JsValue::from_str("processorOptions"), &processor.into());
  let args = Array::new();
  args.push(&context.clone().into());
  args.push(&JsValue::from_str(WORKLET_NAME));
  args.push(&options.into());
  Reflect::construct(&constructor, &args).ok()
}

fn call_method0(target: &JsValue, name: &str) -> Option<JsValue> {
  let func = Reflect::get(target, &JsValue::from_str(name)).ok()?;
  let func = func.dyn_into::<Function>().ok()?;
  func.call0(target).ok()
}

fn call_method1(target: &JsValue, name: &str, arg: &JsValue) -> Option<JsValue> {
  let func = Reflect::get(target, &JsValue::from_str(name)).ok()?;
  let func = func.dyn_into::<Function>().ok()?;
  func.call1(target, arg).ok()
}

fn update_sample_status(state: &Rc<RefCell<AppState>>) {
  let active = state.borrow().audio_worklet.active;
  if active {
    dom::set_text("[data-ml-samples]", "0");
  }
}
