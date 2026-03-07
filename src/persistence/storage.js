import { BLOB_STORE, STORE, idbOp, openDB, runStoreTransaction } from './storage-idb.js';
import { getCollectionStoreDef, mapCollectionRowsToValues } from './storage-collections.js';
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

const normalizeCollectionValues = (value) => (Array.isArray(value) ? value : []);

const appendAndTrimArray = (items, nextItem, maxEntries = Infinity) => {
    const list = Array.isArray(items) ? items.slice() : [];
    list.push(nextItem);
    if (Number.isFinite(maxEntries) && list.length > maxEntries) {
        list.splice(0, list.length - maxEntries);
    }
    return list;
};

const readCollection = (db, definition) => runStoreTransaction(db, definition.storeName, 'readonly', (store, transaction, setResult) => {
    void transaction;
    const request = store.getAll();
    request.onsuccess = () => {
        setResult(mapCollectionRowsToValues(request.result, definition));
    };
});

const writeCollection = (db, definition, value) => {
    const values = normalizeCollectionValues(value);
    return runStoreTransaction(db, definition.storeName, 'readwrite', (store) => {
        store.clear();
        for (const entry of values) {
            const row = definition.rowFromValue(entry);
            if (row) {
                store.add(row);
            }
        }
    });
};

const clearCollection = (db, definition) => runStoreTransaction(db, definition.storeName, 'readwrite', (store) => {
    store.clear();
});

const appendCollection = (db, definition, value, { maxEntries = Infinity } = {}) => {
    const row = definition.rowFromValue(value);
    if (!row) return Promise.resolve();

    return runStoreTransaction(db, definition.storeName, 'readwrite', (store) => {
        store.add(row);
        if (!Number.isFinite(maxEntries)) return;

        const countRequest = store.count();
        countRequest.onerror = (event) => {
            console.warn('[Storage] appendCollection count failed', event.target.error);
            event.preventDefault();
        };
        countRequest.onsuccess = () => {
            const excess = countRequest.result - Math.max(0, Math.floor(maxEntries));
            if (excess <= 0) return;

            const source = definition.trimIndexName ? store.index(definition.trimIndexName) : store;
            let remaining = excess;
            const cursorRequest = source.openCursor();
            cursorRequest.onerror = (event) => {
                console.warn('[Storage] appendCollection cursor failed', event.target.error);
                event.preventDefault();
            };
            cursorRequest.onsuccess = () => {
                const cursor = cursorRequest.result;
                if (!cursor || remaining <= 0) return;
                cursor.delete();
                remaining -= 1;
                cursor.continue();
            };
        };
    });
};

const cleanupLegacyKVKey = async (db, key) => {
    try {
        await idbOp(db, STORE, 'readwrite', (store) => store.delete(key));
    } catch {
        // Ignore cleanup failures for legacy mirrored keys.
    }
};

/* ── Public API: JSON (KV store) ────────────────────────── */

/** Reads a JSON value from IndexedDB with localStorage fallback on failure. */
export const getJSON = async (key) => {
    const collectionDefinition = getCollectionStoreDef(key);
    if (collectionDefinition) {
        const db = await openDB();
        if (!db) return fallbackGetJSON(key);
        try {
            return await readCollection(db, collectionDefinition);
        } catch (error) {
            console.warn('[Storage] IndexedDB collection get failed', error);
            return fallbackGetJSON(key);
        }
    }

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
    const collectionDefinition = getCollectionStoreDef(key);
    if (collectionDefinition) {
        const normalized = normalizeCollectionValues(value);
        const db = await openDB();
        if (!db) {
            fallbackSetJSON(key, normalized);
            return;
        }

        try {
            await writeCollection(db, collectionDefinition, normalized);
            await cleanupLegacyKVKey(db, key);
            fallbackRemoveJSON(key);
        } catch (error) {
            console.warn('[Storage] IndexedDB collection set failed', error);
            fallbackSetJSON(key, normalized);
        }
        return;
    }

    await writeJSONWithFallback({
        warningLabel: '[Storage] IndexedDB set failed',
        write: (store) => store.put(value, key),
        applyFallback: () => fallbackSetJSON(key, value),
    });
};

/** Removes a JSON value from IndexedDB and the fallback store. */
export const removeJSON = async (key) => {
    const collectionDefinition = getCollectionStoreDef(key);
    if (collectionDefinition) {
        const db = await openDB();
        if (!db) {
            fallbackRemoveJSON(key);
            return;
        }

        try {
            await clearCollection(db, collectionDefinition);
            await cleanupLegacyKVKey(db, key);
        } catch (error) {
            console.warn('[Storage] IndexedDB collection remove failed', error);
        } finally {
            fallbackRemoveJSON(key);
        }
        return;
    }

    await writeJSONWithFallback({
        warningLabel: '[Storage] IndexedDB remove failed',
        write: (store) => store.delete(key),
        applyFallback: () => fallbackRemoveJSON(key),
    });
};

/** Appends one entry to a collection-backed JSON value without rewriting the whole store. */
export const appendJSONItem = async (key, value, { maxEntries = Infinity } = {}) => {
    const collectionDefinition = getCollectionStoreDef(key);
    if (!collectionDefinition) {
        const next = appendAndTrimArray(await getJSON(key), value, maxEntries);
        await setJSON(key, next);
        return;
    }

    const db = await openDB();
    if (!db) {
        fallbackSetJSON(key, appendAndTrimArray(fallbackGetJSON(key), value, maxEntries));
        return;
    }

    try {
        await appendCollection(db, collectionDefinition, value, { maxEntries });
        await cleanupLegacyKVKey(db, key);
        fallbackRemoveJSON(key);
    } catch (error) {
        console.warn('[Storage] IndexedDB collection append failed', error);
        fallbackSetJSON(key, appendAndTrimArray(fallbackGetJSON(key), value, maxEntries));
    }
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
