use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbMigration {
  pub version: u32,
  pub sql: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbStatement {
  pub sql: String,
  #[serde(default)]
  pub params: Vec<JsonValue>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum DbRequest {
  #[serde(rename = "DB_INIT")]
  Init {
    request_id: String,
    schema_version: u32,
    schema_sql: String,
    #[serde(default)]
    migrations: Vec<DbMigration>,
  },
  #[serde(rename = "DB_EXEC")]
  Exec {
    request_id: String,
    sql: String,
    #[serde(default)]
    params: Vec<JsonValue>,
  },
  #[serde(rename = "DB_QUERY")]
  Query {
    request_id: String,
    sql: String,
    #[serde(default)]
    params: Vec<JsonValue>,
  },
  #[serde(rename = "DB_BATCH")]
  Batch {
    request_id: String,
    statements: Vec<DbStatement>,
    #[serde(default)]
    transaction: bool,
  },
}

impl DbRequest {
  pub fn request_id(&self) -> &str {
    match self {
      DbRequest::Init { request_id, .. }
      | DbRequest::Exec { request_id, .. }
      | DbRequest::Query { request_id, .. }
      | DbRequest::Batch { request_id, .. } => request_id,
    }
  }
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
  #[serde(rename = "DB_EXEC_RESULT")]
  ExecResult {
    request_id: String,
    ok: bool,
    ms: f64,
  },
  #[serde(rename = "DB_QUERY_RESULT")]
  QueryResult {
    request_id: String,
    rows: Vec<JsonValue>,
    ms: f64,
  },
  #[serde(rename = "DB_BATCH_RESULT")]
  BatchResult {
    request_id: String,
    ok: bool,
    statement_count: usize,
    ms: f64,
  },
  #[serde(rename = "DB_ERROR")]
  Error {
    request_id: String,
    message: String,
  },
}

impl DbResponse {
  pub fn request_id(&self) -> &str {
    match self {
      DbResponse::Ready { request_id, .. }
      | DbResponse::ExecResult { request_id, .. }
      | DbResponse::QueryResult { request_id, .. }
      | DbResponse::BatchResult { request_id, .. }
      | DbResponse::Error { request_id, .. } => request_id,
    }
  }
}
