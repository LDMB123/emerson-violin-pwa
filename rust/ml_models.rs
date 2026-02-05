use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::JsValue;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::spawn_local;
use web_sys::Event;

use crate::dom;
use crate::ml_infer::{self, ModelEntry};
use crate::state::AppState;
use crate::storage;

#[derive(serde::Deserialize)]
struct ModelManifest {
  #[allow(dead_code)]
  #[serde(rename = "schemaVersion", default)]
  schema_version: Option<u32>,
  #[serde(default)]
  models: Vec<ModelEntry>,
}

pub fn init(_state: Rc<RefCell<AppState>>) {
  if dom::query("[data-model-list]").is_none() {
    return;
  }
  spawn_local(async move {
    load_manifest(_state).await;
  });
}

async fn load_manifest(state: Rc<RefCell<AppState>>) {
  let resp = wasm_bindgen_futures::JsFuture::from(dom::window().fetch_with_str("./models/manifest.json")).await;
  let resp = match resp {
    Ok(val) => val,
    Err(_) => {
      render_empty("No model manifest loaded.");
      return;
    }
  };
  let resp = resp.dyn_into::<web_sys::Response>().ok();
  let resp = match resp {
    Some(resp) => resp,
    None => {
      render_empty("No model manifest loaded.");
      return;
    }
  };
  if !resp.ok() {
    render_empty("No model manifest loaded.");
    return;
  }
  let json = wasm_bindgen_futures::JsFuture::from(resp.json().unwrap()).await;
  let json = match json {
    Ok(val) => val,
    Err(_) => {
      render_empty("Model manifest unavailable.");
      return;
    }
  };
  let manifest: ModelManifest = serde_wasm_bindgen::from_value(json).unwrap_or(ModelManifest { schema_version: None, models: vec![] });
  let cache = storage::get_model_cache_all().await.unwrap_or_default();
  render_manifest(state, &manifest.models, &cache);
}

fn render_manifest(state: Rc<RefCell<AppState>>, models: &[ModelEntry], cache: &[JsValue]) {
  let mut cached_ids = std::collections::HashSet::new();
  for entry in cache.iter() {
    if let Ok(id) = js_sys::Reflect::get(entry, &"id".into()) {
      if let Some(id) = id.as_string() {
        cached_ids.insert(id);
      }
    }
  }
  if let Some(list) = dom::query("[data-model-list]") {
    if models.is_empty() {
      list.set_inner_html("<li class=\"empty\">No model manifest loaded.</li>");
      dom::set_text("[data-model-count]", "0 models");
      return;
    }
    list.set_inner_html("");
    dom::set_text("[data-model-count]", &format!("{} models", models.len()));
    for model in models.iter() {
      let li = dom::document().create_element("li").unwrap();
      li.set_class_name("model-entry");
      let title = dom::document().create_element("strong").unwrap();
      title.set_text_content(Some(&model.name));
      let meta = dom::document().create_element("small").unwrap();
      meta.set_text_content(Some(&format!("{} • {}", model.task, model.format)));
      li.append_child(&title).ok();
      li.append_child(&meta).ok();

      let status = dom::document().create_element("small").unwrap();
      let cached = cached_ids.contains(&model.id);
      status.set_text_content(Some(if cached { "Cached" } else { "Not cached" }));
      li.append_child(&status).ok();

      let actions = dom::document().create_element("div").unwrap();
      actions.set_class_name("model-actions");

      if !cached {
        let download = dom::document().create_element("button").unwrap();
        download.set_class_name("btn btn-secondary");
        download.set_text_content(Some("Download"));
        let entry = model.clone();
        let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
          ml_infer::cache_from_manifest(&entry);
        });
        download.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref()).ok();
        cb.forget();
        actions.append_child(&download).ok();
      }

      let activate = dom::document().create_element("button").unwrap();
      activate.set_class_name("btn btn-ghost");
      activate.set_text_content(Some("Activate"));
      let entry = model.clone();
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        ml_infer::set_active_model_entry(&entry);
      });
      activate.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref()).ok();
      cb.forget();
      actions.append_child(&activate).ok();

      let run = dom::document().create_element("button").unwrap();
      run.set_class_name("btn btn-ghost");
      run.set_text_content(Some("Run"));
      let entry = model.clone();
      let state = state.clone();
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        ml_infer::run_active_inference(state.clone(), &entry);
      });
      run.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref()).ok();
      cb.forget();
      actions.append_child(&run).ok();

      li.append_child(&actions).ok();
      list.append_child(&li).ok();
    }
  }
}

fn render_empty(message: &str) {
  if let Some(list) = dom::query("[data-model-list]") {
    list.set_inner_html(&format!("<li class=\"empty\">{}</li>", message));
  }
  dom::set_text("[data-model-count]", "0 models");
}
