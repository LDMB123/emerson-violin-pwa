use wasm_bindgen::JsCast;
use web_sys::{AudioContext, Event};

use crate::dom;

pub fn init() {
  for button in dom::query_all("[data-tone-play]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
      if let Some(el) = event.target().and_then(|t| t.dyn_into::<web_sys::Element>().ok()) {
        let note = el.get_attribute("data-tone-note").unwrap_or_else(|| "A4".to_string());
        play_note(&note);
      }
    });
    let _ = button.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

fn play_note(note: &str) {
  let freq = note_to_frequency(note).unwrap_or(440.0);
  if let Ok(ctx) = AudioContext::new() {
    if let Ok(osc) = ctx.create_oscillator() {
      if let Ok(gain) = ctx.create_gain() {
        osc.frequency().set_value(freq as f32);
        gain.gain().set_value_at_time(0.0001, ctx.current_time()).ok();
        gain.gain().exponential_ramp_to_value_at_time(0.6, ctx.current_time() + 0.02).ok();
        gain.gain().exponential_ramp_to_value_at_time(0.0001, ctx.current_time() + 0.5).ok();
        osc.connect_with_audio_node(&gain).ok();
        gain.connect_with_audio_node(&ctx.destination()).ok();
        osc.start().ok();
        osc.stop_with_when(ctx.current_time() + 0.6).ok();
      }
    }
  }
}

fn note_to_frequency(note: &str) -> Option<f64> {
  let chars: Vec<char> = note.chars().collect();
  if chars.is_empty() {
    return None;
  }
  let letter = chars[0].to_ascii_uppercase();
  let mut idx = 1;
  let accidental = if chars.get(1) == Some(&'#') {
    idx += 1;
    1
  } else if chars.get(1) == Some(&'b') {
    idx += 1;
    -1
  } else {
    0
  };
  let octave: i32 = note[idx..].parse().ok()?;
  let base = match letter {
    'C' => 0,
    'D' => 2,
    'E' => 4,
    'F' => 5,
    'G' => 7,
    'A' => 9,
    'B' => 11,
    _ => return None,
  };
  let semitone = base + accidental;
  let note_num = (octave + 1) * 12 + semitone;
  let freq = 440.0 * 2.0_f64.powf((note_num as f64 - 69.0) / 12.0);
  Some(freq)
}
