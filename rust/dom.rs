use wasm_bindgen::JsCast;
use web_sys::{Document, Element, HtmlElement, Window};

pub fn window() -> Window {
  web_sys::window().expect("window unavailable")
}

pub fn document() -> Document {
  window().document().expect("document unavailable")
}

pub fn query(selector: &str) -> Option<Element> {
  document().query_selector(selector).ok().flatten()
}

pub fn query_all(selector: &str) -> Vec<Element> {
  document()
    .query_selector_all(selector)
    .map(|list| {
      let mut out = Vec::new();
      for idx in 0..list.length() {
        if let Some(node) = list.get(idx) {
          if let Ok(el) = node.dyn_into::<Element>() {
            out.push(el);
          }
        }
      }
      out
    })
    .unwrap_or_default()
}

pub fn set_text(selector: &str, text: &str) {
  if let Some(el) = query(selector) {
    el.set_text_content(Some(text));
  }
}

pub fn set_text_el(el: &Element, text: &str) {
  el.set_text_content(Some(text));
}

pub fn set_attr(el: &Element, name: &str, value: &str) {
  let _ = el.set_attribute(name, value);
}

pub fn set_dataset(el: &Element, key: &str, value: &str) {
  if let Ok(html) = el.clone().dyn_into::<HtmlElement>() {
    let dataset = html.dataset();
    let _ = dataset.set(key, value);
  }
}

pub fn set_style(el: &Element, name: &str, value: &str) {
  if let Ok(html) = el.clone().dyn_into::<HtmlElement>() {
    let _ = html.style().set_property(name, value);
  }
}

pub fn is_standalone() -> bool {
  let window = window();
  let standalone = window
    .match_media("(display-mode: standalone)")
    .ok()
    .flatten()
    .map(|mq| mq.matches())
    .unwrap_or(false);
  let ios = js_sys::Reflect::get(&window.navigator(), &"standalone".into())
    .ok()
    .and_then(|val| val.as_bool())
    .unwrap_or(false);
  standalone || ios
}
