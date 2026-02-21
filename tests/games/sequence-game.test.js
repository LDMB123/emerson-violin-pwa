import { beforeEach, describe, expect, it, vi } from 'vitest';

const sharedMocks = vi.hoisted(() => ({
    cachedEl: vi.fn((selector) => () => document.querySelector(selector)),
    readLiveNumber: vi.fn((el, key) => {
        const value = Number(el?.dataset?.[key]);
        return Number.isFinite(value) ? value : Number.NaN;
    }),
    markChecklist: vi.fn(),
    markChecklistIf: vi.fn(),
    setDifficultyBadge: vi.fn(),
    recordGameEvent: vi.fn(),
    attachTuning: vi.fn(() => {
        const report = vi.fn();
        report.dispose = vi.fn();
        return report;
    }),
    bindTap: vi.fn((el, handler) => el?.addEventListener('click', handler)),
    playToneNote: vi.fn(),
    playToneSequence: vi.fn(),
    stopTonePlayer: vi.fn(),
    buildNoteSequence: vi.fn(() => ['A']),
    updateScoreCombo: vi.fn(),
}));

vi.mock('../../src/games/shared.js', () => sharedMocks);

import { createSequenceGame } from '../../src/games/sequence-game.js';

const mountStage = ({ id, prefix }) => {
    const buttonClass = `${prefix}-btn`;
    document.body.innerHTML = `
        <section id="view-game-${id}">
            <span data-${prefix}="score"></span>
            <span data-${prefix}="combo"></span>
            <div data-${prefix}="status"></div>
            <div data-${prefix}="sequence"></div>
            <button class="${buttonClass}" data-${prefix}-btn="A">A</button>
            <div data-${prefix}-target="A"></div>
        </section>
    `;
};

const createConfig = ({ id, prefix }) => ({
    id,
    prefix,
    viewId: `#view-game-${id}`,
    hashId: `#view-game-${id}`,
    buttonClass: `.${prefix}-btn`,
    btnDataAttr: `${prefix}Btn`,
    targetDataAttr: `${prefix}Target`,
    statusKey: 'status',
    comboTarget: 1,
    baseScore: 10,
    comboMult: 1,
    missPenalty: 1,
    noteOptions: { duration: 0.2 },
    seqOptions: { tempo: 150 },
    completionChecklistId: 'us-step-1',
    comboChecklistId: 'us-step-2',
    stepPrefix: 'us',
    stepScore: 10,
});

describe('sequence-game lifecycle guards', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        window.location.hash = '';
        Object.values(sharedMocks).forEach((mock) => {
            if (typeof mock?.mockClear === 'function') {
                mock.mockClear();
            }
        });
        sharedMocks.attachTuning.mockImplementation((_id, onUpdate) => {
            const report = vi.fn();
            report.dispose = vi.fn();
            onUpdate?.({ difficulty: 'medium' });
            return report;
        });
        sharedMocks.buildNoteSequence.mockReturnValue(['A', 'D']);
    });

    it('stops tone playback and reports on non-persisted pagehide for active view', () => {
        const fixture = { id: 'unit-seq-a', prefix: 'unitseqa' };
        mountStage(fixture);
        window.location.hash = '#view-game-unit-seq-a';
        const game = createSequenceGame(createConfig(fixture));

        game.bind();
        document.querySelector('.unitseqa-btn')?.dispatchEvent(new Event('pointerdown'));
        window.dispatchEvent(new Event('pagehide'));

        expect(sharedMocks.stopTonePlayer).toHaveBeenCalledTimes(1);
        expect(sharedMocks.recordGameEvent).toHaveBeenCalledWith(
            'unit-seq-a',
            expect.objectContaining({ accuracy: 100, score: 11, tier: 'core' })
        );
    });

    it('ignores bfcache persisted pagehide events', () => {
        const fixture = { id: 'unit-seq-b', prefix: 'unitseqb' };
        mountStage(fixture);
        window.location.hash = '#view-game-unit-seq-b';
        const game = createSequenceGame(createConfig(fixture));

        game.bind();
        document.querySelector('.unitseqb-btn')?.dispatchEvent(new Event('pointerdown'));
        const pagehideEvent = typeof PageTransitionEvent === 'function'
            ? new PageTransitionEvent('pagehide', { persisted: true })
            : new Event('pagehide');
        if (!('persisted' in pagehideEvent) || pagehideEvent.persisted !== true) {
            try {
                Object.defineProperty(pagehideEvent, 'persisted', {
                    configurable: true,
                    get: () => true,
                });
            } catch {
                // no-op; test falls back to the platform-provided persisted value
            }
        }
        window.dispatchEvent(pagehideEvent);

        expect(sharedMocks.stopTonePlayer).not.toHaveBeenCalled();
        expect(sharedMocks.recordGameEvent).not.toHaveBeenCalled();
    });

    it('removes old pagehide listeners when re-bound', () => {
        const fixture = { id: 'unit-seq-c', prefix: 'unitseqc' };
        mountStage(fixture);
        window.location.hash = '#view-game-unit-seq-c';
        const game = createSequenceGame(createConfig(fixture));

        game.bind();
        game.bind();
        window.dispatchEvent(new Event('pagehide'));

        expect(sharedMocks.stopTonePlayer).toHaveBeenCalledTimes(1);
    });
});
