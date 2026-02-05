use std::cell::RefCell;
use std::collections::HashSet;
use std::rc::Rc;

use js_sys::Reflect;
use serde::Serialize;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;
use web_sys::{Event, HtmlInputElement, HtmlSelectElement};

use crate::dom;
use crate::file_access;
use crate::ml;
use crate::state::AppState;
use crate::storage;
use crate::utils;

thread_local! {
  static SELECTED: RefCell<HashSet<String>> = RefCell::new(HashSet::new());
}

#[derive(Serialize)]
struct ProfileRow {
  id: String,
  name: String,
  created_at: f64,
}

pub fn init(_state: Rc<RefCell<AppState>>) {
  if dom::query("[data-profile-list]").is_none() {
    return;
  }
  init_section_toggle();
  refresh();

  for btn in dom::query_all("[data-profile-add]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      if let Some(name) = prompt("Student name") {
        let name = name.trim().to_string();
        if !name.is_empty() {
          let payload = js_sys::Object::new();
          let id = utils::create_id();
          let _ = Reflect::set(&payload, &"id".into(), &JsValue::from_str(&id));
          let _ = Reflect::set(&payload, &"name".into(), &JsValue::from_str(&name));
          let _ = Reflect::set(&payload, &"created_at".into(), &JsValue::from_f64(js_sys::Date::now()));
          spawn_local(async move {
            let _ = storage::save_profile(&payload.into()).await;
            refresh();
          });
        }
      }
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-profile-export]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        export_profiles().await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-profile-export-csv]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        export_profiles_csv().await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-profile-export-selected]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        export_selected_json().await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-profile-export-selected-csv]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        export_selected_csv().await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-profile-select-all]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        let profiles = storage::get_profiles().await.unwrap_or_default();
        let ids: HashSet<String> = profiles
          .iter()
          .filter_map(|profile| Reflect::get(profile, &"id".into()).ok().and_then(|v| v.as_string()))
          .collect();
        SELECTED.with(|set| {
          set.borrow_mut().clear();
          set.borrow_mut().extend(ids);
        });
        refresh();
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-profile-clear-selection]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      SELECTED.with(|set| set.borrow_mut().clear());
      refresh();
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(select) = dom::query("[data-profile-select]").and_then(|el| el.dyn_into::<HtmlSelectElement>().ok()) {
    let select_clone = select.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let id = select_clone.value();
      let name = select_clone
        .selected_options()
        .get_with_index(0)
        .and_then(|el| el.text_content())
        .unwrap_or_else(|| "Default".into());
      storage::set_active_profile(&id, &name);
      if let Some(label) = dom::query("[data-profile-active]") {
        dom::set_text_el(&label, &name);
      }
      ml::render(&ml::load_state());
      dispatch_profile_change(&id, &name);
    });
    let _ = select.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

fn init_section_toggle() {
  if let Some(toggle) = dom::query("[data-save-files-section=\"profiles\"]") {
    if let Ok(input) = toggle.dyn_into::<HtmlInputElement>() {
      input.set_checked(file_access::prefers_save_for("profiles"));
      let input_clone = input.clone();
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        file_access::set_prefers_save_for("profiles", input_clone.checked());
      });
      let _ = input.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref());
      cb.forget();
    }
  }
}

pub fn refresh() {
  spawn_local(async move {
    let profiles = storage::get_profiles().await.unwrap_or_default();
    render_list(&profiles);
    render_select(&profiles);
  });
}

fn render_list(profiles: &[JsValue]) {
  let list = match dom::query("[data-profile-list]") {
    Some(el) => el,
    None => return,
  };
  list.set_inner_html("");
  if profiles.is_empty() {
    list.set_inner_html("<li class=\"profile-card\"><div class=\"profile-avatar\">👤</div><div><p class=\"profile-name\">Default</p><p class=\"profile-meta\">Add a student profile.</p></div><button class=\"btn btn-ghost\" type=\"button\" data-profile-add>Add</button></li>");
    dom::set_text("[data-profile-active]", &storage::get_active_profile_name());
    SELECTED.with(|set| set.borrow_mut().clear());
    return;
  }

  let ids: HashSet<String> = profiles
    .iter()
    .filter_map(|profile| Reflect::get(profile, &"id".into()).ok().and_then(|v| v.as_string()))
    .collect();
  SELECTED.with(|set| set.borrow_mut().retain(|id| ids.contains(id)));

  for profile in profiles.iter() {
    let id = Reflect::get(profile, &"id".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
    let name = Reflect::get(profile, &"name".into()).ok().and_then(|v| v.as_string()).unwrap_or_else(|| "Student".into());
    let li = dom::document().create_element("li").unwrap();
    li.set_class_name("profile-card");

    let checkbox = dom::document().create_element("input").unwrap();
    let _ = checkbox.set_attribute("type", "checkbox");
    checkbox.set_class_name("selection-toggle");
    if let Ok(input) = checkbox.clone().dyn_into::<HtmlInputElement>() {
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

    let avatar = dom::document().create_element("div").unwrap();
    avatar.set_class_name("profile-avatar");
    avatar.set_text_content(Some("🎻"));
    li.append_child(&avatar).ok();

    let info = dom::document().create_element("div").unwrap();
    let title = dom::document().create_element("p").unwrap();
    title.set_class_name("profile-name");
    title.set_text_content(Some(&name));
    let meta = dom::document().create_element("p").unwrap();
    meta.set_class_name("profile-meta");
    meta.set_text_content(Some("Local profile"));
    info.append_child(&title).ok();
    info.append_child(&meta).ok();
    li.append_child(&info).ok();

    let use_btn = dom::document().create_element("button").unwrap();
    use_btn.set_class_name("btn btn-ghost");
    use_btn.set_text_content(Some("Use"));
    let id_clone = id.clone();
    let name_clone = name.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      storage::set_active_profile(&id_clone, &name_clone);
      dom::set_text("[data-profile-active]", &name_clone);
      if let Some(select) = dom::query("[data-profile-select]").and_then(|el| el.dyn_into::<HtmlSelectElement>().ok()) {
        select.set_value(&id_clone);
      }
      ml::render(&ml::load_state());
      dispatch_profile_change(&id_clone, &name_clone);
    });
    use_btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref()).ok();
    cb.forget();
    li.append_child(&use_btn).ok();

    let delete_btn = dom::document().create_element("button").unwrap();
    delete_btn.set_class_name("btn btn-ghost");
    delete_btn.set_text_content(Some("Delete"));
    let id_delete = id.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let id_delete = id_delete.clone();
      spawn_local(async move {
        let _ = storage::delete_profile(&id_delete).await;
        if storage::get_active_profile_id() == id_delete {
          storage::set_active_profile("default", "Default");
        }
        refresh();
      });
    });
    delete_btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref()).ok();
    cb.forget();
    li.append_child(&delete_btn).ok();

    list.append_child(&li).ok();
  }
  dom::set_text("[data-profile-active]", &storage::get_active_profile_name());
}

fn render_select(profiles: &[JsValue]) {
  let select = match dom::query("[data-profile-select]").and_then(|el| el.dyn_into::<HtmlSelectElement>().ok()) {
    Some(select) => select,
    None => return,
  };
  select.set_inner_html("");
  let default_option = dom::document().create_element("option").unwrap();
  default_option.set_attribute("value", "default").ok();
  default_option.set_text_content(Some("Default"));
  select.append_child(&default_option).ok();

  for profile in profiles.iter() {
    let id = Reflect::get(profile, &"id".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
    let name = Reflect::get(profile, &"name".into()).ok().and_then(|v| v.as_string()).unwrap_or_else(|| "Student".into());
    let opt = dom::document().create_element("option").unwrap();
    opt.set_attribute("value", &id).ok();
    opt.set_text_content(Some(&name));
    select.append_child(&opt).ok();
  }

  let active_id = storage::get_active_profile_id();
  select.set_value(&active_id);
  if let Some(label) = dom::query("[data-profile-active]") {
    dom::set_text_el(&label, &storage::get_active_profile_name());
  }
}

fn dispatch_profile_change(id: &str, name: &str) {
  let detail = js_sys::Object::new();
  let _ = Reflect::set(&detail, &"id".into(), &JsValue::from_str(id));
  let _ = Reflect::set(&detail, &"name".into(), &JsValue::from_str(name));
  let init = web_sys::CustomEventInit::new();
  init.set_detail(&detail.into());
  if let Ok(event) = web_sys::CustomEvent::new_with_event_init_dict("profile-change", &init) {
    let _ = dom::window().dispatch_event(&event);
  }
}

fn prompt(label: &str) -> Option<String> {
  let window = dom::window();
  window.prompt_with_message(label).ok().flatten()
}

async fn export_profiles() {
  let profiles = storage::get_profiles().await.unwrap_or_default();
  let rows = profiles_to_rows(&profiles);
  let exported_at: String = js_sys::Date::new_0().to_string().into();
  let envelope = serde_json::json!({
    "schemaVersion": 1,
    "exportedAt": exported_at,
    "profiles": rows,
  });
  if let Ok(json) = serde_json::to_string_pretty(&envelope) {
    let force = file_access::prefers_save_for("profiles");
    let _ = if force {
      file_access::save_or_download_force("emerson-profiles.json", "application/json", json.as_bytes()).await
    } else {
      file_access::save_or_download("emerson-profiles.json", "application/json", json.as_bytes()).await
    };
    dom::set_text("[data-profile-status]", if force { "Saved profiles to Files." } else { "Downloaded profiles." });
  }
}

async fn export_profiles_csv() {
  let profiles = storage::get_profiles().await.unwrap_or_default();
  let meta = csv_meta(profiles.len());
  let mut output = format!("{}\n", meta);
  output.push_str("id,name,created_at\n");
  for profile in profiles.iter() {
    let id = Reflect::get(profile, &"id".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
    let name = Reflect::get(profile, &"name".into()).ok().and_then(|v| v.as_string()).unwrap_or_else(|| "Student".into());
    let created_at = Reflect::get(profile, &"created_at".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
    output.push_str(&format!("{},\"{}\",{}\n", id, name.replace('"', "\"\""), created_at as i64));
  }
  let force = file_access::prefers_save_for("profiles");
  let _ = if force {
    file_access::save_or_download_force("emerson-profiles.csv", "text/csv", output.as_bytes()).await
  } else {
    file_access::save_or_download("emerson-profiles.csv", "text/csv", output.as_bytes()).await
  };
  dom::set_text("[data-profile-status]", if force { "Saved profiles CSV to Files." } else { "Downloaded profiles CSV." });
}

async fn export_selected_json() {
  let profiles = storage::get_profiles().await.unwrap_or_default();
  let selected = SELECTED.with(|set| set.borrow().clone());
  let rows: Vec<ProfileRow> = profiles
    .iter()
    .filter(|profile| {
      Reflect::get(profile, &"id".into()).ok().and_then(|v| v.as_string()).map(|id| selected.contains(&id)).unwrap_or(false)
    })
    .filter_map(|profile| {
      Some(ProfileRow {
        id: Reflect::get(profile, &"id".into()).ok()?.as_string().unwrap_or_default(),
        name: Reflect::get(profile, &"name".into()).ok().and_then(|v| v.as_string()).unwrap_or_else(|| "Student".into()),
        created_at: Reflect::get(profile, &"created_at".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0),
      })
    })
    .collect();
  if rows.is_empty() {
    dom::set_text("[data-profile-status]", "No profiles selected.");
    return;
  }
  let exported_at: String = js_sys::Date::new_0().to_string().into();
  let envelope = serde_json::json!({
    "schemaVersion": 1,
    "exportedAt": exported_at,
    "profiles": rows,
  });
  if let Ok(json) = serde_json::to_string_pretty(&envelope) {
    let force = file_access::prefers_save_for("profiles");
    let _ = if force {
      file_access::save_or_download_force("emerson-profiles-selected.json", "application/json", json.as_bytes()).await
    } else {
      file_access::save_or_download("emerson-profiles-selected.json", "application/json", json.as_bytes()).await
    };
    dom::set_text(
      "[data-profile-status]",
      if force { "Saved selected profiles to Files." } else { "Downloaded selected profiles." },
    );
  }
}

async fn export_selected_csv() {
  let profiles = storage::get_profiles().await.unwrap_or_default();
  let selected = SELECTED.with(|set| set.borrow().clone());
  let mut output = String::new();
  let mut count = 0;
  for profile in profiles.iter() {
    let id = Reflect::get(profile, &"id".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
    if !selected.contains(&id) {
      continue;
    }
    let name = Reflect::get(profile, &"name".into()).ok().and_then(|v| v.as_string()).unwrap_or_else(|| "Student".into());
    let created_at = Reflect::get(profile, &"created_at".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
    output.push_str(&format!("{},\"{}\",{}\n", id, name.replace('"', "\"\""), created_at as i64));
    count += 1;
  }
  if count == 0 {
    dom::set_text("[data-profile-status]", "No profiles selected.");
    return;
  }
  let mut with_meta = format!("{}\n", csv_meta(count));
  with_meta.push_str("id,name,created_at\n");
  with_meta.push_str(&output);
  let force = file_access::prefers_save_for("profiles");
  let _ = if force {
    file_access::save_or_download_force("emerson-profiles-selected.csv", "text/csv", with_meta.as_bytes()).await
  } else {
    file_access::save_or_download("emerson-profiles-selected.csv", "text/csv", with_meta.as_bytes()).await
  };
  dom::set_text(
    "[data-profile-status]",
    if force { "Saved selected CSV to Files." } else { "Downloaded selected CSV." },
  );
}

fn profiles_to_rows(profiles: &[JsValue]) -> Vec<ProfileRow> {
  profiles
    .iter()
    .map(|profile| ProfileRow {
      id: Reflect::get(profile, &"id".into()).ok().and_then(|v| v.as_string()).unwrap_or_default(),
      name: Reflect::get(profile, &"name".into()).ok().and_then(|v| v.as_string()).unwrap_or_else(|| "Student".into()),
      created_at: Reflect::get(profile, &"created_at".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0),
    })
    .collect()
}

fn csv_meta(count: usize) -> String {
  let exported_at: String = js_sys::Date::new_0().to_string().into();
  format!("# exportedAt={}, count={}", exported_at, count)
}
