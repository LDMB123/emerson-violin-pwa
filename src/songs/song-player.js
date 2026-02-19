import { SONG_SECTION_COMPLETED } from '../utils/event-names.js';
import { getSongById, getSongSections } from './song-library.js';
import { getSongCheckpoint, saveSongCheckpoint } from './song-progression.js';

const parseViewSongId = (viewId) => {
    if (typeof viewId !== 'string') return null;
    if (!viewId.startsWith('view-song-')) return null;
    return viewId.replace('view-song-', '');
};

const createControls = ({ song, checkpoint }) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'song-advanced-controls glass';
    wrapper.dataset.songAdvancedControls = 'true';

    const options = (song?.sections || []).map((section) => (
        `<option value="${section.id}">${section.label}</option>`
    )).join('');

    wrapper.innerHTML = `
        <div class="song-advanced-row">
            <label>
                <span>Section</span>
                <select data-song-section>
                    ${options || '<option value="full">Full Song</option>'}
                </select>
            </label>
            <label>
                <span>Tempo</span>
                <input type="range" min="50" max="130" value="100" step="5" data-song-tempo-scale>
                <strong data-song-tempo-label>100%</strong>
            </label>
        </div>
        <div class="song-advanced-row">
            <label class="song-loop-toggle">
                <input type="checkbox" data-song-loop>
                <span>Loop section</span>
            </label>
            <button class="btn btn-secondary" type="button" data-song-save-checkpoint>Save checkpoint</button>
            <button class="btn btn-ghost" type="button" data-song-resume-checkpoint>Resume checkpoint</button>
        </div>
        <p class="song-advanced-status" data-song-advanced-status aria-live="polite">Sectional practice ready.</p>
    `;

    if (checkpoint?.sectionId) {
        const select = wrapper.querySelector('[data-song-section]');
        if (select) select.value = checkpoint.sectionId;
    }

    if (Number.isFinite(checkpoint?.tempo)) {
        const scaleInput = wrapper.querySelector('[data-song-tempo-scale]');
        const label = wrapper.querySelector('[data-song-tempo-label]');
        const baseTempo = Number(song?.bpm || 80);
        const ratio = Math.round((checkpoint.tempo / Math.max(baseTempo, 1)) * 100);
        const nextValue = Math.max(50, Math.min(130, ratio));
        if (scaleInput) scaleInput.value = String(nextValue);
        if (label) label.textContent = `${nextValue}%`;
    }

    return wrapper;
};

const setStatus = (controls, message) => {
    const status = controls?.querySelector('[data-song-advanced-status]');
    if (status) status.textContent = message;
};

const sectionDuration = (sections, sectionId) => {
    if (!Array.isArray(sections) || !sections.length) return 0;
    const section = sections.find((item) => item.id === sectionId) || sections[0];
    if (!section) return 0;
    return Math.max(0, (section.end || 0) - (section.start || 0));
};

const applyControlsToView = ({ view, controls, song, sections }) => {
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

export const initSongPlayer = async () => {
    const views = Array.from(document.querySelectorAll('.song-view'));
    for (const view of views) {
        if (view.dataset.songPlayerBound === 'true') continue;
        view.dataset.songPlayerBound = 'true';

        const songId = parseViewSongId(view.id);
        if (!songId) continue;

        const [song, sections, checkpoint] = await Promise.all([
            getSongById(songId),
            getSongSections(songId),
            getSongCheckpoint(songId),
        ]);

        const controls = createControls({ song, checkpoint });
        const anchor = view.querySelector('.song-controls');
        if (anchor?.parentElement) {
            anchor.parentElement.insertBefore(controls, anchor.nextSibling);
        }

        applyControlsToView({
            view,
            controls,
            song,
            sections,
        });
    }
};

export const init = () => {
    initSongPlayer().catch(() => {
        // Song player controls are best effort.
    });
};
