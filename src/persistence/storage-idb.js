import { COLLECTION_STORE_DEFS } from './storage-collections.js';

const DB_NAME = 'panda-violin-db';
const DB_VERSION = 3;
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

const ensureStore = (db, transaction, name, options) => {
    if (db.objectStoreNames.contains(name)) {
        return transaction.objectStore(name);
    }
    return db.createObjectStore(name, options);
};

const ensureCollectionStore = (db, transaction, definition) => {
    const store = ensureStore(db, transaction, definition.storeName, {
        keyPath: 'pk',
        autoIncrement: true,
    });

    for (const index of definition.indexes || []) {
        if (!store.indexNames.contains(index.name)) {
            store.createIndex(index.name, index.keyPath, index.options);
        }
    }

    return store;
};

const migrateLegacyCollection = (legacyStore, collectionStore, definition) => {
    const request = legacyStore.get(definition.key);
    request.onsuccess = () => {
        const values = Array.isArray(request.result) ? request.result : [];
        for (const value of values) {
            const row = definition.rowFromValue(value);
            if (row) {
                collectionStore.add(row);
            }
        }
        legacyStore.delete(definition.key);
    };
    request.onerror = (event) => {
        console.warn('[Storage] Legacy collection migration failed for', definition.key, event.target.error);
        event.preventDefault();
    };
};

/** Opens the app IndexedDB database and caches the live connection promise. */
export const openDB = () => {
    if (dbPromise) return dbPromise;
    if (!('indexedDB' in globalThis)) {
        return Promise.resolve(null);
    }
    dbPromise = new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        let settled = false;
        const resolveWith = (db) => {
            if (settled) {
                if (db) { try { db.close(); } catch {} }
                return;
            }
            settled = true;
            // Do not permanently cache a null DB handle on transient failures.
            if (!db) {
                clearDBPromise();
            }
            resolve(db);
        };
        request.onupgradeneeded = (event) => {
            const db = request.result;
            const transaction = request.transaction;
            const kvStore = ensureStore(db, transaction, STORE);
            ensureStore(db, transaction, BLOB_STORE);

            for (const definition of COLLECTION_STORE_DEFS) {
                const collectionStore = ensureCollectionStore(db, transaction, definition);
                if (event.oldVersion < 3) {
                    migrateLegacyCollection(kvStore, collectionStore, definition);
                }
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

/** Runs an IndexedDB transaction and resolves after commit. */
export const runStoreTransaction = (db, storeName, mode, handler) => new Promise((resolve, reject) => {
    let settled = false;
    let result = null;
    let hasResult = false;

    const finishReject = (error) => {
        if (settled) return;
        settled = true;
        reject(error || new Error('[Storage] IndexedDB transaction failed'));
    };
    const finishResolve = () => {
        if (settled) return;
        settled = true;
        resolve(hasResult ? result : null);
    };

    const tx = runSafeOp(() => db.transaction(storeName, mode), finishReject);
    if (!tx) return;

    tx.oncomplete = finishResolve;
    tx.onabort = () => finishReject(tx.error);
    tx.onerror = () => finishReject(tx.error);

    const setResult = (value) => {
        result = value ?? null;
        hasResult = true;
    };

    runSafeOp(
        () => handler(tx.objectStore(storeName), tx, setResult),
        (error) => {
            try {
                tx.abort();
            } catch {
                // Ignore abort failures after a synchronous handler error.
            }
            finishReject(error);
        },
    );
});

/** Runs an IndexedDB store operation and resolves with its request result. */
export const idbOp = (db, storeName, mode, fn) => runStoreTransaction(db, storeName, mode, (store, transaction, setResult) => {
    void transaction;
    const request = fn(store);
    if (!request) {
        throw new Error(`[Storage] IndexedDB request missing for store "${storeName}"`);
    }

    request.onsuccess = () => {
        setResult(request.result);
    };
});
