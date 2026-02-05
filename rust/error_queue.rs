use std::cell::RefCell;
use std::rc::Rc;

use js_sys::Array;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;
use web_sys::Event;

use crate::dom;
use crate::file_access;
use crate::platform;
use crate::state::AppState;
use crate::storage;
use crate::telemetry;

pub fn init(state: Rc<RefCell<AppState>>) {
  if dom::query("[data-error-queue-list]").is_none() {
    return;
  }
  refresh();

  if let Some(btn) = dom::query("[data-error-banner-dismiss]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      if let Some(banner) = dom::query("[data-error-banner]") {
        let _ = banner.set_attribute("hidden", "true");
      }
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-error-queue-refresh]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      refresh();
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-error-queue-clear]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        let _ = storage::clear_error_queue().await;
        refresh();
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-error-queue-export]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        export_json().await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-error-queue-flush]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      telemetry::flush_now(&state_clone);
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut()>::new(move || {
        refresh();
      });
      let _ = dom::window().set_timeout_with_callback_and_timeout_and_arguments_0(cb.as_ref().unchecked_ref(), 1200);
      cb.forget();
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

pub fn refresh() {
  spawn_local(async move {
    let queue = storage::get_error_queue().await.unwrap_or_default();
    render(&queue);
  });
}

fn render(queue: &[JsValue]) {
  let list = match dom::query("[data-error-queue-list]") {
    Some(el) => el,
    None => return,
  };
  list.set_inner_html("");
  if queue.is_empty() {
    list.set_inner_html("<li class=\"empty\">Error queue empty.</li>");
    dom::set_text("[data-error-queue-count]", "0 errors");
    platform::set_badge_source("error_queue", 0);
    if let Some(banner) = dom::query("[data-error-banner]") {
      let _ = banner.set_attribute("hidden", "true");
    }
    return;
  }

  dom::set_text("[data-error-queue-count]", &format!("{} errors", queue.len()));
  platform::set_badge_source("error_queue", queue.len());
  if let Some(banner) = dom::query("[data-error-banner]") {
    let _ = banner.remove_attribute("hidden");
  }
  let max = queue.len().min(10);
  for item in queue.iter().take(max) {
    let timestamp = js_sys::Reflect::get(item, &"timestamp".into())
      .ok()
      .and_then(|v| v.as_f64())
      .unwrap_or(0.0);
    let kind = js_sys::Reflect::get(item, &"type".into())
      .ok()
      .and_then(|v| v.as_string())
      .unwrap_or_else(|| "error".into());
    let message = js_sys::Reflect::get(item, &"message".into())
      .ok()
      .and_then(|v| v.as_string())
      .unwrap_or_else(|| "Unknown error".into());
    let filename = js_sys::Reflect::get(item, &"filename".into())
      .ok()
      .and_then(|v| v.as_string())
      .unwrap_or_default();

    let label_text = if filename.is_empty() {
      format!("{} • {} • {}", timestamp as i64, kind, message)
    } else {
      format!("{} • {} • {} ({})", timestamp as i64, kind, message, filename)
    };

    let li = dom::document().create_element("li").unwrap();
    li.set_class_name("resource-list");
    let label = dom::document().create_element("span").unwrap();
    label.set_text_content(Some(&label_text));
    li.append_child(&label).ok();
    list.append_child(&li).ok();
  }
}

async fn export_json() {
  let queue = storage::get_error_queue().await.unwrap_or_default();
  let array = Array::from_iter(queue.iter());
  let json = js_sys::JSON::stringify(&array.into()).unwrap_or_else(|_| js_sys::JsString::from("[]"));
  let payload = json.as_string().unwrap_or_else(|| "[]".into());
  let _ = file_access::save_or_download("emerson-error-queue.json", "application/json", payload.as_bytes()).await;
}
