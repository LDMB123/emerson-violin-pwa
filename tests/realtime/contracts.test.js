import { describe, expect, it } from 'vitest';
import {
    RT_CUE,
    RT_STATE,
    RT_SESSION_STARTED,
} from '../../src/utils/event-names.js';
import {
    CONFIDENCE_BANDS,
    CUE_STATES,
    PARENT_PRESETS,
    isRealtimeEventName,
    isConfidenceBand,
    isCueState,
    validateRealtimePayload,
    assertRealtimePayload,
    confidenceBandFrom,
} from '../../src/realtime/contracts.js';

describe('realtime contracts', () => {
    it('exposes required confidence and cue enums', () => {
        expect(CONFIDENCE_BANDS).toEqual(['low', 'medium', 'high']);
        expect(CUE_STATES).toEqual([
            'listening',
            'steady',
            'adjust-up',
            'adjust-down',
            'retry-calm',
            'celebrate-lock',
        ]);
        expect(PARENT_PRESETS).toEqual(['gentle', 'standard', 'challenge']);
    });

    it('provides enum/name guard helpers', () => {
        expect(isRealtimeEventName(RT_CUE)).toBe(true);
        expect(isRealtimeEventName('rt:unknown')).toBe(false);
        expect(isConfidenceBand('high')).toBe(true);
        expect(isConfidenceBand('extreme')).toBe(false);
        expect(isCueState('steady')).toBe(true);
        expect(isCueState('wrong')).toBe(false);
    });

    it('accepts valid cue payloads', () => {
        const result = validateRealtimePayload(RT_CUE, {
            id: 'cue-1',
            state: 'steady',
            message: 'Nice and steady.',
            confidenceBand: 'high',
            priority: 1,
            dwellMs: 1500,
            domain: 'system',
            urgent: false,
            fallback: false,
            issuedAt: Date.now(),
        });
        expect(result.ok).toBe(true);
        expect(result.errors).toEqual([]);
    });

    it('rejects malformed payloads and unknown enums', () => {
        const result = validateRealtimePayload(RT_STATE, {
            sessionId: 's1',
            listening: true,
            paused: false,
            confidenceBand: 'extreme',
            cueState: 'invalid-state',
            timestamp: Date.now(),
        });
        expect(result.ok).toBe(false);
        expect(result.errors.join(' ')).toContain('confidenceBand');
        expect(result.errors.join(' ')).toContain('cueState');
    });

    it('throws with assertRealtimePayload for invalid payloads', () => {
        expect(() => assertRealtimePayload(RT_SESSION_STARTED, { sessionId: '', startedAt: 0 })).toThrow(
            /payload invalid/i,
        );
    });

    it('maps raw confidence values to three bands', () => {
        expect(confidenceBandFrom(0.1)).toBe('low');
        expect(confidenceBandFrom(0.6)).toBe('medium');
        expect(confidenceBandFrom(0.9)).toBe('high');
    });
});
