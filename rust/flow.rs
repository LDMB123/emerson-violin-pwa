use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::JsCast;
use web_sys::{Event, HtmlElement};

use crate::dom;
use crate::state::AppState;
use crate::storage;

const STORAGE_FLOW_KEY: &str = "flow-state";

fn load_flow_state() -> std::collections::HashMap<String, bool> {
  storage::local_get(STORAGE_FLOW_KEY)
    .and_then(|raw| serde_json::from_str(&raw).ok())
    .unwrap_or_default()
}

fn save_flow_state(map: &std::collections::HashMap<String, bool>) {
  if let Ok(raw) = serde_json::to_string(map) {
    storage::local_set(STORAGE_FLOW_KEY, &raw);
  }
}

fn update_flow_complete(map: &std::collections::HashMap<String, bool>) {
  let total = dom::query_all("[data-flow-step]").len();
  let completed = map.values().filter(|v| **v).count();
  dom::set_text("[data-flow-complete]", &format!("{} / {} complete", completed, total));
  for step in dom::query_all("[data-flow-step]") {
    let id = step.get_attribute("data-step-id").unwrap_or_default();
    if let Some(done) = map.get(&id) {
      if *done {
        dom::set_dataset(&step, "state", "complete");
        let _ = step.class_list().add_1("is-complete");
      } else {
        let _ = step.class_list().remove_1("is-complete");
        let _ = step.remove_attribute("data-state");
      }
    }
  }
}

fn clear_flow(map: &mut std::collections::HashMap<String, bool>) {
  map.clear();
  save_flow_state(map);
  update_flow_complete(map);
}

pub fn reset(state: &Rc<RefCell<AppState>>) {
  let mut app = state.borrow_mut();
  app.flow.steps.clear();
  storage::local_remove(STORAGE_FLOW_KEY);
  update_flow_complete(&app.flow.steps);
}

pub fn init(state: Rc<RefCell<AppState>>) {
  let map = load_flow_state();
  state.borrow_mut().flow.steps = map;
  update_flow_complete(&state.borrow().flow.steps);

  for step in dom::query_all("[data-flow-toggle]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
      let button = event.target().and_then(|t| t.dyn_into::<HtmlElement>().ok());
      if let Some(button) = button {
        if let Some(parent) = button.closest("[data-flow-step]").ok().flatten() {
          if let Some(id) = parent.get_attribute("data-step-id") {
            let mut app = state_clone.borrow_mut();
            let entry = app.flow.steps.entry(id).or_insert(false);
            *entry = !*entry;
            save_flow_state(&app.flow.steps);
            update_flow_complete(&app.flow.steps);
          }
        }
      }
    });
    let _ = step.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(reset) = dom::query("[data-flow-reset]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let mut app = state_clone.borrow_mut();
      clear_flow(&mut app.flow.steps);
    });
    let _ = reset.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}
