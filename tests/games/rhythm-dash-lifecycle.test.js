import { beforeEach, describe, expect, it, vi } from 'vitest';

const sharedMocks = vi.hoisted(() => ({
    cachedEl: vi.fn((selector) => () => document.querySelector(selector)),
    readLiveNumber: vi.fn((el, key) => {
        const value = Number(el?.dataset?.[key]);
        return Number.isFinite(value) ? value : null;
    }),
    setLiveNumber: vi.fn((el, key, value, formatter) => {
        if (!el) return;
        el.dataset[key] = String(value);
        el.textContent = formatter ? formatter(value) : String(value);
    }),
    markChecklistIf: vi.fn(),
    setDifficultyBadge: vi.fn(),
    recordGameEvent: vi.fn(),
    attachTuning: vi.fn((_id, onUpdate) => {
        const report = vi.fn();
        report.dispose = vi.fn();
        onUpdate?.({ difficulty: 'medium' });
        return report;
    }),
    bindTap: vi.fn((el, handler) => el?.addEventListener('click', handler)),
    getTonePlayer: vi.fn(() => ({
        playNote: vi.fn(() => Promise.resolve()),
    })),
}));

const rhythmUtilsMocks = vi.hoisted(() => ({
    computeBeatInterval: vi.fn(() => 600),
    computeBpm: vi.fn(() => 90),
    computeTimingScore: vi.fn(() => 0.9),
    getRatingFromScore: vi.fn(() => ({ rating: 'Great', level: 'great' })),
    computeNextCombo: vi.fn((combo) => combo + 1),
    computeScoreIncrement: vi.fn(() => 50),
    computeAverageFromHistory: vi.fn(() => 90),
    computeAccuracyFromTimingScores: vi.fn(() => 90),
    computeAccuracyFromBpmHistory: vi.fn(() => 90),
    getMetronomeNote: vi.fn(() => 'A'),
    getMetronomeVolume: vi.fn(() => 0.12),
    shouldMarkTapMilestone: vi.fn(() => false),
    shouldMarkComboMilestone: vi.fn(() => false),
    shouldMarkEnduranceMilestone: vi.fn(() => false),
    shouldShowComboStatus: vi.fn(() => false),
    formatComboStatus: vi.fn(() => 'combo'),
    formatRegularStatus: vi.fn(() => 'regular'),
}));

vi.mock('../../src/games/shared.js', () => sharedMocks);
vi.mock('../../src/utils/sound-state.js', () => ({ isSoundEnabled: vi.fn(() => true) }));
vi.mock('../../src/utils/rhythm-dash-utils.js', () => rhythmUtilsMocks);

import { bind } from '../../src/games/rhythm-dash.js';

const mountStage = () => {
    document.body.innerHTML = `
        <section id="view-game-rhythm-dash">
            <button class="rhythm-tap" type="button">Tap</button>
            <input id="rhythm-run" type="checkbox" />
            <button data-rhythm="pause" type="button">Pause</button>
            <button data-rhythm="settings" type="button">Settings</button>
            <button data-rhythm="settings-reset" type="button">Reset</button>
            <span data-rhythm="score">0</span>
            <span data-rhythm="combo">x0</span>
            <span data-rhythm="bpm">--</span>
            <span data-rhythm="suggested">--</span>
            <span data-rhythm="status"></span>
            <span data-rhythm="rating"></span>
            <div class="rhythm-meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                <span data-rhythm="meter"></span>
            </div>
            <input data-rhythm="target-slider" type="range" min="60" max="140" value="90" />
            <span data-rhythm="target-value"></span>
        </section>
    `;
};

const createPersistedPagehide = () => {
    const event = typeof PageTransitionEvent === 'function'
        ? new PageTransitionEvent('pagehide', { persisted: true })
        : new Event('pagehide');
    if (!('persisted' in event) || event.persisted !== true) {
        try {
            Object.defineProperty(event, 'persisted', {
                configurable: true,
                get: () => true,
            });
        } catch {
            // no-op
        }
    }
    return event;
};

describe('rhythm-dash pagehide lifecycle', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        window.location.hash = '#view-game-rhythm-dash';
        Object.values(sharedMocks).forEach((mock) => {
            if (typeof mock?.mockClear === 'function') mock.mockClear();
        });
        Object.values(rhythmUtilsMocks).forEach((mock) => {
            if (typeof mock?.mockClear === 'function') mock.mockClear();
        });
        sharedMocks.attachTuning.mockImplementation((_id, onUpdate) => {
            const report = vi.fn();
            report.dispose = vi.fn();
            onUpdate?.({ difficulty: 'medium' });
            return report;
        });
        mountStage();
    });

    it('stops an active run on non-persisted pagehide', () => {
        bind();
        const runToggle = document.querySelector('#rhythm-run');
        expect(runToggle).toBeTruthy();
        runToggle.checked = true;
        runToggle.dispatchEvent(new Event('change', { bubbles: true }));
        expect(runToggle.checked).toBe(true);

        window.dispatchEvent(new Event('pagehide'));

        expect(runToggle.checked).toBe(false);
    });

    it('keeps active run state on persisted pagehide snapshots', () => {
        bind();
        const runToggle = document.querySelector('#rhythm-run');
        expect(runToggle).toBeTruthy();
        runToggle.checked = true;
        runToggle.dispatchEvent(new Event('change', { bubbles: true }));
        expect(runToggle.checked).toBe(true);

        window.dispatchEvent(createPersistedPagehide());

        expect(runToggle.checked).toBe(true);
    });
});
