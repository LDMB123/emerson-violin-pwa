import { createGame } from './game-shell.js';
import { markChecklist, bindTap, readLiveNumber } from './shared.js';
import { clamp } from '../utils/math.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { SOUNDS_CHANGE } from '../utils/event-names.js';

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
        if (statusEl) statusEl.textContent = `Tune ${targetStrings} strings to warm up.`;
        if (progressEl) {
            progressEl.style.width = '0%';
            if (progressBar) progressBar.setAttribute('aria-valuenow', 0);
        }
    },
    onBind: (stage, difficulty, { reportSession, gameState }) => {
        const statusEl = stage.querySelector('[data-tuning="status"]');
        const progressEl = stage.querySelector('[data-tuning="progress"]');
        const progressBar = progressEl?.parentElement;
        const buttons = Array.from(stage.querySelectorAll('.tuning-btn'));
        const audioMap = {
            G: stage.querySelector('audio[aria-labelledby="tuning-g-label"]'),
            D: stage.querySelector('audio[aria-labelledby="tuning-d-label"]'),
            A: stage.querySelector('audio[aria-labelledby="tuning-a-label"]'),
            E: stage.querySelector('audio[aria-labelledby="tuning-e-label"]'),
        };
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
            statusEl.textContent = `Tune ${targetStrings} strings to warm up.`;
        }
        if (progressEl) {
            const percent = clamp((gameState.tunedNotes.size / targetStrings) * 100, 0, 100);
            progressEl.style.width = `${percent}%`;
            if (progressBar) progressBar.setAttribute('aria-valuenow', Math.round(percent));
        }

        buttons.forEach((button) => {
            bindTap(button, () => {
                const note = button.dataset.tuningNote;
                if (!note) return;
                if (!isSoundEnabled()) {
                    if (statusEl) statusEl.textContent = 'Sounds are off. Enable Sounds to hear the tone.';
                    return;
                }
                const audio = audioMap[note];
                if (audio) {
                    audio.currentTime = 0;
                    audio.play().catch(() => {});
                }
                gameState.tunedNotes.add(note);
                if (statusEl) {
                    const remaining = Math.max(0, targetStrings - gameState.tunedNotes.size);
                    statusEl.textContent = remaining
                        ? `Tuning ${note} · ${remaining} more string${remaining === 1 ? '' : 's'} to go.`
                        : 'All target strings tuned. Great job!';
                }
                if (progressEl) {
                    const percent = clamp((gameState.tunedNotes.size / targetStrings) * 100, 0, 100);
                    progressEl.style.width = `${percent}%`;
                    if (progressBar) progressBar.setAttribute('aria-valuenow', Math.round(percent));
                }
                markChecklist(checklistMap[note]);
                if (gameState.tunedNotes.size >= targetStrings) {
                    reportSession();
                }
            });
        });

        document.addEventListener(SOUNDS_CHANGE, (event) => {
            if (event.detail?.enabled === false && statusEl) {
                statusEl.textContent = 'Sounds are off. Enable Sounds to hear tones.';
            }
        });
    },
});

export { updateTuningTime as update, bind };
