use std::cell::RefCell;
use std::rc::Rc;

use js_sys::Reflect;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;
use web_sys::{DomParser, Event, File, FileReader, HtmlInputElement, SupportedType};

use crate::dom;
use crate::pdf_render;
use crate::score_library;
use crate::state::AppState;
use crate::storage;
use crate::utils;

const ONSET_THRESHOLD: f64 = 18.0;
const MIN_ONSET_GAP_MS: f64 = 250.0;
const MEASURES_PER_PAGE: usize = 4;

fn is_online() -> bool {
  let navigator = dom::window().navigator();
  Reflect::get(&navigator, &JsValue::from_str("onLine"))
    .ok()
    .and_then(|val| val.as_bool())
    .unwrap_or(true)
}

fn pdf_pack_cached() -> bool {
  dom::query("[data-pack-pdf-status]")
    .and_then(|el| el.get_attribute("data-pack-state"))
    .map(|state| state == "cached")
    .unwrap_or(false)
}

#[derive(Default)]
struct ScoreFollowState {
  active: bool,
  total_measures: usize,
  current_measure: usize,
  beats_per_measure: usize,
  beat_count: usize,
  tempo_bpm: f64,
  last_onset: f64,
  start_time: Option<f64>,
  onsets: Vec<f64>,
  last_update: f64,
  is_pdf: bool,
  pdf_pages: usize,
  pdf_page: usize,
  score_id: Option<String>,
  title: String,
  listener: Option<wasm_bindgen::closure::Closure<dyn FnMut(Event)>>,
}

pub fn init(state: Rc<RefCell<AppState>>) {
  if dom::query("[data-score-load]").is_none() {
    return;
  }

  let score_state = Rc::new(RefCell::new(ScoreFollowState::default()));

  if let Some(btn) = dom::query("[data-score-load]") {
    let score_state = score_state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let score_state = score_state.clone();
      spawn_local(async move {
        load_score(&score_state).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-score-start]") {
    let score_state = score_state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      start_following(&score_state);
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-score-stop]") {
    let score_state = score_state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      stop_following(&score_state, "Stopped");
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  let score_state_for_load = score_state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
    let detail = Reflect::get(&event, &"detail".into()).ok().unwrap_or(JsValue::UNDEFINED);
    let entry = Reflect::get(&detail, &"entry".into()).ok().unwrap_or(JsValue::UNDEFINED);
    if entry.is_undefined() || entry.is_null() {
      return;
    }
    apply_score_entry(&score_state_for_load, &entry);
  });
  let _ = dom::window().add_event_listener_with_callback("score-load", cb.as_ref().unchecked_ref());
  cb.forget();

  let score_state_for_pdf = score_state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
    let detail = Reflect::get(&event, &"detail".into()).ok().unwrap_or(JsValue::UNDEFINED);
    let pages = Reflect::get(&detail, &"pages".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0) as usize;
    if pages == 0 {
      return;
    }
    let mut score = score_state_for_pdf.borrow_mut();
    score.is_pdf = true;
    score.pdf_pages = pages;
    score.pdf_page = 1;
    score.total_measures = pages * MEASURES_PER_PAGE;
    score.current_measure = 1;
    score.beat_count = 0;
    drop(score);
    dom::set_text("[data-score-count]", &format!("{} pages", pages));
    dom::set_text("[data-score-current]", "1");
    update_progress(1, pages * MEASURES_PER_PAGE);
    render_score_visual(pages * MEASURES_PER_PAGE, 1, true, 1, pages);
  });
  let _ = dom::window().add_event_listener_with_callback("pdf-ready", cb.as_ref().unchecked_ref());
  cb.forget();

  let score_state_for_page = score_state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
    let detail = Reflect::get(&event, &"detail".into()).ok().unwrap_or(JsValue::UNDEFINED);
    let page = Reflect::get(&detail, &"page".into()).ok().and_then(|v| v.as_f64()).unwrap_or(1.0) as usize;
    let pages = Reflect::get(&detail, &"pages".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0) as usize;
    let mut score = score_state_for_page.borrow_mut();
    if !score.is_pdf {
      return;
    }
    score.pdf_page = page.max(1);
    if pages > 0 {
      score.pdf_pages = pages;
    }
    drop(score);
    render_score_visual(
      score_state_for_page.borrow().total_measures,
      score_state_for_page.borrow().current_measure,
      true,
      page.max(1),
      score_state_for_page.borrow().pdf_pages,
    );
  });
  let _ = dom::window().add_event_listener_with_callback("pdf-page", cb.as_ref().unchecked_ref());
  cb.forget();

  let score_state_for_error = score_state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
    let detail = Reflect::get(&event, &"detail".into()).ok().unwrap_or(JsValue::UNDEFINED);
    let message = Reflect::get(&detail, &"message".into())
      .ok()
      .and_then(|val| val.as_string())
      .unwrap_or_else(|| "PDF render failed".to_string());
    dom::toast("PDF render failed. If offline, cache the PDF offline pack first.");
    stop_following(&score_state_for_error, "PDF error");
    dom::set_text("[data-score-status]", &message);
  });
  let _ = dom::window().add_event_listener_with_callback("pdf-error", cb.as_ref().unchecked_ref());
  cb.forget();

  if !state.borrow().config.features.score_following {
    dom::set_text("[data-score-status]", "Disabled in config");
  }

  if let Some(btn) = dom::query("[data-score-pdf-prev]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      pdf_render::prev_page();
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
  if let Some(btn) = dom::query("[data-score-pdf-next]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      pdf_render::next_page();
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }
}

pub fn import_musicxml_text(name: &str, xml: &str) {
  if let Some((measures, beats, tempo, title)) = parse_musicxml(xml, name) {
    let id = utils::create_id();
    save_score_entry(&id, &title, measures, beats, tempo, xml);
    dom::set_text("[data-score-status]", &format!("Imported: {}", title));
    dom::set_text("[data-score-count]", &format!("{}", measures));
    dom::set_text("[data-score-current]", "0");
    update_progress(0, measures);
    render_score_visual(measures, 0, false, 0, 0);
  } else {
    dom::set_text("[data-score-status]", "Invalid MusicXML");
  }
}

async fn load_score(score_state: &Rc<RefCell<ScoreFollowState>>) {
  let file = dom::query("[data-score-file]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .and_then(|input| input.files())
    .and_then(|list| list.get(0));
  let file = match file {
    Some(file) => file,
    None => {
      dom::set_text("[data-score-status]", "Select a MusicXML or PDF file");
      return;
    }
  };

  let file_name = file.name();
  if file_name.to_lowercase().ends_with(".pdf") {
    import_pdf_score(&file, &file_name).await;
    return;
  }

  let reader = match FileReader::new() {
    Ok(reader) => reader,
    Err(_) => {
      dom::set_text("[data-score-status]", "Reader unavailable");
      return;
    }
  };

  let score_state_clone = score_state.clone();
  let reader_clone = reader.clone();
  let onload = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::once(move |_event| {
    let text = reader_clone.result().ok().and_then(|val| val.as_string()).unwrap_or_default();
    match parse_musicxml(&text, &file_name) {
      Some((measures, beats, tempo, title)) => {
        let mut score = score_state_clone.borrow_mut();
        score.total_measures = measures.max(1);
        score.current_measure = 0;
        score.beats_per_measure = beats.max(1);
        score.beat_count = 0;
        score.tempo_bpm = tempo;
        score.title = title.clone();
        let id = utils::create_id();
        score.score_id = Some(id.clone());
        score.is_pdf = false;
        score.pdf_pages = 0;
        score.pdf_page = 0;
        score.onsets.clear();
        score.start_time = None;
        drop(score);
        dom::set_text("[data-score-status]", &format!("Loaded: {}", title));
        dom::set_text("[data-score-count]", &format!("{}", measures));
        dom::set_text("[data-score-current]", "0");
        update_progress(0, measures);
        render_score_visual(measures, 0, false, 0, 0);
        save_score_entry(&id, &title, measures, beats, tempo, &text);
      }
      None => {
        dom::set_text("[data-score-status]", "Invalid MusicXML");
      }
    }
  });

  reader.set_onload(Some(onload.as_ref().unchecked_ref()));
  onload.forget();
  let _ = reader.read_as_text(&file);
}

pub async fn import_pdf_score(file: &File, name: &str) {
  let payload = js_sys::Object::new();
  let id = utils::create_id();
  let _ = Reflect::set(&payload, &"id".into(), &JsValue::from_str(&id));
  let _ = Reflect::set(&payload, &"title".into(), &JsValue::from_str(name));
  let _ = Reflect::set(&payload, &"measures".into(), &JsValue::from_f64(0.0));
  let _ = Reflect::set(&payload, &"beats_per_measure".into(), &JsValue::from_f64(0.0));
  let _ = Reflect::set(&payload, &"tempo_bpm".into(), &JsValue::from_f64(0.0));
  let _ = Reflect::set(&payload, &"created_at".into(), &JsValue::from_f64(js_sys::Date::now()));
  let _ = Reflect::set(&payload, &"source".into(), &JsValue::from_str("pdf"));
  let _ = Reflect::set(&payload, &"filename".into(), &JsValue::from_str(name));
  let _ = Reflect::set(&payload, &"pdf_blob".into(), &file.clone().into());
  spawn_local(async move {
    let _ = storage::save_score_entry(&payload.into()).await;
    score_library::refresh();
  });
  dom::set_text("[data-score-status]", "PDF stored in score library");
}

fn parse_musicxml(xml: &str, fallback_title: &str) -> Option<(usize, usize, f64, String)> {
  let parser = DomParser::new().ok()?;
  let doc = parser.parse_from_string(xml, SupportedType::ApplicationXml).ok()?;
  if doc.get_elements_by_tag_name("parsererror").length() > 0 {
    return None;
  }
  let measures = doc.get_elements_by_tag_name("measure").length() as usize;
  let title = doc
    .get_elements_by_tag_name("work-title")
    .item(0)
    .and_then(|node: web_sys::Element| node.text_content())
    .filter(|t: &String| !t.trim().is_empty())
    .unwrap_or_else(|| fallback_title.to_string());
  let beats = doc
    .get_elements_by_tag_name("beats")
    .item(0)
    .and_then(|node: web_sys::Element| node.text_content())
    .and_then(|text: String| text.trim().parse::<usize>().ok())
    .unwrap_or(4);
  let tempo = doc
    .get_elements_by_tag_name("sound")
    .item(0)
    .and_then(|el: web_sys::Element| el.get_attribute("tempo"))
    .and_then(|val: String| val.parse::<f64>().ok())
    .or_else(|| {
      doc
        .get_elements_by_tag_name("per-minute")
        .item(0)
        .and_then(|node: web_sys::Element| node.text_content())
        .and_then(|text: String| text.trim().parse::<f64>().ok())
    })
    .unwrap_or(90.0);
  Some((measures, beats, tempo, title))
}

fn save_score_entry(id: &str, title: &str, measures: usize, beats: usize, tempo: f64, xml: &str) {
  let payload = js_sys::Object::new();
  let _ = Reflect::set(&payload, &"id".into(), &JsValue::from_str(id));
  let _ = Reflect::set(&payload, &"title".into(), &JsValue::from_str(title));
  let _ = Reflect::set(&payload, &"measures".into(), &JsValue::from_f64(measures as f64));
  let _ = Reflect::set(&payload, &"beats_per_measure".into(), &JsValue::from_f64(beats as f64));
  let _ = Reflect::set(&payload, &"tempo_bpm".into(), &JsValue::from_f64(tempo));
  let _ = Reflect::set(&payload, &"created_at".into(), &JsValue::from_f64(js_sys::Date::now()));
  let _ = Reflect::set(&payload, &"source".into(), &JsValue::from_str("musicxml"));
  let _ = Reflect::set(&payload, &"xml".into(), &JsValue::from_str(xml));
  spawn_local(async move {
    let _ = storage::save_score_entry(&payload.into()).await;
    score_library::refresh();
  });
}

fn apply_score_entry(score_state: &Rc<RefCell<ScoreFollowState>>, entry: &JsValue) {
  let source = Reflect::get(entry, &"source".into()).ok().and_then(|v| v.as_string()).unwrap_or_default();
  if source == "pdf" {
    let title = Reflect::get(entry, &"title".into()).ok().and_then(|v| v.as_string()).unwrap_or_else(|| "Score PDF".into());
    let pdf_blob = Reflect::get(entry, &"pdf_blob".into())
      .ok()
      .and_then(|v| v.dyn_into::<web_sys::Blob>().ok());
    dom::set_text("[data-score-status]", &format!("PDF ready: {}", title));
    dom::set_text("[data-score-count]", "--");
    dom::set_text("[data-score-current]", "--");
    if !is_online() && !pdf_pack_cached() {
      dom::set_text(
        "[data-score-status]",
        "Offline PDF pack not cached. Go online and click “Cache PDF offline pack”.",
      );
      dom::toast("Offline PDF pack not cached. Go online and cache it first.");
      return;
    }
    if let Some(blob) = pdf_blob {
      if pdf_render::load_pdf(&blob) {
        dom::set_text("[data-score-status]", &format!("Loading PDF: {}", title));
      } else {
        dom::set_text("[data-score-status]", "PDF renderer unavailable");
      }
    }
    {
      let mut score = score_state.borrow_mut();
      score.is_pdf = true;
      score.pdf_pages = 0;
      score.pdf_page = 0;
      score.total_measures = 0;
      score.current_measure = 0;
      score.beat_count = 0;
      score.last_onset = 0.0;
      score.start_time = None;
      score.onsets.clear();
    }
    render_score_visual(0, 0, true, 0, 0);
    return;
  }

  let measures = Reflect::get(entry, &"measures".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0) as usize;
  let beats = Reflect::get(entry, &"beats_per_measure".into()).ok().and_then(|v| v.as_f64()).unwrap_or(4.0) as usize;
  let tempo = Reflect::get(entry, &"tempo_bpm".into()).ok().and_then(|v| v.as_f64()).unwrap_or(90.0);
  let title = Reflect::get(entry, &"title".into()).ok().and_then(|v| v.as_string()).unwrap_or_else(|| "Score".into());
  let id = Reflect::get(entry, &"id".into()).ok().and_then(|v| v.as_string());

  let mut score = score_state.borrow_mut();
  score.total_measures = measures.max(1);
  score.current_measure = 0;
  score.beats_per_measure = beats.max(1);
  score.beat_count = 0;
  score.tempo_bpm = tempo;
  score.title = title.clone();
  score.score_id = id;
  score.is_pdf = false;
  score.pdf_pages = 0;
  score.pdf_page = 0;
  drop(score);

  dom::set_text("[data-score-status]", &format!("Loaded: {}", title));
  dom::set_text("[data-score-count]", &format!("{}", measures));
  dom::set_text("[data-score-current]", "0");
  update_progress(0, measures);
  render_score_visual(measures, 0, false, 0, 0);
}

fn start_following(score_state: &Rc<RefCell<ScoreFollowState>>) {
  if score_state.borrow().active {
    return;
  }
  if score_state.borrow().total_measures == 0 {
    dom::set_text("[data-score-status]", "Load a score first");
    return;
  }
  if let Some(listener) = score_state.borrow_mut().listener.take() {
    let _ = dom::window().remove_event_listener_with_callback("ml-trace", listener.as_ref().unchecked_ref());
  }
  {
    let mut score = score_state.borrow_mut();
    score.active = true;
    score.current_measure = 1;
    score.beat_count = 0;
    score.last_onset = 0.0;
    score.start_time = None;
    score.onsets.clear();
    score.last_update = 0.0;
  }
  dom::set_text("[data-score-status]", "Following");
  dom::set_text("[data-score-current]", "1");
  update_progress(1, score_state.borrow().total_measures);
  {
    let score = score_state.borrow();
    render_score_visual(score.total_measures, 1, score.is_pdf, score.pdf_page, score.pdf_pages);
  }

  let score_state_clone = score_state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
    let detail = Reflect::get(&event, &"detail".into()).ok().unwrap_or(JsValue::UNDEFINED);
    let rhythm = Reflect::get(&detail, &"rhythm_ms".into()).ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
    let now = js_sys::Date::now();
    let mut score = score_state_clone.borrow_mut();
    if !score.active {
      return;
    }
    let gap = now - score.last_onset;
    let expected_gap = 60_000.0 / score.tempo_bpm.max(40.0);
    if rhythm < ONSET_THRESHOLD || gap < MIN_ONSET_GAP_MS {
      return;
    }
    if score.last_onset > 0.0 && (gap < expected_gap * 0.5 || gap > expected_gap * 1.8) {
      return;
    }
    score.last_onset = now;
    if score.start_time.is_none() {
      score.start_time = Some(now);
    }
    score.onsets.push(now);
    if score.onsets.len() > 12 {
      let drain = score.onsets.len() - 12;
      score.onsets.drain(0..drain);
    }
    let time_since = now - score.last_update;
    if time_since < 200.0 {
      return;
    }
    score.last_update = now;
    let (measure, beat, done) = align_onsets(&score);
    score.current_measure = measure;
    score.beat_count = beat;
    if done {
      score.active = false;
      dom::set_text("[data-score-status]", "Complete");
    }
    dom::set_text("[data-score-current]", &format!("{}", score.current_measure));
    update_progress(score.current_measure, score.total_measures);
    render_score_visual(score.total_measures, score.current_measure, score.is_pdf, score.pdf_page, score.pdf_pages);
  });

  let _ = dom::window().add_event_listener_with_callback("ml-trace", cb.as_ref().unchecked_ref());
  score_state.borrow_mut().listener = Some(cb);
}

fn stop_following(score_state: &Rc<RefCell<ScoreFollowState>>, status: &str) {
  {
    let mut score = score_state.borrow_mut();
    score.active = false;
    score.beat_count = 0;
    score.onsets.clear();
  }
  dom::set_text("[data-score-status]", status);
  if let Some(listener) = score_state.borrow_mut().listener.take() {
    let _ = dom::window().remove_event_listener_with_callback("ml-trace", listener.as_ref().unchecked_ref());
  }
}

fn align_onsets(score: &ScoreFollowState) -> (usize, usize, bool) {
  let Some(start_time) = score.start_time else {
    return (score.current_measure.max(1), score.beat_count, false);
  };
  if score.onsets.is_empty() {
    return (score.current_measure.max(1), score.beat_count, false);
  }
  let interval = 60_000.0 / score.tempo_bpm.max(40.0);
  let onset_rel: Vec<f64> = score.onsets.iter().map(|t| t - start_time).collect();
  let last_rel = onset_rel.last().copied().unwrap_or(0.0);
  let approx = (last_rel / interval).round() as i32;
  let window = 2;
  let mut best = approx;
  let mut best_cost = f64::MAX;
  let len = onset_rel.len() as i32;
  for offset in (approx - window)..=(approx + window) {
    let mut cost = 0.0;
    for (idx, t) in onset_rel.iter().enumerate() {
      let expected_idx = offset - (len - 1) + idx as i32;
      if expected_idx < 0 {
        cost += (t - 0.0).abs();
      } else {
        let expected = (expected_idx as f64) * interval;
        cost += (t - expected).abs();
      }
    }
    if cost < best_cost {
      best_cost = cost;
      best = offset;
    }
  }
  let beat_index = best.max(0) as usize;
  let mut measure = (beat_index / score.beats_per_measure.max(1)) + 1;
  let beat = beat_index % score.beats_per_measure.max(1);
  if measure > score.total_measures {
    measure = score.total_measures.max(1);
  }
  let done = measure >= score.total_measures && beat >= score.beats_per_measure.saturating_sub(1);
  (measure, beat, done)
}

fn update_progress(current: usize, total: usize) {
  if let Some(fill) = dom::query("[data-score-progress]") {
    let percent = if total > 0 {
      (current as f64 / total as f64) * 100.0
    } else {
      0.0
    };
    dom::set_style(&fill, "width", &format!("{:.0}%", percent));
  }
}

fn render_score_visual(total: usize, current: usize, is_pdf: bool, pdf_page: usize, pdf_pages: usize) {
  let container = match dom::query("[data-score-visual]") {
    Some(el) => el,
    None => return,
  };
  if is_pdf {
    if pdf_pages > 0 {
      dom::set_text("[data-score-page]", &format!("Page {} / {}", pdf_page.max(1), pdf_pages));
    } else {
      dom::set_text("[data-score-page]", "--");
    }
    return;
  }
  if total == 0 {
    container.set_inner_html("<div class=\"score-empty\">No score visual yet.</div>");
    dom::set_text("[data-score-page]", "--");
    return;
  }

  let total_pages = ((total as f64) / (MEASURES_PER_PAGE as f64)).ceil().max(1.0) as usize;
  let page = if current == 0 { 1 } else { ((current - 1) / MEASURES_PER_PAGE) + 1 };
  dom::set_text("[data-score-page]", &format!("Page {} / {}", page, total_pages));

  let width = 320.0;
  let height = 64.0;
  let gap = 6.0;
  let bar_width = if total > 0 {
    (width - gap * (total.saturating_sub(1) as f64)) / (total as f64)
  } else {
    width
  };
  let mut svg = format!("<svg viewBox=\"0 0 {} {}\" xmlns=\"http://www.w3.org/2000/svg\">", width, height);
  for idx in 0..total {
    let x = idx as f64 * (bar_width + gap);
    let fill = if idx + 1 <= current { "#f56b49" } else { "#f2d3c5" };
    svg.push_str(&format!(
      "<rect x=\"{:.1}\" y=\"14\" width=\"{:.1}\" height=\"36\" rx=\"12\" fill=\"{}\" />",
      x, bar_width, fill
    ));
  }
  svg.push_str("</svg>");
  container.set_inner_html(&svg);
}
