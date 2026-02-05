mod capabilities;
mod controls;
mod dom;
mod exports;
mod flow;
mod metronome;
mod ml;
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
mod perf;
mod opfs_test;
mod db_schema;
mod db_messages;
mod db_client;
mod db_migration;
mod db_worker;

use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::spawn_local;

use crate::state::AppState;

#[wasm_bindgen(start)]
pub fn start() {
  console_error_panic_hook::set_once();
  let state = Rc::new(RefCell::new(AppState::default()));
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
  perf::init();
  opfs_test::init();
  db_worker::init();
  db_migration::init();

  let state_clone = state.clone();
  spawn_local(async move {
    if let Ok(sessions) = storage::get_sessions().await {
      state_clone.borrow_mut().sessions = sessions;
    }

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
