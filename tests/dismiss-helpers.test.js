import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markDismissed, wasDismissed } from '../src/platform/dismiss-helpers.js';

vi.mock('../src/persistence/storage.js', () => {
    const store = new Map();
    return {
        getJSON: vi.fn(async (key) => store.get(key) ?? null),
        setJSON: vi.fn(async (key, value) => { store.set(key, value); }),
        __store: store,
    };
});

import { getJSON, setJSON } from '../src/persistence/storage.js';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('markDismissed', () => {
    it('calls setJSON with dismissed:true and a timestamp', async () => {
        const before = Date.now();
        await markDismissed('my-key');
        const after = Date.now();

        expect(setJSON).toHaveBeenCalledOnce();
        const [key, value] = setJSON.mock.calls[0];
        expect(key).toBe('my-key');
        expect(value.dismissed).toBe(true);
        expect(value.timestamp).toBeGreaterThanOrEqual(before);
        expect(value.timestamp).toBeLessThanOrEqual(after);
    });

    it('uses the key passed as argument', async () => {
        await markDismissed('install-guide');
        expect(setJSON.mock.calls[0][0]).toBe('install-guide');
    });
});

describe('wasDismissed', () => {
    it('returns false when getJSON returns null', async () => {
        getJSON.mockResolvedValueOnce(null);
        expect(await wasDismissed('missing-key')).toBe(false);
    });

    it('returns false when dismissed flag is absent', async () => {
        getJSON.mockResolvedValueOnce({ timestamp: Date.now() });
        expect(await wasDismissed('partial-key')).toBe(false);
    });

    it('returns false when dismissed is false', async () => {
        getJSON.mockResolvedValueOnce({ dismissed: false, timestamp: Date.now() });
        expect(await wasDismissed('not-dismissed')).toBe(false);
    });

    it('returns true when dismissed is true', async () => {
        getJSON.mockResolvedValueOnce({ dismissed: true, timestamp: Date.now() });
        expect(await wasDismissed('dismissed-key')).toBe(true);
    });

    it('passes the correct key to getJSON', async () => {
        getJSON.mockResolvedValueOnce(null);
        await wasDismissed('install-toast');
        expect(getJSON).toHaveBeenCalledWith('install-toast');
    });
});
