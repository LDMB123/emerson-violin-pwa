use std::cell::RefCell;
use std::rc::Rc;

use js_sys::Reflect;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;
use web_sys::{ErrorEvent, Event, PromiseRejectionEvent};

use crate::state::AppState;
use crate::storage;
use crate::telemetry;
use crate::utils;

pub fn init(state: Rc<RefCell<AppState>>) {
  let error_state = state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
    if let Ok(err) = event.dyn_into::<ErrorEvent>() {
      let payload = js_sys::Object::new();
      let _ = Reflect::set(&payload, &"id".into(), &JsValue::from_str(&utils::create_id()));
      let _ = Reflect::set(&payload, &"timestamp".into(), &JsValue::from_f64(js_sys::Date::now()));
      let _ = Reflect::set(&payload, &"type".into(), &JsValue::from_str("error"));
      let _ = Reflect::set(&payload, &"message".into(), &JsValue::from_str(&err.message()));
      let _ = Reflect::set(&payload, &"filename".into(), &JsValue::from_str(&err.filename()));
      let _ = Reflect::set(&payload, &"lineno".into(), &JsValue::from_f64(err.lineno() as f64));
      let _ = Reflect::set(&payload, &"colno".into(), &JsValue::from_f64(err.colno() as f64));
      let _ = Reflect::set(&payload, &"stack".into(), &err.error());

      let state = error_state.clone();
      spawn_local(async move {
        let _ = storage::enqueue_error(&payload.into()).await;
        crate::error_queue::refresh();
        if crate::dom::window().navigator().on_line() {
          telemetry::flush_now(&state);
        }
      });
    }
  });
  let _ = crate::dom::window().add_event_listener_with_callback("error", cb.as_ref().unchecked_ref());
  cb.forget();

  let rejection_state = state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
    if let Ok(rej) = event.dyn_into::<PromiseRejectionEvent>() {
      let reason = rej.reason();
      let reason_text = reason.as_string().unwrap_or_else(|| {
        js_sys::JSON::stringify(&reason).ok().and_then(|val| val.as_string()).unwrap_or_else(|| "Unknown rejection".into())
      });
      let payload = js_sys::Object::new();
      let _ = Reflect::set(&payload, &"id".into(), &JsValue::from_str(&utils::create_id()));
      let _ = Reflect::set(&payload, &"timestamp".into(), &JsValue::from_f64(js_sys::Date::now()));
      let _ = Reflect::set(&payload, &"type".into(), &JsValue::from_str("unhandledrejection"));
      let _ = Reflect::set(&payload, &"message".into(), &JsValue::from_str(&reason_text));
      let _ = Reflect::set(&payload, &"stack".into(), &reason);

      let state = rejection_state.clone();
      spawn_local(async move {
        let _ = storage::enqueue_error(&payload.into()).await;
        crate::error_queue::refresh();
        if crate::dom::window().navigator().on_line() {
          telemetry::flush_now(&state);
        }
      });
    }
  });
  let _ = crate::dom::window().add_event_listener_with_callback("unhandledrejection", cb.as_ref().unchecked_ref());
  cb.forget();
}
