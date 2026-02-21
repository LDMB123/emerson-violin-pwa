import { createGame } from './game-shell.js';
import { createPlaybackRuntime } from './game-interactive-runtime.js';
import {
    markChecklist,
    markChecklistIf,
    bindTap,
    getTonePlayer,
    buildNoteSequence,
    bindSoundsChange,
    createStandardGameUpdate,
} from './shared.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { resetMelodyMakerTrackState } from './melody-maker-state.js';
import { playMelodyMakerSequence } from './melody-maker-playback.js';
import {
    setMelodyMakerStatus,
    renderMelodyMakerTrack,
    renderMelodyMakerScore,
    renderMelodyMakerTarget,
} from './melody-maker-view.js';
import { handleMelodyMakerNoteTap } from './melody-maker-track.js';

const updateMelodyMaker = createStandardGameUpdate({
    viewId: '#view-game-melody-maker',
    inputPrefix: 'mm-step-',
    scoreSelector: '[data-melody="score"]',
    scoreMultiplier: 30,
});

const { bind } = createGame({
    id: 'melody-maker',
    computeAccuracy: (state) => state._lengthTarget
        ? Math.min(1, (state._track?.length ?? 0) / state._lengthTarget) * 100
        : 0,
    onReset: (gameState) => {
        resetMelodyMakerTrackState(gameState);
        if (gameState._stopPlayback) gameState._stopPlayback();
        if (gameState._updateTrack) gameState._updateTrack();
        if (gameState._updateScore) gameState._updateScore();
        if (gameState._buildTarget) gameState._buildTarget();
        if (gameState._updateSoundState) gameState._updateSoundState();
        if (gameState._setStatus) gameState._setStatus('Tap notes to build a melody.');
        if (gameState._lengthTarget) {
            gameState._maxTrack = Math.max(gameState._lengthTarget + 2, 6);
        }
    },
    onBind: (stage, difficulty, { reportSession, gameState, registerCleanup }) => {
        const buttons = Array.from(stage.querySelectorAll('.melody-btn'));
        const trackEl = stage.querySelector('[data-melody="track"]');
        const scoreEl = stage.querySelector('[data-melody="score"]');
        const targetEl = stage.querySelector('[data-melody="target"]');
        const statusEl = stage.querySelector('[data-melody="status"]');
        const playButton = stage.querySelector('[data-melody="play"]');
        const playTargetButton = stage.querySelector('[data-melody="play-target"]');
        const clearButton = stage.querySelector('[data-melody="clear"]');
        // difficulty.speed: scales playback tempo; speed=1.0 keeps tempo=92 BPM (current behavior)
        // difficulty.complexity: adjusts lengthTarget; complexity=1 (medium) = 4 notes (current behavior)
        const complexityLengthTargets = [3, 4, 6];
        const lengthTarget = complexityLengthTargets[difficulty.complexity] ?? 4;
        const tempo = Math.round(92 * difficulty.speed);
        const notePool = buttons.map((button) => button.dataset.melodyNote).filter(Boolean);

        // Store ALL mutable state on gameState exclusively (no parallel local lets)
        gameState.score = 0;
        gameState._track = [];
        gameState._lengthTarget = lengthTarget;
        gameState._maxTrack = Math.max(lengthTarget + 2, 6);
        gameState._uniqueNotes = new Set();
        gameState._lastSequence = '';
        gameState._repeatMarked = false;
        gameState._matchCount = 0;
        gameState._targetMotif = ['G', 'A', 'B', 'C'];
        const playback = createPlaybackRuntime();
        gameState._isPlaying = playback.playing;

        const setStatus = (message) => {
            setMelodyMakerStatus(statusEl, message);
        };

        const updateTrack = () => {
            renderMelodyMakerTrack(trackEl, gameState._track);
        };

        const updateScore = () => {
            renderMelodyMakerScore(scoreEl, gameState.score);
        };

        const updateTarget = () => {
            renderMelodyMakerTarget(targetEl, gameState._targetMotif);
        };

        const buildTarget = () => {
            if (!notePool.length) return;
            gameState._targetMotif = buildNoteSequence(notePool, lengthTarget);
            gameState._matchCount = 0;
            updateTarget();
        };

        const stopPlayback = (message) => {
            playback.stop();
            gameState._isPlaying = playback.playing;
            if (message) setStatus(message);
        };

        gameState._onDeactivate = () => {
            if (!playback.playing) return;
            stopPlayback();
        };

        const updateSoundState = () => {
            const enabled = isSoundEnabled();
            if (playButton) playButton.disabled = !enabled;
            if (playTargetButton) playTargetButton.disabled = !enabled;
            if (!enabled) {
                setStatus('Sounds are off. You can still build melodies, but enable Sounds to hear them.');
            }
        };

        const playSequence = (notes, message) => playMelodyMakerSequence({
            notes,
            isSoundEnabled,
            setStatus,
            getPlayer: getTonePlayer,
            playback,
            tempo,
            setIsPlaying: (isPlaying) => {
                gameState._isPlaying = isPlaying;
            },
            startMessage: message,
            onComplete: () => {
                markChecklist('mm-step-4');
                reportSession();
            },
        });

        // Store helpers for onReset (closures that read exclusively from gameState)
        gameState._stopPlayback = stopPlayback;
        gameState._updateTrack = updateTrack;
        gameState._updateScore = updateScore;
        gameState._buildTarget = buildTarget;
        gameState._updateSoundState = updateSoundState;
        gameState._setStatus = setStatus;

        const playTapPreview = (note) => {
            if (!isSoundEnabled()) return;
            const player = getTonePlayer();
            if (!player) return;
            player.playNote(note, { duration: 0.3, volume: 0.2, type: 'triangle' }).catch(() => { });
        };

        buttons.forEach((button) => {
            bindTap(button, () => {
                const note = button.dataset.melodyNote;
                if (!note) return;
                handleMelodyMakerNoteTap({
                    note,
                    gameState,
                    playback,
                    stopPlayback,
                    playTapPreview,
                    updateTrack,
                    updateScore,
                    lengthTarget,
                    setStatus,
                    buildTarget,
                    reportSession,
                    markChecklist,
                    markChecklistIf,
                });
            });
        });

        bindTap(clearButton, () => {
            reportSession();
            resetMelodyMakerTrackState(gameState);
            stopPlayback();
            updateTrack();
            updateScore();
            buildTarget();
            setStatus('Melody cleared. Tap notes to build a new one.');
        });

        bindTap(playButton, () => {
            playSequence(gameState._track, 'Playing your melody\u2026');
        });

        bindTap(playTargetButton, () => {
            playSequence(gameState._targetMotif, 'Playing target motif\u2026');
        });

        const soundsHandler = (event) => {
            if (event.detail?.enabled === false) {
                stopPlayback('Sounds are off. Enable Sounds to play your melody.');
            } else if (event.detail?.enabled === true) {
                setStatus('Sounds on. Tap Play to hear your melody.');
            }
            updateSoundState();
        };
        bindSoundsChange(soundsHandler, registerCleanup);

        updateTrack();
        updateScore();
        buildTarget();
        updateSoundState();
        setStatus('Build a melody, then press Play.');
    },
});

export { updateMelodyMaker as update, bind };
