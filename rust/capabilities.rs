use js_sys::Reflect;
use wasm_bindgen::JsValue;

use crate::dom;

pub fn init() {
  let mut ready = true;
  let mut mic_ready = false;
  let mut storage_ready = false;
  let window = dom::window();
  let navigator = window.navigator();
  let document = dom::document();
  let storage_manager = if Reflect::has(&navigator, &JsValue::from_str("storage")).unwrap_or(false) {
    Some(navigator.storage())
  } else {
    None
  };
  for item in dom::query_all("[data-capability]") {
    let key = item.get_attribute("data-capability").unwrap_or_default();
    let supported = match key.as_str() {
      "wasm" => true,
      "webgpu" => Reflect::has(&navigator, &JsValue::from_str("gpu")).unwrap_or(false),
      "mic" => {
        let ok = navigator.media_devices().is_ok();
        mic_ready = ok;
        ok
      }
      "storage" => {
        let ok = Reflect::has(&navigator, &JsValue::from_str("storage")).unwrap_or(true);
        storage_ready = ok;
        ok
      }
      "camera" => {
        let ok = navigator.media_devices().is_ok();
        ok
      }
      "wake-lock" => Reflect::has(&navigator, &JsValue::from_str("wakeLock")).unwrap_or(false),
      "haptics" => Reflect::has(&navigator, &JsValue::from_str("vibrate")).unwrap_or(false),
      "share" => Reflect::has(&navigator, &JsValue::from_str("share")).unwrap_or(false),
      "notifications" => Reflect::has(&dom::window(), &JsValue::from_str("Notification")).unwrap_or(false),
      "push" => {
        Reflect::has(&navigator, &JsValue::from_str("serviceWorker")).unwrap_or(false)
          && Reflect::has(&window, &JsValue::from_str("PushManager")).unwrap_or(false)
          && Reflect::has(&window, &JsValue::from_str("Notification")).unwrap_or(false)
      }
      "motion" => Reflect::has(&dom::window(), &JsValue::from_str("DeviceMotionEvent")).unwrap_or(false),
      "badge" => {
        Reflect::has(&navigator, &JsValue::from_str("setAppBadge")).unwrap_or(false)
          || Reflect::has(&navigator, &JsValue::from_str("setClientBadge")).unwrap_or(false)
      }
      "media-session" => Reflect::has(&navigator, &JsValue::from_str("mediaSession")).unwrap_or(false),
      "file-system" => {
        Reflect::has(&window, &JsValue::from_str("showSaveFilePicker")).unwrap_or(false)
          || Reflect::has(&window, &JsValue::from_str("showOpenFilePicker")).unwrap_or(false)
      }
      "file-handling" => Reflect::has(&window, &JsValue::from_str("launchQueue")).unwrap_or(false),
      "protocol" => Reflect::has(&navigator, &JsValue::from_str("registerProtocolHandler")).unwrap_or(false),
      "share-target" => Reflect::has(&navigator, &JsValue::from_str("serviceWorker")).unwrap_or(false),
      "webcodecs" => {
        Reflect::has(&window, &JsValue::from_str("VideoEncoder")).unwrap_or(false)
          || Reflect::has(&window, &JsValue::from_str("AudioEncoder")).unwrap_or(false)
      }
      "audio-worklet" => Reflect::has(&window, &JsValue::from_str("AudioWorkletNode")).unwrap_or(false),
      "sab" => Reflect::has(&window, &JsValue::from_str("SharedArrayBuffer")).unwrap_or(false),
      "coi" => Reflect::get(&window, &JsValue::from_str("crossOriginIsolated"))
        .ok()
        .and_then(|val| val.as_bool())
        .unwrap_or(false),
      "wasm-threads" => {
        #[cfg(feature = "wasm-threads")]
        {
          let coi = Reflect::get(&window, &JsValue::from_str("crossOriginIsolated"))
            .ok()
            .and_then(|val| val.as_bool())
            .unwrap_or(false);
          let sab = Reflect::has(&window, &JsValue::from_str("SharedArrayBuffer")).unwrap_or(false);
          coi && sab
        }
        #[cfg(not(feature = "wasm-threads"))]
        {
          false
        }
      }
      "offscreen-canvas" => Reflect::has(&window, &JsValue::from_str("OffscreenCanvas")).unwrap_or(false),
      "opfs" => storage_manager
        .as_ref()
        .map(|storage| Reflect::has(storage, &JsValue::from_str("getDirectory")).unwrap_or(false))
        .unwrap_or(false),
      "storage-buckets" => Reflect::has(&navigator, &JsValue::from_str("storageBuckets")).unwrap_or(false),
      "fullscreen" => Reflect::has(&document, &JsValue::from_str("fullscreenEnabled")).unwrap_or(false),
      "orientation-lock" => {
        Reflect::get(&window, &JsValue::from_str("screen"))
          .ok()
          .and_then(|screen| Reflect::get(&screen, &JsValue::from_str("orientation")).ok())
          .map(|orientation| Reflect::has(&orientation, &JsValue::from_str("lock")).unwrap_or(false))
          .unwrap_or(false)
      }
      _ => false,
    };
    let state = if supported { "on" } else { "off" };
    let essential = matches!(key.as_str(), "wasm" | "mic" | "storage");
    if essential && !supported {
      ready = false;
    }
    dom::set_dataset(&item, "state", state);
    item.set_text_content(Some(if supported { "Ready" } else { "Unavailable" }));
  }

  if let Some(status) = dom::query("[data-platform-status]") {
    let label = if ready && mic_ready { "Device: Ready" } else if storage_ready { "Device: Limited" } else { "Device: Offline only" };
    dom::set_text_el(&status, label);
  }
}
