use serde::Deserialize;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::JsFuture;
use web_sys::Url;

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

const DEFAULT_TELEMETRY_ENDPOINT: &str = "/api/telemetry";
const DEFAULT_ERRORS_ENDPOINT: &str = "/api/errors";
const DEFAULT_PUSH_SUBSCRIBE_ENDPOINT: &str = "/api/push/subscribe";
const DEFAULT_PUSH_SCHEDULE_ENDPOINT: &str = "/api/push/schedule";
const DEFAULT_PUSH_PUBLIC_KEY_ENDPOINT: &str = "/api/push/public-key";
const DEFAULT_UPDATE_ENDPOINT: &str = "/api/pwa/update";
const DEFAULT_UPDATE_CHANNEL: &str = "stable";

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
        telemetry: DEFAULT_TELEMETRY_ENDPOINT.into(),
        errors: DEFAULT_ERRORS_ENDPOINT.into(),
        push_subscribe: DEFAULT_PUSH_SUBSCRIBE_ENDPOINT.into(),
        push_schedule: DEFAULT_PUSH_SCHEDULE_ENDPOINT.into(),
        push_public_key: DEFAULT_PUSH_PUBLIC_KEY_ENDPOINT.into(),
        update: DEFAULT_UPDATE_ENDPOINT.into(),
      },
      channels: Channels {
        update: DEFAULT_UPDATE_CHANNEL.into(),
      },
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
  if !resp.ok() {
    return default_config();
  }
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
  sanitize_endpoints(&mut config);
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
      config.channels.update = sanitize_channel(&channel);
    }
  }
}

fn default_config() -> AppConfig {
  let mut config = AppConfig::default();
  sanitize_endpoints(&mut config);
  apply_channel_override(&mut config);
  config
}

fn sanitize_endpoints(config: &mut AppConfig) {
  config.endpoints.telemetry = sanitize_endpoint(&config.endpoints.telemetry, DEFAULT_TELEMETRY_ENDPOINT);
  config.endpoints.errors = sanitize_endpoint(&config.endpoints.errors, DEFAULT_ERRORS_ENDPOINT);
  config.endpoints.push_subscribe =
    sanitize_endpoint(&config.endpoints.push_subscribe, DEFAULT_PUSH_SUBSCRIBE_ENDPOINT);
  config.endpoints.push_schedule =
    sanitize_endpoint(&config.endpoints.push_schedule, DEFAULT_PUSH_SCHEDULE_ENDPOINT);
  config.endpoints.push_public_key =
    sanitize_endpoint(&config.endpoints.push_public_key, DEFAULT_PUSH_PUBLIC_KEY_ENDPOINT);
  config.endpoints.update = sanitize_endpoint(&config.endpoints.update, DEFAULT_UPDATE_ENDPOINT);
  config.channels.update = sanitize_channel(&config.channels.update);
}

fn sanitize_endpoint(raw: &str, fallback: &str) -> String {
  let trimmed = raw.trim();
  if trimmed.is_empty() {
    return fallback.to_string();
  }

  let origin = dom::window().location().origin().unwrap_or_default();
  let url = match Url::new_with_base(trimmed, &origin) {
    Ok(url) => url,
    Err(_) => return fallback.to_string(),
  };
  let protocol = url.protocol();
  if protocol != "http:" && protocol != "https:" {
    return fallback.to_string();
  }
  if !origin.is_empty() && url.origin() != origin {
    return fallback.to_string();
  }
  let path = url.pathname();
  if path.is_empty() || !path.starts_with('/') {
    return fallback.to_string();
  }
  let query = url.search();
  format!("{}{}", path, query)
}

fn sanitize_channel(raw: &str) -> String {
  let trimmed = raw.trim();
  if trimmed.is_empty() {
    return DEFAULT_UPDATE_CHANNEL.to_string();
  }
  let filtered: String = trimmed
    .chars()
    .filter(|ch| ch.is_ascii_alphanumeric() || *ch == '-' || *ch == '_' || *ch == '.')
    .take(32)
    .collect();
  if filtered.is_empty() {
    DEFAULT_UPDATE_CHANNEL.to_string()
  } else {
    filtered
  }
}
