import {
    readLiveNumber,
    setLiveNumber,
    markChecklist,
    markChecklistIf,
    setDifficultyBadge,
    recordGameEvent,
    attachTuning,
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

const bindMelodyMaker = () => {
    const stage = document.querySelector('#view-game-melody-maker');
    if (!stage) return;
    const buttons = Array.from(stage.querySelectorAll('.melody-btn'));
    const trackEl = stage.querySelector('[data-melody="track"]');
    const scoreEl = stage.querySelector('[data-melody="score"]');
    const targetEl = stage.querySelector('[data-melody="target"]');
    const statusEl = stage.querySelector('[data-melody="status"]');
    const playButton = stage.querySelector('[data-melody="play"]');
    const playTargetButton = stage.querySelector('[data-melody="play-target"]');
    const clearButton = stage.querySelector('[data-melody="clear"]');
    const track = [];
    let score = 0;
    let lastSequence = '';
    let repeatMarked = false;
    const uniqueNotes = new Set();
    let lengthTarget = 4;
    let maxTrack = 6;
    let tempo = 92;
    let reported = false;
    let targetMotif = ['G', 'A', 'B', 'C'];
    let matchCount = 0;
    let isPlaying = false;
    let playToken = 0;
    const notePool = buttons.map((button) => button.dataset.melodyNote).filter(Boolean);

    const setStatus = (message) => {
        if (statusEl) statusEl.textContent = message;
    };

    const updateTrack = () => {
        if (trackEl) trackEl.textContent = track.length ? track.join(' · ') : 'Tap notes to build a melody.';
    };

    const updateScore = () => {
        setLiveNumber(scoreEl, 'liveScore', score);
    };

    const updateTarget = () => {
        if (!targetEl) return;
        targetEl.textContent = `Target: ${targetMotif.join(' · ')}`;
    };

    const buildTarget = () => {
        if (!notePool.length) return;
        targetMotif = buildNoteSequence(notePool, lengthTarget);
        matchCount = 0;
        updateTarget();
    };

    const stopPlayback = (message) => {
        playToken += 1;
        isPlaying = false;
        stopTonePlayer();
        if (message) setStatus(message);
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
        const token = ++playToken;
        isPlaying = true;
        setStatus(message);
        const played = await player.playSequence(notes, {
            tempo,
            gap: 0.12,
            duration: 0.4,
            volume: 0.22,
            type: 'triangle',
        });
        if (token !== playToken || !played) return;
        isPlaying = false;
        setStatus('Nice! Try a new variation or hit Play again.');
        markChecklist('mm-step-4');
        reportSession();
    };

    const updateSoundState = () => {
        const enabled = isSoundEnabled();
        if (playButton) playButton.disabled = !enabled;
        if (playTargetButton) playTargetButton.disabled = !enabled;
        if (!enabled) {
            setStatus('Sounds are off. You can still build melodies, but enable Sounds to hear them.');
        }
    };

    const reportResult = attachTuning('melody-maker', (tuning) => {
        lengthTarget = tuning.lengthTarget ?? lengthTarget;
        tempo = tuning.tempo ?? tuning.melodyTempo ?? tempo;
        maxTrack = Math.max(lengthTarget + 2, 6);
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
        buildTarget();
        updateSoundState();
    });

    const reportSession = () => {
        if (reported || score <= 0) return;
        reported = true;
        const accuracy = lengthTarget ? Math.min(1, track.length / lengthTarget) * 100 : 0;
        reportResult({ accuracy, score });
        recordGameEvent('melody-maker', { accuracy, score });
    };

    const resetSession = (message = 'Tap notes to build a melody.') => {
        track.length = 0;
        score = 0;
        lastSequence = '';
        repeatMarked = false;
        uniqueNotes.clear();
        reported = false;
        matchCount = 0;
        stopPlayback();
        updateTrack();
        updateScore();
        buildTarget();
        setStatus(message);
    };

    buttons.forEach((button) => {
        bindTap(button, () => {
            const note = button.dataset.melodyNote;
            if (!note) return;
            if (isPlaying) {
                stopPlayback('Editing melody. Tap Play to hear it.');
            }
            track.push(note);
            if (track.length > maxTrack) track.shift();
            score += 20;
            uniqueNotes.add(note);
            if (isSoundEnabled()) {
                const player = getTonePlayer();
                if (player) {
                    player.playNote(note, { duration: 0.3, volume: 0.2, type: 'triangle' }).catch(() => {});
                }
            }
            updateTrack();
            updateScore();
            if (track.length >= lengthTarget) {
                markChecklist('mm-step-1');
                const currentSequence = track.slice(-lengthTarget).join('');
                if (lastSequence && currentSequence === lastSequence && !repeatMarked) {
                    repeatMarked = true;
                    markChecklist('mm-step-2');
                }
                lastSequence = currentSequence;
            }
            markChecklistIf(uniqueNotes.size >= 3, 'mm-step-3');

            if (track.length >= targetMotif.length) {
                const attempt = track.slice(-targetMotif.length).join('');
                const target = targetMotif.join('');
                if (attempt === target) {
                    matchCount += 1;
                    score += 50;
                    updateScore();
                    setStatus(`Target hit! ${matchCount} in a row.`);
                    if (matchCount >= 1) markChecklist('mm-step-1');
                    if (matchCount >= 2) markChecklist('mm-step-2');
                    if (matchCount >= 3) reportSession();
                    buildTarget();
                }
            }
        });
    });

    bindTap(clearButton, () => {
        reportSession();
        resetSession('Melody cleared. Tap notes to build a new one.');
    });

    bindTap(playButton, () => {
        playSequence(track, 'Playing your melody\u2026');
    });

    bindTap(playTargetButton, () => {
        playSequence(targetMotif, 'Playing target motif\u2026');
    });

    document.addEventListener(SOUNDS_CHANGE, (event) => {
        if (event.detail?.enabled === false) {
            stopPlayback('Sounds are off. Enable Sounds to play your melody.');
        } else if (event.detail?.enabled === true) {
            setStatus('Sounds on. Tap Play to hear your melody.');
        }
        updateSoundState();
    });

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#view-game-melody-maker') {
            resetSession();
            return;
        }
        stopPlayback();
        reportSession();
    }, { passive: true });

    updateTrack();
    updateScore();
    buildTarget();
    updateSoundState();
    setStatus('Build a melody, then press Play.');
};

export { updateMelodyMaker as update, bindMelodyMaker as bind };
