use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::JsCast;
use web_sys::Event;

use crate::dom;
use crate::metronome;
use crate::recorder;
use crate::state::AppState;
use crate::tuner;

pub fn init(state: Rc<RefCell<AppState>>) {
  if let Some(button) = dom::query("[data-tools-stop]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      stop_all(&state_clone);
    });
    let _ = button.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

pub fn stop_all(state: &Rc<RefCell<AppState>>) {
  tuner::stop(state);
  metronome::stop(state);
  recorder::stop(state);
  dom::set_text("[data-session-status]", "Tools stopped");
}
