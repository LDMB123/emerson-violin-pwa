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
});
