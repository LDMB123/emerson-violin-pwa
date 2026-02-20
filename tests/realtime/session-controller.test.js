import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RT_PROFILE_KEY } from '../../src/persistence/storage-keys.js';
import { RT_STATE } from '../../src/utils/event-names.js';

const storageMocks = vi.hoisted(() => ({
    getJSON: vi.fn(async () => null),
    setJSON: vi.fn(async () => {}),
}));

const eventLogMocks = vi.hoisted(() => ({
    appendRealtimeEvent: vi.fn(async () => {}),
    saveRealtimeQuality: vi.fn(async () => {}),
}));

const policyMocks = vi.hoisted(() => ({
    evaluateFrame: vi.fn(() => null),
    applyParentPreset: vi.fn(async (preset) => preset || 'standard'),
    getPolicyState: vi.fn(() => ({
        preset: 'standard',
        rails: { oneCueAtATime: true, maxConsecutiveCorrections: 2 },
        bounds: { pitchToleranceCents: 8, rhythmToleranceMs: 90 },
        lastCueAt: 0,
        lastCueState: 'listening',
        consecutiveCorrections: 0,
        lowConfidenceFrames: 0,
    })),
}));

vi.mock('../../src/persistence/storage.js', () => storageMocks);
vi.mock('../../src/realtime/event-log.js', () => eventLogMocks);
vi.mock('../../src/realtime/policy-engine.js', () => policyMocks);

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

const createFakeAudioHarness = ({ workerMode = 'auto' } = {}) => {
    class FakeAudioNode {
        connect() {
            return this;
        }
        disconnect() {}
    }

    class FakeAudioContext {
        static instances = [];

        constructor() {
            this.state = 'suspended';
            this.destination = new FakeAudioNode();
            this.audioWorklet = { addModule: vi.fn(async () => {}) };
            FakeAudioContext.instances.push(this);
        }

        createMediaStreamSource() {
            return new FakeAudioNode();
        }

        createGain() {
            return {
                gain: { value: 1 },
                connect() {
                    return this;
                },
                disconnect() {},
            };
        }

        async resume() {
            this.state = 'running';
        }

        async suspend() {
            this.state = 'suspended';
        }

        async close() {
            this.state = 'closed';
        }
    }

    class FakeAudioWorkletNode extends FakeAudioNode {
        static instances = [];

        constructor() {
            super();
            this.port = { onmessage: null };
            FakeAudioWorkletNode.instances.push(this);
        }
    }

    class FakeWorker {
        static instances = [];

        constructor() {
            this.messages = [];
            this.onmessage = null;
            this.onerror = null;
            this.autoRespond = workerMode === 'auto';
            FakeWorker.instances.push(this);
        }

        postMessage(message) {
            this.messages.push(message);
            if (!this.autoRespond) return;

            if (message.type === 'evaluate') {
                queueMicrotask(() => {
                    this.onmessage?.({
                        data: {
                            type: 'evaluate-result',
                            requestId: message.requestId,
                            cueDecision: null,
                            policy: policyMocks.getPolicyState(),
                        },
                    });
                });
            }

            if (message.type === 'apply-preset') {
                const preset = message.payload?.preset || 'standard';
                queueMicrotask(() => {
                    this.onmessage?.({
                        data: {
                            type: 'apply-preset-result',
                            requestId: message.requestId,
                            preset,
                            policy: { ...policyMocks.getPolicyState(), preset },
                        },
                    });
                });
            }
        }

        emitEvaluateResult(requestId, cueDecision = null) {
            this.onmessage?.({
                data: {
                    type: 'evaluate-result',
                    requestId,
                    cueDecision,
                    policy: policyMocks.getPolicyState(),
                },
            });
        }

        terminate() {}
    }

    const trackStop = vi.fn();
    const getUserMedia = vi.fn(async () => ({
        getTracks: () => [{ stop: trackStop }],
    }));

    Object.defineProperty(globalThis, 'AudioContext', {
        configurable: true,
        writable: true,
        value: FakeAudioContext,
    });
    Object.defineProperty(globalThis, 'webkitAudioContext', {
        configurable: true,
        writable: true,
        value: undefined,
    });
    Object.defineProperty(globalThis, 'AudioWorkletNode', {
        configurable: true,
        writable: true,
        value: FakeAudioWorkletNode,
    });

    if (workerMode === 'none') {
        Object.defineProperty(globalThis, 'Worker', {
            configurable: true,
            writable: true,
            value: undefined,
        });
    } else {
        Object.defineProperty(globalThis, 'Worker', {
            configurable: true,
            writable: true,
            value: FakeWorker,
        });
    }

    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia },
    });

    window.location.hash = '#view-coach';

    return { FakeAudioWorkletNode, FakeWorker };
};

const emitFeatureFrame = (FakeAudioWorkletNode, feature) => {
    const node = FakeAudioWorkletNode.instances.at(-1);
    expect(node).toBeTruthy();
    expect(typeof node.port.onmessage).toBe('function');
    node.port.onmessage({
        data: {
            frequency: 440,
            note: 'A4',
            cents: 0,
            tempoBpm: 90,
            confidence: 0.5,
            rhythmOffsetMs: 0,
            onset: false,
            hasSignal: true,
            timestamp: Date.now(),
            ...feature,
        },
    });
};

const loadSessionController = async () => import('../../src/realtime/session-controller.js');

describe('realtime session controller interface', () => {
    let warnSpy;

    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        storageMocks.getJSON.mockResolvedValue(null);
        storageMocks.setJSON.mockResolvedValue(undefined);
        eventLogMocks.appendRealtimeEvent.mockResolvedValue(undefined);
        eventLogMocks.saveRealtimeQuality.mockResolvedValue(undefined);
        policyMocks.evaluateFrame.mockReturnValue(null);
        policyMocks.applyParentPreset.mockImplementation(async (preset) => preset || 'standard');
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        warnSpy?.mockRestore();
    });

    it('returns a stable session state shape', async () => {
        const { getSessionState } = await loadSessionController();
        const state = getSessionState();
        expect(state).toHaveProperty('sessionId');
        expect(state).toHaveProperty('active');
        expect(state).toHaveProperty('paused');
        expect(state).toHaveProperty('listening');
        expect(state).toHaveProperty('policy');
    });

    it('loads long-term calibration and applies it to worker payloads', async () => {
        storageMocks.getJSON.mockImplementation(async (key) => {
            if (key === RT_PROFILE_KEY) {
                return {
                    longTermPitchBiasCents: 10,
                    longTermRhythmBiasMs: -20,
                    longTermSampleCount: 5,
                };
            }
            return null;
        });

        const { FakeAudioWorkletNode, FakeWorker } = createFakeAudioHarness({ workerMode: 'manual' });
        const { startSession, stopSession, getSessionState } = await loadSessionController();

        await startSession();
        emitFeatureFrame(FakeAudioWorkletNode, {
            cents: 25,
            rhythmOffsetMs: 30,
            confidence: 0.5,
        });

        const worker = FakeWorker.instances.at(-1);
        const evaluateMessages = worker.messages.filter((message) => message.type === 'evaluate');
        expect(evaluateMessages).toHaveLength(1);
        expect(evaluateMessages[0].payload.features.pitchCents).toBe(15);
        expect(evaluateMessages[0].payload.features.rhythmOffsetMs).toBe(50);

        const state = getSessionState();
        expect(state.calibration.pitchBiasCents).toBe(10);
        expect(state.calibration.rhythmBiasMs).toBe(-20);
        expect(state.calibration.samples).toBe(5);

        await stopSession('test-stop');
    });

    it('coalesces rapid feature frames to one queued worker evaluation', async () => {
        const { FakeAudioWorkletNode, FakeWorker } = createFakeAudioHarness({ workerMode: 'manual' });
        const { startSession, stopSession } = await loadSessionController();

        await startSession();
        emitFeatureFrame(FakeAudioWorkletNode, { cents: 10, confidence: 0.5 });
        emitFeatureFrame(FakeAudioWorkletNode, { cents: 20, confidence: 0.5 });
        emitFeatureFrame(FakeAudioWorkletNode, { cents: 30, confidence: 0.5 });

        const worker = FakeWorker.instances.at(-1);
        const firstWave = worker.messages.filter((message) => message.type === 'evaluate');
        expect(firstWave).toHaveLength(1);

        worker.emitEvaluateResult(firstWave[0].requestId);
        await nextTick();
        await nextTick();

        const secondWave = worker.messages.filter((message) => message.type === 'evaluate');
        expect(secondWave).toHaveLength(2);
        expect(secondWave[1].payload.features.pitchCents).toBe(30);

        await stopSession('test-stop');
    });

    it('does not persist high-frequency realtime state events to the event log', async () => {
        const { FakeAudioWorkletNode } = createFakeAudioHarness({ workerMode: 'none' });
        const { startSession, stopSession } = await loadSessionController();

        await startSession();
        emitFeatureFrame(FakeAudioWorkletNode, { cents: 12, confidence: 0.55 });
        emitFeatureFrame(FakeAudioWorkletNode, { cents: 5, confidence: 0.62 });
        await nextTick();
        await nextTick();

        const stateLogCalls = eventLogMocks.appendRealtimeEvent.mock.calls
            .filter(([eventName]) => eventName === RT_STATE);
        expect(stateLogCalls).toHaveLength(0);

        await stopSession('test-stop');
    });

    it('falls back to in-thread policy evaluation when Worker is unavailable', async () => {
        const { FakeAudioWorkletNode } = createFakeAudioHarness({ workerMode: 'none' });
        const { startSession, stopSession } = await loadSessionController();

        await startSession();
        emitFeatureFrame(FakeAudioWorkletNode, {
            cents: 18,
            rhythmOffsetMs: -40,
            confidence: 0.5,
        });

        expect(policyMocks.evaluateFrame).toHaveBeenCalledTimes(1);
        const [features] = policyMocks.evaluateFrame.mock.calls[0];
        expect(features.pitchCents).toBe(18);
        expect(features.rhythmOffsetMs).toBe(-40);
        expect(features.confidence).toBe(0.5);

        await stopSession('test-stop');
    });

    it('persists fast-session calibration updates into the realtime profile', async () => {
        storageMocks.getJSON.mockImplementation(async (key) => {
            if (key === RT_PROFILE_KEY) {
                return {
                    longTermPitchBiasCents: 0,
                    longTermRhythmBiasMs: 0,
                    longTermSampleCount: 0,
                };
            }
            return null;
        });

        const { FakeAudioWorkletNode } = createFakeAudioHarness({ workerMode: 'none' });
        const { startSession, stopSession } = await loadSessionController();

        await startSession();
        emitFeatureFrame(FakeAudioWorkletNode, {
            cents: 20,
            rhythmOffsetMs: 100,
            confidence: 0.92,
        });
        await nextTick();

        const profileWrites = storageMocks.setJSON.mock.calls
            .filter(([key]) => key === RT_PROFILE_KEY)
            .map(([, value]) => value);

        expect(profileWrites.length).toBeGreaterThan(0);
        const latestProfile = profileWrites.at(-1);
        expect(latestProfile.longTermSampleCount).toBe(1);
        expect(latestProfile.longTermPitchBiasCents).toBeCloseTo(2.8, 3);
        expect(latestProfile.longTermRhythmBiasMs).toBeCloseTo(14, 3);

        await stopSession('test-stop');
    });

    it('throttles profile persistence during active sampling and flushes on stop', async () => {
        const { FakeAudioWorkletNode } = createFakeAudioHarness({ workerMode: 'none' });
        const { startSession, stopSession } = await loadSessionController();

        await startSession();
        emitFeatureFrame(FakeAudioWorkletNode, {
            cents: 8,
            rhythmOffsetMs: 20,
            confidence: 0.9,
        });
        emitFeatureFrame(FakeAudioWorkletNode, {
            cents: 9,
            rhythmOffsetMs: 22,
            confidence: 0.92,
        });
        await nextTick();
        await nextTick();

        const writesDuringSession = storageMocks.setJSON.mock.calls
            .filter(([key]) => key === RT_PROFILE_KEY)
            .length;
        expect(writesDuringSession).toBe(1);

        await stopSession('test-stop');

        const totalWrites = storageMocks.setJSON.mock.calls
            .filter(([key]) => key === RT_PROFILE_KEY)
            .length;
        expect(totalWrites).toBe(2);
    });

    it('pauses for parent entry and resumes on return to child practice views', async () => {
        const { FakeAudioWorkletNode } = createFakeAudioHarness({ workerMode: 'none' });
        const { init, startSession, getSessionState, stopSession } = await loadSessionController();

        init();
        await startSession();
        emitFeatureFrame(FakeAudioWorkletNode, { cents: 10, confidence: 0.6 });
        await nextTick();

        window.location.hash = '#view-parent';
        window.dispatchEvent(new Event('hashchange'));
        await nextTick();
        await nextTick();

        let state = getSessionState();
        expect(state.active).toBe(true);
        expect(state.paused).toBe(true);
        expect(state.listening).toBe(false);

        window.location.hash = '#view-games';
        window.dispatchEvent(new Event('hashchange'));
        await nextTick();
        await nextTick();

        state = getSessionState();
        expect(state.active).toBe(true);
        expect(state.paused).toBe(false);
        expect(state.listening).toBe(true);

        await stopSession('test-stop');
    });

    it('stops safely when navigating away from practice surfaces', async () => {
        const { FakeAudioWorkletNode } = createFakeAudioHarness({ workerMode: 'none' });
        const { init, startSession, getSessionState } = await loadSessionController();

        init();
        await startSession();
        emitFeatureFrame(FakeAudioWorkletNode, { cents: 8, confidence: 0.65 });
        await nextTick();

        window.location.hash = '#view-settings';
        window.dispatchEvent(new Event('hashchange'));
        await nextTick();
        await nextTick();

        const state = getSessionState();
        expect(state.active).toBe(false);
        expect(state.paused).toBe(false);
        expect(state.listening).toBe(false);
    });

    it('handles pause/resume/stop safely when no active session exists', async () => {
        createFakeAudioHarness({ workerMode: 'none' });
        const { pauseSession, resumeSession, stopSession } = await loadSessionController();

        const paused = await pauseSession();
        expect(paused.active).toBe(false);

        const resumed = await resumeSession();
        expect(typeof resumed.active).toBe('boolean');

        const stopped = await stopSession('test-stop');
        expect(stopped.active).toBe(false);
        expect(stopped.paused).toBe(false);
    });
});
