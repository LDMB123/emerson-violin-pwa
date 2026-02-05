use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

use js_sys::{Reflect, Uint8Array};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;

use crate::dom;
use crate::ml::MlState;
use crate::state::AppState;
use crate::storage;

#[derive(Clone, Debug, serde::Deserialize, serde::Serialize)]
pub struct ModelEntry {
  pub id: String,
  pub name: String,
  #[serde(default)]
  pub task: String,
  #[serde(default)]
  pub format: String,
  #[serde(default)]
  pub path: String,
  #[serde(rename = "inputLen", default)]
  pub input_len: usize,
  #[serde(rename = "outputLen", default)]
  pub output_len: usize,
}

#[allow(dead_code)]
#[derive(Default, Clone)]
struct CachedModel {
  id: String,
  input_len: usize,
  output_len: usize,
  bytes: Vec<u8>,
}

#[cfg(feature = "ml-onnx")]
use tract_onnx::prelude::*;
#[cfg(feature = "ml-onnx")]
use ndarray::Array2;

#[cfg(feature = "ml-onnx")]
struct TractModel {
  plan: Rc<SimplePlan<TypedFact, Box<dyn TypedOp>>>,
  input_len: usize,
  output_len: usize,
}

thread_local! {
  static CACHE: RefCell<HashMap<String, CachedModel>> = RefCell::new(HashMap::new());
  #[cfg(feature = "ml-onnx")]
  static TRACT: RefCell<HashMap<String, TractModel>> = RefCell::new(HashMap::new());
}

const ACTIVE_MODEL_KEY: &str = "ml:model:active";
const ACTIVE_MODEL_META_KEY: &str = "ml:model:active-meta";
const INFER_LAST_KEY: &str = "ml:model:last-infer";

pub fn init(_state: Rc<RefCell<AppState>>) {
  if dom::query("[data-model-status]").is_none() {
    return;
  }
  let status = if active_model_id().is_some() {
    "Model active"
  } else {
    "No active model"
  };
  dom::set_text("[data-model-status]", status);
}

pub fn set_active_model(id: &str) {
  storage::local_set(ACTIVE_MODEL_KEY, id);
  dom::set_text("[data-model-status]", &format!("Active model: {}", id));
}

pub fn set_active_model_entry(entry: &ModelEntry) {
  if let Ok(json) = serde_json::to_string(entry) {
    storage::local_set(ACTIVE_MODEL_META_KEY, &json);
  }
  set_active_model(&entry.id);
}

#[allow(dead_code)]
pub fn clear_active_model() {
  storage::local_remove(ACTIVE_MODEL_KEY);
  storage::local_remove(ACTIVE_MODEL_META_KEY);
  dom::set_text("[data-model-status]", "No active model");
}

pub fn active_model_id() -> Option<String> {
  storage::local_get(ACTIVE_MODEL_KEY)
}

pub fn active_model_entry() -> Option<ModelEntry> {
  storage::local_get(ACTIVE_MODEL_META_KEY)
    .and_then(|raw| serde_json::from_str::<ModelEntry>(&raw).ok())
}

pub fn cache_from_manifest(entry: &ModelEntry) {
  let id = entry.id.clone();
  let entry = entry.clone();
  spawn_local(async move {
    let ok = download_and_cache(&entry).await;
    if ok {
      dom::set_text("[data-model-status]", &format!("Cached {}", entry.name));
      if active_model_id().as_deref() == Some(&id) {
        dom::set_text("[data-model-status]", &format!("Active model: {}", entry.name));
      }
    } else {
      dom::set_text("[data-model-status]", "Model download failed");
    }
  });
}

pub fn run_active_inference(state: Rc<RefCell<AppState>>, entry: &ModelEntry) {
  let entry = entry.clone();
  spawn_local(async move {
    let result = run_inference(&entry, &state.borrow().ml).await;
    match result {
      Some(output) => {
        dom::set_text("[data-model-output]", &format!("Output: {}", output));
      }
      None => {
        dom::set_text("[data-model-output]", "Output unavailable");
      }
    }
  });
}

pub fn maybe_run_active(state: Rc<RefCell<AppState>>) {
  let Some(entry) = active_model_entry() else {
    return;
  };
  let now = js_sys::Date::now();
  let last = storage::local_get(INFER_LAST_KEY)
    .and_then(|raw| raw.parse::<f64>().ok())
    .unwrap_or(0.0);
  if now - last < 2000.0 {
    return;
  }
  storage::local_set(INFER_LAST_KEY, &format!("{}", now));
  run_active_inference(state, &entry);
}

async fn download_and_cache(entry: &ModelEntry) -> bool {
  if entry.path.is_empty() {
    return false;
  }
  let bytes = match fetch_model_bytes(&entry.path).await {
    Some(bytes) => bytes,
    None => return false,
  };
  let filename = model_filename(entry);
  let opfs_path = match storage::save_model_bytes(&entry.id, &filename, &bytes).await {
    Some(path) => path,
    None => return false,
  };
  let payload = js_sys::Object::new();
  let _ = Reflect::set(&payload, &"id".into(), &JsValue::from_str(&entry.id));
  let _ = Reflect::set(&payload, &"name".into(), &JsValue::from_str(&entry.name));
  let _ = Reflect::set(&payload, &"task".into(), &JsValue::from_str(&entry.task));
  let _ = Reflect::set(&payload, &"format".into(), &JsValue::from_str(&entry.format));
  let _ = Reflect::set(&payload, &"opfs_path".into(), &JsValue::from_str(&opfs_path));
  let _ = Reflect::set(&payload, &"size_bytes".into(), &JsValue::from_f64(bytes.len() as f64));
  let _ = Reflect::set(&payload, &"updated_at".into(), &JsValue::from_f64(js_sys::Date::now()));
  let _ = storage::save_model_cache(&entry.id, &payload.into()).await;
  CACHE.with(|cache| {
    cache.borrow_mut().insert(
      entry.id.clone(),
      CachedModel {
        id: entry.id.clone(),
        input_len: entry.input_len,
        output_len: entry.output_len,
        bytes,
      },
    );
  });
  true
}

async fn run_inference(entry: &ModelEntry, state: &MlState) -> Option<String> {
  let start = dom::window().performance().map(|p| p.now()).unwrap_or(0.0);
  let features = build_features(state, entry.input_len);

  #[cfg(feature = "ml-onnx")]
  let output = {
    let bytes = if let Some(cached) = CACHE.with(|cache| cache.borrow().get(&entry.id).cloned()) {
      cached.bytes
    } else {
      let path = storage::get_model_cache(&entry.id).await.ok().flatten()
        .and_then(|val| Reflect::get(&val, &"opfs_path".into()).ok())
        .and_then(|val| val.as_string());
      if let Some(path) = path {
        storage::load_model_bytes(&path).await?
      } else {
        fetch_model_bytes(&entry.path).await?
      }
    };
    run_tract(&entry.id, entry.input_len, entry.output_len, &bytes, &features)
  };
  #[cfg(not(feature = "ml-onnx"))]
  let output: Option<Vec<f32>> = None;

  let end = dom::window().performance().map(|p| p.now()).unwrap_or(start);
  let latency = (end - start).max(0.0);
  dom::set_text("[data-ml-latency]", &format!("{:.0} ms", latency));
  dom::set_text("[data-ml-backend]", if cfg!(feature = "ml-onnx") { "ONNX CPU" } else { "Heuristic" });

  let output = output.unwrap_or_else(|| vec![features.iter().sum::<f32>() / features.len().max(1) as f32]);
  Some(output.iter().map(|val| format!("{:.3}", val)).collect::<Vec<_>>().join(", "))
}

async fn fetch_model_bytes(path: &str) -> Option<Vec<u8>> {
  if path.is_empty() {
    return None;
  }
  let resp = wasm_bindgen_futures::JsFuture::from(dom::window().fetch_with_str(path)).await.ok()?;
  let resp: web_sys::Response = resp.dyn_into().ok()?;
  if !resp.ok() {
    return None;
  }
  let buffer = wasm_bindgen_futures::JsFuture::from(resp.array_buffer().ok()?).await.ok()?;
  let array = Uint8Array::new(&buffer);
  Some(array.to_vec())
}

fn build_features(state: &MlState, input_len: usize) -> Vec<f32> {
  let pitch = state.pitch.last().copied().unwrap_or(0.0) as f32;
  let rhythm = state.rhythm.last().copied().unwrap_or(0.0) as f32;
  let focus = state.focus.last().copied().unwrap_or(0.0) as f32;
  let mut values = vec![pitch, rhythm, focus];
  while values.len() < input_len {
    values.push(0.0);
  }
  values.truncate(input_len);
  values
}

fn model_filename(entry: &ModelEntry) -> String {
  let ext = if entry.format.is_empty() { "onnx" } else { entry.format.as_str() };
  format!("{}.{}", entry.id, ext)
}

#[cfg(feature = "ml-onnx")]
fn run_tract(id: &str, input_len: usize, output_len: usize, bytes: &[u8], features: &[f32]) -> Option<Vec<f32>> {
  let cached = TRACT.with(|cache| cache.borrow().get(id).cloned());
  let plan = if let Some(model) = cached {
    model.plan
  } else {
    let mut cursor = std::io::Cursor::new(bytes.to_vec());
    let model = tract_onnx::onnx().model_for_read(&mut cursor).ok()?;
    let model = model
      .with_input_fact(0, InferenceFact::dt_shape(f32::datum_type(), tvec!(1, input_len)))
      .ok()?;
    let model = model.into_optimized().ok()?.into_runnable().ok()?;
    let plan = Rc::new(model);
    TRACT.with(|cache| {
      cache.borrow_mut().insert(
        id.to_string(),
        TractModel {
          plan: plan.clone(),
          input_len,
          output_len,
        },
      );
    });
    plan
  };

  let input = Array2::from_shape_vec((1, input_len), features.to_vec()).ok()?;
  let result = plan.run(tvec!(input.into())).ok()?;
  let tensor = result.get(0)?;
  let view = tensor.to_array_view::<f32>().ok()?;
  let mut output = Vec::new();
  for (idx, val) in view.iter().enumerate() {
    if idx >= output_len { break; }
    output.push(*val);
  }
  if output.is_empty() {
    None
  } else {
    Some(output)
  }
}
