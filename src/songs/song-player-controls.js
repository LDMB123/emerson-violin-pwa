import { SONG_SECTION_COMPLETED } from '../utils/event-names.js';
import { getSongCheckpoint, saveSongCheckpoint } from './song-progression.js';
import { parseViewSongId, sectionDuration, setStatus } from './song-player-view.js';

export const applyControlsToView = ({ view, controls, song, sections }) => {
    const sectionSelect = controls.querySelector('[data-song-section]');
    const tempoScaleInput = controls.querySelector('[data-song-tempo-scale]');
    const tempoLabel = controls.querySelector('[data-song-tempo-label]');
    const loopToggle = controls.querySelector('[data-song-loop]');
    const saveButton = controls.querySelector('[data-song-save-checkpoint]');
    const resumeButton = controls.querySelector('[data-song-resume-checkpoint]');
    const playToggle = view.querySelector('.song-play-toggle');

    let playbackStart = 0;
    let sectionTimer = null;

    const clearSectionTimer = () => {
        if (sectionTimer) {
            clearTimeout(sectionTimer);
            sectionTimer = null;
        }
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

    const scheduleSectionComplete = () => {
        clearSectionTimer();
        const sectionId = view.dataset.songSectionId || (sections[0]?.id || 'full');
        const duration = sectionDuration(sections, sectionId);
        const tempo = Number(view.dataset.songTempo || song?.bpm || 80);
        const baseTempo = Number(song?.bpm || 80);
        const scale = baseTempo > 0 ? (baseTempo / Math.max(tempo, 1)) : 1;
        const effectiveDuration = Math.max(0.8, duration * scale);

        if (!effectiveDuration || !playToggle?.checked) return;
        playbackStart = Date.now();

        sectionTimer = window.setTimeout(() => {
            if (!playToggle?.checked) return;
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
            }
        }, effectiveDuration * 1000);
    };

    sectionSelect?.addEventListener('change', () => {
        applySection();
        if (playToggle?.checked) {
            scheduleSectionComplete();
        }
    });

    tempoScaleInput?.addEventListener('input', () => {
        applyTempo();
        if (playToggle?.checked) {
            scheduleSectionComplete();
        }
    });

    loopToggle?.addEventListener('change', applyLoop);

    playToggle?.addEventListener('change', () => {
        if (playToggle.checked) {
            scheduleSectionComplete();
            return;
        }
        clearSectionTimer();
    });

    saveButton?.addEventListener('click', async () => {
        const songId = parseViewSongId(view.id);
        if (!songId) return;
        const elapsed = playbackStart ? ((Date.now() - playbackStart) / 1000) : 0;
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
