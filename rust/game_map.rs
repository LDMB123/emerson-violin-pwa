use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

use wasm_bindgen::JsCast;
use wasm_bindgen_futures::spawn_local;
use web_sys::Event;

use crate::dom;
use crate::state::AppState;
use crate::storage;

#[derive(Clone)]
struct MapNode {
  id: &'static str,
  title: &'static str,
  detail: &'static str,
  unlock_stars: usize,
  boss: bool,
}

const MAP_STORAGE_KEY: &str = "game-map";

const NODES: &[MapNode] = &[
  MapNode { id: "twinkle-a", title: "Twinkle Theme", detail: "Open strings + bow lanes", unlock_stars: 0, boss: false },
  MapNode { id: "twinkle-b", title: "Twinkle Var A", detail: "Rhythm grid mastery", unlock_stars: 2, boss: false },
  MapNode { id: "twinkle-boss", title: "Twinkle Boss", detail: "3 clean runs", unlock_stars: 4, boss: true },
  MapNode { id: "lightly-row", title: "Lightly Row", detail: "Pitch target warmup", unlock_stars: 6, boss: false },
  MapNode { id: "song-wind", title: "Song of the Wind", detail: "Bow path control", unlock_stars: 8, boss: false },
  MapNode { id: "aunt-rhody", title: "Go Tell Aunt Rhody", detail: "Blend rhythm + pitch", unlock_stars: 10, boss: false },
  MapNode { id: "minuet-1", title: "Minuet 1", detail: "Boss: full combo", unlock_stars: 12, boss: true },
];

pub fn init(_state: Rc<RefCell<AppState>>) {
  if dom::query("[data-map-list]").is_none() {
    return;
  }
  refresh();

  let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
    refresh();
  });
  let _ = dom::window().add_event_listener_with_callback("profile-change", cb.as_ref().unchecked_ref());
  cb.forget();
}

pub fn refresh() {
  spawn_local(async move {
    let profile_id = storage::get_active_profile_id();
    let stars = count_stars(&profile_id).await;
    let map_state = load_state(&profile_id);
    render(&map_state, stars);
  });
}

async fn count_stars(profile_id: &str) -> usize {
  let scores = storage::get_game_scores().await.unwrap_or_default();
  scores
    .iter()
    .filter(|entry| {
      let pid = js_sys::Reflect::get(entry, &"profile_id".into())
        .ok()
        .and_then(|v| v.as_string())
        .unwrap_or_else(|| "default".into());
      pid == profile_id
    })
    .filter(|entry| {
      let score = js_sys::Reflect::get(entry, &"score".into())
        .ok()
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
      score >= 100.0
    })
    .count()
}

fn load_state(profile_id: &str) -> HashMap<String, bool> {
  let key = format!("{}:{}", MAP_STORAGE_KEY, profile_id);
  storage::local_get(&key)
    .and_then(|raw| serde_json::from_str(&raw).ok())
    .unwrap_or_default()
}

fn save_state(profile_id: &str, map: &HashMap<String, bool>) {
  let key = format!("{}:{}", MAP_STORAGE_KEY, profile_id);
  if let Ok(raw) = serde_json::to_string(map) {
    storage::local_set(&key, &raw);
  }
}

fn render(map: &HashMap<String, bool>, stars: usize) {
  let list = match dom::query("[data-map-list]") {
    Some(el) => el,
    None => return,
  };
  list.set_inner_html("");
  dom::set_text("[data-map-stars]", &format!("{} stars", stars));

  let profile_id = storage::get_active_profile_id();

  for node in NODES.iter() {
    let completed = map.get(node.id).copied().unwrap_or(false);
    let unlocked = stars >= node.unlock_stars;
    let state = if completed {
      "complete"
    } else if unlocked {
      "unlocked"
    } else {
      "locked"
    };

    let item = dom::document().create_element("li").unwrap();
    item.set_class_name("map-node");
    dom::set_dataset(&item, "state", state);

    let header = dom::document().create_element("div").unwrap();
    header.set_class_name("map-node-header");

    let title = dom::document().create_element("strong").unwrap();
    title.set_text_content(Some(node.title));
    header.append_child(&title).ok();

    if node.boss {
      let badge = dom::document().create_element("span").unwrap();
      badge.set_class_name("pill");
      badge.set_text_content(Some("Boss"));
      header.append_child(&badge).ok();
    }

    let detail = dom::document().create_element("small").unwrap();
    detail.set_class_name("muted");
    detail.set_text_content(Some(node.detail));

    let status = dom::document().create_element("span").unwrap();
    status.set_class_name("pill");
    status.set_text_content(Some(if completed { "Mastered" } else if unlocked { "Ready" } else { "Locked" }));

    let action = dom::document().create_element("button").unwrap();
    action.set_class_name("btn btn-ghost");
    action.set_text_content(Some(if completed { "Unmark" } else { "Mark mastered" }));
    if !unlocked {
      let _ = action.set_attribute("disabled", "true");
    }

    let node_id = node.id.to_string();
    let profile_id = profile_id.clone();
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |_event| {
      let mut map = load_state(&profile_id);
      let entry = map.entry(node_id.clone()).or_insert(false);
      *entry = !*entry;
      save_state(&profile_id, &map);
      refresh();
    });
    action.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref()).ok();
    cb.forget();

    let body = dom::document().create_element("div").unwrap();
    body.set_class_name("map-node-body");
    body.append_child(&detail).ok();

    item.append_child(&header).ok();
    item.append_child(&status).ok();
    item.append_child(&body).ok();
    item.append_child(&action).ok();

    list.append_child(&item).ok();
  }
}
