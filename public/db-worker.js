import sqlite3InitModule from './sqlite/index.mjs';

let sqlitePromise = null;
let sqlite3 = null;
let db = null;

const loadSqlite = async () => {
  if (!sqlitePromise) {
    sqlitePromise = sqlite3InitModule({
      locateFile: (path, prefix) => {
        try {
          return new URL(path, import.meta.url).href;
        } catch {
          return `${prefix || ''}${path}`;
        }
      },
    });
  }
  sqlite3 = await sqlitePromise;
  return sqlite3;
};

const getUserVersion = () => {
  const rows = db.exec({
    sql: 'PRAGMA user_version;',
    rowMode: 'scalar',
    returnValue: 'resultRows',
  });
  if (Array.isArray(rows) && rows.length) {
    const value = Number(rows[0]);
    return Number.isFinite(value) ? value : 0;
  }
  return 0;
};

const applySchemaAndMigrations = (schemaSql, migrations, targetVersion) => {
  let version = getUserVersion();
  if (version === 0 && schemaSql) {
    db.exec(schemaSql);
    version = getUserVersion();
  }
  if (Array.isArray(migrations)) {
    const ordered = [...migrations].sort((a, b) => (a.version || 0) - (b.version || 0));
    for (const migration of ordered) {
      if (migration && migration.version > version && migration.sql) {
        db.exec(migration.sql);
        version = getUserVersion();
      }
    }
  }
  if (targetVersion && version === 0 && schemaSql) {
    version = getUserVersion();
  }
  return version;
};

const ensureDb = async (data = {}) => {
  const sqlite = await loadSqlite();
  if (!db) {
    db = new sqlite.oo1.OpfsDb('emerson.db', 'c');
  }
  const version = applySchemaAndMigrations(data.schema_sql, data.migrations, data.schema_version);
  return { sqlite, db, version };
};

self.onmessage = async (event) => {
  const data = event.data || {};
  const requestId = data.request_id || 'unknown';
  const start = performance.now();

  try {
    if (data.type === 'DB_INIT') {
      const { sqlite, version } = await ensureDb(data);
      const sqliteVersion = sqlite?.capi?.sqlite3_libversion?.() || sqlite?.version?.libVersion || 'unknown';
      const dbFile = db?.filename || 'emerson.db';
      self.postMessage({
        type: 'DB_READY',
        request_id: requestId,
        ok: true,
        detail: 'SQLite OPFS ready',
        db_file: dbFile,
        sqlite_version: sqliteVersion,
        schema_version: Number(version) || 0,
        ms: performance.now() - start,
      });
      return;
    }

    if (data.type === 'DB_EXEC') {
      await ensureDb();
      db.exec({
        sql: data.sql,
        bind: Array.isArray(data.params) ? data.params : [],
      });
      self.postMessage({
        type: 'DB_EXEC_RESULT',
        request_id: requestId,
        ok: true,
        ms: performance.now() - start,
      });
      return;
    }

    if (data.type === 'DB_QUERY') {
      await ensureDb();
      const rows = db.exec({
        sql: data.sql,
        bind: Array.isArray(data.params) ? data.params : [],
        rowMode: 'object',
        returnValue: 'resultRows',
      });
      self.postMessage({
        type: 'DB_QUERY_RESULT',
        request_id: requestId,
        rows: Array.isArray(rows) ? rows : [],
        ms: performance.now() - start,
      });
      return;
    }

    if (data.type === 'DB_BATCH') {
      await ensureDb();
      const statements = Array.isArray(data.statements) ? data.statements : [];
      if (data.transaction) {
        db.exec('BEGIN');
      }
      try {
        for (const stmt of statements) {
          if (!stmt?.sql) continue;
          db.exec({
            sql: stmt.sql,
            bind: Array.isArray(stmt.params) ? stmt.params : [],
          });
        }
        if (data.transaction) {
          db.exec('COMMIT');
        }
      } catch (err) {
        if (data.transaction) {
          try {
            db.exec('ROLLBACK');
          } catch {
            // Ignore rollback failures.
          }
        }
        throw err;
      }
      self.postMessage({
        type: 'DB_BATCH_RESULT',
        request_id: requestId,
        ok: true,
        statement_count: statements.length,
        ms: performance.now() - start,
      });
      return;
    }
  } catch (err) {
    const message = String(err?.message || err);
    const name = err?.name || err?.constructor?.name || '';
    const code = typeof err?.code === 'number' ? err.code : null;
    const quota = name === 'QuotaExceededError' || code === 22 || /quota/i.test(message);
    self.postMessage({
      type: 'DB_ERROR',
      request_id: requestId,
      message,
      name: name || null,
      code,
      quota,
      ms: performance.now() - start,
    });
  }
};
