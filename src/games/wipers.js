import { WipersCanvasEngine } from './wipers-canvas.js';
import { bindHashViewGameStartStop, createStartStopBindingState, maybeStopEngineAndRecordThreshold } from './shared.js';

const GAME_ID_WIPERS = 'wipers';

let engine = null;
const bindingState = createStartStopBindingState();

const WIPES_WIN = 20;

export const init = () => {
    const view = document.getElementById('view-game-wipers');
    if (!view) return;

    const canvas = view.querySelector('#wipers-canvas');
    if (!canvas) return;

    const scoreEl = view.querySelector('#wipers-score');
    const startBtn = view.querySelector('#wipers-start-btn');

    if (!engine) {
        engine = new WipersCanvasEngine(canvas, (score, wipes) => {
            if (scoreEl) scoreEl.textContent = `${wipes} / ${WIPES_WIN}`;

            maybeStopEngineAndRecordThreshold({
                engine,
                value: wipes,
                threshold: WIPES_WIN,
                id: GAME_ID_WIPERS,
                payload: {
                    score,
                    accuracy: Math.floor((wipes / WIPES_WIN) * 100),
                },
            });
        });
    }

    bindHashViewGameStartStop({
        state: bindingState,
        engine,
        startButton: startBtn,
        gameId: GAME_ID_WIPERS,
        startLabel: 'Start Engine',
        stopLabel: 'Stop Engine',
        resetBeforeStart: () => {
            if (scoreEl) scoreEl.textContent = `0 / ${WIPES_WIN}`;
        },
    });
};
