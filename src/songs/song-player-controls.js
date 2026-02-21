import { SONG_SECTION_COMPLETED } from '../utils/event-names.js';
import { getSongCheckpoint, saveSongCheckpoint } from './song-progression.js';
import { parseViewSongId, sectionDuration, setStatus } from './song-player-view.js';
import { attachTuning } from '../games/shared.js';
import { RT_STATE } from '../utils/event-names.js';

export const applyControlsToView = ({ view, controls, song, sections }) => {
    const sectionSelect = controls.querySelector('[data-song-section]');
    const tempoScaleInput = controls.querySelector('[data-song-tempo-scale]');
    const tempoLabel = controls.querySelector('[data-song-tempo-label]');
    const loopToggle = controls.querySelector('[data-song-loop]');
    const waitToggle = controls.querySelector('[data-song-wait-for-me]');
    const saveButton = controls.querySelector('[data-song-save-checkpoint]');
    const resumeButton = controls.querySelector('[data-song-resume-checkpoint]');
    const playToggle = view.querySelector('.song-play-toggle');
    const songSheet = view.querySelector('.song-sheet');

    let isPlaying = false;
    let tuningActive = null;
    let playbackStartRealTime = 0;
    let playbackElapsed = 0;
    let lastAnimFrame = 0;
    let raqId = null;
    let currentNotePitch = null;
    let notesElements = [];
    let completedNotes = new Set();
    let isWaiting = false;

    const parseNotes = () => {
        notesElements = Array.from(view.querySelectorAll('.song-note')).map((el) => {
            const style = el.getAttribute('style') || '';
            const startMatch = style.match(/--note-start:\s*([\d.]+)s/);
            const durMatch = style.match(/--note-duration:\s*([\d.]+)s/);
            const pitchEl = el.querySelector('.song-note-pitch');
            return {
                el,
                pitch: pitchEl ? pitchEl.textContent.replace(/\d+$/, '').trim() : null,
                start: startMatch ? Number.parseFloat(startMatch[1]) : 0,
                duration: durMatch ? Number.parseFloat(durMatch[1]) : 0,
            };
        }).sort((a, b) => a.start - b.start);
    };

    const stopPlayback = () => {
        isPlaying = false;
        if (raqId) cancelAnimationFrame(raqId);
        raqId = null;
        if (tuningActive) {
            if (tuningActive.rtListener) {
                document.removeEventListener(RT_STATE, tuningActive.rtListener);
            }
            tuningActive.dispose();
        }
        tuningActive = null;
        if (songSheet) {
            songSheet.classList.remove('is-waiting');
            // Force reset of animations via triggering reflow on play toggle
        }
        isWaiting = false;
    };

    const triggerSectionComplete = (sectionId, tempo, effectiveDuration) => {
        document.dispatchEvent(new CustomEvent(SONG_SECTION_COMPLETED, {
            detail: {
                songId: parseViewSongId(view.id),
                sectionId,
                tempo,
                duration: effectiveDuration,
                timestamp: Date.now(),
            },
        }));

        if (view.dataset.songLoop === 'true') {
            playToggle.checked = false;
            playToggle.dispatchEvent(new Event('change', { bubbles: true }));
            requestAnimationFrame(() => {
                playToggle.checked = true;
                playToggle.dispatchEvent(new Event('change', { bubbles: true }));
            });
        } else {
            playToggle.checked = false;
            stopPlayback();
        }
    };

    const updateLoop = () => {
        if (!isPlaying || !playToggle?.checked) return;

        const now = performance.now();
        const delta = (now - lastAnimFrame) / 1000; // in seconds
        lastAnimFrame = now;

        const sectionId = view.dataset.songSectionId || (sections[0]?.id || 'full');
        const duration = sectionDuration(sections, sectionId);
        const tempo = Number(view.dataset.songTempo || song?.bpm || 80);
        const baseTempo = Number(song?.bpm || 80);
        const scale = baseTempo > 0 ? (baseTempo / Math.max(tempo, 1)) : 1;
        const effectiveDuration = Math.max(0.8, duration * scale);

        // If not waiting on a note, increment elapsed time
        if (!isWaiting) {
            playbackElapsed += delta;
        } else if (songSheet) {
            songSheet.style.setProperty('--song-playhead-paused-time', `${playbackElapsed}s`);
        }

        // Check if we hit the end
        if (playbackElapsed >= effectiveDuration) {
            triggerSectionComplete(sectionId, tempo, effectiveDuration);
            return;
        }

        // Feature: Wait For Me Mode
        if (waitToggle?.checked) {
            // Find the current note we are on based on internal elapsed time
            // Because CSS animations run at effectiveDuration, we need to map elapsed to unscaled time
            const unscaledElapsed = playbackElapsed / scale;

            // Find the first uncompleted note that we have reached in time
            const activeNote = notesElements.find((n) =>
                !completedNotes.has(n.el) && unscaledElapsed >= n.start && unscaledElapsed <= (n.start + n.duration)
            );

            if (activeNote) {
                // We hit a note! We must pause and wait for the pitch.
                if (!isWaiting) {
                    isWaiting = true;
                    if (songSheet) songSheet.classList.add('is-waiting');
                    currentNotePitch = activeNote.pitch;
                }
            } else if (isWaiting) {
                // If we are waiting, but the note was completed by tuning logic, resume.
                isWaiting = false;
                if (songSheet) songSheet.classList.remove('is-waiting');
            }
        }

        raqId = requestAnimationFrame(updateLoop);
    };

    const startPlayback = () => {
        stopPlayback();
        isPlaying = true;
        playbackElapsed = 0;
        lastAnimFrame = performance.now();
        playbackStartRealTime = Date.now();
        completedNotes.clear();
        isWaiting = false;

        if (songSheet) songSheet.classList.remove('is-waiting');
        parseNotes();

        if (waitToggle?.checked) {
            tuningActive = attachTuning('song-player', () => { });

            const onRealtimeState = (event) => {
                const tuning = event.detail?.lastFeature;
                if (!tuning || event.detail?.paused) return;

                if (!isPlaying || !isWaiting || !currentNotePitch) return;

                const cents = Math.round(tuning.cents || 0);

                if (tuning.note && tuning.note.replace(/\d+$/, '') === currentNotePitch.replace(/\d+$/, '')) {
                    if (Math.abs(cents) < 25) {
                        const activeNote = notesElements.find((n) => n.pitch === currentNotePitch && !completedNotes.has(n.el));
                        if (activeNote) {
                            completedNotes.add(activeNote.el);
                            isWaiting = false;
                            if (songSheet) songSheet.classList.remove('is-waiting');
                            currentNotePitch = null;
                            setStatus(controls, `Matched ${tuning.note}!`);
                        }
                    } else {
                        const direction = cents > 0 ? 'Too sharp' : 'Too flat';
                        setStatus(controls, `${direction} (${cents} cents). Adjust your peg.`);
                    }
                } else if (tuning.note) {
                    setStatus(controls, `Heard ${tuning.note}, listening for ${currentNotePitch}...`);
                }
            };

            document.addEventListener(RT_STATE, onRealtimeState);
            tuningActive.rtListener = onRealtimeState;
        }

        raqId = requestAnimationFrame(updateLoop);
    };

    const applySection = () => {
        const sectionId = sectionSelect?.value || (sections[0]?.id || 'full');
        view.dataset.songSectionId = sectionId;
        setStatus(controls, `Section ${sectionId} ready.`);
    };

    const applyTempo = () => {
        const percent = Number(tempoScaleInput?.value || 100);
        const normalized = Math.max(50, Math.min(130, Number.isFinite(percent) ? percent : 100));
        const baseTempo = Number(song?.bpm || 80);
        const tempo = Math.round((baseTempo * normalized) / 100);
        view.dataset.songTempo = String(tempo);
        if (tempoLabel) tempoLabel.textContent = `${normalized}%`;
    };

    const applyLoop = () => {
        view.dataset.songLoop = loopToggle?.checked ? 'true' : 'false';
    };

    sectionSelect?.addEventListener('change', () => {
        applySection();
        if (playToggle?.checked) {
            startPlayback();
        }
    });

    tempoScaleInput?.addEventListener('input', () => {
        applyTempo();
        if (playToggle?.checked) {
            startPlayback();
        }
    });

    loopToggle?.addEventListener('change', applyLoop);
    waitToggle?.addEventListener('change', () => {
        if (playToggle?.checked) {
            startPlayback();
        }
    });

    playToggle?.addEventListener('change', () => {
        if (playToggle.checked) {
            startPlayback();
        } else {
            stopPlayback();
        }
    });

    saveButton?.addEventListener('click', async () => {
        const songId = parseViewSongId(view.id);
        if (!songId) return;
        const elapsed = playbackStartRealTime ? ((Date.now() - playbackStartRealTime) / 1000) : 0;
        const tempo = Number(view.dataset.songTempo || song?.bpm || 80);
        await saveSongCheckpoint(songId, {
            sectionId: view.dataset.songSectionId || sections[0]?.id || 'full',
            elapsed,
            tempo,
        });
        setStatus(controls, 'Checkpoint saved.');
    });

    resumeButton?.addEventListener('click', async () => {
        const songId = parseViewSongId(view.id);
        if (!songId) return;
        const checkpoint = await getSongCheckpoint(songId);
        if (!checkpoint) {
            setStatus(controls, 'No checkpoint yet.');
            return;
        }

        if (sectionSelect && checkpoint.sectionId) {
            sectionSelect.value = checkpoint.sectionId;
        }
        if (Number.isFinite(checkpoint.tempo) && Number.isFinite(song?.bpm) && song.bpm > 0) {
            const percent = Math.round((checkpoint.tempo / song.bpm) * 100);
            if (tempoScaleInput) tempoScaleInput.value = String(Math.max(50, Math.min(130, percent)));
        }
        applySection();
        applyTempo();
        setStatus(controls, 'Checkpoint restored. Press Playhead to continue.');
    });

    applySection();
    applyTempo();
    applyLoop();
};
