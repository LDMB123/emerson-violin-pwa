const DB_NAME = 'panda-violin-db';
const DB_VERSION = 2;
const STORE = 'kv';
const BLOB_STORE = 'blobs';

let dbPromise = null;

const openDB = () => {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE);
            }
            if (!db.objectStoreNames.contains(BLOB_STORE)) {
                db.createObjectStore(BLOB_STORE);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            console.warn('[Storage] IndexedDB open failed', request.error);
            resolve(null);
        };
        request.onblocked = () => resolve(null);
    });
    return dbPromise;
};

/* ── IDB transaction helper ─────────────────────────────── */

const idbOp = (db, storeName, mode, fn) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = fn(store);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
});

/* ── Public API: JSON (KV store) ────────────────────────── */

export const getJSON = async (key) => {
    const db = await openDB();
    if (!db) return null;
    try {
        return await idbOp(db, STORE, 'readonly', (s) => s.get(key));
    } catch (error) {
        console.warn('[Storage] IndexedDB get failed', error);
        return null;
    }
};

export const setJSON = async (key, value) => {
    const db = await openDB();
    if (!db) return;
    try {
        await idbOp(db, STORE, 'readwrite', (s) => s.put(value, key));
    } catch (error) {
        console.warn('[Storage] IndexedDB set failed', error);
    }
};

export const removeJSON = async (key) => {
    const db = await openDB();
    if (!db) return;
    try {
        await idbOp(db, STORE, 'readwrite', (s) => s.delete(key));
    } catch (error) {
        console.warn('[Storage] IndexedDB remove failed', error);
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
