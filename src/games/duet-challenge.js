import { createGame } from './game-shell.js';
import { createPlaybackRuntime } from './game-interactive-runtime.js';
import { createAudioCueBank } from './game-audio-cues.js';
import { RT_STATE } from '../utils/event-names.js';
import {
    markChecklist,
    bindTap,
    playToneNote,
    playToneSequence,
    buildNoteSequence,
    updateScoreCombo,
    bindSoundsChange,
    bindDocumentEvent,
    createRealtimeFeatureStateHandler as createRealtimeStateHandler,
    createStandardGameUpdate,
} from './shared.js';
import { setDisabled as setControlDisabled } from '../utils/dom-utils.js';
import { isSoundEnabled, runIfSoundDisabled } from '../utils/sound-state.js';
import { playDuetPartnerSequence } from './duet-challenge-partner.js';
import {
    setDuetChallengePrompt,
    renderDuetChallengeSequence,
} from './duet-challenge-view.js';
import { resetDuetChallengeSession } from './duet-challenge-reset.js';
import {
    startDuetChallengeRound,
    ensureDuetChallengeReadyForTap,
} from './duet-challenge-round.js';
import { resolveDuetChallengeTapTurn } from './duet-challenge-input.js';
import { createDefaultTuningHitDetector } from '../utils/tuning-utils.js';

const updateDuetChallenge = createStandardGameUpdate({
    viewId: '#view-game-duet-challenge',
    inputPrefix: 'dc-step-',
    scoreSelector: '[data-duet="score"]',
    comboSelector: '[data-duet="combo"]',
    scoreMultiplier: 22,
});

const { bind } = createGame({
    id: 'duet-challenge',
    computeAccuracy: (state) => {
        if (!state._sequence?.length) return 0;
        const mistakes = state._mistakes ?? 0;
        return (Math.max(0, state._sequence.length - mistakes) / state._sequence.length) * 100;
    },
    onReset: (gameState) => {
        if (gameState._stopPartnerPlayback) gameState._stopPartnerPlayback();
        if (gameState._resetSession) gameState._resetSession();
    },
    onBind: (stage, difficultyProfile, { reportSession, registerCleanup, gameState }) => {
        const playButton = stage.querySelector('[data-duet="play"]');
        const buttons = Array.from(stage.querySelectorAll('.duet-btn'));
        const promptEl = stage.querySelector('[data-duet="prompt"]');
        const roundEl = stage.querySelector('[data-duet="round"]');
        const scoreEl = stage.querySelector('[data-duet="score"]');
        const comboEl = stage.querySelector('[data-duet="combo"]');
        const notesEl = stage.querySelector('.duet-notes');
        const cueBank = createAudioCueBank(
            Array.from(stage.querySelectorAll('[data-duet-audio]')).map((audio) => [audio.dataset.duetAudio, audio])
        );
        const notePool = ['G', 'D', 'A', 'E'];
        let sequence = ['G', 'D', 'A', 'E'];
        // difficulty.speed: scales partner playback timeout; speed=1.0 = 900ms per note (current behavior)
        // difficulty.complexity: adjusts sequence length; complexity=1 (medium) = length 4 (current behavior)
        const duetSeqLengths = [3, 4, 5];
        const duetSeqLength = duetSeqLengths[difficultyProfile.complexity] ?? 4;
        const partnerNoteTimeout = Math.round(900 / difficultyProfile.speed);
        let seqIndex = 0;
        let combo = 0;
        let score = 0;
        let active = false;
        const comboTarget = 3;
        let round = 1;
        let mistakes = 0;

        // Initialize gameState
        gameState.score = 0;
        gameState._sequence = sequence;
        gameState._mistakes = 0;

        const updateScoreboard = () => updateScoreCombo(scoreEl, comboEl, score, combo);

        const buildSequence = () => {
            sequence = buildNoteSequence(notePool, duetSeqLength);
            gameState._sequence = sequence;
            renderDuetChallengeSequence({
                notesEl,
                roundEl,
                sequence,
                round,
            });
            seqIndex = 0;
            mistakes = 0;
            gameState._mistakes = 0;
        };

        const updateSoundState = () => {
            setControlDisabled(playButton, !isSoundEnabled());
        };

        const stopPartnerAudio = () => {
            cueBank.stopAll();
            setControlDisabled(playButton, false);
        };
        const partnerPlayback = createPlaybackRuntime({
            onStop: stopPartnerAudio,
            stopToneOnStop: false,
        });

        const stopPartnerPlayback = ({ stopTone = false } = {}) => {
            partnerPlayback.stop({ stopTone });
        };

        const setPrompt = (message) => {
            setDuetChallengePrompt(promptEl, message);
        };

        const playPartnerSequence = () => playDuetPartnerSequence({
            partnerPlayback,
            isSoundEnabled,
            setPrompt,
            playButton,
            sequence,
            cueBank,
            partnerNoteTimeout,
        });

        const setButtonsDisabled = (disabled) => {
            buttons.forEach((button) => {
                button.disabled = disabled;
            });
        };

        gameState._onDeactivate = () => {
            active = false;
            stopPartnerPlayback({ stopTone: true });
            setButtonsDisabled(true);
        };

        const doResetSession = () => {
            resetDuetChallengeSession({
                resetState: () => {
                    combo = 0;
                    score = 0;
                    seqIndex = 0;
                    active = false;
                    round = 1;
                    mistakes = 0;
                },
                resetGameState: () => {
                    gameState.score = 0;
                    gameState._mistakes = 0;
                },
                stopPartnerPlayback,
                updateScoreboard,
                buildSequence,
                setPrompt,
                setButtonsDisabled,
            });
        };

        // Store helpers for onReset
        gameState._stopPartnerPlayback = stopPartnerPlayback;
        gameState._resetSession = doResetSession;

        bindTap(playButton, () => {
            startDuetChallengeRound({
                isSoundEnabled,
                setPrompt,
                setActive: (nextActive) => {
                    active = nextActive;
                },
                buildSequence,
                getSequence: () => sequence,
                setButtonsDisabled,
                playPartnerSequence,
                markChecklist,
            });
        });

        const handleTurn = (targetNote) => {
            const turnResult = resolveDuetChallengeTapTurn({
                note: targetNote,
                sequence,
                seqIndex,
                combo,
                score,
                comboTarget,
                round,
                mistakes,
            });
            combo = turnResult.combo;
            seqIndex = turnResult.seqIndex;
            setPrompt(turnResult.prompt);
            if (turnResult.matched) {
                score = turnResult.score;
                round = turnResult.round;
                gameState.score = score;
                if (turnResult.markStep2) markChecklist('dc-step-2');
                if (turnResult.markStep3) markChecklist('dc-step-3');
                if (turnResult.completedRound) {
                    active = false;
                    if (turnResult.markStep4) markChecklist('dc-step-4');
                    playToneSequence(sequence, { tempo: 160, gap: 0.1, duration: 0.18, volume: 0.16, type: 'violin' });
                    reportSession();
                } else {
                    playToneNote(targetNote, { duration: 0.2, volume: 0.18, type: 'triangle' });
                }
            } else {
                mistakes = turnResult.mistakes;
                gameState._mistakes = mistakes;
                playToneNote('F', { duration: 0.16, volume: 0.12, type: 'sawtooth' });
            }
            updateScoreboard();
        };
        const canAcceptInput = (setPromptHandler) => ensureDuetChallengeReadyForTap({
            isPartnerPlaying: partnerPlayback.playing,
            active,
            setPrompt: setPromptHandler,
        });

        const bindDuetButton = (button) => {
            bindTap(button, () => {
                if (!canAcceptInput(setPrompt)) {
                    return;
                }
                const note = button.dataset.duetNote;
                if (note) handleTurn(note);
            });
        };
        buttons.forEach(bindDuetButton);

        const hitDetector = createDefaultTuningHitDetector();

        const onRealtimeState = createRealtimeStateHandler('duet-challenge', (tuning) => {
            if (!canAcceptInput(() => { })) {
                hitDetector.reset();
                return;
            }

            const targetNote = sequence[seqIndex];
            if (!targetNote) return;

            const detectedHit = hitDetector.detectHit(tuning, targetNote);
            if (detectedHit === false) {
                return;
            }

            // Hit verified!
            handleTurn(targetNote);
        });

        bindDocumentEvent(RT_STATE, onRealtimeState, registerCleanup);

        bindSoundsChange((event) => {
            runIfSoundDisabled(event, () => {
                stopPartnerPlayback({ stopTone: false });
            });
            updateSoundState();
        }, registerCleanup);

        updateSoundState();
        setButtonsDisabled(true);
        buildSequence();
    },
});

export { updateDuetChallenge as update, bind };
