import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EVENTS_KEY, RECORDINGS_KEY } from '../../src/persistence/storage-keys.js';

const FALLBACK_PREFIX = 'panda-violin:kv:';

const createIndexedDBMock = () => {
    const stores = new Map();

    const ensureStoreState = (name, options = undefined) => {
        if (!stores.has(name)) {
            stores.set(name, options?.keyPath
                ? { kind: 'collection', rows: [], nextPk: 1 }
                : { kind: 'kv', rows: new Map() });
        }
        return stores.get(name);
    };

    const completeTransaction = (tx) => {
        if (tx.pending !== 0 || tx.completed || tx.failed) return;
        tx.completed = true;
        tx.oncomplete?.();
    };

    const createRequest = (tx, executor) => {
        tx.pending += 1;
        const request = {
            result: null,
            error: null,
            onsuccess: null,
            onerror: null,
        };

        queueMicrotask(() => {
            try {
                request.result = executor();
                request.onsuccess?.();
            } catch (error) {
                request.error = error;
                tx.error = error;
                tx.failed = true;
                request.onerror?.();
                tx.onerror?.();
                return;
            } finally {
                tx.pending -= 1;
                completeTransaction(tx);
            }
        });

        return request;
    };

    const createObjectStoreApi = (name, tx) => {
        const state = ensureStoreState(name);

        const getCollectionRows = () => state.rows.slice().sort((left, right) => left.pk - right.pk);
        const getTimestampSortedRows = () => (
            state.rows.slice().sort((left, right) => (
                (left.timestamp ?? 0) - (right.timestamp ?? 0)
                || left.pk - right.pk
            ))
        );

        const createCursorRequest = (rowsFactory) => {
            tx.pending += 1;
            const orderedPks = rowsFactory().map((row) => row.pk);
            let cursorIndex = 0;
            const request = {
                result: null,
                error: null,
                onsuccess: null,
                onerror: null,
            };

            const emit = () => {
                queueMicrotask(() => {
                    if (cursorIndex >= orderedPks.length) {
                        request.result = null;
                        request.onsuccess?.();
                        tx.pending -= 1;
                        completeTransaction(tx);
                        return;
                    }

                    const pk = orderedPks[cursorIndex];
                    const row = state.rows.find((entry) => entry.pk === pk) || null;
                    let continued = false;
                    request.result = {
                        value: row,
                        delete: () => {
                            state.rows = state.rows.filter((entry) => entry.pk !== pk);
                        },
                        continue: () => {
                            continued = true;
                            cursorIndex += 1;
                            emit();
                        },
                    };
                    request.onsuccess?.();
                    if (!continued) {
                        tx.pending -= 1;
                        completeTransaction(tx);
                    }
                });
            };

            emit();
            return request;
        };

        return {
            get: (key) => createRequest(tx, () => {
                if (state.kind === 'collection') {
                    return getCollectionRows().find((row) => row.pk === key);
                }
                return state.rows.get(key);
            }),
            getAll: () => createRequest(tx, () => (
                state.kind === 'collection'
                    ? getCollectionRows()
                    : Array.from(state.rows.values())
            )),
            put: (value, key) => createRequest(tx, () => {
                if (state.kind === 'collection') {
                    const pk = key ?? value?.pk ?? state.nextPk++;
                    const nextValue = { ...value, pk };
                    state.rows = state.rows.filter((row) => row.pk !== pk);
                    state.rows.push(nextValue);
                    state.nextPk = Math.max(state.nextPk, pk + 1);
                    return pk;
                }
                state.rows.set(key, value);
                return key;
            }),
            add: (value) => createRequest(tx, () => {
                if (state.kind !== 'collection') {
                    throw new Error(`Store "${name}" does not support add`);
                }
                const pk = state.nextPk++;
                state.rows.push({ ...value, pk });
                return pk;
            }),
            count: () => createRequest(tx, () => (
                state.kind === 'collection' ? state.rows.length : state.rows.size
            )),
            index: () => ({
                openCursor: () => createCursorRequest(getTimestampSortedRows),
            }),
            openCursor: () => createCursorRequest(getCollectionRows),
            delete: (key) => createRequest(tx, () => {
                if (state.kind === 'collection') {
                    state.rows = state.rows.filter((row) => row.pk !== key);
                    return undefined;
                }
                state.rows.delete(key);
                return undefined;
            }),
            clear: () => createRequest(tx, () => {
                if (state.kind === 'collection') {
                    state.rows = [];
                    return undefined;
                }
                state.rows.clear();
                return undefined;
            }),
        };
    };

    const createUpgradeStoreApi = (name) => {
        const tx = {
            pending: 0,
            completed: false,
            failed: false,
            error: null,
            oncomplete: null,
            onerror: null,
        };
        return {
            ...createObjectStoreApi(name, tx),
            indexNames: {
                contains: () => false,
            },
            createIndex: () => {},
        };
    };

    const db = {
        objectStoreNames: {
            contains: (name) => stores.has(name),
        },
        createObjectStore: (name, options) => {
            ensureStoreState(name, options);
            return createUpgradeStoreApi(name);
        },
        transaction: (storeName) => {
            const tx = {
                error: null,
                pending: 0,
                failed: false,
                completed: false,
                onabort: null,
                oncomplete: null,
                onerror: null,
                objectStore: () => createObjectStoreApi(storeName, tx),
                abort: vi.fn(() => {
                    tx.failed = true;
                    tx.error = tx.error || new Error('aborted');
                    tx.onabort?.();
                }),
            };
            return tx;
        },
    };

    return {
        stores,
        db,
        open: vi.fn(() => {
            const request = {
                result: db,
                error: null,
                onupgradeneeded: null,
                onsuccess: null,
                onerror: null,
                onblocked: null,
                transaction: {
                    objectStore: (name) => createUpgradeStoreApi(name),
                },
            };
            queueMicrotask(() => {
                request.onupgradeneeded?.({ oldVersion: 0 });
                request.onsuccess?.();
            });
            return request;
        }),
    };
};

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
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
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
        const indexedDBMock = createIndexedDBMock();
        globalThis.indexedDB = {
            open: indexedDBMock.open,
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

    it('routes collection-backed keys into dedicated IndexedDB stores', async () => {
        const indexedDBMock = createIndexedDBMock();
        globalThis.indexedDB = {
            open: indexedDBMock.open,
        };

        const { setJSON, getJSON, removeJSON } = await import('../../src/persistence/storage.js');
        const events = [{ type: 'game', id: 'rhythm-dash', timestamp: 10, day: 1 }];
        const recordings = [{ id: 'song-1', timestamp: 20, createdAt: '2026-03-06T00:00:00.000Z' }];

        await setJSON(EVENTS_KEY, events);
        await setJSON(RECORDINGS_KEY, recordings);

        await expect(getJSON(EVENTS_KEY)).resolves.toEqual(events);
        await expect(getJSON(RECORDINGS_KEY)).resolves.toEqual(recordings);
        expect(window.localStorage.getItem(`${FALLBACK_PREFIX}${EVENTS_KEY}`)).toBeNull();
        expect(window.localStorage.getItem(`${FALLBACK_PREFIX}${RECORDINGS_KEY}`)).toBeNull();

        await removeJSON(EVENTS_KEY);
        await expect(getJSON(EVENTS_KEY)).resolves.toEqual([]);
    });

    it('appends and prunes collection-backed event rows without rewriting the kv store', async () => {
        const indexedDBMock = createIndexedDBMock();
        globalThis.indexedDB = {
            open: indexedDBMock.open,
        };

        const { appendJSONItem, getJSON } = await import('../../src/persistence/storage.js');

        await appendJSONItem(EVENTS_KEY, { type: 'game', id: 'one', timestamp: 10, day: 1 }, { maxEntries: 2 });
        await appendJSONItem(EVENTS_KEY, { type: 'game', id: 'two', timestamp: 20, day: 1 }, { maxEntries: 2 });
        await appendJSONItem(EVENTS_KEY, { type: 'game', id: 'three', timestamp: 30, day: 1 }, { maxEntries: 2 });

        await expect(getJSON(EVENTS_KEY)).resolves.toEqual([
            { type: 'game', id: 'two', timestamp: 20, day: 1 },
            { type: 'game', id: 'three', timestamp: 30, day: 1 },
        ]);
        expect(window.localStorage.getItem(`${FALLBACK_PREFIX}${EVENTS_KEY}`)).toBeNull();
    });

});
