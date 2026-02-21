import { createGame } from './game-shell.js';
import {
    markChecklist,
    markChecklistIf,
    bindTap,
    playToneNote,
    stopTonePlayer,
    createStandardGameUpdate,
} from './shared.js';
import { RT_STATE } from '../utils/event-names.js';
import { deviationAccuracy } from '../utils/math.js';
import { computeScalePracticeTapResult } from './scale-practice-tap.js';
import { applyScalePracticeTempoUpdate } from './scale-practice-tempo.js';
import { ScalePracticeCanvasEngine } from './scale-practice-canvas.js';

const updateScalePractice = createStandardGameUpdate({
    viewId: '#view-game-scale-practice',
    inputPrefix: 'sp-step-',
    scoreSelector: '[data-scale="score"]',
    scoreMultiplier: 28,
});

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
        if (gameState._updateHighlight) gameState._updateHighlight();
    },
    onBind: (stage, difficulty, { reportSession, gameState, registerCleanup }) => {
        const slider = stage.querySelector('[data-scale="slider"]');
        const tempoEl = stage.querySelector('[data-scale="tempo"]');
        const statusEl = stage.querySelector('[data-scale="status"]');
        const scoreEl = stage.querySelector('[data-scale="score"]');
        const tapButton = stage.querySelector('[data-scale="tap"]');
        const ratingEl = stage.querySelector('[data-scale="rating"]');
        const noteEls = Array.from(stage.querySelectorAll('.scale-note'));
        const tempoTags = new Set();
        const scaleNotes = ['G', 'A', 'B', 'C', 'D', 'E', 'F#', 'G', 'F#', 'E', 'D', 'C', 'B', 'A', 'G'];

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

        // Initialize Canvas Engine
        let canvasEngine = null;
        const canvasEl = stage.querySelector('#scale-practice-canvas');
        if (canvasEl) {
            canvasEngine = new ScalePracticeCanvasEngine(canvasEl);
            canvasEngine.start();
        }

        gameState._updateHighlight = () => {
            const index = gameState.scaleIndex % scaleNotes.length;
            noteEls.forEach((el, i) => {
                el.classList.toggle('is-active', i === index);
            });
            if (canvasEngine) {
                canvasEngine.setActiveIndex(index);
            }

            // Phase 14: Scale Practice Live Progress Climber
            const mascot = stage.querySelector('.mascot-scale');
            if (mascot) {
                // The scale peaks at index 7 (High G) 
                const distanceFromStart = index <= 7 ? index : 14 - index;
                const elevationRatio = distanceFromStart / 7; // 0.0 to 1.0

                mascot.style.transform = `translateY(-${elevationRatio * 180}px) scale(${1 + elevationRatio * 0.3})`;

                if (index === 14 && gameState.score > 0) {
                    mascot.style.filter = 'drop-shadow(0 0 50px rgba(0,255,255,0.9)) brightness(1.3)';
                } else {
                    mascot.style.filter = '';
                }
            }
        };

        gameState._onDeactivate = () => {
            stopTonePlayer();
            if (canvasEngine) canvasEngine.stop();
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
            gameState._updateHighlight();
            updateTempo();
        });
        slider?.addEventListener('change', () => {
            const tempo = slider ? Number.parseInt(slider.value, 10) : 0;
            gameState.accuracy = deviationAccuracy(tempo, targetTempo);
            gameState.score = tempo;
            reportSession();
        });

        const triggerTap = () => {
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
                // Don't play synthesized note if triggered by mic
                // Let the trigger determine if it should play sound

                if (tapResult.shouldReport) {
                    reportSession();
                }
            }
            gameState.lastTap = now;
            gameState._updateHighlight();
        };

        bindTap(tapButton, () => {
            // For manual taps, we do want to hear the synthesized note
            const prevIndex = gameState.scaleIndex;
            triggerTap();
            if (gameState.scaleIndex !== prevIndex) {
                const noteToPlay = scaleNotes[gameState.scaleIndex === 0 ? scaleNotes.length - 1 : gameState.scaleIndex - 1];
                playToneNote(noteToPlay, { duration: 0.28, volume: 0.2, type: 'triangle' });
            }
        });

        let lastPlayedNote = null;

        const onRealtimeState = (event) => {
            if (window.location.hash !== '#view-game-scale-practice') return;
            const tuning = event.detail?.lastFeature;
            if (!tuning || event.detail?.paused) return;

            const targetNote = scaleNotes[gameState.scaleIndex];
            if (!targetNote) return;

            const cents = Math.round(tuning.cents || 0);
            const currentNote = tuning.note ? tuning.note.replace(/\d+$/, '') : null;

            if (!currentNote || Math.abs(cents) >= 20 || currentNote !== targetNote) {
                if (!currentNote) {
                    lastPlayedNote = null;
                }
                return;
            }

            if (lastPlayedNote === currentNote) {
                return; // Require them to stop playing before triggering the same note again (or if the target note changes to something else, it will reset because it won't match)
            }

            lastPlayedNote = currentNote;

            triggerTap(); // They played the correct note on the violin!
        };

        document.addEventListener(RT_STATE, onRealtimeState);
        registerCleanup(() => {
            document.removeEventListener(RT_STATE, onRealtimeState);
        });

        updateTempo();
        gameState._updateHighlight();

        registerCleanup(() => {
            if (canvasEngine) canvasEngine.destroy();
        });
    },
});

export { updateScalePractice as update, bind };
