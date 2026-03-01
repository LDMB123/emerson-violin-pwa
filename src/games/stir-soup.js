import { StirSoupCanvasEngine } from './stir-soup-canvas.js';
import { recordGameEvent } from './shared.js';
import { isGameView } from '../utils/view-hash-utils.js';

const GAME_ID_STIR_SOUP = 'stir-soup';

let engine = null;
let bound = false;
let clickHandler = null;

const SCORE_WIN = 2000;

export const init = () => {
    const view = document.getElementById('view-game-stir-soup');
    if (!view) return;

    const canvas = document.getElementById('stir-canvas');
    if (!canvas) return;

    const scoreEl = document.getElementById('stir-score');
    const authEl = document.getElementById('stir-smoothness');
    const startBtn = document.getElementById('stir-start-btn');

    if (!engine) {
        engine = new StirSoupCanvasEngine(canvas, (score, smoothness) => {
            if (scoreEl) scoreEl.textContent = Math.floor(score);
            if (authEl) authEl.textContent = `${Math.floor(smoothness)}%`;

            // Win condition:
            if (score >= SCORE_WIN) {
                engine.stop();
                recordGameEvent(GAME_ID_STIR_SOUP, {
                    score,
                    accuracy: Math.floor(smoothness)
                });
            }
        });
    }

    if (!bound) {
        startBtn?.removeEventListener('click', clickHandler);
        clickHandler = () => {
            if (engine.isRunning) {
                engine.stop();
                startBtn.textContent = 'Start Stirring';
            } else {
                if (scoreEl) scoreEl.textContent = '0';
                if (authEl) authEl.textContent = '100%';
                engine.start();
                startBtn.textContent = 'Stop Stirring';
            }
        };
        startBtn?.addEventListener('click', clickHandler);
        // Auto-pause if navigating away; self-removes on first non-game navigation
        const onHashChange = () => {
            if (!isGameView(window.location.hash, 'stir-soup')) {
                if (engine?.isRunning) {
                    engine.stop();
                    if (startBtn) startBtn.textContent = 'Start Stirring';
                }
                window.removeEventListener('hashchange', onHashChange);
                bound = false;
            }
        };
        window.addEventListener('hashchange', onHashChange);

        bound = true;
    }
};
