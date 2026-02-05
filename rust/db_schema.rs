use crate::db_messages::DbMigration;

pub const SCHEMA_VERSION: u32 = 3;

// Keep PRAGMA user_version and meta.schema_version aligned with SCHEMA_VERSION.
pub const SCHEMA_SQL: &str = r#"
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA temp_store=MEMORY;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  day_key TEXT NOT NULL,
  duration_minutes REAL NOT NULL,
  note TEXT NOT NULL,
  created_at REAL NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_day_key_idx ON sessions(day_key);
CREATE INDEX IF NOT EXISTS sessions_created_at_idx ON sessions(created_at);

CREATE TABLE IF NOT EXISTS recordings (
  id TEXT PRIMARY KEY,
  created_at REAL NOT NULL,
  duration_seconds REAL NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes REAL NOT NULL,
  format TEXT NOT NULL,
  opfs_path TEXT,
  profile_id TEXT,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS recordings_created_at_idx ON recordings(created_at);
CREATE INDEX IF NOT EXISTS recordings_profile_id_idx ON recordings(profile_id);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  created_at REAL NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sync_queue_created_at_idx ON sync_queue(created_at);

CREATE TABLE IF NOT EXISTS share_inbox (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  size REAL NOT NULL,
  mime TEXT NOT NULL,
  created_at REAL NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS share_inbox_created_at_idx ON share_inbox(created_at);

CREATE TABLE IF NOT EXISTS ml_traces (
  id TEXT PRIMARY KEY,
  created_at REAL NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ml_traces_created_at_idx ON ml_traces(created_at);

CREATE TABLE IF NOT EXISTS game_scores (
  id TEXT PRIMARY KEY,
  created_at REAL NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS game_scores_created_at_idx ON game_scores(created_at);

CREATE TABLE IF NOT EXISTS score_library (
  id TEXT PRIMARY KEY,
  title TEXT,
  composer TEXT,
  created_at REAL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS score_library_title_idx ON score_library(title);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  created_at REAL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS assignments_created_at_idx ON assignments(created_at);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT,
  created_at REAL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS profiles_name_idx ON profiles(name);

CREATE TABLE IF NOT EXISTS telemetry_queue (
  id TEXT PRIMARY KEY,
  created_at REAL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS telemetry_queue_created_at_idx ON telemetry_queue(created_at);

CREATE TABLE IF NOT EXISTS error_queue (
  id TEXT PRIMARY KEY,
  created_at REAL NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS error_queue_created_at_idx ON error_queue(created_at);

CREATE TABLE IF NOT EXISTS score_scans (
  id TEXT PRIMARY KEY,
  created_at REAL NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS score_scans_created_at_idx ON score_scans(created_at);

CREATE TABLE IF NOT EXISTS model_cache (
  id TEXT PRIMARY KEY,
  created_at REAL NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS model_cache_created_at_idx ON model_cache(created_at);

CREATE TABLE IF NOT EXISTS migration_state (
  id TEXT PRIMARY KEY,
  source_version INTEGER NOT NULL,
  started_at REAL NOT NULL,
  updated_at REAL NOT NULL,
  last_store TEXT,
  last_index INTEGER,
  last_key TEXT,
  counts_json TEXT NOT NULL,
  errors_json TEXT NOT NULL,
  checksums_json TEXT NOT NULL DEFAULT '{}',
  completed_at REAL
);

CREATE TABLE IF NOT EXISTS migration_log (
  id TEXT PRIMARY KEY,
  migration_id TEXT NOT NULL,
  store TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at REAL NOT NULL
);

PRAGMA user_version = 3;
INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '3');
"#;

pub fn migrations() -> Vec<DbMigration> {
  vec![
    DbMigration {
      version: 2,
      sql: r#"
CREATE TABLE IF NOT EXISTS migration_state (
  id TEXT PRIMARY KEY,
  source_version INTEGER NOT NULL,
  started_at REAL NOT NULL,
  updated_at REAL NOT NULL,
  last_store TEXT,
  last_index INTEGER,
  counts_json TEXT NOT NULL,
  errors_json TEXT NOT NULL,
  completed_at REAL
);

CREATE TABLE IF NOT EXISTS migration_log (
  id TEXT PRIMARY KEY,
  migration_id TEXT NOT NULL,
  store TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at REAL NOT NULL
);

PRAGMA user_version = 2;
INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '2');
"#
        .trim()
        .to_string(),
    },
    DbMigration {
      version: 3,
      sql: r#"
ALTER TABLE migration_state ADD COLUMN last_key TEXT;
ALTER TABLE migration_state ADD COLUMN checksums_json TEXT NOT NULL DEFAULT '{}';

PRAGMA user_version = 3;
INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '3');
"#
        .trim()
        .to_string(),
    },
  ]
}
