import { createGame } from './game-shell.js';
import { attachTuning } from './shared.js';
import { RT_STATE } from '../utils/event-names.js';
import { clamp } from '../utils/math.js';

export const computeAccuracy = (state) => {
    if (!state.totalTargets) return 0;
    return (state.score / state.totalTargets) * 100;
};

const { bind } = createGame({
    id: 'dynamic-dojo',
    computeAccuracy,
    onReset: (gameState) => {
        gameState.score = 0;
        gameState.totalTargets = 10; // e.g., 10 targets to win
        gameState.currentTarget = null;
        gameState.currentVisualVolume = 0;
        gameState.pianoFrames = 0;

        if (gameState._instructionEl) {
            gameState._instructionEl.textContent = "Tap Start to Train!";
        }
        if (gameState._gaugeFill) {
            gameState._gaugeFill.style.height = "5%";
        }

        hideAllTargets(gameState);
    },
    onBind: (stage, difficulty, { reportSession, gameState, registerCleanup }) => {
        // DOM Elements
        gameState._boardTarget = stage.querySelector('[data-dojo="board"]');
        gameState._tigerTarget = stage.querySelector('[data-dojo="tiger"]');
        gameState._gaugeFill = stage.querySelector('[data-dojo="volume-fill"]');
        gameState._instructionEl = stage.querySelector('[data-dojo="prompt"]');
        const startBtn = stage.querySelector('[data-dojo="listen"]');

        let listening = false;
        let tuningActive = null;

        const handleStart = () => {
            if (listening) return;
            listening = true;
            nextRound(gameState);

            // attachTuning initializes the microphone requirement
            tuningActive = attachTuning('dynamic-dojo', () => { });
            document.addEventListener(RT_STATE, onAudioData);

            if (startBtn) startBtn.style.display = 'none';
        };

        if (startBtn) {
            startBtn.addEventListener('click', handleStart);
        }

        const onAudioData = (event) => {
            const data = event.detail?.lastFeature;
            if (!data || typeof data.rms !== 'number') return;

            // Map 0.0 - 0.25 RMS to 5% - 100% height
            const targetVisual = clamp((data.rms / 0.25) * 100, 5, 100);

            // Smooth visually
            gameState.currentVisualVolume = gameState.currentVisualVolume + (targetVisual - gameState.currentVisualVolume) * 0.2;
            if (gameState._gaugeFill) {
                gameState._gaugeFill.style.height = `${gameState.currentVisualVolume}%`;
            }

            // Check Win Conditions
            if (gameState.currentTarget === 'forte' && data.rms > gameState.targetVolumeThreshold) {
                document.removeEventListener(RT_STATE, onAudioData);
                triggerWin(gameState, checkGameOver);
            } else if (gameState.currentTarget === 'piano' && data.rms > 0.005 && data.rms < gameState.targetVolumeThreshold) {
                gameState.pianoFrames++;
                if (gameState.pianoFrames > 30) {
                    document.removeEventListener(RT_STATE, onAudioData);
                    triggerWin(gameState, checkGameOver);
                    gameState.pianoFrames = 0;
                }
            } else {
                if (gameState.currentTarget === 'piano' && (data.rms > gameState.targetVolumeThreshold || data.rms < 0.005)) {
                    gameState.pianoFrames = 0;
                }
            }
        };

        const checkGameOver = () => {
            if (gameState.score >= gameState.totalTargets) {
                gameState._instructionEl.textContent = "Dojo Master! You Win!";
                cleanupListeners();
                reportSession();
            } else {
                nextRound(gameState);
                document.addEventListener(RT_STATE, onAudioData);
            }
        };

        const cleanupListeners = () => {
            document.removeEventListener(RT_STATE, onAudioData);
            if (tuningActive) tuningActive.dispose();
            tuningActive = null;
            listening = false;
        };

        registerCleanup(cleanupListeners);
    }
});

function hideAllTargets(gameState) {
    if (gameState._boardTarget) {
        gameState._boardTarget.classList.remove('dojo-visible', 'dojo-board-break');
        gameState._boardTarget.classList.add('dojo-hidden');
    }
    if (gameState._tigerTarget) {
        gameState._tigerTarget.classList.remove('dojo-visible', 'dojo-tiger-wake');
        gameState._tigerTarget.classList.add('dojo-hidden');
    }
}

function nextRound(gameState) {
    hideAllTargets(gameState);

    const isForte = Math.random() > 0.5;
    gameState.currentTarget = isForte ? 'forte' : 'piano';

    if (isForte) {
        gameState._instructionEl.textContent = "Play LOUD! (Forte)";
        gameState._boardTarget.classList.remove('dojo-hidden');
        gameState._boardTarget.classList.add('dojo-visible');
        gameState.targetVolumeThreshold = 0.15;
    } else {
        gameState._instructionEl.textContent = "Play SOFT! (Piano)";
        gameState._tigerTarget.classList.remove('dojo-hidden');
        gameState._tigerTarget.classList.add('dojo-visible');
        gameState.targetVolumeThreshold = 0.03;
    }
}

function triggerWin(gameState, onComplete) {
    // Temporarily pause analysis and wait for animation
    if (gameState.currentTarget === 'forte') {
        gameState._boardTarget.classList.add('dojo-board-break');
        gameState._instructionEl.textContent = "SMASH! Great Forte!";
    } else {
        gameState._tigerTarget.textContent = '🐅';
        gameState._tigerTarget.classList.add('dojo-tiger-wake');
        gameState._instructionEl.textContent = "Shh! Perfect Piano.";
    }

    gameState.score++;

    // We expect the caller (`onAudioData`) to have unregistered `RT_STATE`.
    setTimeout(onComplete, 2000);
}

export const init = () => bind();
