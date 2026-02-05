mod capabilities;
mod config;
mod controls;
mod dom;
mod encryption;
mod exports;
mod flow;
mod games;
mod audio_worklet;
mod backup;
mod metronome;
mod ml;
mod ml_api;
mod ml_capture;
mod ml_traces;
mod pose_capture;
mod score_following;
mod score_library;
mod pdf_render;
mod pwa;
mod recorder;
mod share_inbox;
mod reflection;
mod session;
mod state;
mod storage;
mod tuner;
mod utils;
mod tools;
mod tone;
mod platform;
mod docs;
mod telemetry;
mod game_scores;
mod teacher_exports;
mod telemetry_queue;
mod error_queue;
mod errors;
mod imports;
mod file_access;
mod profiles;
mod assignments;
mod ml_calibration;
mod storage_cleanup;
mod game_map;
mod ml_models;
mod ml_infer;
mod diagnostics;
mod db_schema;
mod db_messages;
mod db_client;
mod db_migration;
mod db_worker;
mod perf;
mod opfs_test;

use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::spawn_local;

#[cfg(feature = "wasm-threads")]
use wasm_bindgen_futures::JsFuture;
#[cfg(feature = "wasm-threads")]
use js_sys::Reflect;
#[cfg(feature = "wasm-threads")]
use wasm_bindgen::JsValue;

use crate::state::AppState;

#[cfg(feature = "wasm-threads")]
async fn init_thread_pool() {
  let window = dom::window();
  let cross_origin_isolated = Reflect::get(&window, &JsValue::from_str("crossOriginIsolated"))
    .ok()
    .and_then(|val| val.as_bool())
    .unwrap_or(false);
  let has_sab = Reflect::get(&js_sys::global(), &JsValue::from_str("SharedArrayBuffer"))
    .ok()
    .and_then(|val| val.dyn_into::<js_sys::Function>().ok())
    .is_some();
  if !cross_origin_isolated || !has_sab {
    return;
  }
  let hc = window.navigator().hardware_concurrency();
  let hc = if hc.is_finite() { hc } else { 1.0 };
  let threads = hc.max(1.0).min(4.0) as usize;
  let _ = JsFuture::from(wasm_bindgen_rayon::init_thread_pool(threads)).await;
}

#[cfg(not(feature = "wasm-threads"))]
async fn init_thread_pool() {}

fn boot(state: Rc<RefCell<AppState>>) {
  spawn_local(async move {
    init_thread_pool().await;
  });
  session::init(state.clone());
  reflection::init();
  flow::init(state.clone());
  tuner::init(state.clone());
  metronome::init(state.clone());
  recorder::init(state.clone());
  tools::init(state.clone());
  tone::init();
  controls::init(state.clone());
  exports::init(state.clone());
  share_inbox::init();
  pwa::init(state.clone());
  capabilities::init();
  platform::init();
  audio_worklet::init(state.clone());
  ml_capture::init(state.clone());
  ml_traces::init(state.clone());
  pose_capture::init(state.clone());
  score_following::init(state.clone());
  score_library::init(state.clone());
  backup::init(state.clone());
  games::init(state.clone());
  game_scores::init(state.clone());
  profiles::init(state.clone());
  assignments::init(state.clone());
  ml_calibration::init(state.clone());
  storage_cleanup::init(state.clone());
  teacher_exports::init(state.clone());
  ml_api::init(state.clone());
  docs::init();
  telemetry::init(state.clone());
  telemetry_queue::init(state.clone());
  error_queue::init(state.clone());
  errors::init(state.clone());
  imports::init(state.clone());
  game_map::init(state.clone());
  ml_models::init(state.clone());
  ml_infer::init(state.clone());
  diagnostics::init();
  db_worker::init();
  db_migration::init();
  perf::init();
  opfs_test::init();

  let state_clone = state.clone();
  spawn_local(async move {
    let config = config::load().await;
    {
      let mut app = state_clone.borrow_mut();
      app.config = config.clone();
    }
    config::write_dataset(&config);
    if let Ok(sessions) = storage::get_sessions().await {
      state_clone.borrow_mut().sessions = sessions;
    }
    let _ = storage::prune_recordings(90.0).await;
    storage_cleanup::run_auto();

    state_clone.borrow_mut().ml = ml::load_state();
    {
      let mut app = state_clone.borrow_mut();
      app.metronome.bpm = 90.0;
      app.metronome.accent = 1;
    }
    ml::render(&state_clone.borrow().ml);
    ml::ensure_accel_labels();
    ml::set_model_list(0);
    session::update_summary(&state_clone.borrow());
  });
}

#[wasm_bindgen(start)]
pub fn start() {
  console_error_panic_hook::set_once();
  let state = Rc::new(RefCell::new(AppState::default()));
  let document = dom::document();
  if document.ready_state() == "loading" {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut()>::new(move || {
      boot(state_clone.clone());
    });
    let _ = document.add_event_listener_with_callback("DOMContentLoaded", cb.as_ref().unchecked_ref());
    cb.forget();
  } else {
    boot(state.clone());
  }
}
