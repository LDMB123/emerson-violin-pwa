import { beforeEach, describe, expect, it, vi } from 'vitest';

const FALLBACK_PREFIX = 'panda-violin:kv:';

describe('persistence/storage fallback behavior', () => {
    beforeEach(() => {
        vi.resetModules();
        window.localStorage.clear();
        // Keep IndexedDB absent so fallback paths are exercised deterministically.
        // happy-dom typically has this undefined; delete is safe if it exists.
        delete globalThis.indexedDB;
    });

    it('stores, reads, and removes JSON through localStorage fallback', async () => {
        const { setJSON, getJSON, removeJSON } = await import('../../src/persistence/storage.js');

        await setJSON('qa-key', { score: 12 });
        expect(window.localStorage.getItem(`${FALLBACK_PREFIX}qa-key`)).toBe('{"score":12}');
        await expect(getJSON('qa-key')).resolves.toEqual({ score: 12 });

        await removeJSON('qa-key');
        await expect(getJSON('qa-key')).resolves.toBeNull();
    });

    it('returns null for malformed fallback JSON', async () => {
        const { getJSON } = await import('../../src/persistence/storage.js');
        window.localStorage.setItem(`${FALLBACK_PREFIX}broken`, '{not-json');
        await expect(getJSON('broken')).resolves.toBeNull();
    });

    it('returns null when fallback localStorage read throws', async () => {
        const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        const { getJSON } = await import('../../src/persistence/storage.js');
        await expect(getJSON('throws')).resolves.toBeNull();
        getItemSpy.mockRestore();
    });

    it('does not throw when fallback localStorage write/delete throws', async () => {
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('quota');
        });
        const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        const { setJSON, removeJSON } = await import('../../src/persistence/storage.js');
        await expect(setJSON('quota-key', { ok: true })).resolves.toBeUndefined();
        await expect(removeJSON('quota-key')).resolves.toBeUndefined();
        setItemSpy.mockRestore();
        removeItemSpy.mockRestore();
    });

    it('returns null/false for blob APIs when IndexedDB is unavailable', async () => {
        const { getBlob, setBlob, removeBlob } = await import('../../src/persistence/storage.js');
        const blob = new Blob(['abc'], { type: 'text/plain' });

        await expect(setBlob('blob-key', blob)).resolves.toBe(false);
        await expect(getBlob('blob-key')).resolves.toBeNull();
        await expect(removeBlob('blob-key')).resolves.toBeUndefined();
    });

    it('retries IndexedDB open after a transient open failure', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const open = vi.fn(() => {
            const request = {
                result: null,
                error: new Error('open failed'),
                onupgradeneeded: null,
                onsuccess: null,
                onerror: null,
                onblocked: null,
            };
            queueMicrotask(() => {
                request.onerror?.();
            });
            return request;
        });

        globalThis.indexedDB = { open };
        const { getJSON } = await import('../../src/persistence/storage.js');
        await expect(getJSON('first')).resolves.toBeNull();
        await expect(getJSON('second')).resolves.toBeNull();
        expect(open).toHaveBeenCalledTimes(2);
        warnSpy.mockRestore();
    });

    it('uses IndexedDB stores when available for JSON and blob operations', async () => {
        const stores = new Map();
        const ensureStore = (name) => {
            if (!stores.has(name)) {
                stores.set(name, new Map());
            }
            return stores.get(name);
        };
        const createSuccessRequest = (result) => {
            const request = {
                result,
                error: null,
                onsuccess: null,
                onerror: null,
            };
            queueMicrotask(() => {
                request.onsuccess?.();
            });
            return request;
        };

        const db = {
            objectStoreNames: {
                contains: (name) => stores.has(name),
            },
            createObjectStore: (name) => {
                ensureStore(name);
            },
            transaction: (storeName) => {
                const tx = {
                    error: null,
                    onabort: null,
                    onerror: null,
                    objectStore: () => ({
                        get: (key) => createSuccessRequest(ensureStore(storeName).get(key)),
                        put: (value, key) => {
                            ensureStore(storeName).set(key, value);
                            return createSuccessRequest(key);
                        },
                        delete: (key) => {
                            ensureStore(storeName).delete(key);
                            return createSuccessRequest(undefined);
                        },
                    }),
                };
                return tx;
            },
        };

        globalThis.indexedDB = {
            open: vi.fn(() => {
                const request = {
                    result: db,
                    error: null,
                    onupgradeneeded: null,
                    onsuccess: null,
                    onerror: null,
                    onblocked: null,
                };
                queueMicrotask(() => {
                    request.onupgradeneeded?.();
                    request.onsuccess?.();
                });
                return request;
            }),
        };

        const { setJSON, getJSON, removeJSON, setBlob, getBlob, removeBlob } = await import('../../src/persistence/storage.js');
        await setJSON('idb-key', { ok: true });
        await expect(getJSON('idb-key')).resolves.toEqual({ ok: true });
        await removeJSON('idb-key');
        await expect(getJSON('idb-key')).resolves.toBeNull();

        const blob = new Blob(['blob-data'], { type: 'text/plain' });
        await expect(setBlob('blob-key', blob)).resolves.toBe(true);
        await expect(getBlob('blob-key')).resolves.toBe(blob);
        await removeBlob('blob-key');
        await expect(getBlob('blob-key')).resolves.toBeNull();
    });
});
