use std::cell::RefCell;
use std::rc::Rc;

use js_sys::Array;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;
use web_sys::Event;

use crate::dom;
use crate::file_access;
use crate::state::AppState;
use crate::storage;
use crate::utils;

const ASSIGNMENT_SCHEMA_VERSION: u32 = 1;

thread_local! {
  static SELECTED: std::cell::RefCell<std::collections::HashSet<String>> = std::cell::RefCell::new(std::collections::HashSet::new());
}

pub fn init(_state: Rc<RefCell<AppState>>) {
  if dom::query("[data-assignment-builder]").is_none() {
    return;
  }
  refresh();

  if let Some(btn) = dom::query("[data-assignment-builder]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let title = match prompt("Assignment title") {
        Some(val) => val.trim().to_string(),
        None => return,
      };
      if title.is_empty() { return; }
      let goals = prompt("Goals (comma separated)").unwrap_or_default();
      let schedule = prompt("Schedule notes").unwrap_or_default();
      let payload = js_sys::Object::new();
      let id = utils::create_id();
      let _ = js_sys::Reflect::set(&payload, &"id".into(), &JsValue::from_str(&id));
      let _ = js_sys::Reflect::set(&payload, &"title".into(), &JsValue::from_str(&title));
      let _ = js_sys::Reflect::set(&payload, &"goals".into(), &JsValue::from_str(&goals));
      let _ = js_sys::Reflect::set(&payload, &"schedule".into(), &JsValue::from_str(&schedule));
      let _ = js_sys::Reflect::set(&payload, &"created_at".into(), &JsValue::from_f64(js_sys::Date::now()));
      spawn_local(async move {
        let _ = storage::save_assignment(&payload.into()).await;
        refresh();
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-assignment-export]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        export_assignments().await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-assignment-export-selected]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        export_selected_json().await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-assignment-export-selected-csv]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        export_selected_csv().await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

pub fn refresh() {
  spawn_local(async move {
    let assignments = storage::get_assignments().await.unwrap_or_default();
    render(&assignments);
  });
}

fn render(assignments: &[JsValue]) {
  let list = match dom::query("[data-assignment-list]") {
    Some(el) => el,
    None => return,
  };
  list.set_inner_html("");
  if assignments.is_empty() {
    list.set_inner_html("<li class=\"empty\">No assignments yet.</li>");
    return;
  }

  for assignment in assignments.iter() {
    let id = js_sys::Reflect::get(assignment, &"id".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
    let title = js_sys::Reflect::get(assignment, &"title".into()).ok().and_then(|v| v.as_string()).unwrap_or_else(|| "Assignment".into());
    let goals = js_sys::Reflect::get(assignment, &"goals".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
    let schedule = js_sys::Reflect::get(assignment, &"schedule".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();

    let li = dom::document().create_element("li").unwrap();
    li.set_class_name("plan-item");
    let checkbox = dom::document().create_element("input").unwrap();
    let _ = checkbox.set_attribute("type", "checkbox");
    checkbox.set_class_name("selection-toggle");
    if let Ok(input) = checkbox.clone().dyn_into::<web_sys::HtmlInputElement>() {
      let checked = SELECTED.with(|set| set.borrow().contains(&id));
      input.set_checked(checked);
      let input_clone = input.clone();
      let id_clone = id.clone();
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        let checked = input_clone.checked();
        SELECTED.with(|set| {
          if checked {
            set.borrow_mut().insert(id_clone.clone());
          } else {
            set.borrow_mut().remove(&id_clone);
          }
        });
      });
      input.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref()).ok();
      cb.forget();
    }
    li.append_child(&checkbox).ok();
    let title_el = dom::document().create_element("span").unwrap();
    title_el.set_class_name("plan-title");
    title_el.set_text_content(Some(&title));
    let meta = dom::document().create_element("span").unwrap();
    meta.set_class_name("plan-meta");
    let details = if schedule.is_empty() { goals.clone() } else { format!("{} {}", schedule, goals) };
    meta.set_text_content(Some(details.trim()));
    li.append_child(&title_el).ok();
    li.append_child(&meta).ok();

    let del = dom::document().create_element("button").unwrap();
    del.set_class_name("btn btn-ghost");
    del.set_text_content(Some("Remove"));
    let id_clone = id.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let id_clone = id_clone.clone();
      spawn_local(async move {
        let _ = storage::delete_assignment(&id_clone).await;
        refresh();
      });
    });
    del.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref()).ok();
    cb.forget();
    li.append_child(&del).ok();

    list.append_child(&li).ok();
  }
}

async fn export_assignments() {
  let assignments = storage::get_assignments().await.unwrap_or_default();
  let array = Array::from_iter(assignments.iter());
  let envelope = js_sys::Object::new();
  let _ = js_sys::Reflect::set(&envelope, &"schemaVersion".into(), &JsValue::from_f64(ASSIGNMENT_SCHEMA_VERSION as f64));
  let exported_at: String = js_sys::Date::new_0().to_string().into();
  let _ = js_sys::Reflect::set(&envelope, &"exportedAt".into(), &JsValue::from_str(&exported_at));
  let _ = js_sys::Reflect::set(&envelope, &"assignments".into(), &array.into());
  let json = js_sys::JSON::stringify(&envelope.into()).unwrap_or_else(|_| js_sys::JsString::from("{}"));
  let payload = json.as_string().unwrap_or_else(|| "{}".into());
  let _ = file_access::save_or_download("emerson-assignments.json", "application/json", payload.as_bytes()).await;
}

async fn export_selected_json() {
  let assignments = storage::get_assignments().await.unwrap_or_default();
  let selected: std::collections::HashSet<String> = SELECTED.with(|set| set.borrow().clone());
  let filtered: Vec<JsValue> = assignments.into_iter().filter(|entry| {
    js_sys::Reflect::get(entry, &"id".into()).ok().and_then(|v| v.as_string()).map(|id| selected.contains(&id)).unwrap_or(false)
  }).collect();
  if filtered.is_empty() {
    dom::set_text("[data-assignment-status]", "No assignments selected.");
    return;
  }
  let array = Array::from_iter(filtered.iter());
  let envelope = js_sys::Object::new();
  let _ = js_sys::Reflect::set(&envelope, &"schemaVersion".into(), &JsValue::from_f64(ASSIGNMENT_SCHEMA_VERSION as f64));
  let exported_at: String = js_sys::Date::new_0().to_string().into();
  let _ = js_sys::Reflect::set(&envelope, &"exportedAt".into(), &JsValue::from_str(&exported_at));
  let _ = js_sys::Reflect::set(&envelope, &"assignments".into(), &array.into());
  let json = js_sys::JSON::stringify(&envelope.into()).unwrap_or_else(|_| js_sys::JsString::from("{}"));
  let payload = json.as_string().unwrap_or_else(|| "{}".into());
  let _ = file_access::save_or_download("emerson-assignments-selected.json", "application/json", payload.as_bytes()).await;
}

async fn export_selected_csv() {
  let assignments = storage::get_assignments().await.unwrap_or_default();
  let selected: std::collections::HashSet<String> = SELECTED.with(|set| set.borrow().clone());
  let mut output = String::from("id,title,goals,schedule,created_at\n");
  let mut count = 0;
  for entry in assignments.iter() {
    let id = js_sys::Reflect::get(entry, &"id".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
    if !selected.contains(&id) {
      continue;
    }
    let title = js_sys::Reflect::get(entry, &"title".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
    let goals = js_sys::Reflect::get(entry, &"goals".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
    let schedule = js_sys::Reflect::get(entry, &"schedule".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
    let created_at = js_sys::Reflect::get(entry, &"created_at".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
    output.push_str(&format!(
      "{},\"{}\",\"{}\",\"{}\",{}\n",
      id,
      title.replace('"', "\"\""),
      goals.replace('"', "\"\""),
      schedule.replace('"', "\"\""),
      created_at as i64
    ));
    count += 1;
  }
  if count == 0 {
    dom::set_text("[data-assignment-status]", "No assignments selected.");
    return;
  }
  let _ = file_access::save_or_download("emerson-assignments-selected.csv", "text/csv", output.as_bytes()).await;
}

fn prompt(label: &str) -> Option<String> {
  dom::window().prompt_with_message(label).ok().flatten()
}
