import { createGame } from './game-shell.js';
import {
    readLiveNumber,
    markChecklist,
    markChecklistIf,
    bindTap,
    playToneNote,
    stopTonePlayer,
} from './shared.js';
import { deviationAccuracy } from '../utils/math.js';
import { computeScalePracticeTapResult } from './scale-practice-tap.js';
import { applyScalePracticeTempoUpdate } from './scale-practice-tempo.js';

const updateScalePractice = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-scale-practice input[id^="sp-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = document.querySelector('[data-scale="score"]');
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    if (scoreEl) scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : checked * 28);
};

const { bind } = createGame({
    id: 'scale-practice',
    computeAccuracy: (state) => state.accuracy ?? 0,
    onReset: (gameState) => {
        gameState.score = 0;
        gameState.accuracy = 0;
        gameState.lastTap = 0;
        gameState.scaleIndex = 0;
        gameState.timingScores = [];
        const scoreEl = gameState._scoreEl;
        const ratingEl = gameState._ratingEl;
        if (scoreEl) scoreEl.textContent = '0';
        if (ratingEl) ratingEl.textContent = 'Timing: --';
    },
    onBind: (stage, difficulty, { reportSession, gameState }) => {
        const slider = stage.querySelector('[data-scale="slider"]');
        const tempoEl = stage.querySelector('[data-scale="tempo"]');
        const statusEl = stage.querySelector('[data-scale="status"]');
        const scoreEl = stage.querySelector('[data-scale="score"]');
        const tapButton = stage.querySelector('[data-scale="tap"]');
        const ratingEl = stage.querySelector('[data-scale="rating"]');
        const tempoTags = new Set();
        const scaleNotes = ['G', 'A', 'B', 'C', 'D', 'E', 'F#', 'G'];

        // difficulty.speed: scales targetTempo; speed=1.0 keeps targetTempo=85 (current behavior)
        // difficulty.complexity: visual feedback only for this game (single scale, no content pool to select)
        const targetTempo = Math.round(85 * difficulty.speed);

        // Store DOM refs and state on gameState
        gameState._scoreEl = scoreEl;
        gameState._ratingEl = ratingEl;
        gameState.score = 0;
        gameState.accuracy = 0;
        gameState.lastTap = 0;
        gameState.scaleIndex = 0;
        gameState.timingScores = [];

        gameState._onDeactivate = () => {
            stopTonePlayer();
        };

        const updateTempo = () => {
            applyScalePracticeTempoUpdate({
                slider,
                tempoEl,
                statusEl,
                targetTempo,
                tempoTags,
                markChecklist,
                markChecklistIf,
            });
        };

        slider?.addEventListener('input', () => {
            if (slider) slider.dataset.userSet = 'true';
            gameState.scaleIndex = 0;
            updateTempo();
        });
        slider?.addEventListener('change', () => {
            const tempo = slider ? Number.parseInt(slider.value, 10) : 0;
            gameState.accuracy = deviationAccuracy(tempo, targetTempo);
            gameState.score = tempo;
            reportSession();
        });

        bindTap(tapButton, () => {
            const now = performance.now();
            if (gameState.lastTap) {
                const interval = now - gameState.lastTap;
                const tapResult = computeScalePracticeTapResult({
                    interval,
                    targetTempo,
                    timingScores: gameState.timingScores,
                    score: gameState.score,
                    scaleIndex: gameState.scaleIndex,
                    scaleNotes,
                });
                gameState.timingScores = tapResult.timingScores;
                gameState.score = tapResult.score;
                gameState.scaleIndex = tapResult.scaleIndex;
                gameState.accuracy = tapResult.accuracy;
                if (scoreEl) scoreEl.textContent = String(gameState.score);
                if (ratingEl) ratingEl.textContent = `Timing: ${tapResult.label}`;
                if (tapResult.markStep2) markChecklist('sp-step-2');
                if (tapResult.markStep1) markChecklist('sp-step-1');
                if (tapResult.markStep4) markChecklist('sp-step-4');
                if (tapResult.noteAction) {
                    playToneNote(tapResult.noteAction.note, tapResult.noteAction.options);
                }
                if (tapResult.shouldReport) {
                    reportSession();
                }
            }
            gameState.lastTap = now;
        });
        updateTempo();
    },
});

export { updateScalePractice as update, bind };
