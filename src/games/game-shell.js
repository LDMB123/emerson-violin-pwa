import {
    recordGameEvent,
    attachTuning,
    setDifficultyBadge,
} from './shared.js';
import { GAME_PLAY_AGAIN } from '../utils/event-names.js';

/**
 * createGame — factory for universal game boilerplate.
 *
 * @param {object} options
 * @param {string} options.id - Game ID, e.g. 'tuning-time'. Used to build view selector
 *   and passed to attachTuning/recordGameEvent.
 * @param {function} options.onBind - Called at the end of bind() with (stage, difficulty, shell).
 *   Responsible for setting up all game-specific event listeners and logic.
 * @param {function} [options.computeAccuracy] - Optional. Called in the shell's reportSession
 *   with the current gameState; must return a numeric accuracy (0–100). When omitted, accuracy
 *   defaults to 0 and the guard `accuracy <= 0 && !gameState.score` will suppress reporting
 *   unless gameState.score is set.
 * @param {function} [options.onReset] - Optional. Called in resetSession with the current
 *   gameState. Use to clear game-specific state fields on the shared object.
 * @param {function} [options.computeUpdate] - Optional. Called in update() after the stage is
 *   confirmed to exist. Use for live DOM refresh logic. When omitted, update() is a no-op
 *   (stage-check only).
 * Games may also assign `gameState._onDeactivate = () => { ... }` inside onBind to run
 * game-specific cleanup when the user navigates away from that game view.
 * @returns {{ update: function, bind: function }}
 */
export function createGame({ id, onBind, computeAccuracy, onReset, computeUpdate } = {}) {
    const viewId = `#view-game-${id}`;
    let reportResult = null;
    let reported = false;
    // gameState is a shared mutable object. onBind receives a reference to it and may attach
    // arbitrary fields (score, hits, etc.) that computeAccuracy and onReset can then read.
    const gameState = {};

    function update() {
        const stage = document.querySelector(viewId);
        if (!stage) return;
        if (typeof computeUpdate === 'function') computeUpdate(stage, gameState);
    }

    function bind(difficulty = { speed: 1.0, complexity: 1 }) {
        const stage = document.querySelector(viewId);
        if (!stage) return;

        reported = false;
        // Remove previous hashchange listener before clearing gameState.
        if (gameState._hashHandler) {
            window.removeEventListener('hashchange', gameState._hashHandler, { passive: true });
        }
        if (gameState._playAgainHandler) {
            document.removeEventListener(GAME_PLAY_AGAIN, gameState._playAgainHandler);
        }
        if (gameState._pagehideHandler) {
            window.removeEventListener('pagehide', gameState._pagehideHandler, { passive: true });
        }
        if (reportResult?.dispose) {
            reportResult.dispose();
        }
        // Clear gameState without replacing the reference (onBind captures the same object).
        Object.keys(gameState).forEach((key) => {
            delete gameState[key];
        });

        reportResult = attachTuning(id, (tuning) => {
            setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
            if (typeof onReset === 'function') onReset(gameState);
        });

        const reportSession = () => {
            if (reported) return;
            const accuracy = typeof computeAccuracy === 'function' ? computeAccuracy(gameState) : 0;
            if (accuracy <= 0 && !gameState.score) return;
            reported = true;
            reportResult({ accuracy, score: gameState.score || 0 });
            recordGameEvent(id, { accuracy, score: gameState.score || 0 });
        };

        const resetSession = () => {
            reported = false;
            if (typeof onReset === 'function') onReset(gameState);
        };

        const shell = { reportSession, resetSession, gameState };

        onBind(stage, difficulty, shell);

        const hashHandler = () => {
            if (window.location.hash === `#view-game-${id}`) {
                resetSession();
                return;
            }
            if (typeof gameState._onDeactivate === 'function') {
                gameState._onDeactivate();
            }
            reportSession();
        };
        const playAgainHandler = (event) => {
            const requestedViewId = event?.detail?.viewId;
            const currentViewId = window.location.hash.replace(/^#/, '');
            if (requestedViewId && requestedViewId !== `view-game-${id}`) return;
            if (currentViewId !== `view-game-${id}`) return;
            resetSession();
        };
        const pagehideHandler = (event) => {
            const currentViewId = window.location.hash.replace(/^#/, '');
            if (currentViewId !== `view-game-${id}`) return;
            if (event?.persisted) return;
            if (typeof gameState._onDeactivate === 'function') {
                gameState._onDeactivate();
            }
            reportSession();
        };
        gameState._hashHandler = hashHandler;
        gameState._playAgainHandler = playAgainHandler;
        gameState._pagehideHandler = pagehideHandler;
        window.addEventListener('hashchange', hashHandler, { passive: true });
        window.addEventListener('pagehide', pagehideHandler, { passive: true });
        document.addEventListener(GAME_PLAY_AGAIN, playAgainHandler);
    }

    return { update, bind };
}
