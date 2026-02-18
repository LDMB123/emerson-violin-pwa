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
});
