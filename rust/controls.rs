use std::cell::RefCell;
use std::rc::Rc;

use serde::{Deserialize, Serialize};
use wasm_bindgen::JsCast;
use web_sys::{Event, HtmlInputElement};

use crate::dom;
use crate::encryption;
use crate::file_access;
use crate::flow;
use crate::ml;
use crate::recorder;
use crate::session;
use crate::state::AppState;
use crate::storage;

const PREFS_KEY: &str = "shell:preferences";

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Preferences {
  large_text: bool,
  high_contrast: bool,
  calm_bg: bool,
  reduce_motion: bool,
  compact_mode: bool,
  dyslexia_mode: bool,
  color_blind: bool,
  sound_on: bool,
  voice_on: bool,
}

impl Default for Preferences {
  fn default() -> Self {
    Self {
      large_text: false,
      high_contrast: false,
      calm_bg: false,
      reduce_motion: false,
      compact_mode: false,
      dyslexia_mode: false,
      color_blind: false,
      sound_on: true,
      voice_on: true,
    }
  }
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
    "setting-compact-mode",
    prefs_rc.clone(),
    |prefs| prefs.compact_mode,
    |prefs, value| prefs.compact_mode = value,
  );
  bind_toggle(
    "setting-dyslexia-mode",
    prefs_rc.clone(),
    |prefs| prefs.dyslexia_mode,
    |prefs, value| prefs.dyslexia_mode = value,
  );
  bind_toggle(
    "setting-color-blind",
    prefs_rc.clone(),
    |prefs| prefs.color_blind,
    |prefs, value| prefs.color_blind = value,
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

  bind_button_toggle(
    "[data-sound-toggle]",
    prefs_rc.clone(),
    |prefs| prefs.sound_on,
    |prefs, value| prefs.sound_on = value,
    "Sound on",
    "Sound off",
  );
  bind_button_toggle(
    "[data-voice-toggle]",
    prefs_rc.clone(),
    |prefs| prefs.voice_on,
    |prefs, value| prefs.voice_on = value,
    "Coach voice",
    "Coach voice off",
  );

  init_reset_actions(state);
  init_encryption_controls();
  init_file_access_controls();
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
    dom::set_attr(&root, "data-compact-mode", bool_attr(prefs.compact_mode));
    dom::set_attr(&root, "data-dyslexia-mode", bool_attr(prefs.dyslexia_mode));
    dom::set_attr(&root, "data-color-blind", bool_attr(prefs.color_blind));
    dom::set_attr(&root, "data-sound", if prefs.sound_on { "on" } else { "off" });
    dom::set_attr(&root, "data-voice", if prefs.voice_on { "on" } else { "off" });
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

fn bind_button_toggle(
  selector: &str,
  prefs: Rc<RefCell<Preferences>>,
  getter: fn(&Preferences) -> bool,
  setter: fn(&mut Preferences, bool),
  label_on: &str,
  label_off: &str,
) {
  let button = match dom::query(selector) {
    Some(btn) => btn,
    None => return,
  };
  let label_on_value = label_on.to_string();
  let label_off_value = label_off.to_string();
  let set_ui = |btn: &web_sys::Element, on: bool, label_on: &str, label_off: &str| {
    dom::set_text_el(btn, if on { label_on } else { label_off });
    let _ = btn.set_attribute("aria-pressed", if on { "true" } else { "false" });
    dom::set_dataset(btn, "state", if on { "on" } else { "off" });
  };
  set_ui(&button, getter(&prefs.borrow()), &label_on_value, &label_off_value);
  let button_clone = button.clone();
  let prefs_clone = prefs.clone();
  let label_on_clone = label_on_value.clone();
  let label_off_clone = label_off_value.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event: Event| {
    let mut prefs = prefs_clone.borrow_mut();
    let next = !getter(&prefs);
    setter(&mut prefs, next);
    save_prefs(&prefs);
    apply_prefs(&prefs);
    set_ui(&button_clone, next, &label_on_clone, &label_off_clone);
  });
  let _ = button.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
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
        let _ = storage::clear_recording_blobs().await;
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

fn init_encryption_controls() {
  if dom::query("[data-encryption-status]").is_none() {
    return;
  }

  update_encryption_status();

  if let Some(btn) = dom::query("[data-encryption-set]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let pin = dom::query("[data-encryption-pin]")
        .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
        .map(|input| input.value())
        .unwrap_or_default();
      let confirm = dom::query("[data-encryption-confirm]")
        .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
        .map(|input| input.value())
        .unwrap_or_default();
      if pin.len() < 4 || pin != confirm {
        dom::set_text("[data-encryption-note]", "PIN mismatch or too short.");
        return;
      }
      wasm_bindgen_futures::spawn_local(async move {
        if encryption::enable_pin(&pin).await {
          storage::local_set("enc:pin", &pin);
          dom::set_text("[data-encryption-note]", "PIN set. Data locked to this device.");
        } else {
          dom::set_text("[data-encryption-note]", "PIN already set.");
        }
        update_encryption_status();
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-encryption-unlock]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let pin = dom::query("[data-encryption-pin]")
        .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
        .map(|input| input.value())
        .unwrap_or_default();
      if pin.len() < 4 {
        dom::set_text("[data-encryption-note]", "Enter your PIN to unlock.");
        return;
      }
      wasm_bindgen_futures::spawn_local(async move {
        if encryption::unlock_pin(&pin).await {
          storage::local_set("enc:pin", &pin);
          dom::set_text("[data-encryption-note]", "Unlocked.");
        } else {
          dom::set_text("[data-encryption-note]", "Unlock failed.");
        }
        update_encryption_status();
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-encryption-lock]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      encryption::lock();
      storage::local_remove("enc:pin");
      dom::set_text("[data-encryption-note]", "Locked.");
      update_encryption_status();
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

fn update_encryption_status() {
  let enabled = encryption::is_enabled();
  let unlocked = encryption::is_unlocked();
  let status = if !enabled {
    "PIN not set"
  } else if unlocked {
    "Unlocked"
  } else {
    "Locked"
  };
  dom::set_text("[data-encryption-status]", status);
  if let Some(note) = dom::query("[data-encryption-note]") {
    if !enabled {
      dom::set_text_el(&note, "PIN not set.");
    } else if unlocked {
      dom::set_text_el(&note, "Data unlocked on this device.");
    } else {
      dom::set_text_el(&note, "Enter PIN to unlock.");
    }
  }
}

fn init_file_access_controls() {
  let toggle = match dom::query("[data-save-files-toggle]") {
    Some(el) => el,
    None => return,
  };
  let input = match toggle.dyn_into::<HtmlInputElement>() {
    Ok(input) => input,
    Err(_) => return,
  };
  if !file_access::supports_save_picker() {
    input.set_checked(false);
    input.set_disabled(true);
    dom::set_text("[data-save-files-note]", "Save picker not available on this device.");
    return;
  }
  input.set_checked(file_access::prefers_save_to_files());
  let input_clone = input.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
    file_access::set_prefers_save_to_files(input_clone.checked());
  });
  let _ = input.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref());
  cb.forget();
}
