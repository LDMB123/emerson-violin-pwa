const DB_NAME = 'panda-violin-db';
const DB_VERSION = 2;
const STORE = 'kv';
const BLOB_STORE = 'blobs';

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

const getFromDB = async (db, key) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
});

const setInDB = async (db, key, value) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
});

const removeFromDB = async (db, key) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
});

const getBlobFromDB = async (db, key) => new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readonly');
    const store = tx.objectStore(BLOB_STORE);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
});

const setBlobInDB = async (db, key, blob) => new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readwrite');
    const store = tx.objectStore(BLOB_STORE);
    const request = store.put(blob, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
});

const removeBlobFromDB = async (db, key) => new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readwrite');
    const store = tx.objectStore(BLOB_STORE);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
});

const migrateFallback = async (key, value) => {
    if (value === null || value === undefined) return;
    const db = await openDB();
    if (!db) return;
    try {
        await setInDB(db, key, value);
    } catch (error) {
        console.warn('[Storage] IndexedDB migrate failed', error);
    }
};

export const getJSON = async (key) => {
    const db = await openDB();
    if (db) {
        try {
            const value = await getFromDB(db, key);
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
            await setInDB(db, key, value);
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
            await removeFromDB(db, key);
        } catch (error) {
            console.warn('[Storage] IndexedDB remove failed', error);
        }
    }
    fallbackRemove(key);
};

export const getBlob = async (key) => {
    if (!key) return null;
    const db = await openDB();
    if (!db) return null;
    try {
        return await getBlobFromDB(db, key);
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
        await setBlobInDB(db, key, blob);
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
        await removeBlobFromDB(db, key);
    } catch (error) {
        console.warn('[Storage] IndexedDB blob remove failed', error);
    }
};

export const supportsIndexedDB = hasIndexedDB;
