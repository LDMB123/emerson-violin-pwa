import { WipersCanvasEngine } from './wipers-canvas.js';
import { recordGameEvent } from './shared.js';
import { isGameView } from '../utils/view-hash-utils.js';

const GAME_ID_WIPERS = 'wipers';

let engine = null;
let bound = false;
let clickHandler = null;

const WIPES_WIN = 20;

export const init = () => {
    const view = document.getElementById('view-game-wipers');
    if (!view) return;

    const canvas = document.getElementById('wipers-canvas');
    if (!canvas) return;

    const scoreEl = document.getElementById('wipers-score');
    const startBtn = document.getElementById('wipers-start-btn');

    if (!engine) {
        engine = new WipersCanvasEngine(canvas, (score, wipes) => {
            if (scoreEl) scoreEl.textContent = `${wipes} / ${WIPES_WIN}`;

            // Win condition:
            if (wipes >= WIPES_WIN) {
                engine.stop();
                recordGameEvent(GAME_ID_WIPERS, {
                    score,
                    accuracy: Math.floor((wipes / WIPES_WIN) * 100)
                });
            }
        });
    }

    if (!bound) {
        startBtn?.removeEventListener('click', clickHandler);
        clickHandler = () => {
            if (engine.isRunning) {
                engine.stop();
                startBtn.textContent = 'Start Engine';
            } else {
                if (scoreEl) scoreEl.textContent = `0 / ${WIPES_WIN}`;
                engine.start();
                startBtn.textContent = 'Stop Engine';
            }
        };
        startBtn?.addEventListener('click', clickHandler);
        // Auto-pause if navigating away; self-removes on first non-game navigation
        const onHashChange = () => {
            if (!isGameView(window.location.hash, 'wipers')) {
                if (engine?.isRunning) {
                    engine.stop();
                    if (startBtn) startBtn.textContent = 'Start Engine';
                }
                window.removeEventListener('hashchange', onHashChange);
                bound = false;
            }
        };
        window.addEventListener('hashchange', onHashChange);

        bound = true;
    }
};
