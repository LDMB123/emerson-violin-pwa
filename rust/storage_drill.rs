use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;
use web_sys::Event;

use crate::dom;
use crate::storage;

const DRILL_DIR: &str = "drill-data";

pub fn init() {
  init_fill_button();
  init_clear_button();
  init_check_button();
}

fn init_fill_button() {
  if let Some(btn) = dom::query("[data-storage-drill-fill]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event: Event| {
      dom::set_text("[data-storage-drill-status]", "Filling OPFS...");
      if let Some(btn) = dom::query("[data-storage-drill-fill]") {
        let _ = btn.set_attribute("disabled", "true");
      }
      spawn_local(async move {
        match fill_drill_blobs().await {
          Ok(bytes) => {
            dom::set_text(
              "[data-storage-drill-status]",
              &format!("Filled {} MB of drill data", bytes / (1024 * 1024)),
            );
          }
          Err(err) => {
            let msg = err.as_string().unwrap_or_else(|| "Unknown error".to_string());
            dom::set_text("[data-storage-drill-status]", &format!("Fill failed: {}", msg));
          }
        }
        if let Some(btn) = dom::query("[data-storage-drill-fill]") {
          let _ = btn.remove_attribute("disabled");
        }
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

fn init_clear_button() {
  if let Some(btn) = dom::query("[data-storage-drill-clear]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event: Event| {
      dom::set_text("[data-storage-drill-status]", "Clearing drill blobs...");
      spawn_local(async move {
        match clear_drill_blobs().await {
          Ok(count) => {
            dom::set_text(
              "[data-storage-drill-status]",
              &format!("Cleared {} drill files", count),
            );
          }
          Err(err) => {
            let msg = err.as_string().unwrap_or_else(|| "Unknown error".to_string());
            dom::set_text("[data-storage-drill-status]", &format!("Clear failed: {}", msg));
          }
        }
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

fn init_check_button() {
  if let Some(btn) = dom::query("[data-storage-drill-check]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event: Event| {
      dom::set_text("[data-storage-drill-pressure]", "Checking...");
      spawn_local(async move {
        match check_pressure().await {
          Ok(info) => {
            dom::set_text("[data-storage-drill-pressure]", &info);
          }
          Err(err) => {
            let msg = err.as_string().unwrap_or_else(|| "Unknown error".to_string());
            dom::set_text("[data-storage-drill-pressure]", &format!("Check failed: {}", msg));
          }
        }
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

async fn fill_drill_blobs() -> Result<usize, JsValue> {
  let target_mb = dom::query("[data-storage-drill-size]")
    .and_then(|el| el.dyn_into::<web_sys::HtmlInputElement>().ok())
    .and_then(|input| input.value().parse::<usize>().ok())
    .unwrap_or(64);
  let chunk_size: usize = 1024 * 1024; // 1 MB per file
  let chunks = target_mb;
  let mut total_bytes = 0usize;

  for i in 0..chunks {
    let filename = format!("drill-{:04}.bin", i);
    let path = format!("{}/{}", DRILL_DIR, filename);
    let data = js_sys::Uint8Array::new_with_length(chunk_size as u32);
    data.fill((i % 256) as u8, 0, chunk_size as u32);
    let blob = web_sys::Blob::new_with_u8_array_sequence(
      &js_sys::Array::of1(&data.into()),
    )?;
    storage::save_blob_to_opfs_public(&path, &blob).await?;
    total_bytes += chunk_size;

    if (i + 1) % 8 == 0 {
      dom::set_text(
        "[data-storage-drill-status]",
        &format!("Filling... {} / {} MB", i + 1, chunks),
      );
    }
  }

  Ok(total_bytes)
}

async fn clear_drill_blobs() -> Result<usize, JsValue> {
  storage::delete_opfs_dir_public(DRILL_DIR).await?;
  Ok(1)
}

async fn check_pressure() -> Result<String, JsValue> {
  let navigator = dom::window().navigator();
  let storage_mgr = js_sys::Reflect::get(&navigator, &"storage".into())?;
  let estimate_fn = js_sys::Reflect::get(&storage_mgr, &"estimate".into())?;
  let estimate_fn = estimate_fn.dyn_into::<js_sys::Function>()?;
  let promise = estimate_fn.call0(&storage_mgr)?;
  let promise = promise.dyn_into::<js_sys::Promise>()?;
  let result = wasm_bindgen_futures::JsFuture::from(promise).await?;

  let usage = js_sys::Reflect::get(&result, &"usage".into())
    .ok()
    .and_then(|v| v.as_f64())
    .unwrap_or(0.0);
  let quota = js_sys::Reflect::get(&result, &"quota".into())
    .ok()
    .and_then(|v| v.as_f64())
    .unwrap_or(0.0);

  let usage_mb = usage / (1024.0 * 1024.0);
  let quota_mb = quota / (1024.0 * 1024.0);
  let pct = if quota > 0.0 { (usage / quota) * 100.0 } else { 0.0 };

  Ok(format!("{:.1} / {:.0} MB ({:.1}%)", usage_mb, quota_mb, pct))
}
