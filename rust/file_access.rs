use js_sys::{Array, Function, Object, Reflect, Uint8Array};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Blob, BlobPropertyBag, File};

use crate::dom;
use crate::storage;

const PREF_SAVE_KEY: &str = "pref:save-files";
const PREF_STARTIN_KEY: &str = "pref:save-startin";
const STATUS_SELECTOR: &str = "[data-export-status]";

thread_local! {
  static LAST_SAVE_HANDLE: std::cell::RefCell<Option<JsValue>> = const { std::cell::RefCell::new(None) };
}

pub fn prefers_save_to_files() -> bool {
  storage::local_get(PREF_SAVE_KEY).as_deref() == Some("true")
}

pub fn set_prefers_save_to_files(value: bool) {
  storage::local_set(PREF_SAVE_KEY, if value { "true" } else { "false" });
}

pub fn prefers_save_for(section: &str) -> bool {
  let key = format!("pref:save-files:{}", section);
  storage::local_get(&key).as_deref() == Some("true")
}

pub fn set_prefers_save_for(section: &str, value: bool) {
  let key = format!("pref:save-files:{}", section);
  storage::local_set(&key, if value { "true" } else { "false" });
}

pub fn supports_save_picker() -> bool {
  Reflect::has(&dom::window(), &JsValue::from_str("showSaveFilePicker")).unwrap_or(false)
}

pub fn supports_open_picker() -> bool {
  Reflect::has(&dom::window(), &JsValue::from_str("showOpenFilePicker")).unwrap_or(false)
}

pub async fn save_bytes(filename: &str, mime: &str, bytes: &[u8]) -> bool {
  if !supports_save_picker() {
    return false;
  }
  let window = dom::window();
  let picker = match Reflect::get(&window, &JsValue::from_str("showSaveFilePicker")) {
    Ok(val) => val,
    Err(_) => return false,
  };
  let picker = match picker.dyn_into::<Function>() {
    Ok(func) => func,
    Err(_) => return false,
  };

  let options = Object::new();
  let _ = Reflect::set(&options, &JsValue::from_str("suggestedName"), &JsValue::from_str(filename));
  if let Some(start_in) = storage::local_get(PREF_STARTIN_KEY) {
    let _ = Reflect::set(&options, &JsValue::from_str("startIn"), &JsValue::from_str(&start_in));
  }
  LAST_SAVE_HANDLE.with(|handle| {
    if let Some(value) = handle.borrow().as_ref() {
      let _ = Reflect::set(&options, &JsValue::from_str("startIn"), value);
    }
  });
  let types = Array::new();
  let type_entry = Object::new();
  let _ = Reflect::set(&type_entry, &JsValue::from_str("description"), &JsValue::from_str("Emerson export"));
  let accept = Object::new();
  let ext = extension_from_filename(filename);
  let ext_arr = Array::new();
  if let Some(ext) = ext {
    ext_arr.push(&JsValue::from_str(&ext));
  }
  let _ = Reflect::set(&accept, &JsValue::from_str(mime), &ext_arr);
  let _ = Reflect::set(&type_entry, &JsValue::from_str("accept"), &accept);
  types.push(&type_entry);
  let _ = Reflect::set(&options, &JsValue::from_str("types"), &types);

  let handle = match picker.call1(&window, &options.into()) {
    Ok(val) => val,
    Err(_) => return false,
  };
  let handle_promise = match handle.dyn_into::<js_sys::Promise>() {
    Ok(val) => val,
    Err(_) => return false,
  };
  let handle = match JsFuture::from(handle_promise).await {
    Ok(val) => val,
    Err(_) => return false,
  };
  LAST_SAVE_HANDLE.with(|slot| {
    *slot.borrow_mut() = Some(handle.clone());
  });
  let create_writable = Reflect::get(&handle, &JsValue::from_str("createWritable")).ok();
  let create_writable = match create_writable.and_then(|val| val.dyn_into::<Function>().ok()) {
    Some(func) => func,
    None => return false,
  };
  let writable = match create_writable.call0(&handle) {
    Ok(val) => val,
    Err(_) => return false,
  };
  let writable_promise = match writable.dyn_into::<js_sys::Promise>() {
    Ok(val) => val,
    Err(_) => return false,
  };
  let writable = match JsFuture::from(writable_promise).await {
    Ok(val) => val,
    Err(_) => return false,
  };
  let write = Reflect::get(&writable, &JsValue::from_str("write")).ok();
  let write = match write.and_then(|val| val.dyn_into::<Function>().ok()) {
    Some(func) => func,
    None => return false,
  };
  let array = Uint8Array::from(bytes);
  if write.call1(&writable, &array.into()).is_err() {
    return false;
  }
  let close = Reflect::get(&writable, &JsValue::from_str("close")).ok();
  let close = match close.and_then(|val| val.dyn_into::<Function>().ok()) {
    Some(func) => func,
    None => return false,
  };
  let _ = close.call0(&writable);
  storage::local_set(PREF_STARTIN_KEY, "documents");
  true
}

pub async fn open_file_with_types(description: &str, accept_types: &[(&str, &[&str])]) -> Option<File> {
  if !supports_open_picker() {
    return None;
  }
  let window = dom::window();
  let picker = Reflect::get(&window, &JsValue::from_str("showOpenFilePicker")).ok()?;
  let picker = picker.dyn_into::<Function>().ok()?;

  let options = Object::new();
  let types = Array::new();
  let type_entry = Object::new();
  let _ = Reflect::set(&type_entry, &JsValue::from_str("description"), &JsValue::from_str(description));
  let accept = Object::new();
  for (mime, exts) in accept_types {
    let ext_arr = Array::new();
    for ext in *exts {
      ext_arr.push(&JsValue::from_str(ext));
    }
    let _ = Reflect::set(&accept, &JsValue::from_str(mime), &ext_arr);
  }
  let _ = Reflect::set(&type_entry, &JsValue::from_str("accept"), &accept);
  types.push(&type_entry);
  let _ = Reflect::set(&options, &JsValue::from_str("types"), &types);
  let _ = Reflect::set(&options, &JsValue::from_str("multiple"), &JsValue::FALSE);

  let handles = picker.call1(&window, &options.into()).ok()?;
  let handles = JsFuture::from(handles.dyn_into::<js_sys::Promise>().ok()?).await.ok()?;
  let array = Array::from(&handles);
  let handle = array.get(0);
  let get_file = Reflect::get(&handle, &JsValue::from_str("getFile")).ok()?.dyn_into::<Function>().ok()?;
  let file_val = JsFuture::from(get_file.call0(&handle).ok()?.dyn_into::<js_sys::Promise>().ok()?).await.ok()?;
  file_val.dyn_into::<File>().ok()
}

pub fn download_bytes_fallback(filename: &str, mime: &str, bytes: &[u8]) -> bool {
  let array = Array::new();
  let data = Uint8Array::from(bytes);
  array.push(&data.buffer());
  let bag = BlobPropertyBag::new();
  bag.set_type(mime);
  let blob = match Blob::new_with_u8_array_sequence_and_options(&array, &bag) {
    Ok(blob) => blob,
    Err(_) => return false,
  };
  let url = match web_sys::Url::create_object_url_with_blob(&blob) {
    Ok(url) => url,
    Err(_) => return false,
  };
  let anchor = dom::document().create_element("a").ok();
  let anchor = match anchor.and_then(|el| el.dyn_into::<web_sys::HtmlElement>().ok()) {
    Some(el) => el,
    None => return false,
  };
  let _ = anchor.set_attribute("href", &url);
  let _ = anchor.set_attribute("download", filename);
  anchor.click();
  let _ = web_sys::Url::revoke_object_url(&url);
  true
}

pub async fn save_or_download(filename: &str, mime: &str, bytes: &[u8]) -> bool {
  if prefers_save_to_files() && supports_save_picker() {
    if save_bytes(filename, mime, bytes).await {
      set_status(&format!("Saved {}", filename));
      return true;
    }
  }
  let ok = download_bytes_fallback(filename, mime, bytes);
  let status = if ok {
    format!("Downloaded {}", filename)
  } else {
    "Export failed".to_string()
  };
  set_status(&status);
  ok
}

pub async fn save_or_download_force(filename: &str, mime: &str, bytes: &[u8]) -> bool {
  if supports_save_picker() {
    if save_bytes(filename, mime, bytes).await {
      set_status(&format!("Saved {}", filename));
      return true;
    }
  }
  let ok = download_bytes_fallback(filename, mime, bytes);
  let status = if ok {
    format!("Downloaded {}", filename)
  } else {
    "Export failed".to_string()
  };
  set_status(&status);
  ok
}

fn extension_from_filename(filename: &str) -> Option<String> {
  let parts: Vec<&str> = filename.rsplitn(2, '.').collect();
  if parts.len() < 2 {
    return None;
  }
  Some(format!(".{}", parts[0]))
}

fn set_status(message: &str) {
  dom::set_text(STATUS_SELECTOR, message);
  dom::toast(message);
}
