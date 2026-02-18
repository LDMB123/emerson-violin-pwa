import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME_PLAY_AGAIN } from '../../src/utils/event-names.js';

const sharedMocks = vi.hoisted(() => ({
    attachTuning: vi.fn(() => vi.fn()),
    recordGameEvent: vi.fn(),
    setDifficultyBadge: vi.fn(),
}));

vi.mock('../../src/games/shared.js', () => sharedMocks);

import { createGame } from '../../src/games/game-shell.js';

const mountStage = (id) => {
    document.body.innerHTML = `
        <section id="view-game-${id}">
            <header class="game-header"></header>
        </section>
    `;
};

describe('createGame play-again integration', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        sharedMocks.attachTuning.mockClear();
        sharedMocks.recordGameEvent.mockClear();
        sharedMocks.setDifficultyBadge.mockClear();
        sharedMocks.attachTuning.mockImplementation(() => {
            const report = vi.fn();
            report.dispose = vi.fn();
            return report;
        });
    });

    it('resets when play-again targets the active game view', () => {
        const id = 'unit-a';
        const onReset = vi.fn();
        mountStage(id);
        window.location.hash = '#view-game-unit-a';

        const game = createGame({ id, onBind: () => {}, onReset });
        game.bind();

        expect(onReset).not.toHaveBeenCalled();

        document.dispatchEvent(new CustomEvent(GAME_PLAY_AGAIN, { detail: { viewId: 'view-game-unit-a' } }));

        expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('ignores play-again events for other views', () => {
        const id = 'unit-b';
        const onReset = vi.fn();
        mountStage(id);
        window.location.hash = '#view-game-unit-b';

        const game = createGame({ id, onBind: () => {}, onReset });
        game.bind();

        document.dispatchEvent(new CustomEvent(GAME_PLAY_AGAIN, { detail: { viewId: 'view-game-other' } }));

        expect(onReset).not.toHaveBeenCalled();
    });

    it('disposes prior tuning binding when re-bound', () => {
        const id = 'unit-c';
        mountStage(id);
        window.location.hash = '#view-game-unit-c';
        const firstReport = vi.fn();
        firstReport.dispose = vi.fn();
        const secondReport = vi.fn();
        secondReport.dispose = vi.fn();
        sharedMocks.attachTuning
            .mockReturnValueOnce(firstReport)
            .mockReturnValueOnce(secondReport);

        const game = createGame({ id, onBind: () => {} });
        game.bind();
        game.bind();

        expect(firstReport.dispose).toHaveBeenCalledTimes(1);
        expect(secondReport.dispose).not.toHaveBeenCalled();
    });

    it('runs game-specific deactivate hook when leaving the game hash', () => {
        const id = 'unit-d';
        const onDeactivate = vi.fn();
        mountStage(id);
        window.location.hash = '#view-game-unit-d';

        const game = createGame({
            id,
            onBind: (_stage, _difficulty, { gameState }) => {
                gameState._onDeactivate = onDeactivate;
                gameState.score = 10;
            },
            computeAccuracy: () => 90
        });

        game.bind();

        window.location.hash = '#view-home';
        window.dispatchEvent(new Event('hashchange'));

        expect(onDeactivate).toHaveBeenCalledTimes(1);
    });
});
