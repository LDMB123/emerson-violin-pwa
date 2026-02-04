use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::JsCast;
use web_sys::{Blob, BlobEvent, Event, MediaRecorder, MediaRecorderOptions, MediaStream};

use crate::dom;
use crate::ml;
use crate::state::AppState;
use crate::storage::{self, Recording};
use crate::utils;

pub fn init(state: Rc<RefCell<AppState>>) {
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

  let state_clone = state.clone();
  wasm_bindgen_futures::spawn_local(async move {
    if let Ok(recordings) = storage::get_recordings().await {
      state_clone.borrow_mut().recordings = recordings.clone();
      render_list(&state_clone);
    }
  });

  set_toggle_label(false);
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
    options.set_mime_type("audio/webm;codecs=opus");
    let recorder = MediaRecorder::new_with_media_stream_and_media_recorder_options(&stream, &options)
      .unwrap_or_else(|_| MediaRecorder::new_with_media_stream(&stream).unwrap());

    {
      let mut app = state_clone.borrow_mut();
      app.recorder.active = true;
      app.recorder.recorder = Some(recorder.clone());
      app.recorder.chunks.clear();
      app.recorder.start_time = js_sys::Date::now();
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
      let recording = Recording {
        id: utils::create_id(),
        created_at: js_sys::Date::now(),
        duration_seconds: duration,
        blob: blob.clone(),
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
        wasm_bindgen_futures::spawn_local(async move {
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
  dom::set_text("[data-recorder-status]", "Recording saved");
  set_toggle_label(false);
}

pub fn render_list(state: &Rc<RefCell<AppState>>) {
  let recordings = state.borrow().recordings.clone();
  let list = match dom::query("[data-recorder-list]") {
    Some(el) => el,
    None => return,
  };
  list.set_inner_html("");
  if recordings.is_empty() {
    list.set_inner_html("<li class=\"empty\">No recordings yet.</li>");
    return;
  }

  for recording in recordings.iter() {
    let li = dom::document().create_element("li").unwrap();
    li.set_class_name("resource-list");
    let label = dom::document().create_element("span").unwrap();
    label.set_text_content(Some(&format!("{}s", recording.duration_seconds.round())));
    li.append_child(&label).ok();

    if let Some(blob) = &recording.blob {
      let audio = dom::document().create_element("audio").unwrap();
      audio.set_attribute("controls", "true").ok();
      if let Ok(url) = web_sys::Url::create_object_url_with_blob(blob) {
        audio.set_attribute("src", &url).ok();
      }
      li.append_child(&audio).ok();
    }

    let del = dom::document().create_element("button").unwrap();
    del.set_class_name("btn btn-ghost");
    del.set_text_content(Some("Delete"));
    let id = recording.id.clone();
    let state_clone = state.clone();
    let del_cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let id = id.clone();
      let state_clone = state_clone.clone();
      wasm_bindgen_futures::spawn_local(async move {
        let _ = storage::delete_recording(&id).await;
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

fn set_toggle_label(active: bool) {
  let label = if active { "Stop recording" } else { "Start recording" };
  for button in dom::query_all("[data-recorder-toggle]") {
    dom::set_text_el(&button, label);
  }
}
