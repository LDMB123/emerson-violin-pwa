use wasm_bindgen::JsCast;
use wasm_bindgen_futures::JsFuture;

use crate::dom;

pub fn init() {
  if dom::query("[data-docs-content]").is_none() {
    return;
  }
  wasm_bindgen_futures::spawn_local(async move {
    let window = dom::window();
    let resp = match JsFuture::from(window.fetch_with_str("./docs/api.md")).await {
      Ok(val) => val,
      Err(_) => {
        dom::set_text("[data-docs-content]", "Docs unavailable.");
        return;
      }
    };
    let resp: web_sys::Response = match resp.dyn_into() {
      Ok(val) => val,
      Err(_) => {
        dom::set_text("[data-docs-content]", "Docs unavailable.");
        return;
      }
    };
    let text = match resp.text() {
      Ok(promise) => promise,
      Err(_) => {
        dom::set_text("[data-docs-content]", "Docs unavailable.");
        return;
      }
    };
    let text = match JsFuture::from(text).await {
      Ok(val) => val.as_string().unwrap_or_default(),
      Err(_) => String::new(),
    };
    let mut html_out = String::new();
    let parser = pulldown_cmark::Parser::new(&text);
    pulldown_cmark::html::push_html(&mut html_out, parser);
    if let Some(el) = dom::query("[data-docs-content]") {
      el.set_inner_html(&html_out);
    }
  });
}
