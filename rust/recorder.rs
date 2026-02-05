use std::cell::RefCell;
use std::collections::HashSet;
use std::rc::Rc;

use js_sys::{Float32Array, Function, Reflect, Uint8Array};
use serde::Serialize;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Blob, BlobEvent, Event, HtmlInputElement, MediaRecorder, MediaRecorderOptions, MediaStream, MediaStreamTrack};

use crate::dom;
use crate::file_access;
use crate::ml;
use crate::state::AppState;
use crate::storage::{self, Recording};
use crate::utils;
use crate::backup;

thread_local! {
  static SELECTED: RefCell<HashSet<String>> = RefCell::new(HashSet::new());
}

pub fn init(state: Rc<RefCell<AppState>>) {
  init_section_toggle();
  if let Some(toggle) = dom::query("[data-recorder-toggle]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      if state_clone.borrow().recorder.active {
        stop(&state_clone);
      } else {
        start(&state_clone);
      }
    });
    let _ = toggle.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(clear) = dom::query("[data-recorder-clear]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let state_clone = state_clone.clone();
      wasm_bindgen_futures::spawn_local(async move {
        let _ = storage::clear_recordings().await;
        let _ = storage::clear_recording_blobs().await;
        {
          let mut app = state_clone.borrow_mut();
          app.recordings.clear();
        }
        render_list(&state_clone);
        dom::set_text("[data-recorder-status]", "Recordings cleared");
      });
    });
    let _ = clear.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-recorder-export-json]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      wasm_bindgen_futures::spawn_local(async move {
        let force = file_access::prefers_save_for("recorder");
        export_recording_list_json(force).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-recorder-export-csv]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      wasm_bindgen_futures::spawn_local(async move {
        let force = file_access::prefers_save_for("recorder");
        export_recording_list_csv(force).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-recorder-export-files]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      wasm_bindgen_futures::spawn_local(async move {
        export_recording_list_json(true).await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-recorder-export-selected]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      wasm_bindgen_futures::spawn_local(async move {
        export_selected_json().await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-recorder-export-selected-csv]") {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      wasm_bindgen_futures::spawn_local(async move {
        export_selected_csv().await;
      });
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-recorder-select-all]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let recordings = state_clone.borrow().recordings.clone();
      let filtered = filter_recordings(&recordings);
      let ids: HashSet<String> = filtered.iter().map(|rec| rec.id.clone()).collect();
      SELECTED.with(|set| {
        set.borrow_mut().clear();
        set.borrow_mut().extend(ids);
      });
      render_list(&state_clone);
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(btn) = dom::query("[data-recorder-clear-selection]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      SELECTED.with(|set| set.borrow_mut().clear());
      render_list(&state_clone);
    });
    let _ = btn.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  if let Some(toggle) = dom::query("[data-recorder-profile-only]") {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      render_list(&state_clone);
    });
    let _ = toggle.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref());
    cb.forget();
  }

  let state_clone = state.clone();
  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
    render_list(&state_clone);
  });
  let _ = dom::window().add_event_listener_with_callback("profile-change", cb.as_ref().unchecked_ref());
  cb.forget();

  let state_clone = state.clone();
  wasm_bindgen_futures::spawn_local(async move {
    if let Ok(recordings) = storage::get_recordings().await {
      state_clone.borrow_mut().recordings = recordings.clone();
      render_list(&state_clone);
    }
  });

  set_toggle_label(false);
}

fn init_section_toggle() {
  if let Some(toggle) = dom::query("[data-save-files-section=\"recorder\"]") {
    if let Ok(input) = toggle.dyn_into::<HtmlInputElement>() {
      input.set_checked(file_access::prefers_save_for("recorder"));
      let input_clone = input.clone();
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        file_access::set_prefers_save_for("recorder", input_clone.checked());
      });
      let _ = input.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref());
      cb.forget();
    }
  }
}

#[derive(Serialize)]
struct RecordingExportRow {
  id: String,
  created_at: f64,
  duration_seconds: f64,
  mime_type: String,
  size_bytes: f64,
  format: String,
  opfs_path: Option<String>,
  profile_id: Option<String>,
}

async fn export_recording_list_json(force: bool) {
  let recordings = storage::get_recordings().await.unwrap_or_default();
  let rows: Vec<RecordingExportRow> = recordings
    .into_iter()
    .map(|rec| RecordingExportRow {
      id: rec.id,
      created_at: rec.created_at,
      duration_seconds: rec.duration_seconds,
      mime_type: rec.mime_type,
      size_bytes: rec.size_bytes,
      format: rec.format,
      opfs_path: rec.opfs_path,
      profile_id: rec.profile_id,
    })
    .collect();
  let exported_at: String = js_sys::Date::new_0().to_string().into();
  let envelope = serde_json::json!({
    "schemaVersion": 1,
    "exportedAt": exported_at,
    "recordings": rows,
  });
  if let Ok(json) = serde_json::to_string_pretty(&envelope) {
    let ok = if force {
      file_access::save_or_download_force("emerson-recordings.json", "application/json", json.as_bytes()).await
    } else {
      file_access::save_or_download("emerson-recordings.json", "application/json", json.as_bytes()).await
    };
    if ok {
      dom::set_text(
        "[data-recorder-export-status]",
        if force { "Saved recordings JSON to Files." } else { "Downloaded recordings JSON." },
      );
    }
  }
}

async fn export_recording_list_csv(force: bool) {
  let recordings = storage::get_recordings().await.unwrap_or_default();
  let meta = csv_meta(recordings.len(), active_filter_label().as_deref());
  let mut output = format!("{}\n", meta);
  output.push_str("id,created_at,duration_seconds,mime_type,size_bytes,format,opfs_path,profile_id\n");
  for rec in recordings {
    output.push_str(&format!(
      "{},{},{},{},{},{},{},{}\n",
      rec.id,
      rec.created_at,
      rec.duration_seconds,
      rec.mime_type,
      rec.size_bytes,
      rec.format,
      rec.opfs_path.unwrap_or_default(),
      rec.profile_id.unwrap_or_else(|| "default".into())
    ));
  }
  let ok = if force {
    file_access::save_or_download_force("emerson-recordings.csv", "text/csv", output.as_bytes()).await
  } else {
    file_access::save_or_download("emerson-recordings.csv", "text/csv", output.as_bytes()).await
  };
  if ok {
    dom::set_text(
      "[data-recorder-export-status]",
      if force { "Saved recordings CSV to Files." } else { "Downloaded recordings CSV." },
    );
  }
}

async fn export_selected_json() {
  let recordings = storage::get_recordings().await.unwrap_or_default();
  let selected = SELECTED.with(|set| set.borrow().clone());
  let rows: Vec<RecordingExportRow> = recordings
    .into_iter()
    .filter(|rec| selected.contains(&rec.id))
    .map(|rec| RecordingExportRow {
      id: rec.id,
      created_at: rec.created_at,
      duration_seconds: rec.duration_seconds,
      mime_type: rec.mime_type,
      size_bytes: rec.size_bytes,
      format: rec.format,
      opfs_path: rec.opfs_path,
      profile_id: rec.profile_id,
    })
    .collect();
  if rows.is_empty() {
    dom::set_text("[data-recorder-export-status]", "No recordings selected.");
    return;
  }
  let exported_at: String = js_sys::Date::new_0().to_string().into();
  let envelope = serde_json::json!({
    "schemaVersion": 1,
    "exportedAt": exported_at,
    "recordings": rows,
  });
  if let Ok(json) = serde_json::to_string_pretty(&envelope) {
    let force = file_access::prefers_save_for("recorder");
    let ok = if force {
      file_access::save_or_download_force("emerson-recordings-selected.json", "application/json", json.as_bytes()).await
    } else {
      file_access::save_or_download("emerson-recordings-selected.json", "application/json", json.as_bytes()).await
    };
    if ok {
      dom::set_text(
        "[data-recorder-export-status]",
        if force { "Saved selected JSON to Files." } else { "Downloaded selected JSON." },
      );
    }
  }
}

async fn export_selected_csv() {
  let recordings = storage::get_recordings().await.unwrap_or_default();
  let selected = SELECTED.with(|set| set.borrow().clone());
  let mut output = String::from("id,created_at,duration_seconds,mime_type,size_bytes,format,opfs_path,profile_id\n");
  let mut count = 0;
  for rec in recordings.into_iter() {
    if !selected.contains(&rec.id) {
      continue;
    }
    output.push_str(&format!(
      "{},{},{},{},{},{},{},{}\n",
      rec.id,
      rec.created_at,
      rec.duration_seconds,
      rec.mime_type,
      rec.size_bytes,
      rec.format,
      rec.opfs_path.unwrap_or_default(),
      rec.profile_id.unwrap_or_else(|| "default".into())
    ));
    count += 1;
  }
  if count == 0 {
    dom::set_text("[data-recorder-export-status]", "No recordings selected.");
    return;
  }
  let force = file_access::prefers_save_for("recorder");
  let ok = if force {
    file_access::save_or_download_force("emerson-recordings-selected.csv", "text/csv", output.as_bytes()).await
  } else {
    file_access::save_or_download("emerson-recordings-selected.csv", "text/csv", output.as_bytes()).await
  };
  if ok {
    dom::set_text(
      "[data-recorder-export-status]",
      if force { "Saved selected CSV to Files." } else { "Downloaded selected CSV." },
    );
  }
}

fn request_stream() -> wasm_bindgen_futures::JsFuture {
  let constraints = web_sys::MediaStreamConstraints::new();
  constraints.set_audio(&wasm_bindgen::JsValue::TRUE);
  let media_devices = dom::window().navigator().media_devices().unwrap();
  media_devices.get_user_media_with_constraints(&constraints).unwrap().into()
}

pub fn start(state: &Rc<RefCell<AppState>>) {
  let state_clone = state.clone();
  wasm_bindgen_futures::spawn_local(async move {
    let stream = match wasm_bindgen_futures::JsFuture::from(request_stream()).await {
      Ok(val) => val.dyn_into::<MediaStream>().unwrap(),
      Err(_) => {
        dom::set_text("[data-recorder-status]", "Microphone blocked");
        return;
      }
    };

    let options = MediaRecorderOptions::new();
    let mime_type = pick_mime_type().unwrap_or_else(|| "audio/webm;codecs=opus".to_string());
    options.set_mime_type(&mime_type);
    let recorder = MediaRecorder::new_with_media_stream_and_media_recorder_options(&stream, &options)
      .unwrap_or_else(|_| MediaRecorder::new_with_media_stream(&stream).unwrap());

    {
      let mut app = state_clone.borrow_mut();
      app.recorder.active = true;
      app.recorder.recorder = Some(recorder.clone());
      app.recorder.chunks.clear();
      app.recorder.start_time = js_sys::Date::now();
      app.recorder.stream = Some(stream.clone());
      app.recorder.mime_type = mime_type.clone();
    }
    set_toggle_label(true);

    let state_data = state_clone.clone();
    let ondata = wasm_bindgen::closure::Closure::<dyn FnMut(BlobEvent)>::new(move |event: BlobEvent| {
      if let Some(blob) = event.data() {
        state_data.borrow_mut().recorder.chunks.push(blob);
      }
    });
    recorder.set_ondataavailable(Some(ondata.as_ref().unchecked_ref()));
    ondata.forget();

    let state_stop = state_clone.clone();
    let onstop = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let mut app = state_stop.borrow_mut();
      let duration = (js_sys::Date::now() - app.recorder.start_time) / 1000.0;
      let array = js_sys::Array::new();
      for chunk in app.recorder.chunks.iter() {
        array.push(chunk);
      }
      let blob = Blob::new_with_blob_sequence(&array).ok();
      let has_blob = blob.is_some();
      let size_bytes = blob.as_ref().map(|b| b.size()).unwrap_or(0.0);
      let mime_type = app.recorder.mime_type.clone();
      let format = if mime_type.contains("mp4") { "m4a" }
        else if mime_type.contains("wav") { "wav" }
        else if mime_type.contains("webm") { "webm" }
        else { "unknown" };
      let recording = Recording {
        id: utils::create_id(),
        created_at: js_sys::Date::now(),
        duration_seconds: duration,
        blob: blob.clone(),
        mime_type,
        size_bytes,
        format: format.to_string(),
        opfs_path: None,
        profile_id: Some(storage::get_active_profile_id()),
      };
      app.recordings.insert(0, recording.clone());
      drop(app);
      render_list(&state_stop);
      if has_blob {
        let focus = ml::note_focus_from_duration(duration / 60.0);
        {
          let mut app = state_stop.borrow_mut();
          ml::push_focus(&mut app.ml, focus);
          ml::render(&app.ml);
        }
        let state_clone = state_stop.clone();
        wasm_bindgen_futures::spawn_local(async move {
          if let Some(blob) = blob {
            if storage::opfs_supported() {
              if let Some(path) = storage::save_recording_blob(&recording.id, &recording.format, &blob).await {
                let mut app = state_clone.borrow_mut();
                if let Some(existing) = app.recordings.iter_mut().find(|item| item.id == recording.id) {
                  existing.opfs_path = Some(path.clone());
                  existing.blob = None;
                }
                drop(app);
                render_list(&state_clone);
                let mut updated = recording.clone();
                updated.opfs_path = Some(path);
                updated.blob = None;
                let _ = storage::save_recording(&updated).await;
                return;
              }
            }
          }
          let _ = storage::save_recording(&recording).await;
        });
      }
    });
    recorder.set_onstop(Some(onstop.as_ref().unchecked_ref()));
    onstop.forget();

    recorder.start().unwrap();
    dom::set_text("[data-recorder-status]", "Recording...");
  });
}

pub fn stop(state: &Rc<RefCell<AppState>>) {
  let mut app = state.borrow_mut();
  if !app.recorder.active {
    return;
  }
  app.recorder.active = false;
  if let Some(recorder) = &app.recorder.recorder {
    let _ = recorder.stop();
  }
  if let Some(stream) = app.recorder.stream.take() {
    let tracks = stream.get_tracks();
    for idx in 0..tracks.length() {
      let track_val = tracks.get(idx);
      if track_val.is_undefined() || track_val.is_null() {
        continue;
      }
      if let Ok(track) = track_val.dyn_into::<MediaStreamTrack>() {
        track.stop();
      }
    }
  }
  dom::set_text("[data-recorder-status]", "Recording saved");
  set_toggle_label(false);
}

pub fn render_list(state: &Rc<RefCell<AppState>>) {
  let recordings = state.borrow().recordings.clone();
  let filtered = filter_recordings(&recordings);
  update_filter_badge(active_filter_label());
  let list = match dom::query("[data-recorder-list]") {
    Some(el) => el,
    None => return,
  };
  list.set_inner_html("");
  if filtered.is_empty() {
    list.set_inner_html("<li class=\"empty\">No recordings yet.</li>");
    let opfs_bytes = storage::sum_opfs_bytes(&recordings);
    if let Some(el) = dom::query("[data-opfs-usage]") {
      dom::set_text_el(&el, &format!("{:.1} MB", opfs_bytes / (1024.0 * 1024.0)));
    }
    SELECTED.with(|set| set.borrow_mut().clear());
    return;
  }

  let ids: HashSet<String> = filtered.iter().map(|rec| rec.id.clone()).collect();
  SELECTED.with(|set| set.borrow_mut().retain(|id| ids.contains(id)));

  let opfs_bytes = storage::sum_opfs_bytes(&recordings);
  if let Some(el) = dom::query("[data-opfs-usage]") {
    dom::set_text_el(&el, &format!("{:.1} MB", opfs_bytes / (1024.0 * 1024.0)));
  }

  let webcodecs = supports_webcodecs();
  for recording in filtered.iter() {
    let li = dom::document().create_element("li").unwrap();
    li.set_class_name("resource-list");
    let checkbox = dom::document().create_element("input").unwrap();
    let _ = checkbox.set_attribute("type", "checkbox");
    checkbox.set_class_name("selection-toggle");
    if let Ok(input) = checkbox.clone().dyn_into::<HtmlInputElement>() {
      let checked = SELECTED.with(|set| set.borrow().contains(&recording.id));
      input.set_checked(checked);
      let input_clone = input.clone();
      let id_clone = recording.id.clone();
      let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        let checked = input_clone.checked();
        SELECTED.with(|set| {
          if checked {
            set.borrow_mut().insert(id_clone.clone());
          } else {
            set.borrow_mut().remove(&id_clone);
          }
        });
      });
      input.add_event_listener_with_callback("change", cb.as_ref().unchecked_ref()).ok();
      cb.forget();
    }
    li.append_child(&checkbox).ok();
    let label = dom::document().create_element("span").unwrap();
    label.set_text_content(Some(&format!(
      "{}s • {}",
      recording.duration_seconds.round(),
      recording.format
    )));
    li.append_child(&label).ok();

    if let Some(blob) = &recording.blob {
      let audio = dom::document().create_element("audio").unwrap();
      audio.set_attribute("controls", "true").ok();
      if let Ok(url) = web_sys::Url::create_object_url_with_blob(blob) {
        audio.set_attribute("src", &url).ok();
      }
      let recording_clone = recording.clone();
      let play_cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        update_media_session(&recording_clone, true);
      });
      audio.add_event_listener_with_callback("play", play_cb.as_ref().unchecked_ref()).ok();
      play_cb.forget();

      let recording_clone = recording.clone();
      let pause_cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        update_media_session(&recording_clone, false);
      });
      audio.add_event_listener_with_callback("pause", pause_cb.as_ref().unchecked_ref()).ok();
      audio.add_event_listener_with_callback("ended", pause_cb.as_ref().unchecked_ref()).ok();
      pause_cb.forget();
      li.append_child(&audio).ok();
    } else if let Some(path) = &recording.opfs_path {
      let audio = dom::document().create_element("audio").unwrap();
      audio.set_attribute("controls", "true").ok();
      audio.set_attribute("data-loading", "true").ok();
      let audio_el = audio.clone();
      let path = path.clone();
      wasm_bindgen_futures::spawn_local(async move {
        if let Some(blob) = storage::load_recording_blob(&path).await {
          if let Ok(url) = web_sys::Url::create_object_url_with_blob(&blob) {
            let _ = audio_el.set_attribute("src", &url);
            let _ = audio_el.remove_attribute("data-loading");
          }
        } else {
          let _ = audio_el.set_attribute("data-load-failed", "true");
        }
      });
      li.append_child(&audio).ok();
    }

    let export_wav = dom::document().create_element("button").unwrap();
    export_wav.set_class_name("btn btn-ghost");
    export_wav.set_text_content(Some("Export WAV"));
    let recording_clone = recording.clone();
    let export_state = state.clone();
    let export_cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let recording_clone = recording_clone.clone();
      let export_state = export_state.clone();
      wasm_bindgen_futures::spawn_local(async move {
        let ok = export_recording(&recording_clone, ExportFormat::Wav).await;
        if ok {
          dom::set_text("[data-recorder-status]", "WAV export ready");
        } else {
          dom::set_text("[data-recorder-status]", "WAV export failed");
        }
        render_list(&export_state);
      });
    });
    export_wav.add_event_listener_with_callback("click", export_cb.as_ref().unchecked_ref()).ok();
    export_cb.forget();
    li.append_child(&export_wav).ok();

    if webcodecs || recording.mime_type.contains("mp4") || recording.mime_type.contains("m4a") {
      let export_m4a = dom::document().create_element("button").unwrap();
      export_m4a.set_class_name("btn btn-ghost");
      export_m4a.set_text_content(Some("Export M4A"));
      let recording_clone = recording.clone();
      let export_state = state.clone();
      let export_cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
        let recording_clone = recording_clone.clone();
        let export_state = export_state.clone();
        wasm_bindgen_futures::spawn_local(async move {
          let ok = export_recording(&recording_clone, ExportFormat::M4a).await;
          if ok {
            dom::set_text("[data-recorder-status]", "M4A export ready");
          } else {
            dom::set_text("[data-recorder-status]", "M4A export failed");
          }
          render_list(&export_state);
        });
      });
      export_m4a.add_event_listener_with_callback("click", export_cb.as_ref().unchecked_ref()).ok();
      export_cb.forget();
      li.append_child(&export_m4a).ok();
    }

    let del = dom::document().create_element("button").unwrap();
    del.set_class_name("btn btn-ghost");
    del.set_text_content(Some("Delete"));
    let id = recording.id.clone();
    let state_clone = state.clone();
    let recording_clone = recording.clone();
    let del_cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let id = id.clone();
      let state_clone = state_clone.clone();
      let recording_clone = recording_clone.clone();
      wasm_bindgen_futures::spawn_local(async move {
        let _ = storage::delete_recording_assets(&recording_clone).await;
        {
          let mut app = state_clone.borrow_mut();
          app.recordings.retain(|r| r.id != id);
        }
        render_list(&state_clone);
      });
    });
    del.add_event_listener_with_callback("click", del_cb.as_ref().unchecked_ref()).ok();
    del_cb.forget();
    li.append_child(&del).ok();

    list.append_child(&li).ok();
  }
}

fn csv_meta(count: usize, filter: Option<&str>) -> String {
  let exported_at: String = js_sys::Date::new_0().to_string().into();
  let filter_text = filter.unwrap_or("all");
  format!("# exportedAt={}, count={}, filter={}", exported_at, count, filter_text)
}

fn active_filter_label() -> Option<String> {
  let profile_only = dom::query("[data-recorder-profile-only]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .map(|input| input.checked())
    .unwrap_or(false);
  if !profile_only {
    return None;
  }
  Some(format!("profile {}", storage::get_active_profile_name()))
}

fn update_filter_badge(label: Option<String>) {
  if let Some(badge) = dom::query("[data-recorder-filter-badge]") {
    let text = label.unwrap_or_else(|| "All profiles".into());
    dom::set_text_el(&badge, &text);
  }
}

fn set_toggle_label(active: bool) {
  let label = if active { "Stop recording" } else { "Start recording" };
  for button in dom::query_all("[data-recorder-toggle]") {
    dom::set_text_el(&button, label);
    dom::set_attr(&button, "aria-pressed", if active { "true" } else { "false" });
    dom::set_dataset(&button, "state", if active { "on" } else { "off" });
  }
}

fn filter_recordings(recordings: &[Recording]) -> Vec<Recording> {
  let profile_only = dom::query("[data-recorder-profile-only]")
    .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
    .map(|input| input.checked())
    .unwrap_or(false);
  if !profile_only {
    return recordings.to_vec();
  }
  let active = storage::get_active_profile_id();
  recordings
    .iter()
    .filter(|rec| rec.profile_id.as_deref().unwrap_or("default") == active)
    .cloned()
    .collect()
}

fn update_media_session(recording: &Recording, playing: bool) {
  let navigator = dom::window().navigator();
  let media_session = match Reflect::get(&navigator, &JsValue::from_str("mediaSession")) {
    Ok(val) => val,
    Err(_) => return,
  };
  let metadata = js_sys::Object::new();
  let _ = Reflect::set(&metadata, &"title".into(), &JsValue::from_str("Practice recording"));
  let _ = Reflect::set(&metadata, &"artist".into(), &JsValue::from_str("Emerson Violin Studio"));
  let _ = Reflect::set(
    &metadata,
    &"album".into(),
    &JsValue::from_str(&format!("{} take", recording.format)),
  );
  let _ = Reflect::set(&media_session, &"metadata".into(), &metadata.into());
  let _ = Reflect::set(
    &media_session,
    &"playbackState".into(),
    &JsValue::from_str(if playing { "playing" } else { "paused" }),
  );
  if let Ok(handler) = Reflect::get(&media_session, &JsValue::from_str("setActionHandler")) {
    if let Ok(handler) = handler.dyn_into::<Function>() {
      let _ = handler.call2(&media_session, &JsValue::from_str("play"), &JsValue::NULL);
      let _ = handler.call2(&media_session, &JsValue::from_str("pause"), &JsValue::NULL);
    }
  }
}

fn pick_mime_type() -> Option<String> {
  let candidates = [
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/wav",
  ];
  for candidate in candidates {
    if MediaRecorder::is_type_supported(candidate) {
      return Some(candidate.to_string());
    }
  }
  None
}

#[derive(Clone, Copy)]
enum ExportFormat {
  Wav,
  M4a,
}

fn supports_webcodecs() -> bool {
  let window = dom::window();
  js_sys::Reflect::has(&window, &JsValue::from_str("AudioEncoder")).unwrap_or(false)
}

async fn export_recording(recording: &Recording, format: ExportFormat) -> bool {
  let blob = match recording.blob.clone() {
    Some(blob) => Some(blob),
    None => {
      if let Some(path) = &recording.opfs_path {
        storage::load_recording_blob(path).await
      } else {
        None
      }
    }
  };
  let blob = match blob {
    Some(blob) => blob,
    None => return false,
  };

  match format {
    ExportFormat::Wav => {
      if let Some(bytes) = wav_from_blob(&blob).await {
        let _ = backup::download_bytes(&format!("emerson-recording-{}.wav", recording.id), "audio/wav", &bytes).await;
        return true;
      }
      false
    }
    ExportFormat::M4a => {
      if recording.mime_type.contains("mp4") || recording.mime_type.contains("m4a") {
        if let Some(bytes) = blob_to_bytes(&blob).await {
          let _ = backup::download_bytes(&format!("emerson-recording-{}.m4a", recording.id), "audio/mp4", &bytes).await;
          return true;
        }
      }
      if supports_webcodecs() {
        if let Some(bytes) = wav_from_blob(&blob).await {
          let _ = backup::download_bytes(&format!("emerson-recording-{}.wav", recording.id), "audio/wav", &bytes).await;
          return true;
        }
      }
      false
    }
  }
}

async fn wav_from_blob(blob: &Blob) -> Option<Vec<u8>> {
  let buffer = array_buffer_from_blob(blob).await?;
  let context = web_sys::AudioContext::new().ok()?;
  let decode = Reflect::get(&context, &JsValue::from_str("decodeAudioData")).ok()?.dyn_into::<Function>().ok()?;
  let promise = decode.call1(&context, &buffer).ok()?.dyn_into::<js_sys::Promise>().ok()?;
  let audio_buffer = JsFuture::from(promise).await.ok()?;
  let _ = context.close();
  audio_buffer_to_wav(&audio_buffer)
}

fn audio_buffer_to_wav(buffer: &JsValue) -> Option<Vec<u8>> {
  let channels = Reflect::get(buffer, &JsValue::from_str("numberOfChannels")).ok()?.as_f64()? as usize;
  let length = Reflect::get(buffer, &JsValue::from_str("length")).ok()?.as_f64()? as usize;
  let sample_rate = Reflect::get(buffer, &JsValue::from_str("sampleRate")).ok()?.as_f64()? as u32;
  let get_channel = Reflect::get(buffer, &JsValue::from_str("getChannelData")).ok()?.dyn_into::<Function>().ok()?;

  let mut channel_data: Vec<Float32Array> = Vec::with_capacity(channels);
  for ch in 0..channels {
    let data = get_channel.call1(buffer, &JsValue::from_f64(ch as f64)).ok()?;
    channel_data.push(Float32Array::new(&data));
  }

  let bytes_per_sample = 2usize;
  let data_size = length * channels * bytes_per_sample;
  let mut wav = Vec::with_capacity(44 + data_size);

  wav.extend_from_slice(b"RIFF");
  wav.extend_from_slice(&(36 + data_size as u32).to_le_bytes());
  wav.extend_from_slice(b"WAVE");
  wav.extend_from_slice(b"fmt ");
  wav.extend_from_slice(&16u32.to_le_bytes()); // PCM header size
  wav.extend_from_slice(&1u16.to_le_bytes()); // PCM format
  wav.extend_from_slice(&(channels as u16).to_le_bytes());
  wav.extend_from_slice(&sample_rate.to_le_bytes());
  let byte_rate = sample_rate * channels as u32 * bytes_per_sample as u32;
  wav.extend_from_slice(&byte_rate.to_le_bytes());
  let block_align = (channels * bytes_per_sample) as u16;
  wav.extend_from_slice(&block_align.to_le_bytes());
  wav.extend_from_slice(&(bytes_per_sample as u16 * 8).to_le_bytes());
  wav.extend_from_slice(b"data");
  wav.extend_from_slice(&(data_size as u32).to_le_bytes());

  for i in 0..length {
    for ch in 0..channels {
      let sample = channel_data[ch].get_index(i as u32).clamp(-1.0, 1.0);
      let value = (sample * i16::MAX as f32) as i16;
      wav.extend_from_slice(&value.to_le_bytes());
    }
  }

  Some(wav)
}

async fn array_buffer_from_blob(blob: &Blob) -> Option<JsValue> {
  let array_buffer = Reflect::get(blob, &JsValue::from_str("arrayBuffer")).ok()?.dyn_into::<Function>().ok()?;
  let promise = array_buffer.call0(blob).ok()?.dyn_into::<js_sys::Promise>().ok()?;
  JsFuture::from(promise).await.ok()
}

async fn blob_to_bytes(blob: &Blob) -> Option<Vec<u8>> {
  let buffer = array_buffer_from_blob(blob).await?.dyn_into::<js_sys::ArrayBuffer>().ok()?;
  let uint = Uint8Array::new(&buffer);
  let mut data = vec![0u8; uint.length() as usize];
  uint.copy_to(&mut data);
  Some(data)
}
