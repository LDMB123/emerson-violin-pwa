use std::cell::RefCell;
use std::rc::Rc;

use js_sys::Reflect;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Blob, Event, HtmlInputElement};

use crate::dom;
use crate::backup;
use crate::file_access;
use crate::state::AppState;
use crate::storage;

const SCORE_LIBRARY_XML_KEY: &str = "score-library:include-xml";
const SCORE_LIBRARY_PDF_KEY: &str = "score-library:include-pdf";

pub fn init(_state: Rc<RefCell<AppState>>) {
  if dom::query("[data-score-library-list]").is_none() {
    return;
  }
  init_section_toggle();
  init_export_toggles();
  refresh();

  if let Some(btn) = dom::query("[data-score-library-refresh]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      refresh();
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-score-library-clear]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        let _ = storage::clear_scores().await;
        refresh();
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-score-library-export-zip]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      spawn_local(async move {
        export_zip().await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

fn init_section_toggle() {
  if let Some(toggle) = dom::query("[data-save-files-section=\"score-library\"]") {
    if let Ok(input) = toggle.dyn_into::<HtmlInputElement>() {
      input.set_checked(file_access::prefers_save_for("score-library"));
      let input_clone = input.clone();
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        file_access::set_prefers_save_for("score-library", input_clone.checked());
      });
      let _ = input.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref());
      cb.forget();
    }
  }
}

fn init_export_toggles() {
  if let Some(input) = dom::query("[data-score-library-include-xml]").and_then(|el| el.dyn_into::<HtmlInputElement>().ok()) {
    let checked = storage::local_get(SCORE_LIBRARY_XML_KEY)
      .map(|val| val == "true")
      .unwrap_or(true);
    input.set_checked(checked);
    let input_clone = input.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      storage::local_set(SCORE_LIBRARY_XML_KEY, if input_clone.checked() { "true" } else { "false" });
    });
    let _ = input.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(input) = dom::query("[data-score-library-include-pdf]").and_then(|el| el.dyn_into::<HtmlInputElement>().ok()) {
    let checked = storage::local_get(SCORE_LIBRARY_PDF_KEY)
      .map(|val| val == "true")
      .unwrap_or(true);
    input.set_checked(checked);
    let input_clone = input.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      storage::local_set(SCORE_LIBRARY_PDF_KEY, if input_clone.checked() { "true" } else { "false" });
    });
    let _ = input.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

pub fn refresh() {
  spawn_local(async move {
    let scores = storage::get_scores().await.unwrap_or_default();
    render(&scores);
  });
}

fn render(scores: &[JsValue]) {
  let list = match dom::query("[data-score-library-list]") {
    Some(el) => el,
    None => return,
  };
  list.set_inner_html("");
  if scores.is_empty() {
    list.set_inner_html("<li class=\"empty\">No scores loaded yet.</li>");
    dom::set_text("[data-score-library-count]", "0 scores");
    return;
  }

  dom::set_text("[data-score-library-count]", &format!("{} scores", scores.len()));
  let mut sorted: Vec<&JsValue> = scores.iter().collect();
  sorted.sort_by(|a, b| {
    let a_ts = js_sys::Reflect::get(a, &"created_at".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
    let b_ts = js_sys::Reflect::get(b, &"created_at".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
    b_ts.partial_cmp(&a_ts).unwrap_or(std::cmp::Ordering::Equal)
  });

  for score in sorted.iter() {
    let id = js_sys::Reflect::get(score, &"id".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
    let title = js_sys::Reflect::get(score, &"title".into()).ok().and_then(|v| v.as_string()).unwrap_or_else(|| "Score".into());
    let measures = js_sys::Reflect::get(score, &"measures".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
    let source = js_sys::Reflect::get(score, &"source".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
    let xml = js_sys::Reflect::get(score, &"xml".into()).ok().and_then(|v| v.as_string());
    let pdf_blob = js_sys::Reflect::get(score, &"pdf_blob".into())
      .ok()
      .and_then(|v| v.dyn_into::<web_sys::Blob>().ok());

    let li = dom::document().create_element("li").unwrap();
    li.set_class_name("resource-list");

    let label = dom::document().create_element("span").unwrap();
    let label_text = if source == "pdf" {
      format!("{} • PDF score", title)
    } else {
      format!("{} • {} measures", title, measures as i32)
    };
    label.set_text_content(Some(&label_text));
    li.append_child(&label).ok();

    if source != "pdf" {
      let use_btn = dom::document().create_element("button").unwrap();
      use_btn.set_class_name("btn btn-ghost");
      use_btn.set_text_content(Some("Use"));
      let score_clone = (*score).clone();
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        let detail = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&detail, &"entry".into(), &score_clone);
        let init = web_sys::CustomEventInit::new();
        init.set_detail(&detail.into());
        if let Ok(event) = web_sys::CustomEvent::new_with_event_init_dict("score-load", &init) {
          let _ = dom::window().dispatch_event(&event);
        }
      });
      use_btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref()).ok();
      cb.forget();
      li.append_child(&use_btn).ok();

      if let Some(xml_text) = xml.clone() {
        let save_btn = dom::document().create_element("button").unwrap();
        save_btn.set_class_name("btn btn-ghost");
        save_btn.set_text_content(Some("Save MusicXML"));
        let title_clone = title.clone();
        let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
          let filename = format!("{}.musicxml", title_clone);
          let xml_bytes = xml_text.as_bytes().to_vec();
          spawn_local(async move {
            let _ = file_access::save_or_download_force(&filename, "application/vnd.recordare.musicxml+xml", &xml_bytes).await;
            dom::set_text("[data-score-library-status]", "MusicXML saved.");
          });
        });
        save_btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref()).ok();
        cb.forget();
        li.append_child(&save_btn).ok();
      }
    }

    if let Some(blob) = pdf_blob {
      let link = dom::document().create_element("a").unwrap();
      link.set_class_name("btn btn-ghost");
      link.set_text_content(Some("Open PDF"));
      let _ = link.set_attribute("download", &format!("{}.pdf", title));
      if let Ok(url) = web_sys::Url::create_object_url_with_blob(&blob) {
        let _ = link.set_attribute("href", &url);
        let _ = link.set_attribute("target", "_blank");
      }
      li.append_child(&link).ok();

      let save_btn = dom::document().create_element("button").unwrap();
      save_btn.set_class_name("btn btn-ghost");
      save_btn.set_text_content(Some("Save PDF"));
      let blob_clone = blob.clone();
      let title_clone = title.clone();
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        let blob_clone = blob_clone.clone();
        let title_clone = title_clone.clone();
        spawn_local(async move {
          if let Some(bytes) = blob_to_bytes(&blob_clone).await {
            let filename = format!("{}.pdf", title_clone);
            let _ = file_access::save_or_download_force(&filename, "application/pdf", &bytes).await;
            dom::set_text("[data-score-library-status]", "PDF saved.");
          }
        });
      });
      save_btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref()).ok();
      cb.forget();
      li.append_child(&save_btn).ok();
    }

    let rename_btn = dom::document().create_element("button").unwrap();
    rename_btn.set_class_name("btn btn-ghost");
    rename_btn.set_text_content(Some("Rename"));
    let score_clone = (*score).clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      if let Some(name) = dom::window().prompt_with_message("New score title").ok().flatten() {
        let payload = score_clone.clone();
        let _ = js_sys::Reflect::set(&payload, &"title".into(), &JsValue::from_str(&name));
        spawn_local(async move {
          let _ = storage::save_score_entry(&payload).await;
          refresh();
        });
      }
    });
    rename_btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref()).ok();
    cb.forget();
    li.append_child(&rename_btn).ok();

    let delete_btn = dom::document().create_element("button").unwrap();
    delete_btn.set_class_name("btn btn-ghost");
    delete_btn.set_text_content(Some("Delete"));
    let id_delete = id.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let id_delete = id_delete.clone();
      spawn_local(async move {
        let _ = storage::delete_score_entry(&id_delete).await;
        refresh();
      });
    });
    delete_btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref()).ok();
    cb.forget();
    li.append_child(&delete_btn).ok();

    list.append_child(&li).ok();
  }
}

async fn blob_to_bytes(blob: &Blob) -> Option<Vec<u8>> {
  let array_buffer = js_sys::Reflect::get(blob, &JsValue::from_str("arrayBuffer")).ok()?;
  let func = array_buffer.dyn_into::<js_sys::Function>().ok()?;
  let promise = func.call0(blob).ok()?.dyn_into::<js_sys::Promise>().ok()?;
  let buffer = JsFuture::from(promise).await.ok()?.dyn_into::<js_sys::ArrayBuffer>().ok()?;
  let uint = js_sys::Uint8Array::new(&buffer);
  let mut data = vec![0u8; uint.length() as usize];
  uint.copy_to(&mut data);
  Some(data)
}

async fn export_zip() {
  let scores = storage::get_scores().await.unwrap_or_default();
  if scores.is_empty() {
    dom::set_text("[data-score-library-status]", "No scores to export.");
    return;
  }
  let include_xml = dom::query("[data-score-library-include-xml]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .map(|input| input.checked())
    .unwrap_or(true);
  let include_pdf = dom::query("[data-score-library-include-pdf]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .map(|input| input.checked())
    .unwrap_or(true);
  if !include_xml && !include_pdf {
    dom::set_text("[data-score-library-status]", "Select MusicXML or PDF to export.");
    return;
  }
  let mut entries: Vec<backup::ZipEntry> = Vec::new();

  for score in scores.iter() {
    let id = Reflect::get(score, &"id".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
    let title = Reflect::get(score, &"title".into()).ok().and_then(|v| v.as_string()).unwrap_or_else(|| "score".into());
    let xml = Reflect::get(score, &"xml".into()).ok().and_then(|v| v.as_string());
    let pdf_blob = Reflect::get(score, &"pdf_blob".into()).ok().and_then(|v| v.dyn_into::<web_sys::Blob>().ok());
    let base = sanitize_filename(&title, &id);

    if include_xml {
      if let Some(xml_text) = xml {
      let filename = format!("scores/{}.musicxml", base);
      entries.push(backup::ZipEntry::new(&filename, xml_text.as_bytes().to_vec()));
      }
    }

    if include_pdf {
      if let Some(blob) = pdf_blob {
        if let Some(bytes) = blob_to_bytes(&blob).await {
          let filename = format!("scores/{}.pdf", base);
          entries.push(backup::ZipEntry::new(&filename, bytes));
        }
      }
    }
  }

  if entries.is_empty() {
    dom::set_text("[data-score-library-status]", "No score files available.");
    return;
  }

  let zip_bytes = backup::build_zip(entries);
  let force = file_access::prefers_save_for("score-library");
  let _ = if force {
    file_access::save_or_download_force("emerson-score-library.zip", "application/zip", &zip_bytes).await
  } else {
    file_access::save_or_download("emerson-score-library.zip", "application/zip", &zip_bytes).await
  };
  dom::set_text(
    "[data-score-library-status]",
    if force { "Saved score library ZIP to Files." } else { "Downloaded score library ZIP." },
  );
}

fn sanitize_filename(title: &str, fallback: &str) -> String {
  let trimmed = title.trim();
  let mut safe = String::new();
  for ch in trimmed.chars() {
    if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
      safe.push(ch);
    } else if ch.is_whitespace() {
      safe.push('-');
    }
  }
  if safe.is_empty() {
    format!("score-{}", fallback)
  } else {
    safe
  }
}
