import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetStorageMocks } from './test-helpers.js';

const storageMocks = vi.hoisted(() => ({
    getJSON: vi.fn(async () => null),
    setJSON: vi.fn(async () => {}),
}));

vi.mock('../../src/persistence/storage.js', () => storageMocks);
vi.mock('../../src/persistence/storage-keys.js', () => ({
    RT_EVENT_LOG_KEY: 'rt-events',
    RT_QUALITY_KEY: 'rt-quality',
}));

const loadEventLog = async () => import('../../src/realtime/event-log.js');

describe('realtime event log', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.useFakeTimers();
        resetStorageMocks(storageMocks);
    });

    afterEach(async () => {
        await vi.runOnlyPendingTimersAsync();
        vi.useRealTimers();
    });

    it('normalizes stored event log values to arrays', async () => {
        storageMocks.getJSON.mockResolvedValueOnce({ invalid: true });
        const { loadRealtimeEvents } = await loadEventLog();
        await expect(loadRealtimeEvents()).resolves.toEqual([]);
    });

    it('appends realtime events in memory and batches persistence', async () => {
        storageMocks.getJSON.mockResolvedValueOnce([{ type: 'rt:state', detail: { listening: true }, timestamp: 1 }]);
        const { appendRealtimeEvent, flushRealtimeEvents, loadRealtimeEvents } = await loadEventLog();

        const firstAppend = await appendRealtimeEvent('rt:cue', { id: 'cue-1' });
        const secondAppend = await appendRealtimeEvent('rt:cue', { id: 'cue-2' });

        expect(firstAppend).toHaveLength(2);
        expect(secondAppend).toHaveLength(3);
        expect(storageMocks.getJSON).toHaveBeenCalledTimes(1);
        expect(storageMocks.setJSON).not.toHaveBeenCalled();
        await expect(loadRealtimeEvents()).resolves.toEqual(secondAppend);

        const flushed = await flushRealtimeEvents();
        expect(flushed).toEqual(secondAppend);
        expect(storageMocks.setJSON).toHaveBeenCalledTimes(1);
        expect(storageMocks.setJSON).toHaveBeenCalledWith('rt-events', secondAppend);
    });

    it('trims appended logs to the max realtime event window', async () => {
        const seeded = Array.from({ length: 1500 }, (_, index) => ({
            type: 'rt:state',
            detail: { index },
            timestamp: index,
        }));
        storageMocks.getJSON.mockResolvedValueOnce(seeded);
        const { appendRealtimeEvent, flushRealtimeEvents } = await loadEventLog();

        const events = await appendRealtimeEvent('rt:cue', { id: 'overflow' });
        await flushRealtimeEvents();

        expect(events).toHaveLength(1500);
        expect(events[0].detail).toEqual({ index: 1 });
        expect(events[1499]).toMatchObject({ type: 'rt:cue', detail: { id: 'overflow' } });
    });

    it('clears the cached realtime event log', async () => {
        storageMocks.getJSON.mockResolvedValueOnce([{ type: 'rt:cue', detail: { id: 'cue-1' }, timestamp: 1 }]);
        const { clearRealtimeEvents, loadRealtimeEvents } = await loadEventLog();

        await expect(clearRealtimeEvents()).resolves.toEqual([]);
        await expect(loadRealtimeEvents()).resolves.toEqual([]);
        expect(storageMocks.setJSON).toHaveBeenCalledWith('rt-events', []);
    });

    it('loads and saves realtime quality snapshots', async () => {
        const { loadRealtimeQuality, saveRealtimeQuality } = await loadEventLog();

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
