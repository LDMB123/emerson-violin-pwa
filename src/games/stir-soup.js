import { StirSoupCanvasEngine } from './stir-soup-canvas.js';
import { bindHashViewGameStartStop, createStartStopBindingState, maybeStopEngineAndRecordThreshold } from './shared.js';

const GAME_ID_STIR_SOUP = 'stir-soup';

let engine = null;
const bindingState = createStartStopBindingState();

const SCORE_WIN = 2000;

export function init() {
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

            maybeStopEngineAndRecordThreshold({
                engine,
                value: score,
                threshold: SCORE_WIN,
                id: GAME_ID_STIR_SOUP,
                payload: {
                    score,
                    accuracy: Math.floor(smoothness),
                },
            });
        });
    }

    bindHashViewGameStartStop({
        gameId: GAME_ID_STIR_SOUP,
        state: bindingState,
        startButton: startBtn,
        engine,
        startLabel: 'Start Stirring',
        stopLabel: 'Stop Stirring',
        resetBeforeStart: () => {
            if (scoreEl) scoreEl.textContent = '0';
            if (authEl) authEl.textContent = '100%';
        },
    });
}
