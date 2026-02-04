pub fn create_id() -> String {
  if let Some(crypto) = web_sys::window().and_then(|w| w.crypto().ok()) {
    return crypto.random_uuid();
  }
  format!(
    "{}-{}",
    js_sys::Date::now() as i64,
    (js_sys::Math::random() * 1_000_000.0) as i64
  )
}
