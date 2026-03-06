import { SONG_SECTION_COMPLETED, RT_STATE, emitEvent } from '../utils/event-names.js';
import { clamp, percentageRounded } from '../utils/math.js';
import { getSongCheckpoint, saveSongCheckpoint } from './song-progression.js';
import { parseViewSongId, sectionDuration, setStatus } from './song-player-view.js';
import { attachTuning, playToneNote } from '../games/shared.js';
import { getActiveTuningFeature, roundTuningCents } from '../utils/tuning-utils.js';
import { createVisibilityListener } from '../utils/lifecycle-utils.js';

const PLAYHEAD_AUTOSCROLL_INTERVAL_MS = 80;
const PLAYHEAD_AUTOSCROLL_DELTA_PX = 4;

const stripPitchOctave = (pitch) => String(pitch || '').replace(/\d+$/, '');

const isNoteActiveAtElapsed = (note, elapsed) => (
    elapsed >= note.start && elapsed <= (note.start + note.duration)
);

const isPendingActiveNote = (note, seenSet, elapsed) => (
    !seenSet.has(note.el) && isNoteActiveAtElapsed(note, elapsed)
);

const findPendingActiveNote = (notes, seenSet, elapsed) => (
    notes.find((note) => isPendingActiveNote(note, seenSet, elapsed))
);

const listPendingActiveNotes = (notes, seenSet, elapsed) => {
    const pending = [];
    for (const note of notes) {
        if (isPendingActiveNote(note, seenSet, elapsed)) {
            pending.push(note);
        }
    }
    return pending;
};

const querySongPlayerElements = (view, controls) => ({
    sectionSelect: controls.querySelector('[data-song-section]'),
    tempoScaleInput: controls.querySelector('[data-song-tempo-scale]'),
    tempoLabel: controls.querySelector('[data-song-tempo-label]'),
    loopToggle: controls.querySelector('[data-song-loop]'),
    waitToggle: controls.querySelector('[data-song-wait-for-me]'),
    playMelodyToggle: controls.querySelector('[data-song-play-melody]'),
    metronomeToggle: controls.querySelector('[data-song-metronome]'),
    saveButton: controls.querySelector('[data-song-save-checkpoint]'),
    resumeButton: controls.querySelector('[data-song-resume-checkpoint]'),
    playToggle: view.querySelector('.song-play-toggle'),
    songSheet: view.querySelector('.song-sheet'),
});

const createPlaybackState = (song, sections) => ({
    isPlaying: false,
    tuningActive: null,
    playbackElapsed: 0,
    lastAnimFrame: 0,
    raqId: null,
    currentNotePitch: null,
    notesElements: [],
    playheadEl: null,
    completedNotes: new Set(),
    audioTriggers: new Set(),
    isWaiting: false,
    lastMetronomeBeat: -1,
    lastAutoScrollAt: 0,
    lastAutoScrollTarget: 0,
    beatsPerMeasure: song?.time ? parseInt(song.time.split('/')[0], 10) || 4 : 4,
    defaultSectionId: sections[0]?.id || 'full',
});

/**
 * Applies playback, looping, checkpoint, and tuning controls to a song view.
 */
export const applyControlsToView = ({ view, controls, song, sections }) => {
    const elements = querySongPlayerElements(view, controls);
    const state = createPlaybackState(song, sections);

    const getActiveSectionId = () => view.dataset.songSectionId || state.defaultSectionId;
    const getActiveTempo = () => Number(view.dataset.songTempo || song?.bpm || 80);
    const getEffectiveDuration = () => {
        const sectionId = getActiveSectionId();
        const duration = sectionDuration(sections, sectionId);
        const tempo = getActiveTempo();
        const baseTempo = Number(song?.bpm || 80);
        const scale = baseTempo > 0 ? (baseTempo / Math.max(tempo, 1)) : 1;
        return {
            sectionId,
            tempo,
            scale,
            effectiveDuration: Math.max(0.8, duration * scale),
        };
    };

    const setWaitingState = (waiting) => {
        state.isWaiting = waiting;
        if (elements.songSheet) {
            elements.songSheet.classList.toggle('is-waiting', waiting);
        }
    };

    const disposeTuning = () => {
        if (!state.tuningActive) return;
        if (state.tuningActive.rtListener) {
            document.removeEventListener(RT_STATE, state.tuningActive.rtListener);
        }
        state.tuningActive.dispose();
        state.tuningActive = null;
    };

    const resetPlaybackState = () => {
        state.playheadEl = null;
        state.lastAutoScrollAt = 0;
        state.lastAutoScrollTarget = 0;
        state.lastMetronomeBeat = -1;
        state.currentNotePitch = null;
        setWaitingState(false);
    };

    const scheduleUpdateLoop = () => {
        if (state.raqId) cancelAnimationFrame(state.raqId);
        state.raqId = requestAnimationFrame(updateLoop);
    };

    const onVisibilityChange = () => {
        if (!state.isPlaying || !elements.playToggle?.checked) return;

        if (document.visibilityState === 'hidden') {
            if (state.raqId) cancelAnimationFrame(state.raqId);
            state.raqId = null;
            return;
        }

        if (!state.raqId) {
            state.lastAnimFrame = performance.now();
            scheduleUpdateLoop();
        }
    };
    const visibilityListener = createVisibilityListener(onVisibilityChange);

    const parseNotes = () => {
        state.notesElements = Array.from(view.querySelectorAll('.song-note')).map((el) => {
            const style = el.getAttribute('style') || '';
            const startMatch = style.match(/--note-start:\s*([\d.]+)s/);
            const durMatch = style.match(/--note-duration:\s*([\d.]+)s/);
            const pitchEl = el.querySelector('.song-note-pitch');
            return {
                el,
                pitch: pitchEl ? pitchEl.textContent.trim() : null,
                start: startMatch ? Number.parseFloat(startMatch[1]) : 0,
                duration: durMatch ? Number.parseFloat(durMatch[1]) : 0,
            };
        }).sort((a, b) => a.start - b.start);
        state.playheadEl = elements.songSheet?.querySelector('.song-playhead') || null;
    };

    const stopPlayback = () => {
        state.isPlaying = false;
        if (state.raqId) cancelAnimationFrame(state.raqId);
        state.raqId = null;
        visibilityListener.unbind();
        disposeTuning();
        resetPlaybackState();
    };

    const updateAutoScroll = (now) => {
        if (!elements.songSheet || !state.playheadEl) return;
        if (now - state.lastAutoScrollAt < PLAYHEAD_AUTOSCROLL_INTERVAL_MS) return;
        state.lastAutoScrollAt = now;

        const playheadRect = state.playheadEl.getBoundingClientRect();
        const containerRect = elements.songSheet.getBoundingClientRect();
        const relativeX = playheadRect.left - containerRect.left + elements.songSheet.scrollLeft;
        const viewWidth = elements.songSheet.clientWidth;
        if (viewWidth <= 0) return;

        const nextTarget = relativeX > viewWidth * 0.5
            ? relativeX - (viewWidth * 0.5)
            : 0;

        if (Math.abs(nextTarget - state.lastAutoScrollTarget) < PLAYHEAD_AUTOSCROLL_DELTA_PX) return;
        state.lastAutoScrollTarget = nextTarget;

        if (Math.abs(elements.songSheet.scrollLeft - nextTarget) < PLAYHEAD_AUTOSCROLL_DELTA_PX) return;
        elements.songSheet.scrollLeft = nextTarget;
    };

    const triggerSectionComplete = (sectionId, tempo, effectiveDuration) => {
        emitEvent(SONG_SECTION_COMPLETED, {
            songId: parseViewSongId(view.id),
            sectionId,
            tempo,
            duration: effectiveDuration,
            timestamp: Date.now(),
        });

        if (view.dataset.songLoop === 'true') {
            // Restart directly — avoids toggle-flipping which would
            // trigger legacy song-progress.js handlers and cause audio gaps.
            startPlayback();
        } else {
            elements.playToggle.checked = false;
            elements.playToggle.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };

    const completeWaitForMeNote = (tuningNote) => {
        const activeNote = state.notesElements.find((note) => (
            note.pitch === state.currentNotePitch && !state.completedNotes.has(note.el)
        ));
        if (!activeNote) return;

        state.completedNotes.add(activeNote.el);
        setWaitingState(false);
        state.currentNotePitch = null;
        setStatus(controls, `Matched ${tuningNote}!`);
    };

    const handleWaitForMeTuning = (tuning) => {
        if (!tuning || !state.isPlaying || !state.isWaiting || !state.currentNotePitch) return;
        if (!tuning.note) return;

        const cents = roundTuningCents(tuning);
        if (stripPitchOctave(tuning.note) === stripPitchOctave(state.currentNotePitch)) {
            if (Math.abs(cents) < 25) {
                completeWaitForMeNote(tuning.note);
            } else {
                const direction = cents > 0 ? 'Too sharp' : 'Too flat';
                setStatus(controls, `${direction} (${cents} cents). Adjust your peg.`);
            }
            return;
        }

        setStatus(controls, `Heard ${tuning.note}, listening for ${state.currentNotePitch}...`);
    };

    const bindWaitForMeTuning = () => {
        if (!elements.waitToggle?.checked) return;

        state.tuningActive = attachTuning('song-player', () => { });
        const onRealtimeState = (event) => {
            handleWaitForMeTuning(getActiveTuningFeature(event));
        };
        document.addEventListener(RT_STATE, onRealtimeState);
        state.tuningActive.rtListener = onRealtimeState;
    };

    const advancePlayback = (delta) => {
        if (!state.isWaiting) {
            state.playbackElapsed += delta;
            return;
        }
        if (elements.songSheet) {
            elements.songSheet.style.setProperty('--song-playhead-paused-time', `${state.playbackElapsed}s`);
        }
    };

    const updateMetronome = (tempo) => {
        if (!elements.metronomeToggle?.checked) return;

        const beatInterval = 60 / tempo;
        const currentBeat = Math.floor(state.playbackElapsed / beatInterval);
        if (currentBeat <= state.lastMetronomeBeat) return;

        state.lastMetronomeBeat = currentBeat;
        const isDownbeat = currentBeat % state.beatsPerMeasure === 0;
        playToneNote(isDownbeat ? 'C6' : 'G5', {
            duration: 0.05,
            volume: isDownbeat ? 0.3 : 0.15,
            type: 'square',
        });
    };

    const updateWaitForMeMode = (unscaledElapsed) => {
        const activeNote = findPendingActiveNote(state.notesElements, state.completedNotes, unscaledElapsed);
        if (activeNote) {
            if (!state.isWaiting) {
                setWaitingState(true);
                state.currentNotePitch = activeNote.pitch;
            }
            return;
        }

        if (state.isWaiting) {
            setWaitingState(false);
        }
    };

    const updatePlayMelodyMode = (unscaledElapsed, scale) => {
        const activeNotesToPlay = listPendingActiveNotes(state.notesElements, state.audioTriggers, unscaledElapsed);
        activeNotesToPlay.forEach((note) => {
            state.audioTriggers.add(note.el);
            if (note.pitch && note.pitch !== 'REST') {
                playToneNote(note.pitch, {
                    duration: note.duration * scale,
                    volume: 0.4,
                    type: 'violin',
                });
            }
        });
    };

    const updatePlaybackAssist = (scale) => {
        const unscaledElapsed = state.playbackElapsed / scale;
        if (elements.waitToggle?.checked) {
            updateWaitForMeMode(unscaledElapsed);
            return;
        }
        if (elements.playMelodyToggle?.checked) {
            updatePlayMelodyMode(unscaledElapsed, scale);
        }
    };

    const updateLoop = () => {
        state.raqId = null;
        if (!state.isPlaying || !elements.playToggle?.checked) return;
        if (document.visibilityState === 'hidden') return;

        const now = performance.now();
        const delta = (now - state.lastAnimFrame) / 1000; // in seconds
        state.lastAnimFrame = now;

        const { sectionId, tempo, scale, effectiveDuration } = getEffectiveDuration();

        advancePlayback(delta);

        // Throttle layout reads/writes to reduce main-thread work during playback.
        updateAutoScroll(now);

        // Check if we hit the end
        if (state.playbackElapsed >= effectiveDuration) {
            triggerSectionComplete(sectionId, tempo, effectiveDuration);
            return;
        }

        updateMetronome(tempo);
        updatePlaybackAssist(scale);

        scheduleUpdateLoop();
    };

    const startPlayback = () => {
        stopPlayback();
        state.isPlaying = true;
        state.playbackElapsed = 0;
        state.lastAnimFrame = performance.now();
        visibilityListener.bind();
        state.completedNotes.clear();
        state.audioTriggers.clear();
        resetPlaybackState();
        state.lastAutoScrollTarget = elements.songSheet ? elements.songSheet.scrollLeft : 0;
        parseNotes();
        bindWaitForMeTuning();
        scheduleUpdateLoop();
    };

    const applySection = () => {
        const sectionId = elements.sectionSelect?.value || state.defaultSectionId;
        view.dataset.songSectionId = sectionId;
        setStatus(controls, `Section ${sectionId} ready.`);
    };

    const applyTempo = () => {
        const percent = Number(elements.tempoScaleInput?.value || 100);
        const normalized = clamp(Number.isFinite(percent) ? percent : 100, 50, 130);
        const baseTempo = Number(song?.bpm || 80);
        const tempo = Math.round((baseTempo * normalized) / 100);
        view.dataset.songTempo = String(tempo);
        if (elements.tempoLabel) elements.tempoLabel.textContent = `${normalized}%`;
    };

    const applyLoop = () => {
        view.dataset.songLoop = elements.loopToggle?.checked ? 'true' : 'false';
    };

    const restoreCheckpointInputs = (checkpoint) => {
        if (elements.sectionSelect && checkpoint.sectionId) {
            elements.sectionSelect.value = checkpoint.sectionId;
        }
        if (Number.isFinite(checkpoint.tempo) && Number.isFinite(song?.bpm) && song.bpm > 0) {
            const percent = percentageRounded(checkpoint.tempo, song.bpm);
            if (elements.tempoScaleInput) {
                elements.tempoScaleInput.value = String(clamp(percent, 50, 130));
            }
        }
    };

    const saveCheckpointForSong = async (songId) => {
        await saveSongCheckpoint(songId, {
            sectionId: getActiveSectionId(),
            elapsed: state.playbackElapsed,
            tempo: getActiveTempo(),
        });
        setStatus(controls, 'Checkpoint saved.');
    };

    const restoreCheckpointForSong = async (songId) => {
        const checkpoint = await getSongCheckpoint(songId);
        if (!checkpoint) {
            setStatus(controls, 'No checkpoint yet.');
            return;
        }

        restoreCheckpointInputs(checkpoint);
        applySection();
        applyTempo();
        setStatus(controls, 'Checkpoint restored. Press Playhead to continue.');
    };

    const withSongId = (handler) => async () => {
        const songId = parseViewSongId(view.id);
        if (!songId) return;
        await handler(songId);
    };

    const restartPlaybackIfActive = () => {
        if (elements.playToggle?.checked) {
            startPlayback();
        }
    };

    const bindRestartingControl = (element, eventName, applyChange = () => {}) => {
        element?.addEventListener(eventName, () => {
            applyChange();
            restartPlaybackIfActive();
        });
    };

    const syncPlaybackFromToggle = () => {
        if (elements.playToggle?.checked) {
            startPlayback();
            return;
        }
        stopPlayback();
    };

    const bindPlaybackOptionListeners = () => {
        bindRestartingControl(elements.sectionSelect, 'change', applySection);
        bindRestartingControl(elements.tempoScaleInput, 'input', applyTempo);
        elements.loopToggle?.addEventListener('change', applyLoop);
        bindRestartingControl(elements.waitToggle, 'change');
    };

    const bindActionListeners = () => {
        elements.playToggle?.addEventListener('change', syncPlaybackFromToggle);

        elements.saveButton?.addEventListener('click', withSongId(saveCheckpointForSong));
        elements.resumeButton?.addEventListener('click', withSongId(restoreCheckpointForSong));
    };

    const initializeControlState = () => {
        applySection();
        applyTempo();
        applyLoop();
    };

    bindPlaybackOptionListeners();
    bindActionListeners();

    initializeControlState();
};
