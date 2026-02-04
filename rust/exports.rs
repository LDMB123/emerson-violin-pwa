use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::JsCast;
use web_sys::{Blob, Event};

use crate::dom;
use crate::state::AppState;

fn download_json(filename: &str, payload: &str) {
  let array = js_sys::Array::new();
  array.push(&wasm_bindgen::JsValue::from_str(payload));
  let blob = Blob::new_with_str_sequence(&array).unwrap();
  let url = web_sys::Url::create_object_url_with_blob(&blob).unwrap();
  let document = dom::document();
  let anchor = document.create_element("a").unwrap();
  anchor.set_attribute("href", &url).ok();
  anchor.set_attribute("download", filename).ok();
  anchor.dyn_into::<web_sys::HtmlElement>().unwrap().click();
  let _ = web_sys::Url::revoke_object_url(&url);
}

pub fn init(state: Rc<RefCell<AppState>>) {
  if let Some(btn) = dom::query("[data-export-summary]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let app = state_clone.borrow();
      let weekly: Vec<_> = app.sessions.iter().take(7).cloned().collect();
      if let Ok(json) = serde_json::to_string_pretty(&weekly) {
        download_json("emerson-weekly-summary.json", &json);
      }
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-export-session]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let app = state_clone.borrow();
      if let Some(session) = app.sessions.first() {
        if let Ok(json) = serde_json::to_string_pretty(session) {
          download_json("emerson-latest-session.json", &json);
        }
      }
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}
