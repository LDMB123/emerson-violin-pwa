use std::cell::RefCell;
use std::rc::Rc;

use serde::{Deserialize, Serialize};
use wasm_bindgen::JsCast;
use web_sys::{Event, HtmlInputElement};

use crate::dom;
use crate::flow;
use crate::ml;
use crate::recorder;
use crate::session;
use crate::state::AppState;
use crate::storage;

const PREFS_KEY: &str = "shell:preferences";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct Preferences {
  large_text: bool,
  high_contrast: bool,
  calm_bg: bool,
  reduce_motion: bool,
}

pub fn init(state: Rc<RefCell<AppState>>) {
  let prefs = load_prefs();
  apply_prefs(&prefs);
  let prefs_rc = Rc::new(RefCell::new(prefs));

  bind_toggle(
    "setting-large-text",
    prefs_rc.clone(),
    |prefs| prefs.large_text,
    |prefs, value| prefs.large_text = value,
  );
  bind_toggle(
    "setting-high-contrast",
    prefs_rc.clone(),
    |prefs| prefs.high_contrast,
    |prefs, value| prefs.high_contrast = value,
  );
  bind_toggle(
    "setting-calm-bg",
    prefs_rc.clone(),
    |prefs| prefs.calm_bg,
    |prefs, value| prefs.calm_bg = value,
  );
  bind_toggle(
    "setting-reduce-motion",
    prefs_rc.clone(),
    |prefs| prefs.reduce_motion,
    |prefs, value| prefs.reduce_motion = value,
  );

  init_reset_actions(state);
}

fn load_prefs() -> Preferences {
  storage::local_get(PREFS_KEY)
    .and_then(|raw| serde_json::from_str(&raw).ok())
    .unwrap_or_default()
}

fn save_prefs(prefs: &Preferences) {
  if let Ok(raw) = serde_json::to_string(prefs) {
    storage::local_set(PREFS_KEY, &raw);
  }
}

fn bool_attr(value: bool) -> &'static str {
  if value { "true" } else { "false" }
}

fn apply_prefs(prefs: &Preferences) {
  if let Some(root) = dom::document().document_element() {
    dom::set_attr(&root, "data-large-text", bool_attr(prefs.large_text));
    dom::set_attr(&root, "data-high-contrast", bool_attr(prefs.high_contrast));
    dom::set_attr(&root, "data-calm-bg", bool_attr(prefs.calm_bg));
    dom::set_attr(&root, "data-pref-large-text", bool_attr(prefs.large_text));
    dom::set_attr(&root, "data-pref-high-contrast", bool_attr(prefs.high_contrast));
    dom::set_attr(&root, "data-pref-calm-mode", bool_attr(prefs.calm_bg));
    dom::set_attr(&root, "data-pref-reduce-motion", bool_attr(prefs.reduce_motion));
  }
}

fn bind_toggle(
  id: &str,
  prefs: Rc<RefCell<Preferences>>,
  getter: fn(&Preferences) -> bool,
  setter: fn(&mut Preferences, bool),
) {
  let selector = format!("#{}", id);
  let input = match dom::query(&selector).and_then(|el| el.dyn_into::<HtmlInputElement>().ok()) {
    Some(input) => input,
    None => return,
  };
  input.set_checked(getter(&prefs.borrow()));
  let prefs_clone = prefs.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
    let input = event
      .target()
      .and_then(|t| t.dyn_into::<HtmlInputElement>().ok());
    if let Some(input) = input {
      let mut prefs = prefs_clone.borrow_mut();
      setter(&mut prefs, input.checked());
      save_prefs(&prefs);
      apply_prefs(&prefs);
    }
  });
  let _ = input.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref());
  cb.forget();
}

fn init_reset_actions(state: Rc<RefCell<AppState>>) {
  if let Some(reset) = dom::query("[data-reset-data]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let state_clone = state_clone.clone();
      wasm_bindgen_futures::spawn_local(async move {
        let _ = storage::clear_sessions().await;
        let _ = storage::clear_sync_queue().await;
        let _ = storage::clear_share_inbox().await;

        {
          let mut app = state_clone.borrow_mut();
          app.sessions.clear();
        }
        session::reset_timer(&state_clone);
        session::update_summary(&state_clone.borrow());
        flow::reset(&state_clone);
        {
          let mut app = state_clone.borrow_mut();
          ml::reset(&mut app.ml);
        }
      });
    });
    let _ = reset.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(clear) = dom::query("[data-clear-recordings]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let state_clone = state_clone.clone();
      wasm_bindgen_futures::spawn_local(async move {
        let _ = storage::clear_recordings().await;
        {
          let mut app = state_clone.borrow_mut();
          app.recordings.clear();
        }
        recorder::render_list(&state_clone);
        dom::set_text("[data-recorder-status]", "Recordings cleared");
      });
    });
    let _ = clear.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}
