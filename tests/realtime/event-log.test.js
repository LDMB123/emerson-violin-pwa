import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageMocks = vi.hoisted(() => ({
    getJSON: vi.fn(async () => null),
    setJSON: vi.fn(async () => {}),
}));

vi.mock('../../src/persistence/storage.js', () => storageMocks);
vi.mock('../../src/persistence/storage-keys.js', () => ({
    RT_EVENT_LOG_KEY: 'rt-events',
    RT_QUALITY_KEY: 'rt-quality',
}));

import {
    loadRealtimeEvents,
    appendRealtimeEvent,
    clearRealtimeEvents,
    loadRealtimeQuality,
    saveRealtimeQuality,
} from '../../src/realtime/event-log.js';

describe('realtime event log', () => {
    beforeEach(() => {
        storageMocks.getJSON.mockClear();
        storageMocks.setJSON.mockClear();
        storageMocks.getJSON.mockResolvedValue(null);
    });

    it('normalizes stored event log values to arrays', async () => {
        storageMocks.getJSON.mockResolvedValueOnce({ invalid: true });
        await expect(loadRealtimeEvents()).resolves.toEqual([]);
    });

    it('appends realtime events and persists the updated log', async () => {
        storageMocks.getJSON.mockResolvedValueOnce([{ type: 'rt:state', detail: { listening: true }, timestamp: 1 }]);
        const events = await appendRealtimeEvent('rt:cue', { id: 'cue-1' });

        expect(events).toHaveLength(2);
        expect(events[1]).toMatchObject({
            type: 'rt:cue',
            detail: { id: 'cue-1' },
        });
        expect(typeof events[1].timestamp).toBe('number');
        expect(storageMocks.setJSON).toHaveBeenCalledWith('rt-events', events);
    });

    it('trims appended logs to the max realtime event window', async () => {
        const seeded = Array.from({ length: 1500 }, (_, index) => ({
            type: 'rt:state',
            detail: { index },
            timestamp: index,
        }));
        storageMocks.getJSON.mockResolvedValueOnce(seeded);

        const events = await appendRealtimeEvent('rt:cue', { id: 'overflow' });

        expect(events).toHaveLength(1500);
        expect(events[0].detail).toEqual({ index: 1 });
        expect(events[1499]).toMatchObject({ type: 'rt:cue', detail: { id: 'overflow' } });
    });

    it('clears persisted realtime events', async () => {
        await clearRealtimeEvents();
        expect(storageMocks.setJSON).toHaveBeenCalledWith('rt-events', []);
    });

    it('loads and saves realtime quality snapshots', async () => {
        storageMocks.getJSON.mockResolvedValueOnce({ p95CueLatencyMs: 120 });
        await expect(loadRealtimeQuality()).resolves.toEqual({ p95CueLatencyMs: 120 });

        storageMocks.getJSON.mockResolvedValueOnce('invalid');
        await expect(loadRealtimeQuality()).resolves.toBeNull();

        await saveRealtimeQuality({ p95CueLatencyMs: 95 });
        expect(storageMocks.setJSON).toHaveBeenCalledWith('rt-quality', { p95CueLatencyMs: 95 });

        storageMocks.setJSON.mockClear();
        await saveRealtimeQuality(null);
        expect(storageMocks.setJSON).not.toHaveBeenCalled();
    });
});
