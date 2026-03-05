import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ML_RESET, ML_UPDATE } from '../../src/utils/event-names.js';
import { setDocumentVisibility } from '../utils/test-lifecycle-mocks.js';

const adaptiveEngineMocks = vi.hoisted(() => ({
    getGameTuning: vi.fn(async () => ({ focusMinutes: 0.02 })),
    updateGameResult: vi.fn(async () => {}),
}));

const sharedMocks = vi.hoisted(() => ({
    triggerMiniConfetti: vi.fn(),
}));

vi.mock('../../src/ml/adaptive-engine.js', () => adaptiveEngineMocks);
vi.mock('../../src/games/shared.js', () => sharedMocks);

import { init as initFocusTimer } from '../../src/coach/focus-timer.js';

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
};

describe('coach/focus-timer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
        setDocumentVisibility('visible');
        adaptiveEngineMocks.getGameTuning.mockClear();
        adaptiveEngineMocks.updateGameResult.mockClear();
        sharedMocks.triggerMiniConfetti.mockClear();

        document.body.innerHTML = `
            <section id="view-coach" class="view is-active">
                <input id="focus-timer" type="checkbox" />
                <div class="practice-focus"></div>
                <div class="focus-status"></div>
                <button type="button" data-coach-step-target="play">Play</button>
            </section>
        `;
    });

    afterEach(async () => {
        await vi.runOnlyPendingTimersAsync();
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('starts with tuned duration and completes the countdown', async () => {
        initFocusTimer();
        await flush();

        const focusArea = document.querySelector('.practice-focus');
        const statusEl = document.querySelector('.focus-status');
        const focusToggle = document.querySelector('#focus-timer');

        expect(focusArea?.style.getPropertyValue('--focus-duration')).toBe('1.2s');
        expect(statusEl?.textContent).toBe('Ready!');

        focusToggle.checked = true;
        focusToggle.dispatchEvent(new Event('change', { bubbles: true }));
        expect(statusEl?.textContent).toBe('Time left 0:02');

        await vi.advanceTimersByTimeAsync(2000);

        expect(statusEl?.textContent).toBe('Session complete! Great work.');
        expect(focusToggle.checked).toBe(false);
        expect(adaptiveEngineMocks.updateGameResult).toHaveBeenCalledWith(
            'coach-focus',
            expect.objectContaining({ accuracy: 100, score: 0.02 }),
        );
        expect(sharedMocks.triggerMiniConfetti).toHaveBeenCalledTimes(1);
    });

    it('stops an active session when the page becomes hidden', async () => {
        initFocusTimer();
        await flush();

        const statusEl = document.querySelector('.focus-status');
        const focusToggle = document.querySelector('#focus-timer');

        focusToggle.checked = true;
        focusToggle.dispatchEvent(new Event('change', { bubbles: true }));

        setDocumentVisibility('hidden');
        document.dispatchEvent(new Event('visibilitychange'));

        expect(focusToggle.checked).toBe(false);
        expect(statusEl?.textContent).toBe('Session paused.');

        await vi.advanceTimersByTimeAsync(2000);
        expect(adaptiveEngineMocks.updateGameResult).not.toHaveBeenCalled();
        expect(sharedMocks.triggerMiniConfetti).not.toHaveBeenCalled();
    });

    it('refreshes tuned focus duration on ML update and reset events', async () => {
        initFocusTimer();
        await flush();

        const focusArea = document.querySelector('.practice-focus');
        const statusEl = document.querySelector('.focus-status');

        focusArea.dataset.userSet = 'true';
        focusArea.style.setProperty('--focus-duration', '600s');

        adaptiveEngineMocks.getGameTuning.mockResolvedValueOnce({ focusMinutes: 0.05 });
        document.dispatchEvent(new CustomEvent(ML_UPDATE, {
            detail: { id: 'coach-focus' },
        }));
        await flush();

        expect(focusArea.style.getPropertyValue('--focus-duration')).toBe('600s');
        expect(adaptiveEngineMocks.getGameTuning).toHaveBeenCalledTimes(2);

        adaptiveEngineMocks.getGameTuning.mockResolvedValueOnce({ focusMinutes: 0.03 });
        document.dispatchEvent(new Event(ML_RESET));
        await flush();

        expect(focusArea.dataset.userSet).toBeUndefined();
        expect(focusArea.style.getPropertyValue('--focus-duration')).toBe('1.7999999999999998s');
        expect(statusEl?.textContent).toBe('Ready!');
        expect(adaptiveEngineMocks.getGameTuning).toHaveBeenCalledTimes(3);
    });
});
