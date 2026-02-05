use std::cell::RefCell;
use std::rc::Rc;

use js_sys::{Object, Reflect};

use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;

use crate::dom;
use crate::ml;
use crate::state::AppState;

thread_local! {
  static EMITTER: RefCell<Option<js_sys::Function>> = RefCell::new(None);
}

pub fn init(state: Rc<RefCell<AppState>>) {
  let api = Object::new();
  let v1 = Object::new();

  let status_state = state.clone();
  let status_closure = wasm_bindgen::closure::Closure::<dyn FnMut() -> JsValue>::new(move || {
    let app = status_state.borrow();
    let thresholds = ml::load_thresholds();
    let obj = Object::new();
    let _ = Reflect::set(&obj, &"version".into(), &JsValue::from_str("v1"));
    let _ = Reflect::set(&obj, &"pitch_samples".into(), &JsValue::from_f64(app.ml.pitch.len() as f64));
    let _ = Reflect::set(&obj, &"rhythm_samples".into(), &JsValue::from_f64(app.ml.rhythm.len() as f64));
    let _ = Reflect::set(&obj, &"focus_samples".into(), &JsValue::from_f64(app.ml.focus.len() as f64));
    let _ = Reflect::set(&obj, &"pitch_max".into(), &JsValue::from_f64(thresholds.pitch_max));
    let _ = Reflect::set(&obj, &"rhythm_max".into(), &JsValue::from_f64(thresholds.rhythm_max));
    let _ = Reflect::set(&obj, &"focus_min".into(), &JsValue::from_f64(thresholds.focus_min));
    obj.into()
  });
  let _ = Reflect::set(&v1, &"status".into(), status_closure.as_ref());
  status_closure.forget();

  let scores_state = state.clone();
  let scores_closure = wasm_bindgen::closure::Closure::<dyn FnMut() -> JsValue>::new(move || {
    let app = scores_state.borrow();
    let obj = Object::new();
    let pitch = app.ml.pitch.last().cloned().unwrap_or_default();
    let rhythm = app.ml.rhythm.last().cloned().unwrap_or_default();
    let focus = app.ml.focus.last().cloned().unwrap_or_default();
    let _ = Reflect::set(&obj, &"pitch".into(), &JsValue::from_f64(pitch));
    let _ = Reflect::set(&obj, &"rhythm".into(), &JsValue::from_f64(rhythm));
    let _ = Reflect::set(&obj, &"focus".into(), &JsValue::from_f64(focus));
    obj.into()
  });
  let _ = Reflect::set(&v1, &"scores".into(), scores_closure.as_ref());
  scores_closure.forget();

  let get_thresholds = wasm_bindgen::closure::Closure::<dyn FnMut() -> JsValue>::new(move || {
    let thresholds = ml::load_thresholds();
    serde_wasm_bindgen::to_value(&thresholds).unwrap_or(JsValue::NULL)
  });
  let _ = Reflect::set(&v1, &"get_thresholds".into(), get_thresholds.as_ref());
  get_thresholds.forget();

  let set_thresholds = wasm_bindgen::closure::Closure::<dyn FnMut(JsValue)>::new(move |payload| {
    if let Ok(thresholds) = serde_wasm_bindgen::from_value::<ml::Thresholds>(payload) {
      ml::save_thresholds(&thresholds);
      ml::render(&ml::load_state());
    }
  });
  let _ = Reflect::set(&v1, &"set_thresholds".into(), set_thresholds.as_ref());
  set_thresholds.forget();

  let on_event = wasm_bindgen::closure::Closure::<dyn FnMut(JsValue)>::new(move |callback: JsValue| {
    if let Ok(func) = callback.dyn_into::<js_sys::Function>() {
      EMITTER.with(|cell| *cell.borrow_mut() = Some(func));
    }
  });
  let _ = Reflect::set(&v1, &"on_event".into(), on_event.as_ref());
  on_event.forget();

  let off_event = wasm_bindgen::closure::Closure::<dyn FnMut()>::new(move || {
    EMITTER.with(|cell| {
      *cell.borrow_mut() = None;
    });
  });
  let _ = Reflect::set(&v1, &"off_event".into(), off_event.as_ref());
  off_event.forget();

  let _ = Reflect::set(&api, &"v1".into(), &v1.into());
  let _ = Reflect::set(&dom::window(), &"EmersonML".into(), &api.into());
}

pub fn emit_event(name: &str, payload: &JsValue) {
  EMITTER.with(|cell| {
    let binding = cell.borrow();
    let Some(callback) = binding.as_ref() else {
      return;
    };
    let _ = callback.call2(&JsValue::NULL, &JsValue::from_str(name), payload);
  });
}
