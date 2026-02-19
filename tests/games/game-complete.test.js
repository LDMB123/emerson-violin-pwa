import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME_PLAY_AGAIN, GAME_RECORDED } from '../../src/utils/event-names.js';

const mountGameCompleteDom = () => {
    document.body.innerHTML = `
        <dialog id="game-complete-modal">
            <span id="game-complete-score">0</span>
            <span id="game-complete-accuracy">0%</span>
            <div id="game-complete-stars">
                <span class="game-complete-star">★</span>
                <span class="game-complete-star">★</span>
                <span class="game-complete-star">★</span>
            </div>
            <button id="game-complete-play-again" type="button">Play Again</button>
            <a id="game-complete-back" href="#view-games">Back to Games</a>
        </dialog>
    `;
    const dialog = document.getElementById('game-complete-modal');
    if (dialog instanceof HTMLDialogElement) {
        dialog.showModal = vi.fn();
        dialog.close = vi.fn();
    }
};

describe('game-complete modal', () => {
    beforeEach(() => {
        vi.resetModules();
        mountGameCompleteDom();
    });

    it('dispatches a play-again event for the active game view', async () => {
        window.location.hash = '#view-game-note-memory';
        const historyBack = vi.spyOn(history, 'back');
        const historyForward = vi.spyOn(history, 'forward');
        const onPlayAgain = vi.fn();
        document.addEventListener(GAME_PLAY_AGAIN, onPlayAgain);

        await import('../../src/games/game-complete.js');
        document.getElementById('game-complete-play-again')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(onPlayAgain).toHaveBeenCalledTimes(1);
        expect(onPlayAgain.mock.calls[0][0]?.detail).toEqual({ viewId: 'view-game-note-memory' });
        expect(historyBack).not.toHaveBeenCalled();
        expect(historyForward).not.toHaveBeenCalled();
    });

    it('does not dispatch play-again event outside game views', async () => {
        window.location.hash = '#view-games';
        const onPlayAgain = vi.fn();
        document.addEventListener(GAME_PLAY_AGAIN, onPlayAgain);

        await import('../../src/games/game-complete.js');
        document.getElementById('game-complete-play-again')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(onPlayAgain).not.toHaveBeenCalled();
    });

    it('does not open the dialog when game events fire outside game views', async () => {
        window.location.hash = '#view-games';
        await import('../../src/games/game-complete.js');
        const dialog = document.getElementById('game-complete-modal');

        document.dispatchEvent(new CustomEvent(GAME_RECORDED, {
            detail: { score: 25, accuracy: 80, stars: 2 },
        }));

        expect(dialog.showModal).not.toHaveBeenCalled();
    });

    it('opens the dialog for meaningful game events while a game view is active', async () => {
        window.location.hash = '#view-game-pitch-quest';
        await import('../../src/games/game-complete.js');
        const dialog = document.getElementById('game-complete-modal');

        document.dispatchEvent(new CustomEvent(GAME_RECORDED, {
            detail: { score: 25, accuracy: 80, stars: 2 },
        }));

        expect(dialog.showModal).toHaveBeenCalledTimes(1);
    });

    it('ignores game events when active game id does not match event id', async () => {
        window.location.hash = '#view-game-pitch-quest';
        await import('../../src/games/game-complete.js');
        const dialog = document.getElementById('game-complete-modal');

        document.dispatchEvent(new CustomEvent(GAME_RECORDED, {
            detail: { id: 'rhythm-dash', score: 25, accuracy: 80, stars: 2 },
        }));

        expect(dialog.showModal).not.toHaveBeenCalled();
    });
});
