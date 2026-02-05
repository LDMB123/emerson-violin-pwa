use serde::Deserialize;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::JsFuture;

use crate::dom;
use crate::storage;

#[derive(Clone, Debug, Deserialize)]
pub struct FeatureFlags {
  pub games: bool,
  pub ml: bool,
  pub pose: bool,
  pub score_following: bool,
  pub teacher_mode: bool,
  pub telemetry: bool,
  #[allow(dead_code)]
  pub push: bool,
  pub audio_worklet: bool,
  #[allow(dead_code)]
  pub webcodecs: bool,
}

#[derive(Clone, Debug, Deserialize)]
pub struct Endpoints {
  pub telemetry: String,
  pub errors: String,
  #[serde(alias = "pushSubscribe")]
  pub push_subscribe: String,
  #[serde(alias = "pushSchedule")]
  pub push_schedule: String,
  #[serde(alias = "pushPublicKey")]
  pub push_public_key: String,
  pub update: String,
}

#[derive(Clone, Debug, Deserialize)]
pub struct Channels {
  pub update: String,
}

#[derive(Clone, Debug, Deserialize)]
pub struct AppConfig {
  #[serde(alias = "schemaVersion")]
  #[allow(dead_code)]
  pub schema_version: u32,
  pub features: FeatureFlags,
  pub endpoints: Endpoints,
  pub channels: Channels,
}

impl Default for AppConfig {
  fn default() -> Self {
    Self {
      schema_version: 1,
      features: FeatureFlags {
        games: true,
        ml: true,
        pose: true,
        score_following: true,
        teacher_mode: true,
        telemetry: true,
        push: true,
        audio_worklet: true,
        webcodecs: true,
      },
      endpoints: Endpoints {
        telemetry: "/api/telemetry".into(),
        errors: "/api/errors".into(),
        push_subscribe: "/api/push/subscribe".into(),
        push_schedule: "/api/push/schedule".into(),
        push_public_key: "/api/push/public-key".into(),
        update: "/api/pwa/update".into(),
      },
      channels: Channels { update: "stable".into() },
    }
  }
}

pub async fn load() -> AppConfig {
  let window = dom::window();
  let fetch = window.fetch_with_str("./config.json");
  let resp = match JsFuture::from(fetch).await {
    Ok(val) => val,
    Err(_) => return default_config(),
  };
  let resp: web_sys::Response = match resp.dyn_into() {
    Ok(resp) => resp,
    Err(_) => return default_config(),
  };
  let text = match resp.text() {
    Ok(promise) => promise,
    Err(_) => return default_config(),
  };
  let text = match JsFuture::from(text).await {
    Ok(val) => val,
    Err(_) => return default_config(),
  };
  let raw = text.as_string().unwrap_or_default();
  let mut config = serde_json::from_str(&raw).unwrap_or_default();
  apply_channel_override(&mut config);
  config
}

pub fn write_dataset(config: &AppConfig) {
  if let Some(root) = dom::document().document_element() {
    dom::set_attr(&root, "data-feature-games", if config.features.games { "true" } else { "false" });
    dom::set_attr(&root, "data-feature-ml", if config.features.ml { "true" } else { "false" });
    dom::set_attr(&root, "data-feature-pose", if config.features.pose { "true" } else { "false" });
    dom::set_attr(&root, "data-feature-teacher", if config.features.teacher_mode { "true" } else { "false" });
    dom::set_attr(&root, "data-feature-score", if config.features.score_following { "true" } else { "false" });
  }
}

#[allow(dead_code)]
pub fn endpoint_allowlist(config: &AppConfig) -> Vec<String> {
  vec![
    config.endpoints.telemetry.clone(),
    config.endpoints.errors.clone(),
    config.endpoints.push_subscribe.clone(),
    config.endpoints.push_schedule.clone(),
    config.endpoints.push_public_key.clone(),
    config.endpoints.update.clone(),
  ]
}

fn apply_channel_override(config: &mut AppConfig) {
  if let Some(channel) = storage::local_get("shell:update-channel") {
    if !channel.is_empty() {
      config.channels.update = channel;
    }
  }
}

fn default_config() -> AppConfig {
  let mut config = AppConfig::default();
  apply_channel_override(&mut config);
  config
}
