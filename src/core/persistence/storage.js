const DB_NAME = 'panda-violin-db';
const DB_VERSION = 2;
const STORE = 'kv';
const BLOB_STORE = 'blobs';

const hasIndexedDB = typeof indexedDB !== 'undefined';
let dbPromise = null;
const WRITE_QUEUE_LIMIT = 200;
const WRITE_RETRY_LIMIT = 5;
const WRITE_BASE_DELAY = 400;
const writeQueue = [];
let flushTimer = null;
let flushing = false;

const notifyQueue = (reason) => {
    if (typeof document === 'undefined') return;
    document.dispatchEvent(new CustomEvent('panda:storage-queue', {
        detail: { pending: writeQueue.length, reason },
    }));
};

const scheduleFlush = (reason) => {
    if (flushTimer || typeof window === 'undefined') return;
    const delay = Math.min(5000, WRITE_BASE_DELAY * (2 ** (writeQueue[0]?.attempt || 0)));
    flushTimer = window.setTimeout(() => {
        flushTimer = null;
        flushQueue(reason);
    }, delay);
};

const coalesceEntry = (entry) => {
    for (let i = writeQueue.length - 1; i >= 0; i -= 1) {
        const queued = writeQueue[i];
        if (queued.store !== entry.store || queued.key !== entry.key) continue;
        if (entry.type === 'remove') {
            writeQueue.splice(i, 1);
        } else if (entry.type === queued.type) {
            queued.value = entry.value;
            queued.attempt = 0;
            return true;
        }
    }
    return false;
};

const enqueueWrite = (entry) => {
    if (coalesceEntry(entry)) {
        notifyQueue('coalesce');
        scheduleFlush('coalesce');
        return;
    }
    writeQueue.push(entry);
    if (writeQueue.length > WRITE_QUEUE_LIMIT) {
        writeQueue.shift();
    }
    notifyQueue('enqueue');
    scheduleFlush('enqueue');
};

const flushQueue = async (reason = 'flush') => {
    if (flushing || !writeQueue.length) return;
    flushing = true;
    const db = await openDB();
    if (!db) {
        flushing = false;
        scheduleFlush('db-unavailable');
        return;
    }
    while (writeQueue.length) {
        const entry = writeQueue[0];
        try {
            if (entry.type === 'set') {
                await setInDB(db, entry.key, entry.value);
            } else if (entry.type === 'remove') {
                await removeFromDB(db, entry.key);
            }
            writeQueue.shift();
            notifyQueue(reason);
        } catch {
            entry.attempt += 1;
            if (entry.attempt >= WRITE_RETRY_LIMIT) {
                writeQueue.shift();
            }
            break;
        }
    }
    flushing = false;
    if (writeQueue.length) {
        scheduleFlush('retry');
    }
};

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => scheduleFlush('online'), { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') scheduleFlush('visible');
    });
}

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

export const getJSON = async (key) => {
    const db = await openDB();
    if (!db) return null;
    try {
        const value = await getFromDB(db, key);
        return value !== null && value !== undefined ? value : null;
    } catch (error) {
        console.warn('[Storage] IndexedDB get failed', error);
        return null;
    }
};

export const setJSON = async (key, value) => {
    const db = await openDB();
    if (!db) {
        enqueueWrite({ type: 'set', store: STORE, key, value, attempt: 0 });
        return;
    }
    try {
        await setInDB(db, key, value);
    } catch (error) {
        console.warn('[Storage] IndexedDB set failed', error);
        enqueueWrite({ type: 'set', store: STORE, key, value, attempt: 0 });
    }
};

export const removeJSON = async (key) => {
    const db = await openDB();
    if (!db) {
        enqueueWrite({ type: 'remove', store: STORE, key, attempt: 0 });
        return;
    }
    try {
        await removeFromDB(db, key);
    } catch (error) {
        console.warn('[Storage] IndexedDB remove failed', error);
        enqueueWrite({ type: 'remove', store: STORE, key, attempt: 0 });
    }
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
