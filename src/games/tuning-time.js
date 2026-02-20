import { createGame } from './game-shell.js';
import { createAudioCueBank } from './game-audio-cues.js';
import { markChecklist, bindTap, readLiveNumber, bindSoundsChange } from './shared.js';
import { clamp } from '../utils/math.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import {
    formatTuningProgressMessage,
    setTuningStatusText,
    renderTuningProgress,
} from './tuning-time-view.js';

const updateTuningTime = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-tuning-time input[id^="tt-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = document.querySelector('[data-tuning="score"]');
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    if (scoreEl) scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : checked * 25);
};

const { bind } = createGame({
    id: 'tuning-time',
    computeAccuracy: (state) => state.tunedNotes
        ? clamp((state.tunedNotes.size / (state.targetStrings || 4)) * 100, 0, 100)
        : 0,
    onReset: (gameState) => {
        if (gameState.tunedNotes) gameState.tunedNotes.clear();
        const statusEl = gameState._statusEl;
        const progressEl = gameState._progressEl;
        const progressBar = gameState._progressBar;
        const targetStrings = gameState.targetStrings || 4;
        setTuningStatusText(statusEl, `Tune ${targetStrings} strings to warm up.`);
        renderTuningProgress({
            progressEl,
            progressBar,
            tunedCount: 0,
            targetStrings,
        });
    },
    onBind: (stage, difficulty, { reportSession, gameState, registerCleanup }) => {
        const statusEl = stage.querySelector('[data-tuning="status"]');
        const progressEl = stage.querySelector('[data-tuning="progress"]');
        const progressBar = progressEl?.parentElement;
        const buttons = Array.from(stage.querySelectorAll('.tuning-btn'));
        const cueBank = createAudioCueBank({
            G: stage.querySelector('audio[aria-labelledby="tuning-g-label"]'),
            D: stage.querySelector('audio[aria-labelledby="tuning-d-label"]'),
            A: stage.querySelector('audio[aria-labelledby="tuning-a-label"]'),
            E: stage.querySelector('audio[aria-labelledby="tuning-e-label"]'),
        });
        const checklistMap = {
            G: 'tt-step-1',
            D: 'tt-step-2',
            A: 'tt-step-3',
            E: 'tt-step-4',
        };

        // difficulty.speed: visual feedback only for this game (no time limit to scale)
        // difficulty.complexity: sets initial targetStrings; complexity=1 (medium) = 3 strings (current behavior)
        const complexityTargets = [2, 3, 4];
        gameState.targetStrings = complexityTargets[difficulty.complexity] ?? 3;
        gameState.tunedNotes = new Set();
        // Store DOM refs so onReset can access them
        gameState._statusEl = statusEl;
        gameState._progressEl = progressEl;
        gameState._progressBar = progressBar;

        const { targetStrings } = gameState;

        if (statusEl && gameState.tunedNotes.size === 0) {
            setTuningStatusText(statusEl, `Tune ${targetStrings} strings to warm up.`);
        }
        renderTuningProgress({
            progressEl,
            progressBar,
            tunedCount: gameState.tunedNotes.size,
            targetStrings,
        });

        gameState._onDeactivate = () => {
            cueBank.stopAll();
        };

        buttons.forEach((button) => {
            bindTap(button, () => {
                const note = button.dataset.tuningNote;
                if (!note) return;
                if (!isSoundEnabled()) {
                    setTuningStatusText(statusEl, 'Sounds are off. Enable Sounds to hear the tone.');
                    return;
                }
                cueBank.play(note);
                gameState.tunedNotes.add(note);
                setTuningStatusText(statusEl, formatTuningProgressMessage({
                    note,
                    tunedCount: gameState.tunedNotes.size,
                    targetStrings,
                }));
                renderTuningProgress({
                    progressEl,
                    progressBar,
                    tunedCount: gameState.tunedNotes.size,
                    targetStrings,
                });
                markChecklist(checklistMap[note]);
                if (gameState.tunedNotes.size >= targetStrings) {
                    reportSession();
                }
            });
        });

        const soundsHandler = (event) => {
            if (event.detail?.enabled === false) {
                setTuningStatusText(statusEl, 'Sounds are off. Enable Sounds to hear tones.');
            }
        };
        bindSoundsChange(soundsHandler, registerCleanup);
    },
});

export { updateTuningTime as update, bind };
