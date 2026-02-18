import { createGame } from './game-shell.js';
import {
    readLiveNumber,
    markChecklist,
    markChecklistIf,
    bindTap,
    playToneNote,
} from './shared.js';
import { clamp, deviationAccuracy } from '../utils/math.js';

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

        const updateTempo = () => {
            if (!slider || !tempoEl) return;
            const tempo = Number.parseInt(slider.value, 10);
            tempoEl.textContent = `${tempo} BPM`;
            slider.setAttribute('aria-valuenow', String(tempo));
            slider.setAttribute('aria-valuetext', `${tempo} BPM`);
            if (statusEl) statusEl.textContent = `Tempo set to ${tempo} BPM · Goal ${targetTempo} BPM.`;
            if (tempo <= 70) {
                tempoTags.add('slow');
                markChecklist('sp-step-1');
            }
            if (tempo >= 80 && tempo <= 95) {
                tempoTags.add('target');
                markChecklist('sp-step-2');
            }
            if (tempo >= 100) {
                tempoTags.add('fast');
                markChecklist('sp-step-3');
            }
            markChecklistIf(tempoTags.size >= 3, 'sp-step-4');
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
                const ideal = 60000 / targetTempo;
                const deviation = Math.abs(interval - ideal);
                const timingScore = clamp(1 - deviation / ideal, 0, 1);
                gameState.timingScores.push(timingScore);
                if (gameState.timingScores.length > 8) gameState.timingScores.shift();
                let label = 'Off';
                if (timingScore >= 0.9) label = 'Perfect';
                else if (timingScore >= 0.75) label = 'Great';
                else if (timingScore >= 0.6) label = 'Good';
                gameState.score += Math.round(8 + timingScore * 12);
                if (scoreEl) scoreEl.textContent = String(gameState.score);
                if (ratingEl) ratingEl.textContent = `Timing: ${label}`;
                if (timingScore >= 0.75) markChecklist('sp-step-2');
                if (timingScore >= 0.6) markChecklist('sp-step-1');
                if (timingScore >= 0.9) markChecklist('sp-step-4');
                if (timingScore >= 0.75) {
                    const note = scaleNotes[gameState.scaleIndex % scaleNotes.length];
                    playToneNote(note, { duration: 0.22, volume: 0.18, type: 'triangle' });
                    gameState.scaleIndex += 1;
                } else if (timingScore > 0) {
                    playToneNote('F', { duration: 0.18, volume: 0.12, type: 'sawtooth' });
                }
                gameState.accuracy = clamp(
                    (gameState.timingScores.reduce((sum, value) => sum + value, 0) / gameState.timingScores.length) * 100,
                    0,
                    100,
                );
                if (gameState.timingScores.length >= 4) {
                    reportSession();
                }
            }
            gameState.lastTap = now;
        });
        updateTempo();
    },
});

export { updateScalePractice as update, bind };
