const DB_NAME = 'panda-violin-db';
const DB_VERSION = 2;
/** Object store name for JSON/key-value records. */
export const STORE = 'kv';
/** Object store name for blob-backed recording payloads. */
export const BLOB_STORE = 'blobs';

let dbPromise = null;
const clearDBPromise = () => {
    dbPromise = null;
};

const runSafeOp = (operation, onError) => {
    try {
        return operation();
    } catch (error) {
        onError(error);
        return null;
    }
};

/** Opens the app IndexedDB database and caches the live connection promise. */
export const openDB = () => {
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

/** Runs an IndexedDB store operation and resolves with its request result. */
export const idbOp = (db, storeName, mode, fn) => new Promise((resolve, reject) => {
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

    const tx = runSafeOp(() => db.transaction(storeName, mode), finishReject);
    if (!tx) return;

    tx.onabort = () => finishReject(tx.error);
    tx.onerror = () => finishReject(tx.error);

    const store = tx.objectStore(storeName);
    const request = runSafeOp(() => fn(store), finishReject);
    if (!request) {
        finishReject(new Error(`[Storage] IndexedDB request missing for store "${storeName}"`));
        return;
    }

    request.onsuccess = () => finishResolve(request.result);
    request.onerror = () => finishReject(request.error);
});
