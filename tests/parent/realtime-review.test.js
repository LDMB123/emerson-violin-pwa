import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    RT_CUE,
    RT_PARENT_OVERRIDE,
    RT_QUALITY,
} from '../../src/utils/event-names.js';

const eventLogMocks = vi.hoisted(() => ({
    loadRealtimeEvents: vi.fn(async () => []),
    loadRealtimeQuality: vi.fn(async () => null),
}));

const sessionControllerMocks = vi.hoisted(() => ({
    setParentPreset: vi.fn(async (preset) => preset),
}));

const policyState = vi.hoisted(() => ({ preset: 'standard' }));

const policyEngineMocks = vi.hoisted(() => ({
    getPolicyState: vi.fn(() => ({
        preset: policyState.preset,
        rails: { oneCueAtATime: true, maxConsecutiveCorrections: 2 },
        bounds: { pitchToleranceCents: 8, rhythmToleranceMs: 90 },
    })),
}));

vi.mock('../../src/realtime/event-log.js', () => eventLogMocks);
vi.mock('../../src/realtime/session-controller.js', () => sessionControllerMocks);
vi.mock('../../src/realtime/policy-engine.js', () => policyEngineMocks);

const flush = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
};

const renderFixture = () => {
    document.body.innerHTML = `
        <section data-rt-review>
            <div data-rt-review-list></div>
            <p data-rt-review-empty>Timeline will appear after a listening session.</p>
            <p data-rt-quality></p>
            <p data-rt-preset-status></p>
            <p data-rt-preset-preview></p>
            <button type="button" data-rt-preset="gentle">Gentle</button>
            <button type="button" data-rt-preset="standard">Standard</button>
            <button type="button" data-rt-preset="challenge">Challenge</button>
        </section>
    `;
};

const loadRealtimeReview = async () => import('../../src/parent/realtime-review.js');

describe('parent realtime review', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        policyState.preset = 'standard';
        sessionControllerMocks.setParentPreset.mockImplementation(async (preset) => {
            policyState.preset = preset;
            return preset;
        });
        eventLogMocks.loadRealtimeEvents.mockResolvedValue([]);
        eventLogMocks.loadRealtimeQuality.mockResolvedValue(null);
        renderFixture();
    });

    it('renders preset status and quality snapshot', async () => {
        eventLogMocks.loadRealtimeQuality.mockResolvedValue({
            p95CueLatencyMs: 183,
            falseCorrectionRate: 0.04,
            fallbackRate: 0.12,
        });

        const { init } = await loadRealtimeReview();
        init();
        await flush();

        expect(document.querySelector('[data-rt-preset-status]')?.textContent).toContain('Standard');
        expect(document.querySelector('[data-rt-preset-preview]')?.textContent).toContain('Balanced correction');
        expect(document.querySelector('[data-rt-quality]')?.textContent).toContain('p95 latency 183ms');
    });

    it('renders timeline cards with safe text content', async () => {
        eventLogMocks.loadRealtimeEvents.mockResolvedValue([
            {
                type: RT_CUE,
                timestamp: 1700000000000,
                detail: {
                    confidenceBand: 'high',
                    message: '<img src=x onerror=alert(1)>',
                },
            },
            {
                type: RT_PARENT_OVERRIDE,
                timestamp: 1700000001000,
                detail: {
                    preset: 'challenge',
                    confidenceBand: 'medium',
                },
            },
        ]);

        const { init } = await loadRealtimeReview();
        init();
        await flush();

        const cards = Array.from(document.querySelectorAll('.rt-review-card'));
        expect(cards).toHaveLength(2);
        expect(document.querySelector('[data-rt-review-empty]')?.hidden).toBe(true);
        const messages = cards.map((card) => card.querySelector('.rt-review-card-message')?.textContent || '');
        expect(messages).toContain('<img src=x onerror=alert(1)>');
        expect(cards.some((card) => card.querySelector('img'))).toBe(false);
    });

    it('applies parent preset changes and refreshes timeline', async () => {
        eventLogMocks.loadRealtimeEvents.mockResolvedValue([]);

        const { init } = await loadRealtimeReview();
        init();
        await flush();

        const challengeButton = document.querySelector('[data-rt-preset="challenge"]');
        expect(challengeButton).toBeTruthy();
        challengeButton.click();
        await flush();

        expect(sessionControllerMocks.setParentPreset).toHaveBeenCalledWith('challenge', 'parent-zone');
        expect(document.querySelector('[data-rt-preset-status]')?.textContent).toContain('Challenge');
        expect(challengeButton.getAttribute('aria-pressed')).toBe('true');
    });

    it('refreshes on realtime document events', async () => {
        eventLogMocks.loadRealtimeEvents.mockResolvedValue([]);
        const { init } = await loadRealtimeReview();
        init();
        await flush();

        eventLogMocks.loadRealtimeEvents.mockResolvedValue([
            {
                type: RT_CUE,
                timestamp: 1700000002000,
                detail: { message: 'Nice and steady.', confidenceBand: 'medium' },
            },
        ]);
        eventLogMocks.loadRealtimeQuality.mockResolvedValue({
            p95CueLatencyMs: 220,
            falseCorrectionRate: 0.01,
            fallbackRate: 0.06,
        });

        document.dispatchEvent(new CustomEvent(RT_QUALITY, { detail: { sessionId: 'rt-1' } }));
        await flush();

        expect(document.querySelectorAll('.rt-review-card')).toHaveLength(1);
        expect(document.querySelector('[data-rt-quality]')?.textContent).toContain('p95 latency 220ms');
    });
});
