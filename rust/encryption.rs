use std::cell::RefCell;

use js_sys::{Function, Object, Reflect, Uint8Array};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;
use web_sys::Crypto;

use crate::dom;
use crate::storage;

const ENABLE_KEY: &str = "enc:enabled";
const SALT_KEY: &str = "enc:salt";
const ITER_KEY: &str = "enc:iter";
const DEFAULT_ITERATIONS: u32 = 150_000;

thread_local! {
  static KEY_CACHE: RefCell<Option<JsValue>> = RefCell::new(None);
}

pub fn is_enabled() -> bool {
  storage::local_get(ENABLE_KEY).as_deref() == Some("true")
}

pub fn is_unlocked() -> bool {
  KEY_CACHE.with(|cell| cell.borrow().is_some())
}

pub fn lock() {
  KEY_CACHE.with(|cell| *cell.borrow_mut() = None);
}

pub async fn enable_pin(pin: &str) -> bool {
  if is_enabled() {
    return false;
  }
  let salt = match random_bytes(16) {
    Some(bytes) => bytes,
    None => return false,
  };
  let key = match derive_key(pin, &salt, DEFAULT_ITERATIONS).await {
    Some(key) => key,
    None => return false,
  };
  storage::local_set(ENABLE_KEY, "true");
  storage::local_set(SALT_KEY, &to_hex(&salt));
  storage::local_set(ITER_KEY, &DEFAULT_ITERATIONS.to_string());
  KEY_CACHE.with(|cell| *cell.borrow_mut() = Some(key));
  true
}

pub async fn unlock_pin(pin: &str) -> bool {
  if !is_enabled() {
    return false;
  }
  let salt = storage::local_get(SALT_KEY).and_then(|hex| from_hex(&hex));
  let salt = match salt {
    Some(salt) => salt,
    None => return false,
  };
  let iterations = storage::local_get(ITER_KEY)
    .and_then(|val| val.parse::<u32>().ok())
    .unwrap_or(DEFAULT_ITERATIONS);
  let key = match derive_key(pin, &salt, iterations).await {
    Some(key) => key,
    None => return false,
  };
  KEY_CACHE.with(|cell| *cell.borrow_mut() = Some(key));
  true
}

pub async fn encrypt_value(value: &JsValue) -> Option<JsValue> {
  if !is_unlocked() {
    return None;
  }
  let json = js_sys::JSON::stringify(value).ok()?.as_string()?;
  let (ciphertext, iv) = encrypt_bytes(json.as_bytes()).await?;
  let obj = Object::new();
  let _ = Reflect::set(&obj, &"enc".into(), &JsValue::TRUE);
  let _ = Reflect::set(&obj, &"alg".into(), &JsValue::from_str("AES-GCM"));
  let _ = Reflect::set(&obj, &"iv".into(), &JsValue::from_str(&to_hex(&iv)));
  let _ = Reflect::set(&obj, &"data".into(), &JsValue::from_str(&to_hex(&ciphertext)));
  Some(obj.into())
}

pub async fn decrypt_value(value: &JsValue) -> Option<JsValue> {
  ensure_unlocked().await?;
  let iv_hex = Reflect::get(value, &"iv".into()).ok().and_then(|v| v.as_string())?;
  let data_hex = Reflect::get(value, &"data".into()).ok().and_then(|v| v.as_string())?;
  let iv = from_hex(&iv_hex)?;
  let data = from_hex(&data_hex)?;
  let plain = decrypt_bytes(&data, &iv).await?;
  let text = String::from_utf8(plain).ok()?;
  js_sys::JSON::parse(&text).ok()
}

async fn ensure_unlocked() -> Option<()> {
  if !is_enabled() {
    return None;
  }
  if is_unlocked() {
    return Some(());
  }
  if let Some(pin) = storage::local_get("enc:pin") {
    if unlock_pin(&pin).await {
      return Some(());
    }
  }
  None
}

async fn encrypt_bytes(data: &[u8]) -> Option<(Vec<u8>, Vec<u8>)> {
  let iv = random_bytes(12)?;
  let key = KEY_CACHE.with(|cell| cell.borrow().clone())?;
  let alg = Object::new();
  let _ = Reflect::set(&alg, &JsValue::from_str("name"), &JsValue::from_str("AES-GCM"));
  let _ = Reflect::set(&alg, &JsValue::from_str("iv"), &Uint8Array::from(iv.as_slice()).into());
  let payload = Uint8Array::from(data);
  let encrypted = subtle_call("encrypt", &[alg.into(), key, payload.into()]).await?;
  let buffer = encrypted.dyn_into::<js_sys::ArrayBuffer>().ok()?;
  let output = Uint8Array::new(&buffer);
  let mut ciphertext = vec![0u8; output.length() as usize];
  output.copy_to(&mut ciphertext);
  Some((ciphertext, iv))
}

async fn decrypt_bytes(ciphertext: &[u8], iv: &[u8]) -> Option<Vec<u8>> {
  let key = KEY_CACHE.with(|cell| cell.borrow().clone())?;
  let alg = Object::new();
  let _ = Reflect::set(&alg, &JsValue::from_str("name"), &JsValue::from_str("AES-GCM"));
  let _ = Reflect::set(&alg, &JsValue::from_str("iv"), &Uint8Array::from(iv).into());
  let payload = Uint8Array::from(ciphertext);
  let decrypted = subtle_call("decrypt", &[alg.into(), key, payload.into()]).await?;
  let buffer = decrypted.dyn_into::<js_sys::ArrayBuffer>().ok()?;
  let output = Uint8Array::new(&buffer);
  let mut bytes = vec![0u8; output.length() as usize];
  output.copy_to(&mut bytes);
  Some(bytes)
}

async fn derive_key(pin: &str, salt: &[u8], iterations: u32) -> Option<JsValue> {
  let pin_bytes = Uint8Array::from(pin.as_bytes());
  let import = subtle_call(
    "importKey",
    &[
      JsValue::from_str("raw"),
      pin_bytes.into(),
      JsValue::from_str("PBKDF2"),
      JsValue::from_bool(false),
      js_sys::Array::of1(&JsValue::from_str("deriveKey")).into(),
    ],
  ).await?;

  let params = Object::new();
  let _ = Reflect::set(&params, &JsValue::from_str("name"), &JsValue::from_str("PBKDF2"));
  let _ = Reflect::set(&params, &JsValue::from_str("salt"), &Uint8Array::from(salt).into());
  let _ = Reflect::set(&params, &JsValue::from_str("iterations"), &JsValue::from_f64(iterations as f64));
  let _ = Reflect::set(&params, &JsValue::from_str("hash"), &JsValue::from_str("SHA-256"));

  let aes = Object::new();
  let _ = Reflect::set(&aes, &JsValue::from_str("name"), &JsValue::from_str("AES-GCM"));
  let _ = Reflect::set(&aes, &JsValue::from_str("length"), &JsValue::from_f64(256.0));

  let usages = js_sys::Array::new();
  usages.push(&JsValue::from_str("encrypt"));
  usages.push(&JsValue::from_str("decrypt"));

  let derived = subtle_call("deriveKey", &[params.into(), import, aes.into(), JsValue::from_bool(false), usages.into()]).await?;
  Some(derived)
}

async fn subtle_call(method: &str, args: &[JsValue]) -> Option<JsValue> {
  let subtle = crypto_subtle()?;
  let func = Reflect::get(&subtle, &JsValue::from_str(method)).ok()?;
  let func = func.dyn_into::<Function>().ok()?;
  let promise = func.apply(&subtle, &js_sys::Array::from_iter(args.iter())).ok()?;
  let promise = promise.dyn_into::<js_sys::Promise>().ok()?;
  JsFuture::from(promise).await.ok()
}

fn crypto_subtle() -> Option<JsValue> {
  let crypto: Crypto = dom::window().crypto().ok()?;
  Reflect::get(&crypto, &JsValue::from_str("subtle")).ok()
}

fn random_bytes(len: usize) -> Option<Vec<u8>> {
  let crypto: Crypto = dom::window().crypto().ok()?;
  let mut data = vec![0u8; len];
  crypto.get_random_values_with_u8_array(&mut data).ok()?;
  Some(data)
}

fn to_hex(bytes: &[u8]) -> String {
  bytes.iter().map(|b| format!("{:02x}", b)).collect::<Vec<_>>().join("")
}

fn from_hex(hex: &str) -> Option<Vec<u8>> {
  if hex.len() % 2 != 0 {
    return None;
  }
  let mut out = Vec::with_capacity(hex.len() / 2);
  let chars: Vec<char> = hex.chars().collect();
  for i in (0..chars.len()).step_by(2) {
    let hi = chars[i].to_digit(16)?;
    let lo = chars[i + 1].to_digit(16)?;
    out.push(((hi << 4) | lo) as u8);
  }
  Some(out)
}
