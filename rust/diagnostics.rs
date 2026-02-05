use wasm_bindgen::JsCast;
use web_sys::Event;

use crate::db_schema::SCHEMA_VERSION;
use crate::dom;
use crate::file_access;
use crate::storage;

pub fn init() {
  if let Some(btn) = dom::query("[data-diagnostics-export]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      wasm_bindgen_futures::spawn_local(async move {
        export_diagnostics().await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

fn text(selector: &str) -> String {
  dom::query(selector)
    .and_then(|el| el.text_content())
    .unwrap_or_default()
}

async fn export_diagnostics() {
  let window = dom::window();
  let navigator = window.navigator();
  let mut capabilities = Vec::new();
  for item in dom::query_all("[data-capability]") {
    let name = item.get_attribute("data-capability").unwrap_or_default();
    let state = item.get_attribute("data-state").unwrap_or_default();
    capabilities.push(serde_json::json!({ "name": name, "state": state }));
  }
  let timestamp: String = js_sys::Date::new_0().to_string().into();

  let storage_manager = navigator.storage();
  let persisted = match storage_manager.persisted() {
    Ok(promise) => wasm_bindgen_futures::JsFuture::from(promise)
      .await
      .ok()
      .and_then(|val| val.as_bool()),
    Err(_) => None,
  };

  let mut estimate_usage: Option<f64> = None;
  let mut estimate_quota: Option<f64> = None;
  if let Ok(estimate) = storage_manager.estimate() {
    if let Ok(result) = wasm_bindgen_futures::JsFuture::from(estimate).await {
      estimate_usage = js_sys::Reflect::get(&result, &"usage".into()).ok().and_then(|v| v.as_f64());
      estimate_quota = js_sys::Reflect::get(&result, &"quota".into()).ok().and_then(|v| v.as_f64());
    }
  }

  let migration = storage::get_migration_summary().await.ok();
  let sqlite_active = true;
  let legacy_idb_has_data = storage::legacy_idb_has_data().await;
  let idb_purged_at = storage::idb_purged_at();

  let payload = serde_json::json!({
    "appVersion": env!("CARGO_PKG_VERSION"),
    "deviceId": storage::get_or_create_device_id(),
    "userAgent": navigator.user_agent().unwrap_or_default(),
    "online": js_sys::Reflect::get(&navigator, &"onLine".into()).ok().and_then(|v| v.as_bool()).unwrap_or(true),
    "installStatus": dom::query("[data-install-status]").and_then(|el| el.text_content()).unwrap_or_default(),
    "capabilities": capabilities,
    "timestamp": timestamp,
    "storage": {
      "persisted": persisted,
      "estimateUsage": estimate_usage,
      "estimateQuota": estimate_quota,
      "persistedLabel": text("[data-storage-persisted]"),
      "pressureLabel": text("[data-storage-pressure]"),
      "usageLabel": text("[data-storage-usage]"),
      "quotaLabel": text("[data-storage-quota]"),
      "statusLabel": text("[data-storage-status]"),
    },
    "db": {
      "schemaVersion": SCHEMA_VERSION,
      "modeLabel": text("[data-db-mode]"),
      "workerStatus": text("[data-db-worker-status]"),
      "workerFile": text("[data-db-worker-file]"),
      "latencyP50": text("[data-db-latency-p50]"),
      "latencyP95": text("[data-db-latency-p95]"),
      "latencyP99": text("[data-db-latency-p99]"),
      "latencySamples": text("[data-db-latency-count]"),
    },
    "migration": {
      "sqliteActive": sqlite_active,
      "legacyIdbHasData": legacy_idb_has_data,
      "idbPurgedAt": idb_purged_at,
      "summary": migration.as_ref().map(|s| serde_json::json!({
        "started": s.started,
        "completed": s.completed,
        "updatedAt": s.updated_at,
        "lastStore": s.last_store,
        "checksumsOk": s.checksums_ok,
        "errors": s.errors,
      })),
      "uiStateLabel": text("[data-db-migrate-state]"),
      "uiChecksumsLabel": text("[data-db-migrate-checksums]"),
      "uiLegacyIdbLabel": text("[data-db-migrate-idb]"),
    },
    "serviceWorker": {
      "statusLabel": text("[data-sw-status]"),
      "pdfPackLabel": text("[data-pack-pdf-status]"),
      "shareStagingCount": text("[data-share-staging-count]"),
      "shareStagingNewest": text("[data-share-staging-newest]"),
    },
  });
  if let Ok(json) = serde_json::to_string_pretty(&payload) {
    let ok = file_access::save_or_download("emerson-diagnostics.json", "application/json", json.as_bytes()).await;
    if ok {
      dom::set_text("[data-diagnostics-status]", "Diagnostics exported.");
    }
  }
}
