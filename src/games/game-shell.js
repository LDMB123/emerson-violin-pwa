import {
    recordGameEvent,
    attachTuning,
    setDifficultyBadge,
} from './shared.js';
import { bindGameSessionLifecycle } from './game-session-lifecycle.js';
import { resolveGameObjectiveProgress } from './game-objectives.js';

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
    let sessionStartedAt = 0;
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

        if (typeof gameState._disposeBindings === 'function') {
            try {
                gameState._disposeBindings();
            } catch {
                // Ignore cleanup failures from previous session bindings.
            }
        }
        reported = false;
        sessionStartedAt = Date.now();
        let hasReceivedInitialTuning = false;
        if (reportResult?.dispose) {
            reportResult.dispose();
        }
        // Clear gameState without replacing the reference (onBind captures the same object).
        Object.keys(gameState).forEach((key) => {
            delete gameState[key];
        });

        const cleanupFns = [];
        const registerCleanup = (cleanup) => {
            if (typeof cleanup !== 'function') return cleanup;
            cleanupFns.push(cleanup);
            return cleanup;
        };
        const disposeBindings = () => {
            while (cleanupFns.length) {
                const cleanup = cleanupFns.pop();
                try {
                    cleanup();
                } catch {
                    // Ignore cleanup failures to ensure remaining handlers still dispose.
                }
            }
        };
        gameState._disposeBindings = disposeBindings;

        reportResult = attachTuning(id, (tuning) => {
            setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
            if (!hasReceivedInitialTuning) {
                hasReceivedInitialTuning = true;
                return;
            }
            if (typeof onReset === 'function') onReset(gameState);
        });

        const reportSession = () => {
            if (reported) return;
            const accuracy = typeof computeAccuracy === 'function' ? computeAccuracy(gameState) : 0;
            if (accuracy <= 0 && !gameState.score) return;
            reported = true;
            reportResult({ accuracy, score: gameState.score || 0 });

            const objectiveProgress = resolveGameObjectiveProgress({
                stage,
                gameId: id,
                difficultyComplexity: difficulty?.complexity || 0,
                includeInput: (input) => (
                    !input.id.startsWith('setting-')
                    && !input.id.includes('parent-')
                    && /(-step-|set-)/.test(input.id)
                ),
            });
            const mistakes = Number.isFinite(gameState.mistakes)
                ? Math.max(0, Math.round(gameState.mistakes))
                : Math.max(0, objectiveProgress.objectiveTotal - objectiveProgress.objectivesCompleted);
            const sessionMs = Math.max(0, Date.now() - (sessionStartedAt || Date.now()));
            const difficultyLevel = stage.querySelector('.difficulty-badge')?.dataset?.level
                || stage.dataset.gameDifficulty
                || 'medium';

            recordGameEvent(id, {
                accuracy,
                score: gameState.score || 0,
                difficulty: difficultyLevel,
                tier: objectiveProgress.tier,
                sessionMs,
                objectiveTotal: objectiveProgress.objectiveTotal,
                objectivesCompleted: objectiveProgress.objectivesCompleted,
                mistakes,
            });
        };

        const resetSession = () => {
            reported = false;
            sessionStartedAt = Date.now();
            if (typeof onReset === 'function') onReset(gameState);
        };

        const shell = {
            reportSession,
            resetSession,
            gameState,
            // Register cleanup for global listeners created in onBind.
            // These callbacks run on re-bind and on game deactivation.
            registerCleanup,
        };

        const handleNavigationIntercept = (e) => {
            const anchor = e.target.closest('a[href^="#"]');
            if (!anchor) return;

            // Heuristic for "active" game: user has a score, or game state explicitly says playing/active
            const isPlaying = gameState.playing
                || gameState.active
                || (typeof gameState.score === 'number' && gameState.score > 0)
                || (typeof gameState.hits === 'number' && gameState.hits > 0);

            if (isPlaying) {
                e.preventDefault();
                const modal = document.getElementById('exit-confirm-modal');
                if (!modal) return;

                const keepPlayingBtn = modal.querySelector('#exit-confirm-keep-playing');
                const exitGameBtn = modal.querySelector('#exit-confirm-exit');

                const cleanupModal = () => {
                    keepPlayingBtn?.removeEventListener('click', onKeepPlaying);
                    exitGameBtn?.removeEventListener('click', onExitGame);
                };

                const onKeepPlaying = () => {
                    modal.close();
                    cleanupModal();
                };

                const onExitGame = () => {
                    modal.close();
                    cleanupModal();
                    window.location.hash = anchor.getAttribute('href');
                };

                keepPlayingBtn?.addEventListener('click', onKeepPlaying);
                exitGameBtn?.addEventListener('click', onExitGame);
                modal.showModal();
            }
        };

        stage.addEventListener('click', handleNavigationIntercept);
        registerCleanup(() => stage.removeEventListener('click', handleNavigationIntercept));

        onBind(stage, difficulty, shell);

        registerCleanup(bindGameSessionLifecycle({
            hashId: `#view-game-${id}`,
            onReset: resetSession,
            onDeactivate: () => {
                if (typeof gameState._onDeactivate === 'function') {
                    gameState._onDeactivate();
                }
                disposeBindings();
            },
            onReport: reportSession,
        }));
    }

    return { update, bind };
}
