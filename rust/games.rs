use std::cell::RefCell;
use std::rc::Rc;

use js_sys::Reflect;
use wasm_bindgen::JsValue;
use wasm_bindgen::JsCast;
use web_sys::{CanvasRenderingContext2d, Event, HtmlCanvasElement, PointerEvent};

use crate::dom;
use crate::game_scores;
use crate::platform;
use crate::state::AppState;
use crate::storage;
use crate::telemetry;
use crate::utils;

#[derive(Clone, Copy, Debug)]
enum GameType {
  Rhythm,
  Pitch,
  Bow,
}

impl GameType {
  fn from_str(value: &str) -> Self {
    match value {
      "pitch" => Self::Pitch,
      "bow" => Self::Bow,
      _ => Self::Rhythm,
    }
  }
}

struct GameState {
  active: bool,
  score: i32,
  streak: i32,
  bpm: f64,
  next_beat: f64,
  last_tick: f64,
  started_at: f64,
  game_type: GameType,
  raf_id: Option<i32>,
  zen_mode: bool,
  profile_id: String,
  difficulty: f64,
  last_tap_x: f64,
  last_tap_y: f64,
  last_tap_time: f64,
}

impl Default for GameState {
  fn default() -> Self {
    Self {
      active: false,
      score: 0,
      streak: 0,
      bpm: 90.0,
      next_beat: 0.0,
      last_tick: 0.0,
      started_at: 0.0,
      game_type: GameType::Rhythm,
      raf_id: None,
      zen_mode: false,
      profile_id: "default".into(),
      difficulty: 0.0,
      last_tap_x: 0.5,
      last_tap_y: 0.5,
      last_tap_time: 0.0,
    }
  }
}

pub fn init(_state: Rc<RefCell<AppState>>) {
  let game_state = Rc::new(RefCell::new(GameState {
    bpm: 90.0,
    ..Default::default()
  }));

  for button in dom::query_all("[data-game-start]") {
    let state = game_state.clone();
    let app_state = _state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
      let target = event.target().and_then(|t| t.dyn_into::<web_sys::Element>().ok());
      let game_type = target
        .and_then(|el| el.get_attribute("data-game-type"))
        .map(|t| GameType::from_str(&t))
        .unwrap_or(GameType::Rhythm);
      start_game(&state, game_type);
      let payload = js_sys::Object::new();
      let _ = Reflect::set(&payload, &"type".into(), &JsValue::from_str(game_type_label(game_type)));
      telemetry::log_event(&app_state, "game_start", Some(payload.into()));
    });
    let _ = button.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  for button in dom::query_all("[data-game-settings]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
      let target = event.target().and_then(|t| t.dyn_into::<web_sys::Element>().ok());
      let game_type = target
        .and_then(|el| el.get_attribute("data-game-type"))
        .map(|t| GameType::from_str(&t))
        .unwrap_or(GameType::Rhythm);
      let profile_id = storage::get_active_profile_id();
      let key = format!("game:bpm:{}:{}", profile_id, game_type_label(game_type).to_lowercase());
      let current = storage::local_get(&key).unwrap_or_else(|| "90".into());
      if let Some(next) = dom::window().prompt_with_message_and_default("Override BPM (leave empty to reset)", &current).ok().flatten() {
        let trimmed = next.trim();
        if trimmed.is_empty() {
          storage::local_remove(&key);
        } else if let Ok(val) = trimmed.parse::<f64>() {
          storage::local_set(&key, &format!("{}", val.clamp(50.0, 160.0)));
        }
      }
    });
    let _ = button.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(pause) = dom::query("[data-game-pause]") {
    let state = game_state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event: Event| {
      stop_game(&state);
    });
    let _ = pause.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-game-zen]") {
    let state = game_state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
      let mut game = state.borrow_mut();
      game.zen_mode = !game.zen_mode;
      if let Some(el) = event.target().and_then(|t| t.dyn_into::<web_sys::Element>().ok()) {
        let _ = el.set_attribute("aria-pressed", if game.zen_mode { "true" } else { "false" });
        dom::set_text_el(&el, if game.zen_mode { "Zen on" } else { "Zen off" });
      }
      dom::set_text("[data-game-tip]", if game.zen_mode { "Zen mode: relaxed timing, no score." } else { "Tap to the beat. Aim for a clean, centered hit." });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(canvas) = dom::query("[data-game-canvas]").and_then(|el| el.dyn_into::<HtmlCanvasElement>().ok()) {
    let state = game_state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(PointerEvent)>::new(move |event: PointerEvent| {
      register_hit(&state, Some(event));
    });
    let _ = canvas.add_event_listener_with_callback("pointerdown", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(launch) = storage::local_get("launch:game-type") {
    storage::local_remove("launch:game-type");
    let game_type = GameType::from_str(&launch);
    dom::set_text("[data-game-tip]", &format!("Deep link ready: {} mode.", game_type_label(game_type)));
  }
}

fn start_game(state: &Rc<RefCell<GameState>>, game_type: GameType) {
  platform::request_wake_lock();
  platform::lock_orientation("landscape");
  platform::request_fullscreen();
  let now = dom::window().performance().map(|p| p.now()).unwrap_or(0.0);
  let profile_id = storage::get_active_profile_id();
  let diff_key = format!("game:diff:{}:{}", profile_id, game_type_label(game_type).to_lowercase());
  let difficulty = storage::local_get(&diff_key).and_then(|val| val.parse::<f64>().ok()).unwrap_or(0.0);
  let bpm_override_key = format!("game:bpm:{}:{}", profile_id, game_type_label(game_type).to_lowercase());
  let base_bpm = match game_type {
    GameType::Rhythm => 90.0,
    GameType::Pitch => 84.0,
    GameType::Bow => 78.0,
  };
  let mut bpm = (base_bpm + difficulty * 20.0).clamp(60.0, 140.0);
  if let Some(val) = storage::local_get(&bpm_override_key).and_then(|val| val.parse::<f64>().ok()) {
    bpm = val.clamp(50.0, 160.0);
  }
  {
    let mut game = state.borrow_mut();
    game.active = true;
    game.score = 0;
    game.streak = 0;
    game.game_type = game_type;
    game.last_tick = now;
    game.started_at = now;
    game.profile_id = profile_id;
    game.difficulty = difficulty;
    game.bpm = bpm;
    game.next_beat = now + beat_interval(game.bpm);
  }
  dom::set_text("[data-game-score]", "0");
  dom::set_text("[data-game-streak]", "0");
  dom::set_text("[data-game-timing]", "--");
  let tip = match game_type {
    GameType::Rhythm => "Tap to the beat. Aim for a clean, centered hit.",
    GameType::Pitch => "Match the target height with precise taps.",
    GameType::Bow => "Tap the active bow lane with steady timing.",
  };
  dom::set_text("[data-game-tip]", tip);
  tick_loop(state);
}

fn stop_game(state: &Rc<RefCell<GameState>>) {
  let (score, streak, bpm, duration, game_type, should_log, zen, profile_id, difficulty) = {
    let mut game = state.borrow_mut();
    let duration = if game.started_at > 0.0 { (game.last_tick - game.started_at).max(0.0) } else { 0.0 };
    let should_log = game.score > 0 || game.streak > 0;
    let score = game.score;
    let streak = game.streak;
    let bpm = game.bpm;
    let game_type = game.game_type;
    let zen = game.zen_mode;
    let profile_id = game.profile_id.clone();
    let difficulty = game.difficulty;
    game.active = false;
    if let Some(id) = game.raf_id.take() {
      let _ = dom::window().cancel_animation_frame(id);
    }
    (score, streak, bpm, duration, game_type, should_log, zen, profile_id, difficulty)
  };
  platform::release_wake_lock();
  platform::unlock_orientation();
  platform::exit_fullscreen();
  dom::set_text("[data-game-timing]", "Paused");

  if should_log && !zen {
    let payload = js_sys::Object::new();
    let _ = Reflect::set(&payload, &"id".into(), &JsValue::from_str(&utils::create_id()));
    let _ = Reflect::set(&payload, &"game_type".into(), &JsValue::from_str(game_type_label(game_type)));
    let _ = Reflect::set(&payload, &"score".into(), &JsValue::from_f64(score as f64));
    let _ = Reflect::set(&payload, &"streak".into(), &JsValue::from_f64(streak as f64));
    let _ = Reflect::set(&payload, &"bpm".into(), &JsValue::from_f64(bpm));
    let _ = Reflect::set(&payload, &"duration_ms".into(), &JsValue::from_f64(duration));
    let _ = Reflect::set(&payload, &"ended_at".into(), &JsValue::from_f64(js_sys::Date::now()));
    let _ = Reflect::set(&payload, &"profile_id".into(), &JsValue::from_str(&profile_id));
    let _ = Reflect::set(&payload, &"difficulty".into(), &JsValue::from_f64(difficulty));
    wasm_bindgen_futures::spawn_local(async move {
      let _ = storage::save_game_score(&payload.into()).await;
      game_scores::refresh();
      crate::game_map::refresh();
    });

    let diff_key = format!("game:diff:{}:{}", profile_id, game_type_label(game_type).to_lowercase());
    let next_diff = if score >= 120 || streak >= 6 {
      (difficulty + 0.15).min(1.0)
    } else if score <= 40 {
      (difficulty - 0.15).max(0.0)
    } else {
      difficulty
    };
    storage::local_set(&diff_key, &next_diff.to_string());
  }
}

fn beat_interval(bpm: f64) -> f64 {
  60000.0 / bpm.max(40.0)
}

fn register_hit(state: &Rc<RefCell<GameState>>, event: Option<PointerEvent>) {
  let now = dom::window().performance().map(|p| p.now()).unwrap_or(0.0);
  let mut game = state.borrow_mut();
  if !game.active {
    return;
  }
  let (tap_x, tap_y) = match event {
    Some(event) => normalized_pointer(&event),
    None => (0.5, 0.5),
  };
  game.last_tap_x = tap_x;
  game.last_tap_y = tap_y;
  game.last_tap_time = now;
  let diff = (now - game.next_beat).abs();
  let accuracy = accuracy_label(diff, game.game_type, tap_x, tap_y, game.next_beat, game.bpm);

  if !game.zen_mode {
    match accuracy {
      "Perfect" => {
        game.score += 14;
        game.streak += 1;
      }
      "Great" => {
        game.score += 8;
        game.streak += 1;
      }
      _ => {
        game.streak = (game.streak - 1).max(0);
      }
    }
    dom::set_text("[data-game-score]", &game.score.to_string());
    dom::set_text("[data-game-streak]", &game.streak.to_string());
  } else {
    dom::set_text("[data-game-score]", "--");
    dom::set_text("[data-game-streak]", "--");
  }
  dom::set_text("[data-game-timing]", accuracy);

  trigger_haptic(diff <= 40.0);
}

fn accuracy_label(diff: f64, game_type: GameType, _tap_x: f64, tap_y: f64, next_beat: f64, bpm: f64) -> &'static str {
  let interval = beat_interval(bpm);
  let timing = diff <= 20.0;
  match game_type {
    GameType::Bow => {
      let target_lane = (next_beat / interval).floor() as i32 % 3;
      let lane = if tap_y < 0.33 { 0 } else if tap_y < 0.66 { 1 } else { 2 };
      if timing && lane == target_lane { "Perfect" } else if diff <= 60.0 { "Great" } else { "Late" }
    }
    GameType::Pitch => {
      let target_y = (0.5 + (next_beat / interval).sin() * 0.25).clamp(0.15, 0.85);
      let close = (tap_y - target_y).abs() < 0.12;
      if timing && close { "Perfect" } else if diff <= 60.0 { "Great" } else { "Late" }
    }
    GameType::Rhythm => {
      if diff <= 20.0 { "Perfect" } else if diff <= 40.0 { "Great" } else { "Late" }
    }
  }
}

fn normalized_pointer(event: &PointerEvent) -> (f64, f64) {
  let target = event.target().and_then(|t| t.dyn_into::<web_sys::Element>().ok());
  if let Some(el) = target {
    let rect = el.get_bounding_client_rect();
    let x = (event.client_x() as f64 - rect.left()) / rect.width().max(1.0);
    let y = (event.client_y() as f64 - rect.top()) / rect.height().max(1.0);
    return (x.clamp(0.0, 1.0), y.clamp(0.0, 1.0));
  }
  (0.5, 0.5)
}

fn trigger_haptic(hit: bool) {
  let navigator = dom::window().navigator();
  if let Ok(vibrate) = Reflect::get(&navigator, &"vibrate".into()) {
    if let Ok(func) = vibrate.dyn_into::<js_sys::Function>() {
      let pattern = if hit {
        js_sys::Array::of1(&JsValue::from_f64(15.0))
      } else {
        js_sys::Array::of3(&JsValue::from_f64(40.0), &JsValue::from_f64(20.0), &JsValue::from_f64(40.0))
      };
      let _ = func.call1(&navigator, &pattern.into());
    }
  }
}

fn tick_loop(state: &Rc<RefCell<GameState>>) {
  let state_clone = state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut()>::new(move || {
    update_frame(&state_clone);
  });
  let id = dom::window()
    .request_animation_frame(cb.as_ref().unchecked_ref())
    .unwrap_or(0);
  state.borrow_mut().raf_id = Some(id);
  cb.forget();
}

fn update_frame(state: &Rc<RefCell<GameState>>) {
  let mut game = state.borrow_mut();
  if !game.active {
    return;
  }
  let now = dom::window().performance().map(|p| p.now()).unwrap_or(0.0);
  game.last_tick = now;
  if now >= game.next_beat {
    game.next_beat += beat_interval(game.bpm);
  }
  let interval = beat_interval(game.bpm);
  draw_canvas(
    game.game_type,
    now,
    game.next_beat,
    interval,
    game.last_tap_x,
    game.last_tap_y,
    game.last_tap_time,
  );
  drop(game);
  tick_loop(state);
}

fn draw_canvas(game_type: GameType, now: f64, next_beat: f64, interval: f64, tap_x: f64, tap_y: f64, tap_time: f64) {
  let canvas = match dom::query("[data-game-canvas]").and_then(|el| el.dyn_into::<HtmlCanvasElement>().ok()) {
    Some(canvas) => canvas,
    None => return,
  };
  let ctx = match canvas
    .get_context("2d")
    .ok()
    .flatten()
    .and_then(|ctx| ctx.dyn_into::<CanvasRenderingContext2d>().ok()) {
      Some(ctx) => ctx,
      None => return,
  };

  let width = canvas.width() as f64;
  let height = canvas.height() as f64;
  ctx.clear_rect(0.0, 0.0, width, height);

  ctx.set_fill_style_str("#fff4e8");
  ctx.fill_rect(0.0, 0.0, width, height);

  match game_type {
    GameType::Rhythm => {
      ctx.set_stroke_style_str("rgba(213,106,63,0.35)");
      ctx.set_line_width(4.0);
      let center_y = height * 0.5;
      ctx.begin_path();
      ctx.move_to(0.0, center_y);
      ctx.line_to(width, center_y);
      ctx.stroke();

      let beat_progress = ((next_beat - now) / interval).clamp(0.0, 1.0);
      let x = width * (1.0 - beat_progress);
      ctx.set_fill_style_str("rgba(213,106,63,0.8)");
      ctx.begin_path();
      ctx.arc(x, center_y, 18.0, 0.0, std::f64::consts::PI * 2.0).ok();
      ctx.fill();
    }
    GameType::Pitch => {
      let target_y = (0.5 + (next_beat / interval).sin() * 0.25).clamp(0.15, 0.85);
      let y = height * target_y;
      ctx.set_stroke_style_str("rgba(29,111,111,0.3)");
      ctx.set_line_width(3.0);
      ctx.begin_path();
      ctx.move_to(width * 0.2, y);
      ctx.line_to(width * 0.8, y);
      ctx.stroke();

      ctx.set_fill_style_str("rgba(29,111,111,0.75)");
      ctx.begin_path();
      ctx.arc(width * 0.5, y, 16.0, 0.0, std::f64::consts::PI * 2.0).ok();
      ctx.fill();
    }
    GameType::Bow => {
      let lane_height = height / 3.0;
      for lane in 0..3 {
        let top = lane as f64 * lane_height;
        ctx.set_stroke_style_str("rgba(213,106,63,0.2)");
        ctx.set_line_width(2.0);
        ctx.stroke_rect(32.0, top + 16.0, width - 64.0, lane_height - 32.0);
      }
      let target_lane = (next_beat / interval).floor() as i32 % 3;
      let top = target_lane as f64 * lane_height + 16.0;
      ctx.set_fill_style_str("rgba(213,106,63,0.25)");
      ctx.fill_rect(32.0, top, width - 64.0, lane_height - 32.0);
    }
  }

  if now - tap_time < 600.0 {
    ctx.set_fill_style_str("rgba(245,107,73,0.6)");
    ctx.begin_path();
    ctx.arc(width * tap_x, height * tap_y, 12.0, 0.0, std::f64::consts::PI * 2.0).ok();
    ctx.fill();
  }

  ctx.set_fill_style_str("rgba(29,111,111,0.6)");
  let label = game_type_label(game_type);
  ctx.set_font("24px Nunito");
  ctx.fill_text(label, 24.0, 36.0).ok();
}

fn game_type_label(game_type: GameType) -> &'static str {
  match game_type {
    GameType::Rhythm => "Rhythm",
    GameType::Pitch => "Pitch",
    GameType::Bow => "Bow",
  }
}
