import sqlite3InitModule from './sqlite/index.mjs';

let sqlitePromise = null;

const loadSqlite = () => {
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
  return sqlitePromise;
};

self.onmessage = async (event) => {
  const data = event.data || {};
  if (data.type !== 'DB_INIT') return;

  const start = performance.now();
  const requestId = data.request_id || 'unknown';
  let db = null;

  try {
    const sqlite3 = await loadSqlite();
    if (!sqlite3?.oo1?.OpfsDb) {
      throw new Error('sqlite3 OPFS VFS unavailable');
    }

    db = new sqlite3.oo1.OpfsDb('emerson.db', 'c');
    if (data.schema_sql) {
      db.exec(data.schema_sql);
    }

    const sqliteVersion = sqlite3.capi?.sqlite3_libversion?.() || 'unknown';
    const dbFile = db.filename || 'emerson.db';

    self.postMessage({
      type: 'DB_READY',
      request_id: requestId,
      ok: true,
      detail: 'SQLite OPFS ready',
      db_file: dbFile,
      sqlite_version: sqliteVersion,
      schema_version: data.schema_version || 0,
      ms: performance.now() - start,
    });
  } catch (err) {
    self.postMessage({
      type: 'DB_ERROR',
      request_id: requestId,
      message: String(err?.message || err),
    });
  } finally {
    try {
      db?.close();
    } catch {
      // Ignore close errors for diagnostics worker.
    }
  }
};
