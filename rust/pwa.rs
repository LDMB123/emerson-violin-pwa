use std::cell::RefCell;
use std::rc::Rc;

use js_sys::{Array, Function, Reflect};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;
use web_sys::{Event, HtmlDialogElement, ServiceWorker, ServiceWorkerRegistration};

use crate::dom;
use crate::db_migration;
use crate::share_inbox;
use crate::state::AppState;
use crate::storage;

const INSTALL_DISMISSED_KEY: &str = "shell:install-dismissed";

pub fn init(_state: Rc<RefCell<AppState>>) {
  init_offline_indicator();
  init_install();
  init_share();
  init_service_worker();
  init_storage_status();
}

fn init_offline_indicator() {
  update_offline_indicator();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
    update_offline_indicator();
  });
  let window = dom::window();
  let _ = window.add_event_listener_with_callback("online", cb.as_ref().unchecked_ref());
  let _ = window.add_event_listener_with_callback("offline", cb.as_ref().unchecked_ref());
  cb.forget();
}

fn update_offline_indicator() {
  let navigator = dom::window().navigator();
  let online = Reflect::get(&navigator, &JsValue::from_str("onLine"))
    .ok()
    .and_then(|val| val.as_bool())
    .unwrap_or(true);
  let label = if online { "Online" } else { "Offline" };
  if let Some(indicator) = dom::query("[data-offline-indicator]") {
    dom::set_text_el(&indicator, label);
    dom::set_dataset(&indicator, "state", if online { "online" } else { "offline" });
  }
}

fn init_install() {
  let banner = dom::query("[data-install-banner]");
  let action = dom::query("[data-install-action]");
  let dismissed_buttons = dom::query_all("[data-install-dismiss]");
  let update_banner = dom::query("[data-update-banner]");
  let update_action = dom::query("[data-update-action]");
  let update_dismiss = dom::query("[data-update-dismiss]");

  let dismissed = storage::local_get(INSTALL_DISMISSED_KEY)
    .map(|value| value == "true")
    .unwrap_or(false);
  let dismissed_rc = Rc::new(RefCell::new(dismissed));
  let deferred_prompt: Rc<RefCell<Option<JsValue>>> = Rc::new(RefCell::new(None));

  let installed = dom::is_standalone();
  let install_status = if installed {
    "Install status: Installed"
  } else {
    "Install status: Add to Home Screen for offline access"
  };
  dom::set_text("[data-install-status]", install_status);
  if let Some(banner) = &banner {
    set_hidden(banner, installed || *dismissed_rc.borrow());
  }

  if let Some(help) = dom::query("[data-install-help]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      open_install_guide();
    });
    let _ = help.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(check) = dom::query("[data-install-check]") {
    let banner = banner.clone();
    let dismissed = dismissed_rc.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let installed = dom::is_standalone();
      let status = if installed {
        "Install status: Installed"
      } else {
        "Install status: Not installed"
      };
      dom::set_text("[data-install-status]", status);
      if let Some(banner) = &banner {
        set_hidden(banner, installed || *dismissed.borrow());
      }
    });
    let _ = check.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(close) = dom::query("[data-install-close]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      close_install_guide();
    });
    let _ = close.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = update_dismiss {
    let update_banner = update_banner.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      if let Some(update_banner) = &update_banner {
        set_hidden(update_banner, true);
      }
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = update_action {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        if !migration_allows_update().await {
          dom::set_text("[data-sw-status]", "Update blocked: migration not verified");
          return;
        }
        dom::set_text("[data-sw-status]", "Reloading...");
        let _ = dom::window().location().reload();
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  for button in dismissed_buttons {
    let banner = banner.clone();
    let dismissed = dismissed_rc.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      *dismissed.borrow_mut() = true;
      storage::local_set(INSTALL_DISMISSED_KEY, "true");
      dom::set_text("[data-install-status]", "Install status: Banner dismissed");
      if let Some(banner) = &banner {
        set_hidden(banner, true);
      }
    });
    let _ = button.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(action) = action {
    let deferred_prompt = deferred_prompt.clone();
    let banner = banner.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      if let Some(prompt_event) = deferred_prompt.borrow_mut().take() {
        if let Ok(prompt_fn) = Reflect::get(&prompt_event, &JsValue::from_str("prompt")) {
          if let Ok(prompt_fn) = prompt_fn.dyn_into::<Function>() {
            let _ = prompt_fn.call0(&prompt_event);
          }
        }
        if let Ok(choice) = Reflect::get(&prompt_event, &JsValue::from_str("userChoice")) {
          let banner = banner.clone();
          if let Ok(choice) = choice.dyn_into::<js_sys::Promise>() {
            spawn_local(async move {
              if let Ok(result) = wasm_bindgen_futures::JsFuture::from(choice).await {
              let outcome = Reflect::get(&result, &JsValue::from_str("outcome"))
                .ok()
                .and_then(|val| val.as_string())
                .unwrap_or_default();
              if outcome == "accepted" {
                dom::set_text("[data-install-status]", "Install status: Installed");
                if let Some(banner) = &banner {
                  set_hidden(banner, true);
                }
              } else {
                dom::set_text("[data-install-status]", "Install status: Install dismissed");
              }
              }
            });
          }
        }
        return;
      }
      open_install_guide();
    });
    let _ = action.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  let banner_for_prompt = banner.clone();
  let dismissed_for_prompt = dismissed_rc.clone();
  let deferred_for_prompt = deferred_prompt.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
    event.prevent_default();
    *deferred_for_prompt.borrow_mut() = Some(event.clone().into());
    dom::set_text("[data-install-status]", "Install status: Ready to install");
    if let Some(banner) = &banner_for_prompt {
      if !*dismissed_for_prompt.borrow() {
        set_hidden(banner, false);
      }
    }
  });
  let _ = dom::window().add_event_listener_with_callback("beforeinstallprompt", cb.as_ref().unchecked_ref());
  cb.forget();

  let banner_for_installed = banner.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
    dom::set_text("[data-install-status]", "Install status: Installed");
    if let Some(banner) = &banner_for_installed {
      set_hidden(banner, true);
    }
  });
  let _ = dom::window().add_event_listener_with_callback("appinstalled", cb.as_ref().unchecked_ref());
  cb.forget();
}

fn open_install_guide() {
  if let Some(dialog) = dom::query("#install-guide") {
    if let Ok(dialog_el) = dialog.clone().dyn_into::<HtmlDialogElement>() {
      let _ = dialog_el.show_modal();
    } else {
      let _ = dialog.set_attribute("open", "true");
    }
  }
}

fn close_install_guide() {
  if let Some(dialog) = dom::query("#install-guide") {
    if let Ok(dialog_el) = dialog.clone().dyn_into::<HtmlDialogElement>() {
      let _ = dialog_el.close();
    } else {
      let _ = dialog.remove_attribute("open");
    }
  }
}

fn set_hidden(element: &web_sys::Element, hidden: bool) {
  if hidden {
    let _ = element.set_attribute("hidden", "true");
  } else {
    let _ = element.remove_attribute("hidden");
  }
}

fn init_share() {
  if let Some(btn) = dom::query("[data-share-button]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let navigator = dom::window().navigator();
      if Reflect::has(&navigator, &JsValue::from_str("share")).unwrap_or(false) {
        if let Ok(share_fn) = Reflect::get(&navigator, &JsValue::from_str("share")) {
          if let Ok(share_fn) = share_fn.dyn_into::<Function>() {
            let data = js_sys::Object::new();
            let _ = Reflect::set(&data, &JsValue::from_str("title"), &JsValue::from_str("Emerson Violin Studio"));
            let _ = Reflect::set(&data, &JsValue::from_str("text"), &JsValue::from_str("Offline-first violin practice studio."));
            let _ = Reflect::set(&data, &JsValue::from_str("url"), &JsValue::from_str(&dom::window().location().href().unwrap_or_default()));
            let _ = share_fn.call1(&navigator, &data);
            return;
          }
        }
      }
      let _ = dom::window().navigator().clipboard().write_text(&dom::window().location().href().unwrap_or_default());
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(copy) = dom::query("[data-copy-link]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let _ = dom::window().navigator().clipboard().write_text(&dom::window().location().href().unwrap_or_default());
    });
    let _ = copy.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

fn init_service_worker() {
  let navigator = dom::window().navigator();
  if !Reflect::has(&navigator, &JsValue::from_str("serviceWorker")).unwrap_or(false) {
    dom::set_text("[data-sw-status]", "Service worker not supported");
    set_button_disabled("[data-sw-update]", true);
    set_button_disabled("[data-sw-apply]", true);
    set_button_disabled("[data-pack-pdf-cache]", true);
    set_button_disabled("[data-pack-clear]", true);
    return;
  }
  let sw_container = navigator.service_worker();

  set_button_disabled("[data-sw-apply]", true);

  let sw_for_messages = sw_container.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
    if let Ok(data) = Reflect::get(&event, &JsValue::from_str("data")) {
      handle_sw_message(&data);
    }
  });
  let _ = sw_for_messages.add_event_listener_with_callback("message", cb.as_ref().unchecked_ref());
  cb.forget();

  let sw_for_controller = sw_container.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
    let _ = dom::window().location().reload();
  });
  let _ = sw_for_controller.add_event_listener_with_callback("controllerchange", cb.as_ref().unchecked_ref());
  cb.forget();

  let sw_register = sw_container.clone();
  spawn_local(async move {
    dom::set_text("[data-sw-status]", "Registering service worker...");
    let promise = sw_register.register("./sw.js");
    let reg = wasm_bindgen_futures::JsFuture::from(promise).await.ok();
    if let Some(reg) = reg.and_then(|val| val.dyn_into::<ServiceWorkerRegistration>().ok()) {
      dom::set_text("[data-sw-status]", "Service worker active");
      let waiting = Rc::new(RefCell::new(reg.waiting()));
      if waiting.borrow().is_some() {
        dom::set_text("[data-sw-status]", "Update ready. Apply to refresh.");
        set_button_disabled("[data-sw-apply]", false);
        reveal_update_banner();
      }
      wire_update_buttons(reg.clone(), waiting.clone());
      wire_pack_buttons();
      watch_for_updates(reg.clone(), waiting.clone());
      request_cache_stats();
      request_share_inbox();
    } else {
      dom::set_text("[data-sw-status]", "Service worker failed");
      set_button_disabled("[data-sw-update]", true);
      set_button_disabled("[data-sw-apply]", true);
      set_button_disabled("[data-pack-pdf-cache]", true);
      set_button_disabled("[data-pack-clear]", true);
    }
  });
}

fn wire_pack_buttons() {
  if let Some(btn) = dom::query("[data-pack-pdf-cache]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      dom::set_text("[data-pack-pdf-status]", "Caching...");
      request_pack_cache("pdf");
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-pack-clear]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      dom::set_text("[data-pack-pdf-status]", "Clearing...");
      request_clear_packs();
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

fn wire_update_buttons(reg: ServiceWorkerRegistration, waiting: Rc<RefCell<Option<ServiceWorker>>>) {
  if let Some(check) = dom::query("[data-sw-update]") {
    let reg_clone = reg.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      dom::set_text("[data-sw-status]", "Checking for updates...");
      let _ = reg_clone.update();
      request_cache_stats();
      request_share_inbox();
    });
    let _ = check.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(apply) = dom::query("[data-sw-apply]") {
    let reg_clone = reg.clone();
    let waiting_clone = waiting.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let worker = waiting_clone.borrow().clone().or_else(|| reg_clone.waiting());
      if worker.is_none() {
        dom::set_text("[data-sw-status]", "No update ready");
        return;
      }
      let worker = worker.unwrap();
      spawn_local(async move {
        if !migration_allows_update().await {
          dom::set_text("[data-sw-status]", "Update blocked: migration not verified");
          return;
        }
        let message = js_sys::Object::new();
        let _ = Reflect::set(&message, &JsValue::from_str("type"), &JsValue::from_str("SKIP_WAITING"));
        let _ = worker.post_message(&message);
        dom::set_text("[data-sw-status]", "Applying update...");
      });
    });
    let _ = apply.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

fn watch_for_updates(reg: ServiceWorkerRegistration, waiting: Rc<RefCell<Option<ServiceWorker>>>) {
  let reg_clone = reg.clone();
  let waiting_clone = waiting.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
    if let Some(worker) = reg_clone.installing() {
      dom::set_text("[data-sw-status]", "Update found. Installing...");
      let worker_clone = worker.clone();
      let reg_inner = reg_clone.clone();
      let waiting_inner = waiting_clone.clone();
      let cb_state = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        let state = Reflect::get(&worker_clone, &JsValue::from_str("state"))
          .ok()
          .and_then(|val| val.as_string())
          .unwrap_or_default();
        if state == "installed" {
          if has_sw_controller() {
            *waiting_inner.borrow_mut() = reg_inner.waiting().or(Some(worker_clone.clone()));
            dom::set_text("[data-sw-status]", "Update ready. Apply to refresh.");
            set_button_disabled("[data-sw-apply]", false);
            reveal_update_banner();
          } else {
            dom::set_text("[data-sw-status]", "Service worker installed for offline use.");
          }
        }
      });
      let _ = worker.add_event_listener_with_callback("statechange", cb_state.as_ref().unchecked_ref());
      cb_state.forget();
    }
  });
  let _ = reg.add_event_listener_with_callback("updatefound", cb.as_ref().unchecked_ref());
  cb.forget();
}

fn handle_sw_message(data: &JsValue) {
  let msg_type = Reflect::get(data, &JsValue::from_str("type"))
    .ok()
    .and_then(|val| val.as_string())
    .unwrap_or_default();
  match msg_type.as_str() {
    "CACHE_STATS" => {
      let cache_entries = Reflect::get(data, &JsValue::from_str("cacheEntries"))
        .ok()
        .and_then(|val| val.as_f64())
        .unwrap_or(0.0);
      let pack_entries = Reflect::get(data, &JsValue::from_str("packEntries"))
        .ok()
        .and_then(|val| val.as_f64())
        .unwrap_or(0.0);
      let precache_entries = Reflect::get(data, &JsValue::from_str("precacheEntries"))
        .ok()
        .and_then(|val| val.as_f64())
        .unwrap_or(0.0);
      let pdf_pack_entries = Reflect::get(data, &JsValue::from_str("pdfPackEntries"))
        .ok()
        .and_then(|val| val.as_f64())
        .unwrap_or(0.0);
      dom::set_text(
        "[data-sw-status]",
        &format!(
          "Cache ready (shell {} / {}, packs {})",
          cache_entries as i32,
          precache_entries as i32,
          pack_entries as i32
        ),
      );
      if let Some(el) = dom::query("[data-pack-pdf-status]") {
        let label = if pack_entries <= 0.0 {
          "Not cached".to_string()
        } else {
          format!("{} / {} files", pack_entries as i32, pdf_pack_entries as i32)
        };
        dom::set_text_el(&el, &label);
      }
    }
    "PACKS_CLEARED" => {
      dom::set_text("[data-sw-status]", "Offline packs cleared");
      dom::set_text("[data-pack-pdf-status]", "Not cached");
    }
    "PACK_STATUS" => {
      let pack = Reflect::get(data, &JsValue::from_str("pack"))
        .ok()
        .and_then(|val| val.as_string())
        .unwrap_or_default();
      let cached = Reflect::get(data, &JsValue::from_str("cached"))
        .ok()
        .and_then(|val| val.as_f64())
        .unwrap_or(0.0);
      let expected = Reflect::get(data, &JsValue::from_str("expected"))
        .ok()
        .and_then(|val| val.as_f64())
        .unwrap_or(0.0);
      let ok = Reflect::get(data, &JsValue::from_str("ok"))
        .ok()
        .and_then(|val| val.as_bool())
        .unwrap_or(false);
      let ms = Reflect::get(data, &JsValue::from_str("ms"))
        .ok()
        .and_then(|val| val.as_f64())
        .unwrap_or(0.0);
      if pack == "pdf" {
        let label = if ok {
          format!("Cached ({} files, {:.0} ms)", cached as i32, ms)
        } else {
          format!(
            "Partial ({} / {} files, {:.0} ms)",
            cached as i32,
            expected as i32,
            ms
          )
        };
        dom::set_text("[data-pack-pdf-status]", &label);
      }
    }
    "SYNC_COMPLETE" => {
      let synced = Reflect::get(data, &JsValue::from_str("synced"))
        .ok()
        .and_then(|val| val.as_f64())
        .unwrap_or(0.0);
      dom::set_text("[data-sw-status]", &format!("Synced {} sessions", synced as i32));
    }


"SHARE_PAYLOAD" => {
  dom::set_text("[data-sw-status]", "Share payload received");
  let entries_val = Reflect::get(data, &JsValue::from_str("entries")).ok();
  let entries = entries_val
    .map(|val| Array::from(&val))
    .unwrap_or_else(Array::new);
  let values: Vec<JsValue> = entries.iter().collect();
  let ids = extract_share_entry_ids(&values);
  spawn_local(async move {
    match storage::ingest_share_entries(values).await {
      Ok(_) => {
        acknowledge_share_entries(ids);
        dom::set_text("[data-sw-status]", "Share inbox updated");
        share_inbox::refresh();
      }
      Err(_) => {
        dom::set_text("[data-sw-status]", "Share inbox ingest failed");
      }
    }
  });
}

"SHARE_INBOX_UPDATED" => {
      dom::set_text("[data-sw-status]", "Share inbox updated");
      share_inbox::refresh();
    }
    _ => {}
  }
}


fn request_share_inbox() {
  let sw = dom::window().navigator().service_worker();
  if let Ok(controller) = Reflect::get(&sw, &JsValue::from_str("controller")) {
    if let Ok(worker) = controller.dyn_into::<ServiceWorker>() {
      let message = js_sys::Object::new();
      let _ = Reflect::set(&message, &JsValue::from_str("type"), &JsValue::from_str("REQUEST_SHARE_INBOX"));
      let _ = worker.post_message(&message);
    }
  }
}

fn request_pack_cache(pack: &str) {
  let sw = dom::window().navigator().service_worker();
  if let Ok(controller) = Reflect::get(&sw, &JsValue::from_str("controller")) {
    if let Ok(worker) = controller.dyn_into::<ServiceWorker>() {
      let message = js_sys::Object::new();
      let _ = Reflect::set(&message, &JsValue::from_str("type"), &JsValue::from_str("CACHE_PACK"));
      let _ = Reflect::set(&message, &JsValue::from_str("pack"), &JsValue::from_str(pack));
      let _ = worker.post_message(&message);
      return;
    }
  }
  dom::set_text("[data-pack-pdf-status]", "Service worker unavailable");
}

fn request_clear_packs() {
  let sw = dom::window().navigator().service_worker();
  if let Ok(controller) = Reflect::get(&sw, &JsValue::from_str("controller")) {
    if let Ok(worker) = controller.dyn_into::<ServiceWorker>() {
      let message = js_sys::Object::new();
      let _ = Reflect::set(&message, &JsValue::from_str("type"), &JsValue::from_str("CLEAR_PACKS"));
      let _ = worker.post_message(&message);
      return;
    }
  }
  dom::set_text("[data-pack-pdf-status]", "Service worker unavailable");
}

fn acknowledge_share_entries(ids: Vec<String>) {
  if ids.is_empty() {
    return;
  }
  let sw = dom::window().navigator().service_worker();
  if let Ok(controller) = Reflect::get(&sw, &JsValue::from_str("controller")) {
    if let Ok(worker) = controller.dyn_into::<ServiceWorker>() {
      let message = js_sys::Object::new();
      let _ = Reflect::set(&message, &JsValue::from_str("type"), &JsValue::from_str("ACK_SHARE_INBOX"));
      let ids_array = Array::new();
      for id in ids {
        ids_array.push(&JsValue::from_str(&id));
      }
      let _ = Reflect::set(&message, &JsValue::from_str("ids"), &ids_array);
      let _ = worker.post_message(&message);
    }
  }
}

fn extract_share_entry_ids(entries: &[JsValue]) -> Vec<String> {
  let mut ids = Vec::new();
  for entry in entries {
    if let Ok(id_val) = Reflect::get(entry, &JsValue::from_str("id")) {
      if let Some(id) = id_val.as_string() {
        ids.push(id);
      }
    }
  }
  ids
}

fn request_cache_stats() {
  let sw = dom::window().navigator().service_worker();
  if let Ok(controller) = Reflect::get(&sw, &JsValue::from_str("controller")) {
    if let Ok(worker) = controller.dyn_into::<ServiceWorker>() {
      let message = js_sys::Object::new();
      let _ = Reflect::set(&message, &JsValue::from_str("type"), &JsValue::from_str("CACHE_STATS"));
      let _ = worker.post_message(&message);
    }
  }
}


async fn migration_allows_update() -> bool {
  match db_migration::migration_summary().await {
    Ok(summary) => {
      if summary.started && !(summary.completed && summary.errors.is_empty() && summary.checksums_ok) {
        return false;
      }
      true
    }
    Err(_) => true,
  }
}

fn has_sw_controller() -> bool {
  let sw = dom::window().navigator().service_worker();
  Reflect::get(&sw, &JsValue::from_str("controller"))
    .ok()
    .map(|val| !val.is_null() && !val.is_undefined())
    .unwrap_or(false)
}

fn set_button_disabled(selector: &str, disabled: bool) {
  if let Some(button) = dom::query(selector) {
    if disabled {
      let _ = button.set_attribute("disabled", "true");
    } else {
      let _ = button.remove_attribute("disabled");
    }
  }
}

fn reveal_update_banner() {
  if let Some(banner) = dom::query("[data-update-banner]") {
    set_hidden(&banner, false);
  }
}

fn init_storage_status() {
  spawn_local(async move {
    let storage_manager = dom::window().navigator().storage();
    if let Ok(persisted) = storage_manager.persisted() {
      match wasm_bindgen_futures::JsFuture::from(persisted).await {
        Ok(result) => {
          let label = match result.as_bool() {
            Some(true) => "Yes",
            Some(false) => "No",
            None => "Unknown",
          };
          dom::set_text("[data-storage-persisted]", label);
        }
        Err(_) => {
          dom::set_text("[data-storage-persisted]", "Unknown");
        }
      }
    } else {
      dom::set_text("[data-storage-persisted]", "Unknown");
    }

    if let Ok(estimate) = storage_manager.estimate() {
      if let Ok(result) = wasm_bindgen_futures::JsFuture::from(estimate).await {
        let usage = js_sys::Reflect::get(&result, &"usage".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
        let quota = js_sys::Reflect::get(&result, &"quota".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
        let usage_mb = usage / (1024.0 * 1024.0);
        let quota_mb = quota / (1024.0 * 1024.0);
        let percent = if quota > 0.0 { usage / quota } else { 0.0 };
        let percent_value = (percent * 100.0).round().clamp(0.0, 100.0);
        dom::set_text("[data-storage-usage]", &format!("{:.1} MB", usage_mb));
        dom::set_text("[data-storage-quota]", &format!("{:.0} MB", quota_mb));
        dom::set_text("[data-storage-status]", &format!("Storage: {:.0}%", percent_value));
        let pressure = if percent_value >= 90.0 {
          "High"
        } else if percent_value >= 75.0 {
          "Moderate"
        } else {
          "Low"
        };
        dom::set_text("[data-storage-pressure]", pressure);
        if let Some(fill) = dom::query("[data-storage-fill]") {
          dom::set_style(&fill, "width", &format!("{:.0}%", percent_value));
        }
        if let Some(bar) = dom::query("[data-storage-bar]") {
          dom::set_style(&bar, "width", &format!("{:.0}%", percent_value));
        }
        dom::set_text("[data-offline-ready]", "Offline ready");
      }
    }
  });
}
