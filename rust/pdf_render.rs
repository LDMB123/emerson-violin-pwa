use js_sys::Reflect;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use web_sys::Blob;

use crate::dom;

fn pdf_api() -> Option<JsValue> {
  Reflect::get(&dom::window(), &JsValue::from_str("EmersonPdf")).ok()
}

pub fn load_pdf(blob: &Blob) -> bool {
  let api = match pdf_api() {
    Some(api) => api,
    None => return false,
  };
  let load = Reflect::get(&api, &JsValue::from_str("load")).ok();
  let load = match load.and_then(|val| val.dyn_into::<js_sys::Function>().ok()) {
    Some(func) => func,
    None => return false,
  };
  let _ = load.call1(&api, &blob.clone().into());
  true
}

#[allow(dead_code)]
pub fn set_page(page: usize) -> bool {
  let api = match pdf_api() {
    Some(api) => api,
    None => return false,
  };
  let func = Reflect::get(&api, &JsValue::from_str("setPage")).ok();
  let func = match func.and_then(|val| val.dyn_into::<js_sys::Function>().ok()) {
    Some(func) => func,
    None => return false,
  };
  let _ = func.call1(&api, &JsValue::from_f64(page as f64));
  true
}

pub fn next_page() -> bool {
  let api = match pdf_api() {
    Some(api) => api,
    None => return false,
  };
  let func = Reflect::get(&api, &JsValue::from_str("nextPage")).ok();
  let func = match func.and_then(|val| val.dyn_into::<js_sys::Function>().ok()) {
    Some(func) => func,
    None => return false,
  };
  let _ = func.call0(&api);
  true
}

pub fn prev_page() -> bool {
  let api = match pdf_api() {
    Some(api) => api,
    None => return false,
  };
  let func = Reflect::get(&api, &JsValue::from_str("prevPage")).ok();
  let func = match func.and_then(|val| val.dyn_into::<js_sys::Function>().ok()) {
    Some(func) => func,
    None => return false,
  };
  let _ = func.call0(&api);
  true
}
