import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EVENTS_KEY, RECORDINGS_KEY } from '../../src/persistence/storage-keys.js';

const storageMocks = vi.hoisted(() => ({
    getJSON: vi.fn(async () => null),
    setJSON: vi.fn(async () => {}),
    getBlob: vi.fn(async () => null),
}));

vi.mock('../../src/persistence/storage.js', () => storageMocks);

import {
    loadEvents,
    saveEvents,
    loadRecordings,
    resolveRecordingSource,
} from '../../src/persistence/loaders.js';

describe('persistence/loaders', () => {
    beforeEach(() => {
        storageMocks.getJSON.mockClear();
        storageMocks.setJSON.mockClear();
        storageMocks.getBlob.mockClear();
    });

    it('loadEvents returns [] when storage value is not an array', async () => {
        storageMocks.getJSON.mockResolvedValueOnce({ invalid: true });
        await expect(loadEvents()).resolves.toEqual([]);
        expect(storageMocks.getJSON).toHaveBeenCalledWith(EVENTS_KEY);
    });

    it('loadEvents returns stored event array', async () => {
        const events = [{ id: 'e1', score: 10 }];
        storageMocks.getJSON.mockResolvedValueOnce(events);
        await expect(loadEvents()).resolves.toEqual(events);
    });

    it('saveEvents persists payload under events key', async () => {
        const events = [{ id: 'save-me' }];
        await saveEvents(events);
        expect(storageMocks.setJSON).toHaveBeenCalledWith(EVENTS_KEY, events);
    });

    it('loadRecordings returns [] when storage value is not an array', async () => {
        storageMocks.getJSON.mockResolvedValueOnce('not-array');
        await expect(loadRecordings()).resolves.toEqual([]);
        expect(storageMocks.getJSON).toHaveBeenCalledWith(RECORDINGS_KEY);
    });

    it('loadRecordings returns stored recording array', async () => {
        const recordings = [{ id: 'r1' }];
        storageMocks.getJSON.mockResolvedValueOnce(recordings);
        await expect(loadRecordings()).resolves.toEqual(recordings);
    });

    it('resolveRecordingSource returns direct dataUrl when present', async () => {
        const recording = { dataUrl: 'data:audio/mp3;base64,AAA' };
        await expect(resolveRecordingSource(recording)).resolves.toEqual({
            url: recording.dataUrl,
            revoke: false,
        });
    });

    it('resolveRecordingSource returns blob URL for blob-backed recording', async () => {
        const blob = new Blob(['abc'], { type: 'audio/webm' });
        storageMocks.getBlob.mockResolvedValueOnce(blob);
        const objectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:qa-test');

        await expect(resolveRecordingSource({ blobKey: 'blob-1' })).resolves.toEqual({
            url: 'blob:qa-test',
            revoke: true,
        });
        expect(storageMocks.getBlob).toHaveBeenCalledWith('blob-1');
        objectUrlSpy.mockRestore();
    });

    it('resolveRecordingSource returns null when blob lookup misses', async () => {
        storageMocks.getBlob.mockResolvedValueOnce(null);
        await expect(resolveRecordingSource({ blobKey: 'missing' })).resolves.toBeNull();
    });

    it('resolveRecordingSource returns null for empty input', async () => {
        await expect(resolveRecordingSource(null)).resolves.toBeNull();
    });
});
