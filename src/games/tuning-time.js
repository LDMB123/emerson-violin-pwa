import { createGame } from './game-shell.js';
import { createAudioCueBank } from './game-audio-cues.js';
import { markChecklist, bindTap, readLiveNumber, bindSoundsChange, attachTuning } from './shared.js';
import { clamp } from '../utils/math.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { RT_STATE } from '../utils/event-names.js';
import { TuningCanvasEngine } from './tuning-canvas.js';
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
        gameState.tuningEnergy = 0.0;

        // Store DOM refs so onReset can access them
        gameState._statusEl = statusEl;
        gameState._progressEl = null; // Removed CSS bar
        gameState._progressBar = null;

        const { targetStrings } = gameState;

        const canvasEl = stage.querySelector('#pitch-quest-canvas');
        let tuningEngine = null;
        if (canvasEl) {
            tuningEngine = new TuningCanvasEngine(canvasEl);
            tuningEngine.start();
        }

        if (statusEl && gameState.tunedNotes.size === 0) {
            setTuningStatusText(statusEl, `Tune ${targetStrings} strings to warm up.`);
        }
        renderTuningProgress({
            progressEl,
            progressBar,
            tunedCount: gameState.tunedNotes.size,
            targetStrings,
        });

        // Initialize mic state
        gameState.activeTarget = null;
        gameState.holdStart = 0;

        let tuningActive = null;

        gameState._onDeactivate = () => {
            cueBank.stopAll();
            if (tuningActive) tuningActive.dispose();
            tuningActive = null;
            gameState.activeTarget = null;
            if (tuningEngine) tuningEngine.stop();
        };

        const checkWinState = () => {
            renderTuningProgress({
                progressEl,
                progressBar,
                tunedCount: gameState.tunedNotes.size,
                targetStrings,
            });
            if (gameState.tunedNotes.size >= targetStrings) {
                setTuningStatusText(statusEl, 'All strings tuned! Great job.');
                if (tuningActive) tuningActive.dispose();
                tuningActive = null;
                reportSession();
                return true;
            }
            return false;
        };

        tuningActive = attachTuning('tuning-time', () => { });

        const onRealtimeState = (event) => {
            if (window.location.hash !== '#view-game-tuning-time') return;
            const tuning = event.detail?.lastFeature;
            if (!tuning || event.detail?.paused) return;

            if (!gameState.activeTarget || gameState.tunedNotes.has(gameState.activeTarget)) return;

            const target = gameState.activeTarget;
            const cents = Math.round(tuning.cents || 0);

            // Build continuous tuning physics
            let matchesTarget = false;
            if (tuning.note && tuning.note.replace(/\d+$/, '') === target.replace(/\d+$/, '')) {
                matchesTarget = true;
            }

            if (tuningEngine) {
                tuningEngine.updatePitch(cents, matchesTarget);
            }

            if (matchesTarget && Math.abs(cents) < 18) {
                gameState.tuningEnergy += 0.012; // fill up fluidly
                if (Math.abs(cents) < 5) gameState.tuningEnergy += 0.008; // fill faster near center
            } else if (tuning.hasSignal) {
                gameState.tuningEnergy -= 0.015; // Drain slowly
            }

            // Phase 14: Toggle Bioluminescent Mascot Class
            const container = document.getElementById('view-game-tuning-time');
            if (container) {
                if (gameState.tuningEnergy > 0.8) {
                    container.classList.add('in-tune');
                } else {
                    container.classList.remove('in-tune');
                }
            }

            // Clamp and render
            gameState.tuningEnergy = clamp(gameState.tuningEnergy, 0, 1.0);
            if (tuningEngine) tuningEngine.setEnergy(gameState.tuningEnergy);

            if (gameState.tuningEnergy >= 0.99) {
                // Success!
                tuningEngine.spawnSparkles(100);
                gameState.tunedNotes.add(target);
                gameState.activeTarget = null;
                gameState.tuningEnergy = 0;
                if (tuningEngine) {
                    tuningEngine.setTarget(null);
                    tuningEngine.setEnergy(0);
                }

                setTuningStatusText(statusEl, `Perfect! ${target} is tuned.`);
                markChecklist(checklistMap[target]);

                buttons.forEach((b) => {
                    if (b.dataset.tuningNote === target) {
                        b.classList.remove('is-active');
                        b.classList.add('is-tuned');
                        b.style.backgroundColor = 'var(--color-primary)';
                        b.style.color = '#fff';
                        b.style.transform = 'scale(1.0)';
                    }
                });

                cueBank.stopAll();

                if (!checkWinState()) {
                    // Find the next untuned string in standard order (G, D, A, E)
                    const order = ['G', 'D', 'A', 'E'];
                    const nextTarget = order.find(n => !gameState.tunedNotes.has(n));
                    if (nextTarget) {
                        setTimeout(() => {
                            const nextBtn = buttons.find(b => b.dataset.tuningNote === nextTarget);
                            if (nextBtn) {
                                nextBtn.dispatchEvent(new Event('click'));
                            }
                        }, 1000); // 1-second pause to celebrate before auto-advancing
                    }
                }
            } else if (matchesTarget) {
                // Not done, but close
                const direction = cents > 0 ? 'Too sharp' : 'Too flat';
                if (Math.abs(cents) > 18) {
                    setTuningStatusText(statusEl, `${direction} (${cents} cents). Adjust peg.`);
                } else {
                    setTuningStatusText(statusEl, `Hold it...`);
                }
            } else if (tuning.note && tuning.hasSignal) {
                setTuningStatusText(statusEl, `Hearing ${tuning.note}. Play ${target} loudly!`);
            }
        };

        document.addEventListener(RT_STATE, onRealtimeState);
        registerCleanup(() => {
            document.removeEventListener(RT_STATE, onRealtimeState);
        });

        buttons.forEach((button) => {
            bindTap(button, () => {
                const note = button.dataset.tuningNote;
                if (!note || gameState.tunedNotes.has(note)) return;

                if (!isSoundEnabled()) {
                    setTuningStatusText(statusEl, 'Sounds are off. Enable Sounds to hear the tone.');
                    return;
                }

                gameState.activeTarget = note;
                gameState.holdStart = 0;

                if (tuningEngine) {
                    tuningEngine.setTarget(note);
                    tuningEngine.setEnergy(0);
                }

                buttons.forEach(b => {
                    b.classList.remove('is-active');
                    b.style.transform = 'scale(1.0)';
                });
                button.classList.add('is-active');

                cueBank.play(note);
                setTuningStatusText(statusEl, formatTuningProgressMessage({
                    note,
                    tunedCount: gameState.tunedNotes.size,
                    targetStrings,
                }) + ` (Listening...)`);
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
