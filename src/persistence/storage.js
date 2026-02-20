import { BLOB_STORE, STORE, idbOp, openDB } from './storage-idb.js';
import { fallbackGetJSON, fallbackRemoveJSON, fallbackSetJSON } from './storage-fallback.js';

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

/**
 * Read JSON value from the primary key, or migrate from legacy keys when present.
 * Legacy values are copied into the primary key non-destructively.
 */
export const getJSONFromAnyKey = async (primaryKey, legacyKeys = []) => {
    if (!primaryKey) return null;
    const primary = await getJSON(primaryKey);
    if (primary !== null && primary !== undefined) {
        return primary;
    }

    for (const key of legacyKeys) {
        if (!key) continue;
        const candidate = await getJSON(key);
        if (candidate === null || candidate === undefined) continue;
        await setJSON(primaryKey, candidate);
        return candidate;
    }

    return null;
};

/**
 * Apply a migration function to a JSON record and persist only when changed.
 */
export const migrateJSON = async (key, migrationFn) => {
    if (!key || typeof migrationFn !== 'function') return null;
    const current = await getJSON(key);
    const migrated = migrationFn(current);
    const changed = JSON.stringify(migrated) !== JSON.stringify(current);
    if (changed) {
        await setJSON(key, migrated);
    }
    return migrated;
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
