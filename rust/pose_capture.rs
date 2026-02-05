use std::cell::RefCell;
use std::rc::Rc;

use js_sys::Reflect;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;
use web_sys::Event;

use crate::dom;
use crate::state::AppState;
use crate::storage;
use crate::utils;

struct PoseState {
  active: bool,
  listener: Option<wasm_bindgen::closure::Closure<dyn FnMut(Event)>>,
}

impl Default for PoseState {
  fn default() -> Self {
    Self {
      active: false,
      listener: None,
    }
  }
}

pub fn init(state: Rc<RefCell<AppState>>) {
  if dom::query("[data-pose-status]").is_none() {
    return;
  }
  dom::set_text("[data-pose-status]", "Idle");
  dom::set_text("[data-pose-samples]", "0");

  let pose_state = Rc::new(RefCell::new(PoseState::default()));

  if let Some(btn) = dom::query("[data-pose-start]") {
    let pose_state = pose_state.clone();
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let pose_state = pose_state.clone();
      let state_clone = state_clone.clone();
      spawn_local(async move {
        if start_pose(&state_clone, &pose_state).await {
          dom::set_text("[data-pose-status]", "Active");
        } else {
          dom::set_text("[data-pose-status]", "Unavailable");
        }
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-pose-stop]") {
    let pose_state = pose_state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      stop_pose(&pose_state);
      dom::set_text("[data-pose-status]", "Stopped");
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

async fn start_pose(state: &Rc<RefCell<AppState>>, pose_state: &Rc<RefCell<PoseState>>) -> bool {
  if !state.borrow().config.features.pose {
    dom::set_text("[data-pose-status]", "Disabled in config");
    return false;
  }
  if pose_state.borrow().active {
    return true;
  }

  // Wire listener for pose-sample events from JS pipeline.
  if let Some(listener) = pose_state.borrow_mut().listener.take() {
    let _ = dom::window().remove_event_listener_with_callback("pose-sample", listener.as_ref().unchecked_ref());
  }
  let pose_state_clone = pose_state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
    handle_sample(&pose_state_clone, &event);
  });
  let _ = dom::window().add_event_listener_with_callback("pose-sample", cb.as_ref().unchecked_ref());
  pose_state.borrow_mut().listener = Some(cb);

  // Call JS pipeline if available.
  if let Some(started) = call_pose_start().await {
    if started {
      pose_state.borrow_mut().active = true;
      return true;
    }
  }

  // Fallback: emit a stub sample.
  pose_state.borrow_mut().active = true;
  emit_stub_sample();
  true
}

fn stop_pose(pose_state: &Rc<RefCell<PoseState>>) {
  let mut pose = pose_state.borrow_mut();
  if !pose.active {
    return;
  }
  pose.active = false;
  if let Some(listener) = pose.listener.take() {
    let _ = dom::window().remove_event_listener_with_callback("pose-sample", listener.as_ref().unchecked_ref());
  }
  let _ = call_pose_stop();
}

fn handle_sample(pose_state: &Rc<RefCell<PoseState>>, event: &Event) {
  if !pose_state.borrow().active {
    return;
  }
  let detail = Reflect::get(event, &"detail".into()).ok().unwrap_or(JsValue::UNDEFINED);
  let confidence = Reflect::get(&detail, &"confidence".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
  let bow_angle = Reflect::get(&detail, &"bow_angle".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
  let posture = Reflect::get(&detail, &"posture".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);

  let payload = js_sys::Object::new();
  let trace_id = utils::create_id();
  let _ = Reflect::set(&payload, &"id".into(), &JsValue::from_str(&trace_id));
  let _ = Reflect::set(&payload, &"pose_confidence".into(), &JsValue::from_f64(confidence));
  let _ = Reflect::set(&payload, &"bow_angle_deg".into(), &JsValue::from_f64(bow_angle));
  let _ = Reflect::set(&payload, &"posture_score".into(), &JsValue::from_f64(posture));
  let _ = Reflect::set(&payload, &"timestamp".into(), &JsValue::from_f64(js_sys::Date::now()));
  let _ = Reflect::set(&payload, &"source".into(), &JsValue::from_str("pose"));

  let prev = dom::query("[data-pose-samples]")
    .and_then(|el| el.text_content())
    .and_then(|text| text.parse::<u32>().ok())
    .unwrap_or(0);
  dom::set_text("[data-pose-samples]", &(prev + 1).to_string());

  spawn_local(async move {
    let _ = storage::enqueue_ml_trace(&payload.into()).await;
    let _ = storage::prune_ml_traces(1200, 30.0 * 86_400_000.0).await;
  });
}

async fn call_pose_start() -> Option<bool> {
  let window = dom::window();
  let pose = Reflect::get(&window, &"EmersonPose".into()).ok()?;
  let start = Reflect::get(&pose, &"start".into()).ok()?;
  let start = start.dyn_into::<js_sys::Function>().ok()?;
  let result = start.call0(&pose).ok()?;
  if let Ok(promise) = result.clone().dyn_into::<js_sys::Promise>() {
    let resolved = wasm_bindgen_futures::JsFuture::from(promise).await.ok()?;
    return Some(resolved.as_bool().unwrap_or(true));
  }
  Some(result.as_bool().unwrap_or(true))
}

fn call_pose_stop() -> bool {
  let window = dom::window();
  let pose = match Reflect::get(&window, &"EmersonPose".into()) {
    Ok(val) => val,
    Err(_) => return false,
  };
  let stop = match Reflect::get(&pose, &"stop".into()) {
    Ok(val) => val,
    Err(_) => return false,
  };
  let stop = match stop.dyn_into::<js_sys::Function>() {
    Ok(val) => val,
    Err(_) => return false,
  };
  stop.call0(&pose).is_ok()
}

fn emit_stub_sample() {
  let detail = js_sys::Object::new();
  let t = js_sys::Date::now() / 1000.0;
  let confidence = (t.sin() * 0.15 + 0.8).clamp(0.3, 0.98);
  let _ = Reflect::set(&detail, &"confidence".into(), &JsValue::from_f64(confidence));
  let _ = Reflect::set(&detail, &"bow_angle".into(), &JsValue::from_f64((t.cos() * 15.0).clamp(-30.0, 30.0)));
  let _ = Reflect::set(&detail, &"posture".into(), &JsValue::from_f64((confidence * 100.0).round()));
  let init = web_sys::CustomEventInit::new();
  init.set_detail(&detail.into());
  if let Ok(event) = web_sys::CustomEvent::new_with_event_init_dict("pose-sample", &init) {
    let _ = dom::window().dispatch_event(&event);
  }
}
