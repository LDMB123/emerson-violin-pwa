import { dataUrlToBlob, blobToDataUrl } from '../utils/recording-export.js';

const DB_NAME = 'panda-violin-db';
const DB_VERSION = 2;
const STORE = 'kv';
const BLOB_STORE = 'blobs';
const BLOB_FALLBACK_PREFIX = 'panda-violin:blob-fallback:';
const BLOB_FALLBACK_LIMIT = 1.8_000_000;

const hasIndexedDB = typeof indexedDB !== 'undefined';
let dbPromise = null;

const openDB = () => {
    if (!hasIndexedDB) return Promise.resolve(null);
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

/* ── localStorage fallbacks ─────────────────────────────── */

const fallbackGet = (key) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn('[Storage] localStorage get failed', error);
        return null;
    }
};

const fallbackSet = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn('[Storage] localStorage set failed', error);
    }
};

const fallbackRemove = (key) => {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.warn('[Storage] localStorage remove failed', error);
    }
};

/* ── Blob localStorage fallbacks ────────────────────────── */

const fallbackSetBlob = async (key, blob) => {
    try {
        const dataUrl = await blobToDataUrl(blob);
        if (typeof dataUrl === 'string' && dataUrl.length > BLOB_FALLBACK_LIMIT) return false;
        localStorage.setItem(`${BLOB_FALLBACK_PREFIX}${key}`, dataUrl);
        return true;
    } catch (error) {
        console.warn('[Storage] blob fallback set failed', error);
        return false;
    }
};

const fallbackGetBlob = async (key) => {
    try {
        const raw = localStorage.getItem(`${BLOB_FALLBACK_PREFIX}${key}`);
        if (!raw) return null;
        return dataUrlToBlob(raw);
    } catch (error) {
        console.warn('[Storage] blob fallback get failed', error);
        return null;
    }
};

const fallbackRemoveBlob = (key) => {
    try {
        localStorage.removeItem(`${BLOB_FALLBACK_PREFIX}${key}`);
    } catch (error) {
        console.warn('[Storage] blob fallback remove failed', error);
    }
};

/* ── Migration ──────────────────────────────────────────── */

const migrateFallback = async (key, value) => {
    if (value === null || value === undefined) return;
    const db = await openDB();
    if (!db) return;
    try {
        await idbOp(db, STORE, 'readwrite', (s) => s.put(value, key));
    } catch (error) {
        console.warn('[Storage] IndexedDB migrate failed', error);
    }
};

/* ── Public API: JSON (KV store) ────────────────────────── */

export const getJSON = async (key) => {
    const db = await openDB();
    if (db) {
        try {
            const value = await idbOp(db, STORE, 'readonly', (s) => s.get(key));
            if (value !== null && value !== undefined) return value;
        } catch (error) {
            console.warn('[Storage] IndexedDB get failed', error);
        }
    }
    const fallback = fallbackGet(key);
    await migrateFallback(key, fallback);
    return fallback;
};

export const setJSON = async (key, value) => {
    const db = await openDB();
    if (db) {
        try {
            await idbOp(db, STORE, 'readwrite', (s) => s.put(value, key));
            return;
        } catch (error) {
            console.warn('[Storage] IndexedDB set failed', error);
        }
    }
    fallbackSet(key, value);
};

export const removeJSON = async (key) => {
    const db = await openDB();
    if (db) {
        try {
            await idbOp(db, STORE, 'readwrite', (s) => s.delete(key));
        } catch (error) {
            console.warn('[Storage] IndexedDB remove failed', error);
        }
    }
    fallbackRemove(key);
};

/* ── Public API: Blobs ──────────────────────────────────── */

export const getBlob = async (key) => {
    if (!key) return null;
    const db = await openDB();
    try {
        if (db) return await idbOp(db, BLOB_STORE, 'readonly', (s) => s.get(key));
    } catch (error) {
        console.warn('[Storage] IndexedDB blob get failed', error);
    }

    const fallback = await fallbackGetBlob(key);
    if (fallback) return fallback;

    return null;
};

export const setBlob = async (key, blob) => {
    if (!key || !blob) return false;
    const db = await openDB();
    try {
        if (!db) throw new Error('[Storage] IndexedDB unavailable');
        await idbOp(db, BLOB_STORE, 'readwrite', (s) => s.put(blob, key));
        return true;
    } catch (error) {
        console.warn('[Storage] IndexedDB blob set failed', error);
        const fallbackStored = await fallbackSetBlob(key, blob);
        if (fallbackStored) return true;
        return false;
    }
};

export const removeBlob = async (key) => {
    if (!key) return;
    fallbackRemoveBlob(key);
    try {
        const db = await openDB();
        if (!db) return;
        await idbOp(db, BLOB_STORE, 'readwrite', (s) => s.delete(key));
    } catch (error) {
        console.warn('[Storage] blob cleanup failed', error);
    }
};

export const supportsIndexedDB = hasIndexedDB;
