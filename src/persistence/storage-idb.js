const DB_NAME = 'panda-violin-db';
const DB_VERSION = 2;
export const STORE = 'kv';
export const BLOB_STORE = 'blobs';

let dbPromise = null;
const clearDBPromise = () => {
    dbPromise = null;
};

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
