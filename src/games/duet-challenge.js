import { createGame } from './game-shell.js';
import { createPlaybackRuntime } from './game-interactive-runtime.js';
import { createAudioCueBank } from './game-audio-cues.js';
import {
    readLiveNumber,
    markChecklist,
    bindTap,
    playToneNote,
    playToneSequence,
    buildNoteSequence,
    updateScoreCombo,
    bindSoundsChange,
} from './shared.js';
import { isSoundEnabled } from '../utils/sound-state.js';
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

const updateDuetChallenge = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-duet-challenge input[id^="dc-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = document.querySelector('[data-duet="score"]');
    const comboEl = document.querySelector('[data-duet="combo"]');
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    const liveCombo = readLiveNumber(comboEl, 'liveCombo');
    if (scoreEl) scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : checked * 22);
    if (comboEl) {
        const combo = Number.isFinite(liveCombo) ? liveCombo : checked;
        comboEl.textContent = `x${combo}`;
    }
};

const { bind } = createGame({
    id: 'duet-challenge',
    computeAccuracy: (state) => state._sequence?.length
        ? (Math.max(0, state._sequence.length - (state._mistakes ?? 0)) / state._sequence.length) * 100
        : 0,
    onReset: (gameState) => {
        if (gameState._stopPartnerPlayback) gameState._stopPartnerPlayback();
        if (gameState._resetSession) gameState._resetSession();
    },
    onBind: (stage, difficulty, { reportSession, gameState, registerCleanup }) => {
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
        const duetSeqLength = duetSeqLengths[difficulty.complexity] ?? 4;
        const partnerNoteTimeout = Math.round(900 / difficulty.speed);
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
            if (playButton) playButton.disabled = !isSoundEnabled();
        };

        const stopPartnerAudio = () => {
            cueBank.stopAll();
            if (playButton) playButton.disabled = false;
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

        buttons.forEach((button) => {
            bindTap(button, () => {
                if (!ensureDuetChallengeReadyForTap({
                    isPartnerPlaying: partnerPlayback.playing,
                    active,
                    setPrompt,
                })) {
                    return;
                }
                const note = button.dataset.duetNote;
                if (note) {
                    playToneNote(note, { duration: 0.2, volume: 0.18, type: 'triangle' });
                }
                const turnResult = resolveDuetChallengeTapTurn({
                    note,
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
                    }
                } else {
                    mistakes = turnResult.mistakes;
                    gameState._mistakes = mistakes;
                    playToneNote('F', { duration: 0.16, volume: 0.12, type: 'sawtooth' });
                }
                updateScoreboard();
            });
        });

        const soundsHandler = (event) => {
            if (event.detail?.enabled === false) {
                stopPartnerPlayback({ stopTone: false });
            }
            updateSoundState();
        };
        bindSoundsChange(soundsHandler, registerCleanup);

        updateSoundState();
        setButtonsDisabled(true);
        buildSequence();
    },
});

export { updateDuetChallenge as update, bind };
