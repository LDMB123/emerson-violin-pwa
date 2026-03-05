import { BLOB_STORE, STORE, idbOp, openDB } from './storage-idb.js';
import { fallbackGetJSON, fallbackRemoveJSON, fallbackSetJSON } from './storage-fallback.js';

const writeJSONWithFallback = async ({ warningLabel, write, applyFallback }) => {
    const db = await openDB();
    if (!db) {
        applyFallback();
        return;
    }

    try {
        await idbOp(db, STORE, 'readwrite', write);
    } catch (error) {
        console.warn(warningLabel, error);
    } finally {
        applyFallback();
    }
};

/* ── Public API: JSON (KV store) ────────────────────────── */

/** Reads a JSON value from IndexedDB with localStorage fallback on failure. */
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

/** Persists a JSON value to IndexedDB and mirrors it to the fallback store. */
export const setJSON = async (key, value) => {
    await writeJSONWithFallback({
        warningLabel: '[Storage] IndexedDB set failed',
        write: (store) => store.put(value, key),
        applyFallback: () => fallbackSetJSON(key, value),
    });
};

/** Removes a JSON value from IndexedDB and the fallback store. */
export const removeJSON = async (key) => {
    await writeJSONWithFallback({
        warningLabel: '[Storage] IndexedDB remove failed',
        write: (store) => store.delete(key),
        applyFallback: () => fallbackRemoveJSON(key),
    });
};



/* ── Public API: Blobs ──────────────────────────────────── */

/** Reads a blob payload from the dedicated IndexedDB blob store. */
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

/** Persists a blob payload to the dedicated IndexedDB blob store. */
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

/** Removes a blob payload from the dedicated IndexedDB blob store. */
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
