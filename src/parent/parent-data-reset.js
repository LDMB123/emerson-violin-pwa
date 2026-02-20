import { removeJSON } from '../persistence/storage.js';
import * as STORAGE_KEYS from '../persistence/storage-keys.js';

const DB_NAME = 'panda-violin-db';
const CACHE_PREFIXES = ['panda-violin-', 'workbox-'];

const collectJsonKeys = () =>
    Object.values(STORAGE_KEYS)
        .filter((value) => typeof value === 'string' && value.startsWith('panda-violin:'));

const clearJsonState = async () => {
    const keys = collectJsonKeys();
    await Promise.allSettled(keys.map((key) => removeJSON(key)));
};

const clearLocalStorageState = () => {
    try {
        const keys = Object.keys(window.localStorage || {});
        keys.forEach((key) => {
            if (key.startsWith('panda-violin:') || key === 'onboarding-complete') {
                window.localStorage.removeItem(key);
            }
        });
    } catch {
        // Ignore privacy mode / quota errors.
    }
};

const clearRuntimeCaches = async () => {
    if (!('caches' in window)) return;
    const keys = await caches.keys();
    const appCaches = keys.filter((key) => CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)));
    await Promise.allSettled(appCaches.map((key) => caches.delete(key)));
};

const deleteIndexedDb = () =>
    new Promise((resolve) => {
        if (!('indexedDB' in window)) {
            resolve({ ok: false, reason: 'unsupported' });
            return;
        }

        let settled = false;
        const finish = (payload) => {
            if (settled) return;
            settled = true;
            resolve(payload);
        };

        let request;
        try {
            request = indexedDB.deleteDatabase(DB_NAME);
        } catch {
            finish({ ok: false, reason: 'error' });
            return;
        }

        request.onsuccess = () => finish({ ok: true });
        request.onerror = () => finish({ ok: false, reason: 'error' });
        request.onblocked = () => finish({ ok: false, reason: 'blocked' });
    });

export const wipeAllLocalData = async () => {
    await clearJsonState();
    clearLocalStorageState();
    const [dbResult] = await Promise.all([
        deleteIndexedDb(),
        clearRuntimeCaches(),
    ]);
    return dbResult;
};

export const confirmLocalDataDeletion = () => {
    const accepted = window.confirm('Delete all local Panda Violin data on this device? This cannot be undone.');
    if (!accepted) return false;
    const phrase = window.prompt('Type DELETE to confirm local data removal.');
    return phrase === 'DELETE';
};
