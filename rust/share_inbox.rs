use wasm_bindgen::JsCast;
use wasm_bindgen_futures::JsFuture;
use js_sys::{Object, Reflect};
use web_sys::Event;

use crate::dom;
use crate::file_access;
use crate::platform;
use crate::storage::{self, ShareItem};

pub fn init() {
  if dom::query("[data-share-inbox-list]").is_none() {
    return;
  }

  refresh();

  if let Some(btn) = dom::query("[data-share-inbox-refresh]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      request_sw_share_inbox();
      request_sw_share_inbox_stats();
      refresh();
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-share-inbox-clear]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      wasm_bindgen_futures::spawn_local(async move {
        let _ = storage::clear_share_inbox().await;
        refresh();
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-share-staging-clear]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      send_sw_message("CLEAR_SHARE_INBOX");
      request_sw_share_inbox_stats();
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

pub fn refresh() {
  wasm_bindgen_futures::spawn_local(async move {
    match storage::get_share_inbox().await {
      Ok(items) => render_list(&items),
      Err(_) => render_error(),
    }
  });
}

fn render_error() {
  if let Some(list) = dom::query("[data-share-inbox-list]") {
    list.set_inner_html("<li class=\"empty\">Share inbox unavailable.</li>");
  }
  set_count(0);
  platform::set_badge_source("share_inbox", 0);
}

fn render_list(items: &[ShareItem]) {
  let list = match dom::query("[data-share-inbox-list]") {
    Some(el) => el,
    None => return,
  };
  list.set_inner_html("");
  set_count(items.len());
  platform::set_badge_source("share_inbox", items.len());
  if items.is_empty() {
    list.set_inner_html("<li class=\"empty\">No shared files yet.</li>");
    return;
  }

  for item in items.iter() {
    let li = dom::document().create_element("li").unwrap();
    li.set_class_name("resource-list");

    let info = dom::document().create_element("div").unwrap();
    info.set_class_name("resource-info");

    let title = dom::document().create_element("strong").unwrap();
    title.set_text_content(Some(&item.name));
    info.append_child(&title).ok();

    let meta = dom::document().create_element("small").unwrap();
    meta.set_text_content(Some(&format!(
      "{} • {} • {}",
      format_size(item.size),
      item.mime,
      format_date(item.created_at)
    )));
    info.append_child(&meta).ok();

    li.append_child(&info).ok();

    if let Some(blob) = &item.blob {
      let link = dom::document().create_element("a").unwrap();
      link.set_class_name("btn btn-ghost");
      link.set_text_content(Some("Download"));
      let _ = link.set_attribute("download", &item.name);
      if let Ok(url) = web_sys::Url::create_object_url_with_blob(blob) {
        let _ = link.set_attribute("href", &url);
      }
      li.append_child(&link).ok();

      let save_btn = dom::document().create_element("button").unwrap();
      save_btn.set_class_name("btn btn-ghost");
      save_btn.set_text_content(Some("Save to Files"));
      let blob_clone = blob.clone();
      let name_clone = item.name.clone();
      let mime_clone = item.mime.clone();
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        let blob_clone = blob_clone.clone();
        let name_clone = name_clone.clone();
        let mime_clone = mime_clone.clone();
        wasm_bindgen_futures::spawn_local(async move {
          if let Some(bytes) = blob_to_bytes(&blob_clone).await {
            let _ = file_access::save_or_download_force(&name_clone, &mime_clone, &bytes).await;
          }
        });
      });
      save_btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref()).ok();
      cb.forget();
      li.append_child(&save_btn).ok();
    }

    let del = dom::document().create_element("button").unwrap();
    del.set_class_name("btn btn-ghost");
    del.set_text_content(Some("Remove"));
    let id = item.id.clone();
    let del_cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let id = id.clone();
      wasm_bindgen_futures::spawn_local(async move {
        let _ = storage::delete_share_item(&id).await;
        refresh();
      });
    });
    del.add_event_listener_with_callback("click", del_cb.as_ref().unchecked_ref()).ok();
    del_cb.forget();
    li.append_child(&del).ok();

    list.append_child(&li).ok();
  }
}

async fn blob_to_bytes(blob: &web_sys::Blob) -> Option<Vec<u8>> {
  let array_buffer = js_sys::Reflect::get(blob, &"arrayBuffer".into()).ok()?;
  let func = array_buffer.dyn_into::<js_sys::Function>().ok()?;
  let promise = func.call0(blob).ok()?.dyn_into::<js_sys::Promise>().ok()?;
  let buffer = JsFuture::from(promise).await.ok()?.dyn_into::<js_sys::ArrayBuffer>().ok()?;
  let uint = js_sys::Uint8Array::new(&buffer);
  let mut data = vec![0u8; uint.length() as usize];
  uint.copy_to(&mut data);
  Some(data)
}

fn set_count(count: usize) {
  dom::set_text("[data-share-inbox-count]", &format!("{} items", count));
}

fn format_size(bytes: f64) -> String {
  let kb = bytes / 1024.0;
  if kb >= 1024.0 {
    format!("{:.1} MB", kb / 1024.0)
  } else if kb >= 1.0 {
    format!("{:.0} KB", kb)
  } else {
    format!("{:.0} B", bytes)
  }
}

fn format_date(timestamp: f64) -> String {
  let date = js_sys::Date::new(&wasm_bindgen::JsValue::from_f64(timestamp));
  date.to_locale_string("en-US", &js_sys::Object::new()).into()
}

fn request_sw_share_inbox() {
  send_sw_message("REQUEST_SHARE_INBOX");
}

fn request_sw_share_inbox_stats() {
  send_sw_message("SHARE_INBOX_STATS");
}

fn send_sw_message(msg_type: &str) {
  let sw = dom::window().navigator().service_worker();
  let controller = Reflect::get(&sw, &"controller".into()).ok();
  let controller = match controller.and_then(|val| val.dyn_into::<web_sys::ServiceWorker>().ok()) {
    Some(controller) => controller,
    None => return,
  };
  let message = Object::new();
  let _ = Reflect::set(&message, &"type".into(), &msg_type.into());
  let _ = controller.post_message(&message);
}
