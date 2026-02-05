use std::cell::RefCell;

use js_sys::{Array, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use web_sys::{PerformanceObserver, PerformanceObserverEntryList};

use crate::dom;

#[derive(Default, Clone)]
struct PerfState {
  lcp_ms: f64,
  inp_max_ms: f64,
  long_task_max_ms: f64,
  inp_count: u32,
}

thread_local! {
  static PERF: RefCell<PerfState> = RefCell::new(PerfState::default());
  static OBSERVER: RefCell<Option<PerformanceObserver>> = RefCell::new(None);
}

pub fn init() {
  let window = dom::window();
  let has_observer = Reflect::has(&window, &JsValue::from_str("PerformanceObserver")).unwrap_or(false);
  if !has_observer {
    dom::set_text("[data-perf-status]", "Perf: unsupported");
    return;
  }

  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(PerformanceObserverEntryList, PerformanceObserver)>::new(
    move |list: PerformanceObserverEntryList, _observer: PerformanceObserver| {
      let entries: Array = list.get_entries();
      for entry in entries.iter() {
        handle_entry(&entry);
      }
    },
  );

  let observer = PerformanceObserver::new(cb.as_ref().unchecked_ref());
  let observer = match observer {
    Ok(observer) => observer,
    Err(_) => {
      dom::set_text("[data-perf-status]", "Perf: failed");
      return;
    }
  };

  cb.forget();

  let options = js_sys::Object::new();
  let entry_types = Array::new();
  entry_types.push(&JsValue::from_str("largest-contentful-paint"));
  entry_types.push(&JsValue::from_str("event"));
  entry_types.push(&JsValue::from_str("longtask"));
  let _ = Reflect::set(&options, &JsValue::from_str("entryTypes"), &entry_types);
  let _ = Reflect::set(&options, &JsValue::from_str("buffered"), &JsValue::TRUE);

  let observe = Reflect::get(&observer, &JsValue::from_str("observe"))
    .ok()
    .and_then(|val| val.dyn_into::<js_sys::Function>().ok());
  if let Some(observe) = observe {
    let _ = observe.call1(&observer, &options.into());
    dom::set_text("[data-perf-status]", "Perf: observing");
  } else {
    dom::set_text("[data-perf-status]", "Perf: unsupported");
  }

  OBSERVER.with(|cell| *cell.borrow_mut() = Some(observer));
}

fn handle_entry(entry: &JsValue) {
  let entry_type = Reflect::get(entry, &"entryType".into())
    .ok()
    .and_then(|val| val.as_string())
    .unwrap_or_default();

  match entry_type.as_str() {
    "largest-contentful-paint" => {
      let start = Reflect::get(entry, &"startTime".into())
        .ok()
        .and_then(|val| val.as_f64())
        .unwrap_or(0.0);
      update_lcp(start);
    }
    "event" => {
      let start = Reflect::get(entry, &"startTime".into())
        .ok()
        .and_then(|val| val.as_f64())
        .unwrap_or(0.0);
      let processing_start = Reflect::get(entry, &"processingStart".into())
        .ok()
        .and_then(|val| val.as_f64())
        .unwrap_or(0.0);
      if processing_start >= start && processing_start > 0.0 {
        let delay = processing_start - start;
        update_inp(delay);
      }
    }
    "longtask" => {
      let duration = Reflect::get(entry, &"duration".into())
        .ok()
        .and_then(|val| val.as_f64())
        .unwrap_or(0.0);
      update_long_task(duration);
    }
    _ => {}
  }
}

fn update_lcp(value: f64) {
  PERF.with(|cell| {
    let mut state = cell.borrow_mut();
    if value > 0.0 {
      state.lcp_ms = value;
    }
    dom::set_text("[data-perf-lcp]", &format!("{:.0} ms", state.lcp_ms));
  });
}

fn update_inp(delay: f64) {
  PERF.with(|cell| {
    let mut state = cell.borrow_mut();
    state.inp_count = state.inp_count.saturating_add(1);
    if delay > state.inp_max_ms {
      state.inp_max_ms = delay;
    }
    dom::set_text("[data-perf-inp]", &format!("{:.0} ms", state.inp_max_ms));
  });
}

fn update_long_task(duration: f64) {
  PERF.with(|cell| {
    let mut state = cell.borrow_mut();
    if duration > state.long_task_max_ms {
      state.long_task_max_ms = duration;
    }
    dom::set_text("[data-perf-longtask]", &format!("{:.0} ms", state.long_task_max_ms));
  });
}
