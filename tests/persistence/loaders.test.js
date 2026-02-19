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
    migrateEventShape,
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
        expect(storageMocks.setJSON).toHaveBeenCalledWith(EVENTS_KEY, []);
    });

    it('loadEvents normalizes stored event array', async () => {
        const events = [{ type: 'game', id: 'e1', score: 10, timestamp: 86400000 }];
        storageMocks.getJSON.mockResolvedValueOnce(events);
        const result = await loadEvents();
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            type: 'game',
            id: 'e1',
            score: 10,
            accuracy: 10,
            day: 1,
        });
        expect(storageMocks.setJSON).toHaveBeenCalledWith(EVENTS_KEY, result);
    });

    it('migrateEventShape upgrades legacy song events', () => {
        const migrated = migrateEventShape([{
            type: 'song',
            id: 'twinkle',
            score: 83,
            bpm: 76,
            timestamp: 172800000,
        }]);

        expect(migrated.changed).toBe(true);
        expect(migrated.events[0]).toMatchObject({
            type: 'song',
            id: 'twinkle',
            accuracy: 83,
            timingAccuracy: 83,
            intonationAccuracy: 83,
            stars: 3,
            tempo: 76,
            attemptType: 'full',
            day: 2,
        });
    });

    it('migrateEventShape normalizes legacy game + practice payloads and filters invalid events', () => {
        const migrated = migrateEventShape([
            null,
            {
                type: 'game',
                id: 'rhythm-dash',
                score: 74,
                level: 'mastery',
                mode: 'hard',
                objectives: { total: 4, completed: 3 },
                misses: 2,
                timestamp: 3 * 86400000,
            },
            {
                type: 'practice',
                id: 'practice-1',
                minutes: -7,
                timestamp: 5 * 86400000,
            },
        ]);

        expect(migrated.changed).toBe(true);
        expect(migrated.events).toHaveLength(2);
        expect(migrated.events[0]).toMatchObject({
            type: 'game',
            difficulty: 'hard',
            tier: 'mastery',
            objectiveTotal: 4,
            objectivesCompleted: 3,
            mistakes: 2,
        });
        expect(migrated.events[1]).toMatchObject({
            type: 'practice',
            minutes: 0,
            day: 5,
        });
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
        const result = await loadRecordings();
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ id: 'r1' });
        expect(typeof result[0].timestamp).toBe('number');
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

    it('resolveRecordingSource returns null when no source fields are present', async () => {
        await expect(resolveRecordingSource({ id: 'recording-without-source' })).resolves.toBeNull();
    });
});
