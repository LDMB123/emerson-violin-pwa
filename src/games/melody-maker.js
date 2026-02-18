import { createGame } from './game-shell.js';
import {
    readLiveNumber,
    setLiveNumber,
    markChecklist,
    markChecklistIf,
    bindTap,
    getTonePlayer,
    stopTonePlayer,
    buildNoteSequence,
} from './shared.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { SOUNDS_CHANGE } from '../utils/event-names.js';

const updateMelodyMaker = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-melody-maker input[id^="mm-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = document.querySelector('[data-melody="score"]');
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    if (scoreEl) scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : checked * 30);
};

let _soundsHandler = null;

const { bind } = createGame({
    id: 'melody-maker',
    computeAccuracy: (state) => state._lengthTarget
        ? Math.min(1, (state._track?.length ?? 0) / state._lengthTarget) * 100
        : 0,
    onReset: (gameState) => {
        if (gameState._track) gameState._track.length = 0;
        gameState.score = 0;
        gameState._lastSequence = '';
        gameState._repeatMarked = false;
        gameState._matchCount = 0;
        if (gameState._uniqueNotes) gameState._uniqueNotes.clear();
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
    onBind: (stage, difficulty, { reportSession, gameState }) => {
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
        gameState._isPlaying = false;
        gameState._playToken = 0;

        const setStatus = (message) => {
            if (statusEl) statusEl.textContent = message;
        };

        const updateTrack = () => {
            if (trackEl) trackEl.textContent = gameState._track.length ? gameState._track.join(' · ') : 'Tap notes to build a melody.';
        };

        const updateScore = () => {
            setLiveNumber(scoreEl, 'liveScore', gameState.score);
        };

        const updateTarget = () => {
            if (!targetEl) return;
            targetEl.textContent = `Target: ${gameState._targetMotif.join(' · ')}`;
        };

        const buildTarget = () => {
            if (!notePool.length) return;
            gameState._targetMotif = buildNoteSequence(notePool, lengthTarget);
            gameState._matchCount = 0;
            updateTarget();
        };

        const stopPlayback = (message) => {
            gameState._playToken += 1;
            gameState._isPlaying = false;
            stopTonePlayer();
            if (message) setStatus(message);
        };

        const updateSoundState = () => {
            const enabled = isSoundEnabled();
            if (playButton) playButton.disabled = !enabled;
            if (playTargetButton) playTargetButton.disabled = !enabled;
            if (!enabled) {
                setStatus('Sounds are off. You can still build melodies, but enable Sounds to hear them.');
            }
        };

        const playSequence = async (notes, message) => {
            if (!notes.length) {
                setStatus('Add notes to hear your melody.');
                return;
            }
            if (!isSoundEnabled()) {
                setStatus('Sounds are off. Enable Sounds to play.');
                return;
            }
            const player = getTonePlayer();
            if (!player) {
                setStatus('Audio is unavailable on this device.');
                return;
            }
            const token = ++gameState._playToken;
            gameState._isPlaying = true;
            setStatus(message);
            const played = await player.playSequence(notes, {
                tempo,
                gap: 0.12,
                duration: 0.4,
                volume: 0.22,
                type: 'triangle',
            });
            if (token !== gameState._playToken || !played) return;
            gameState._isPlaying = false;
            setStatus('Nice! Try a new variation or hit Play again.');
            markChecklist('mm-step-4');
            reportSession();
        };

        // Store helpers for onReset (closures that read exclusively from gameState)
        gameState._stopPlayback = stopPlayback;
        gameState._updateTrack = updateTrack;
        gameState._updateScore = updateScore;
        gameState._buildTarget = buildTarget;
        gameState._updateSoundState = updateSoundState;
        gameState._setStatus = setStatus;

        buttons.forEach((button) => {
            bindTap(button, () => {
                const note = button.dataset.melodyNote;
                if (!note) return;
                if (gameState._isPlaying) {
                    stopPlayback('Editing melody. Tap Play to hear it.');
                }
                gameState._track.push(note);
                if (gameState._track.length > gameState._maxTrack) gameState._track.shift();
                gameState.score += 20;
                gameState._uniqueNotes.add(note);
                if (isSoundEnabled()) {
                    const player = getTonePlayer();
                    if (player) {
                        player.playNote(note, { duration: 0.3, volume: 0.2, type: 'triangle' }).catch(() => {});
                    }
                }
                updateTrack();
                updateScore();
                if (gameState._track.length >= lengthTarget) {
                    markChecklist('mm-step-1');
                    const currentSequence = gameState._track.slice(-lengthTarget).join('');
                    if (gameState._lastSequence && currentSequence === gameState._lastSequence && !gameState._repeatMarked) {
                        gameState._repeatMarked = true;
                        markChecklist('mm-step-2');
                    }
                    gameState._lastSequence = currentSequence;
                }
                markChecklistIf(gameState._uniqueNotes.size >= 3, 'mm-step-3');

                if (gameState._track.length >= gameState._targetMotif.length) {
                    const attempt = gameState._track.slice(-gameState._targetMotif.length).join('');
                    const target = gameState._targetMotif.join('');
                    if (attempt === target) {
                        gameState._matchCount += 1;
                        gameState.score += 50;
                        updateScore();
                        setStatus(`Target hit! ${gameState._matchCount} in a row.`);
                        if (gameState._matchCount >= 1) markChecklist('mm-step-1');
                        if (gameState._matchCount >= 2) markChecklist('mm-step-2');
                        if (gameState._matchCount >= 3) reportSession();
                        buildTarget();
                    }
                }
            });
        });

        bindTap(clearButton, () => {
            reportSession();
            gameState._track.length = 0;
            gameState.score = 0;
            gameState._lastSequence = '';
            gameState._repeatMarked = false;
            gameState._uniqueNotes.clear();
            gameState._matchCount = 0;
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
        if (_soundsHandler) {
            document.removeEventListener(SOUNDS_CHANGE, _soundsHandler);
        }
        _soundsHandler = soundsHandler;
        document.addEventListener(SOUNDS_CHANGE, soundsHandler);

        updateTrack();
        updateScore();
        buildTarget();
        updateSoundState();
        setStatus('Build a melody, then press Play.');
    },
});

export { updateMelodyMaker as update, bind };
