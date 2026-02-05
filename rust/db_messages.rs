use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum DbRequest {
  #[serde(rename = "DB_INIT")]
  Init {
    request_id: String,
    schema_version: u32,
    schema_sql: String,
  },
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum DbResponse {
  #[serde(rename = "DB_READY")]
  Ready {
    request_id: String,
    ok: bool,
    detail: String,
    db_file: String,
    sqlite_version: String,
    schema_version: u32,
    ms: f64,
  },
  #[serde(rename = "DB_ERROR")]
  Error {
    request_id: String,
    message: String,
  },
}
