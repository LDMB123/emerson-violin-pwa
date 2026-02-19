import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GAME_MASTERY_UPDATED, GAME_RECORDED, SOUNDS_CHANGE } from '../../src/utils/event-names.js';

const sharedDeps = vi.hoisted(() => {
    const player = {
        stopAll: vi.fn(),
        playNote: vi.fn(() => Promise.resolve()),
        playSequence: vi.fn(() => Promise.resolve()),
    };
    return {
        getGameTuning: vi.fn(async () => ({ difficulty: 'medium', speed: 1, complexity: 1 })),
        updateGameResult: vi.fn(async () => ({ difficulty: 'hard', speed: 1.1, complexity: 2 })),
        createTonePlayer: vi.fn(() => player),
        getJSON: vi.fn(async () => []),
        setJSON: vi.fn(async () => {}),
        isSoundEnabled: vi.fn(() => true),
        todayDay: vi.fn(() => 42),
        formatDifficulty: vi.fn((value) => String(value)),
        updateGameMastery: vi.fn(async () => ({ game: { tier: 'bronze', bronzeDays: 1 } })),
        player,
    };
});

vi.mock('../../src/ml/adaptive-engine.js', () => ({
    getGameTuning: sharedDeps.getGameTuning,
    updateGameResult: sharedDeps.updateGameResult,
}));
vi.mock('../../src/audio/tone-player.js', () => ({
    createTonePlayer: sharedDeps.createTonePlayer,
}));
vi.mock('../../src/persistence/storage.js', () => ({
    getJSON: sharedDeps.getJSON,
    setJSON: sharedDeps.setJSON,
}));
vi.mock('../../src/utils/sound-state.js', () => ({
    isSoundEnabled: sharedDeps.isSoundEnabled,
}));
vi.mock('../../src/utils/math.js', () => ({
    todayDay: sharedDeps.todayDay,
}));
vi.mock('../../src/tuner/tuner-utils.js', () => ({
    formatDifficulty: sharedDeps.formatDifficulty,
}));
vi.mock('../../src/persistence/storage-keys.js', () => ({
    EVENTS_KEY: 'events',
}));
vi.mock('../../src/games/game-mastery.js', () => ({
    updateGameMastery: sharedDeps.updateGameMastery,
}));

import {
    bindTap,
    buildNoteSequence,
    cachedEl,
    createSoundsChangeBinding,
    formatCountdown,
    formatStars,
    getTonePlayer,
    markChecklist,
    markChecklistIf,
    playToneNote,
    playToneSequence,
    readLiveNumber,
    recordGameEvent,
    setDifficultyBadge,
    setLiveNumber,
    stopTonePlayer,
    updateScoreCombo,
} from '../../src/games/shared.js';

describe('games/shared utilities', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        Object.values(sharedDeps).forEach((value) => {
            if (typeof value?.mockClear === 'function') value.mockClear();
        });
    });

    it('formats stars and countdown values', () => {
        expect(formatStars(3, 5)).toBe('★★★☆☆');
        expect(formatCountdown(125)).toBe('02:05');
        expect(formatCountdown(-3)).toBe('00:00');
    });

    it('caches DOM lookups until the node is disconnected', () => {
        document.body.innerHTML = '<div id="probe">A</div>';
        const getProbe = cachedEl('#probe');

        const first = getProbe();
        expect(first?.textContent).toBe('A');

        first?.remove();
        document.body.insertAdjacentHTML('beforeend', '<div id="probe">B</div>');
        expect(getProbe()?.textContent).toBe('B');
    });

    it('plays tones only when sound is enabled and a tone player exists', () => {
        sharedDeps.isSoundEnabled.mockReturnValue(false);
        expect(playToneNote('A4')).toBe(false);
        expect(playToneSequence(['A4', 'B4'])).toBe(false);

        sharedDeps.isSoundEnabled.mockReturnValue(true);
        expect(playToneNote('A4', { duration: 0.2 })).toBe(true);
        expect(playToneSequence(['A4', 'B4'], { tempo: 110 })).toBe(true);
        stopTonePlayer();

        expect(getTonePlayer()).toBe(sharedDeps.player);
        expect(sharedDeps.createTonePlayer).toHaveBeenCalledTimes(1);
        expect(sharedDeps.player.playNote).toHaveBeenCalledWith('A4', { duration: 0.2 });
        expect(sharedDeps.player.playSequence).toHaveBeenCalledWith(['A4', 'B4'], { tempo: 110 });
        expect(sharedDeps.player.stopAll).toHaveBeenCalledTimes(1);
    });

    it('bindTap handles pointer and keyboard/click input without double firing', () => {
        const button = document.createElement('button');
        document.body.appendChild(button);
        const handler = vi.fn();

        bindTap(button, handler, { threshold: 0, clickIgnoreWindow: 420 });

        const pointerEvent = new Event('pointerdown', { bubbles: true, cancelable: true });
        Object.defineProperty(pointerEvent, 'pointerType', { value: 'touch' });
        Object.defineProperty(pointerEvent, 'button', { value: 0 });
        button.dispatchEvent(pointerEvent);
        button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
        button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));

        expect(handler).toHaveBeenCalledTimes(2);
    });

    it('reads and sets live number state and updates score/combo', () => {
        const scoreEl = document.createElement('span');
        const comboEl = document.createElement('span');

        setLiveNumber(scoreEl, 'liveScore', 11);
        setLiveNumber(comboEl, 'liveCombo', 3, (value) => `x${value}`);
        expect(readLiveNumber(scoreEl, 'liveScore')).toBe(11);
        expect(readLiveNumber(comboEl, 'liveCombo')).toBe(3);

        updateScoreCombo(scoreEl, comboEl, 25, 4);
        expect(scoreEl.textContent).toBe('25');
        expect(comboEl.textContent).toBe('x4');
    });

    it('marks checklist items and conditionally marks by predicate', () => {
        document.body.innerHTML = '<input id="c1" type="checkbox" /><input id="c2" type="checkbox" />';
        const c1 = document.getElementById('c1');
        const c2 = document.getElementById('c2');
        const changeSpy = vi.fn();
        c1?.addEventListener('change', changeSpy);
        c2?.addEventListener('change', changeSpy);

        markChecklist('c1');
        markChecklistIf(true, 'c2');
        markChecklistIf(false, 'c2');
        markChecklist('missing');
        markChecklist('c1');

        expect(c1?.checked).toBe(true);
        expect(c2?.checked).toBe(true);
        expect(changeSpy).toHaveBeenCalledTimes(2);
    });

    it('renders and updates difficulty badges', () => {
        const container = document.createElement('div');
        setDifficultyBadge(container, 'hard', 'Session');
        setDifficultyBadge(container, 'easy', 'Session');

        const badge = container.querySelector('.difficulty-badge');
        expect(badge).not.toBeNull();
        expect(badge?.dataset.level).toBe('easy');
        expect(badge?.textContent).toBe('Session: easy');
    });

    it('builds note sequences without immediate repeats', () => {
        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
        const sequence = buildNoteSequence(['G', 'D'], 4);
        randomSpy.mockRestore();

        expect(sequence).toHaveLength(4);
        expect(sequence[0]).toBe('G');
        expect(sequence[1]).toBe('D');
        expect(sequence[2]).toBe('G');
    });

    it('records enriched game events and dispatches mastery updates', async () => {
        const recordedEvents = [];
        const masteryEvents = [];
        document.addEventListener(GAME_RECORDED, (event) => recordedEvents.push(event.detail), { once: true });
        document.addEventListener(GAME_MASTERY_UPDATED, (event) => masteryEvents.push(event.detail), { once: true });

        sharedDeps.getJSON.mockResolvedValueOnce([{ type: 'game', id: 'old', day: 1, timestamp: 1 }]);
        await recordGameEvent('rhythm-dash', {
            score: 93.7,
            accuracy: 91.2,
            stars: 4.6,
            difficulty: ' hard ',
            tier: ' mastery ',
            sessionMs: 1523.4,
            objectiveTotal: 5.8,
            objectivesCompleted: 4.2,
            mistakes: 2.1,
        });

        expect(sharedDeps.setJSON).toHaveBeenCalledTimes(1);
        const [, saved] = sharedDeps.setJSON.mock.calls[0];
        expect(saved).toHaveLength(2);
        expect(saved[1]).toMatchObject({
            id: 'rhythm-dash',
            score: 94,
            accuracy: 91,
            stars: 5,
            difficulty: 'hard',
            tier: 'mastery',
            sessionMs: 1523,
            objectiveTotal: 6,
            objectivesCompleted: 4,
            mistakes: 2,
            day: 42,
            type: 'game',
        });
        expect(sharedDeps.updateGameMastery).toHaveBeenCalledWith({
            gameId: 'rhythm-dash',
            score: 91,
            day: 42,
        });
        expect(recordedEvents).toHaveLength(1);
        expect(masteryEvents).toHaveLength(1);

        await recordGameEvent('', { score: 20 });
        expect(sharedDeps.setJSON).toHaveBeenCalledTimes(1);
    });

    it('replaces SOUNDS_CHANGE listeners when binding is reused', () => {
        const bind = createSoundsChangeBinding();
        const first = vi.fn();
        const second = vi.fn();

        bind(first);
        document.dispatchEvent(new Event(SOUNDS_CHANGE));
        bind(second);
        document.dispatchEvent(new Event(SOUNDS_CHANGE));

        expect(first).toHaveBeenCalledTimes(1);
        expect(second).toHaveBeenCalledTimes(1);
    });
});
