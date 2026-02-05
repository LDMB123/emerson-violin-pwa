use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::JsCast;
use wasm_bindgen_futures::spawn_local;
use web_sys::Event;

use crate::dom;
use crate::ml;
use crate::platform;
use crate::reflection;
use crate::state::AppState;
use crate::storage::{self, Session, SyncEntry};
use crate::telemetry;

fn now_ms() -> f64 {
  js_sys::Date::now()
}

fn day_key() -> String {
  let date = js_sys::Date::new_0();
  let tz_offset = date.get_timezone_offset() * 60000.0;
  let ms = date.get_time() - tz_offset;
  let local = js_sys::Date::new(&wasm_bindgen::JsValue::from_f64(ms));
  local.to_iso_string().as_string().unwrap_or_else(|| "1970-01-01".to_string())[..10].to_string()
}

pub fn init(state: Rc<RefCell<AppState>>) {
  let start = dom::query("[data-session-start]");
  let pause = dom::query("[data-session-pause]");
  let finish = dom::query("[data-session-finish]");

  if let Some(start_btn) = start.clone() {
    let state = state.clone();
    let _ = start_btn.remove_attribute("disabled");
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      start_timer(&state);
    });
    let _ = start_btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(pause_btn) = pause.clone() {
    let state = state.clone();
    let _ = pause_btn.remove_attribute("disabled");
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      pause_timer(&state);
    });
    let _ = pause_btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(finish_btn) = finish {
    let state = state.clone();
    let _ = finish_btn.remove_attribute("disabled");
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      finish_timer(&state);
    });
    let _ = finish_btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  update_summary(&state.borrow());
}

fn start_timer(state: &Rc<RefCell<AppState>>) {
  let mut app = state.borrow_mut();
  let timer = &mut app.session_timer;
  if timer.running {
    return;
  }
  timer.running = true;
  timer.start = now_ms();

  let state_clone = state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut()>::new(move || {
    tick(&state_clone);
  });
  let id = dom::window()
    .set_interval_with_callback_and_timeout_and_arguments_0(cb.as_ref().unchecked_ref(), 500)
    .unwrap_or(0);
  timer.interval_id = Some(id);
  cb.forget();

  dom::set_text("[data-session-status]", "Session running");
  platform::request_wake_lock();
  telemetry::log_event(state, "session_start", None);
}

fn pause_timer(state: &Rc<RefCell<AppState>>) {
  let mut app = state.borrow_mut();
  let timer = &mut app.session_timer;
  if !timer.running {
    return;
  }
  timer.elapsed += now_ms() - timer.start;
  timer.running = false;
  timer.start = 0.0;
  if let Some(id) = timer.interval_id.take() {
    let _ = dom::window().clear_interval_with_handle(id);
  }
  dom::set_text("[data-session-status]", "Session paused");
  platform::release_wake_lock();
  telemetry::log_event(state, "session_pause", None);
  tick(state);
}

fn finish_timer(state: &Rc<RefCell<AppState>>) {
  pause_timer(state);
  let mut app = state.borrow_mut();
  let elapsed = app.session_timer.elapsed;
  if elapsed < 1000.0 {
    dom::set_text("[data-session-status]", "Session ready");
    return;
  }
  let minutes = (elapsed / 60000.0).round();
  app.session_timer.elapsed = 0.0;
  dom::set_text("[data-session-status]", "Session saved");
  telemetry::log_event(state, "session_finish", None);
  let entry = Session {
    id: crate::utils::create_id(),
    day_key: day_key(),
    duration_minutes: minutes,
    note: reflection::current_text().unwrap_or_default(),
    created_at: js_sys::Date::now(),
  };
  reflection::clear();
  app.sessions.insert(0, entry.clone());
  update_summary(&app);

  let sync_entry = SyncEntry {
    id: crate::utils::create_id(),
    created_at: js_sys::Date::now(),
    payload: entry,
  };
  let ml_state = &mut app.ml;
  let focus = ml::note_focus_from_duration(minutes);
  ml::push_focus(ml_state, focus);

  let state_clone = state.clone();
  spawn_local(async move {
    let _ = storage::save_session(&sync_entry.payload).await;
    let _ = storage::add_sync_entry(&sync_entry).await;
    update_summary(&state_clone.borrow());
  });

  tick(state);
}

fn tick(state: &Rc<RefCell<AppState>>) {
  let app = state.borrow();
  let timer = &app.session_timer;
  let elapsed = if timer.running { timer.elapsed + (now_ms() - timer.start) } else { timer.elapsed };
  dom::set_text("[data-session-timer]", &format_duration(elapsed));
  let percent = ((elapsed / (15.0 * 60000.0)) * 100.0).clamp(0.0, 100.0).round();
  dom::set_text("[data-session-percent]", &format!("{}%", percent));
  if let Some(el) = dom::query("[data-session-progress]") {
    dom::set_style(&el, "--progress", &format!("{}", percent / 100.0));
    dom::set_attr(&el, "aria-valuenow", &format!("{:.0}", percent));
    dom::set_attr(&el, "aria-valuetext", &format!("{:.0}% complete", percent));
  }
}

fn format_duration(ms: f64) -> String {
  let total_seconds = (ms / 1000.0).max(0.0).floor() as i64;
  let minutes = total_seconds / 60;
  let seconds = total_seconds % 60;
  format!("{:02}:{:02}", minutes, seconds)
}

pub fn reset_timer(state: &Rc<RefCell<AppState>>) {
  let mut app = state.borrow_mut();
  if let Some(id) = app.session_timer.interval_id.take() {
    let _ = dom::window().clear_interval_with_handle(id);
  }
  app.session_timer.running = false;
  app.session_timer.start = 0.0;
  app.session_timer.elapsed = 0.0;
  dom::set_text("[data-session-timer]", "00:00");
  dom::set_text("[data-session-percent]", "0%");
  if let Some(el) = dom::query("[data-session-progress]") {
    dom::set_style(&el, "--progress", "0");
    dom::set_attr(&el, "aria-valuenow", "0");
    dom::set_attr(&el, "aria-valuetext", "0% complete");
  }
}

pub fn update_summary(app: &AppState) {
  let today = day_key();
  let daily_minutes: f64 = app
    .sessions
    .iter()
    .filter(|s| s.day_key == today)
    .map(|s| s.duration_minutes)
    .sum();

  let week_start = js_sys::Date::new_0().get_time() - 6.0 * 86400000.0;
  let weekly_minutes: f64 = app
    .sessions
    .iter()
    .filter(|s| {
      let date = js_sys::Date::new(&wasm_bindgen::JsValue::from_f64(s.created_at));
      date.get_time() >= week_start
    })
    .map(|s| s.duration_minutes)
    .sum();

  let streak = compute_streak(&app.sessions);
  let total = app.sessions.iter().map(|s| s.duration_minutes).sum::<f64>();

  dom::set_text("[data-summary-minutes]", &format!("{}", daily_minutes.round()));
  dom::set_text("[data-summary-week]", &format!("{}", weekly_minutes.round()));
  dom::set_text("[data-summary-total]", &format!("{}", total.round()));
  dom::set_text("[data-summary-streak]", &format!("{} days", streak));

  let status = if app.session_timer.running {
    "Session running"
  } else if app.session_timer.elapsed > 0.0 {
    "Session paused"
  } else if daily_minutes >= 15.0 {
    "Daily goal complete"
  } else {
    "Ready to begin"
  };
  dom::set_text("[data-session-status]", status);
}

fn compute_streak(sessions: &[Session]) -> i32 {
  let mut days: Vec<String> = sessions.iter().map(|s| s.day_key.clone()).collect();
  days.sort();
  days.dedup();
  let mut streak = 0;
  let cursor = js_sys::Date::new_0();
  loop {
    let key = day_key_from_date(&cursor);
    if days.contains(&key) {
      streak += 1;
      let current = cursor.get_date();
      let next = if current > 0 { current - 1 } else { 0 };
      cursor.set_date(next);
    } else {
      break;
    }
  }
  streak
}

fn day_key_from_date(date: &js_sys::Date) -> String {
  let tz_offset = date.get_timezone_offset() * 60000.0;
  let ms = date.get_time() - tz_offset;
  let local = js_sys::Date::new(&wasm_bindgen::JsValue::from_f64(ms));
  local.to_iso_string().as_string().unwrap_or_else(|| "1970-01-01".to_string())[..10].to_string()
}
