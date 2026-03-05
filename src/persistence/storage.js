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
    await writeJSONWithFallback({
        warningLabel: '[Storage] IndexedDB set failed',
        write: (store) => store.put(value, key),
        applyFallback: () => fallbackSetJSON(key, value),
    });
};

export const removeJSON = async (key) => {
    await writeJSONWithFallback({
        warningLabel: '[Storage] IndexedDB remove failed',
        write: (store) => store.delete(key),
        applyFallback: () => fallbackRemoveJSON(key),
    });
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
