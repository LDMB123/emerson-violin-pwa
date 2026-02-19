import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageMocks = vi.hoisted(() => ({
    getJSON: vi.fn(async () => null),
    setJSON: vi.fn(async () => {}),
}));

vi.mock('../../src/persistence/storage.js', () => storageMocks);

const loadPolicy = async () => import('../../src/realtime/policy-engine.js');

describe('realtime policy engine', () => {
    beforeEach(() => {
        vi.resetModules();
        storageMocks.getJSON.mockClear();
        storageMocks.getJSON.mockResolvedValue(null);
        storageMocks.setJSON.mockClear();
    });

    it('enforces cooldown for one-cue-at-a-time behavior', async () => {
        const { evaluateFrame } = await loadPolicy();
        const frame = {
            pitchCents: 22,
            rhythmOffsetMs: 0,
            confidence: 0.92,
            hasSignal: true,
            onset: false,
        };

        const first = evaluateFrame(frame, { now: 5000 });
        const second = evaluateFrame(frame, { now: 5300 });

        expect(first).toBeTruthy();
        expect(second).toBeNull();
    });

    it('triggers calm fallback after sustained low confidence', async () => {
        const { evaluateFrame } = await loadPolicy();
        let fallbackCue = null;

        for (let i = 0; i < 24; i += 1) {
            const cue = evaluateFrame(
                {
                    pitchCents: 0,
                    rhythmOffsetMs: 0,
                    confidence: 0.1,
                    hasSignal: false,
                    onset: false,
                },
                { now: 1000 + i * 200 },
            );
            if (cue?.fallback) fallbackCue = cue;
        }

        expect(fallbackCue).toBeTruthy();
        expect(fallbackCue.state).toBe('retry-calm');
    });

    it('allows parent presets to change bounds but never bypass hard rails', async () => {
        const { applyParentPreset, getPolicyState, evaluateFrame } = await loadPolicy();
        await applyParentPreset('challenge');

        const policy = getPolicyState();
        expect(policy.preset).toBe('challenge');
        expect(policy.rails.oneCueAtATime).toBe(true);
        expect(policy.rails.maxConsecutiveCorrections).toBe(2);

        const frame = {
            pitchCents: 30,
            rhythmOffsetMs: 0,
            confidence: 0.95,
            hasSignal: true,
            onset: false,
        };

        const cue1 = evaluateFrame(frame, { now: 1000 });
        const cue2 = evaluateFrame(frame, { now: 2200 });
        const cue3 = evaluateFrame(frame, { now: 3400 });

        expect(cue1?.state).toBe('adjust-down');
        expect(cue2?.state).toBe('adjust-down');
        expect(cue3?.state).toBe('retry-calm');
    });
});
