const DB_NAME = 'panda-violin-db';
const DB_VERSION = 2;
const STORE = 'kv';
const BLOB_STORE = 'blobs';
const FALLBACK_PREFIX = 'panda-violin:kv:';

let dbPromise = null;
const clearDBPromise = () => {
    dbPromise = null;
};

const openDB = () => {
    if (dbPromise) return dbPromise;
    if (!('indexedDB' in globalThis)) {
        return Promise.resolve(null);
    }
    dbPromise = new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        const resolveWith = (db) => {
            // Do not permanently cache a null DB handle on transient failures.
            if (!db) {
                clearDBPromise();
            }
            resolve(db);
        };
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE);
            }
            if (!db.objectStoreNames.contains(BLOB_STORE)) {
                db.createObjectStore(BLOB_STORE);
            }
        };
        request.onsuccess = () => {
            const db = request.result;
            db.onversionchange = () => {
                try {
                    db.close();
                } catch {
                    // Ignore close failures.
                }
                clearDBPromise();
            };
            resolveWith(db);
        };
        request.onerror = () => {
            console.warn('[Storage] IndexedDB open failed', request.error);
            resolveWith(null);
        };
        request.onblocked = () => {
            console.warn('[Storage] IndexedDB open blocked');
            resolveWith(null);
        };
    });
    return dbPromise;
};

const fallbackKey = (key) => `${FALLBACK_PREFIX}${key}`;

const fallbackGetJSON = (key) => {
    try {
        const raw = window.localStorage.getItem(fallbackKey(key));
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const fallbackSetJSON = (key, value) => {
    try {
        window.localStorage.setItem(fallbackKey(key), JSON.stringify(value));
    } catch {
        // Ignore storage quota or privacy-mode failures.
    }
};

const fallbackRemoveJSON = (key) => {
    try {
        window.localStorage.removeItem(fallbackKey(key));
    } catch {
        // Ignore storage failures.
    }
};

/* ── IDB transaction helper ─────────────────────────────── */

const idbOp = (db, storeName, mode, fn) => new Promise((resolve, reject) => {
    let settled = false;
    const finishReject = (error) => {
        if (settled) return;
        settled = true;
        reject(error || new Error('[Storage] IndexedDB transaction failed'));
    };
    const finishResolve = (value) => {
        if (settled) return;
        settled = true;
        resolve(value ?? null);
    };

    let tx;
    try {
        tx = db.transaction(storeName, mode);
    } catch (error) {
        finishReject(error);
        return;
    }

    tx.onabort = () => finishReject(tx.error);
    tx.onerror = () => finishReject(tx.error);

    const store = tx.objectStore(storeName);
    let request;
    try {
        request = fn(store);
    } catch (error) {
        finishReject(error);
        return;
    }

    if (!request) {
        finishReject(new Error(`[Storage] IndexedDB request missing for store "${storeName}"`));
        return;
    }

    request.onsuccess = () => finishResolve(request.result);
    request.onerror = () => finishReject(request.error);
});

/* ── Public API: JSON (KV store) ────────────────────────── */

export const getJSON = async (key) => {
    const db = await openDB();
    if (!db) return fallbackGetJSON(key);
    try {
        return await idbOp(db, STORE, 'readonly', (s) => s.get(key));
    } catch (error) {
        console.warn('[Storage] IndexedDB get failed', error);
        return fallbackGetJSON(key);
    }
};

export const setJSON = async (key, value) => {
    const db = await openDB();
    if (!db) {
        fallbackSetJSON(key, value);
        return;
    }
    try {
        await idbOp(db, STORE, 'readwrite', (s) => s.put(value, key));
        fallbackSetJSON(key, value);
    } catch (error) {
        console.warn('[Storage] IndexedDB set failed', error);
        fallbackSetJSON(key, value);
    }
};

export const removeJSON = async (key) => {
    const db = await openDB();
    if (!db) {
        fallbackRemoveJSON(key);
        return;
    }
    try {
        await idbOp(db, STORE, 'readwrite', (s) => s.delete(key));
        fallbackRemoveJSON(key);
    } catch (error) {
        console.warn('[Storage] IndexedDB remove failed', error);
        fallbackRemoveJSON(key);
    }
};

/* ── Public API: Blobs ──────────────────────────────────── */

export const getBlob = async (key) => {
    if (!key) return null;
    const db = await openDB();
    if (!db) return null;
    try {
        return await idbOp(db, BLOB_STORE, 'readonly', (s) => s.get(key));
    } catch (error) {
        console.warn('[Storage] IndexedDB blob get failed', error);
        return null;
    }
};

export const setBlob = async (key, blob) => {
    if (!key || !blob) return false;
    const db = await openDB();
    if (!db) return false;
    try {
        await idbOp(db, BLOB_STORE, 'readwrite', (s) => s.put(blob, key));
        return true;
    } catch (error) {
        console.warn('[Storage] IndexedDB blob set failed', error);
        return false;
    }
};

export const removeBlob = async (key) => {
    if (!key) return;
    const db = await openDB();
    if (!db) return;
    try {
        await idbOp(db, BLOB_STORE, 'readwrite', (s) => s.delete(key));
    } catch (error) {
        console.warn('[Storage] blob cleanup failed', error);
    }
};
