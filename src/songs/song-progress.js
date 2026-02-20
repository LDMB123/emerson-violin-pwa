import { createTonePlayer } from '../audio/tone-player.js';
import { loadEvents } from '../persistence/loaders.js';
import { clamp } from '../utils/math.js';
import { SOUNDS_CHANGE } from '../utils/event-names.js';
import { getSongIdFromViewId, parseDuration } from '../utils/recording-export.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { isBfcachePagehide } from '../utils/lifecycle-utils.js';
import { assessSongAttempt } from './song-assessment.js';
import { saveSongCheckpoint } from './song-progression.js';
import { recordSongEvent } from './song-progress-recording.js';
import { updateBestAccuracyUI } from './song-progress-ui.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const NOTE_DURATION_SCALE = 0.74;
const NOTE_MIN_SECONDS = 0.12;
const NOTE_MAX_SECONDS = 2.6;
const NOTE_RELEASE_MS = 40;

let tonePlayer = null;
let playbackToken = 0;
let globalListenersBound = false;

const getTonePlayer = () => {
    if (!tonePlayer) {
        tonePlayer = createTonePlayer();
    }
    return tonePlayer;
};

const stopPlayAlongAudio = () => {
    playbackToken += 1;
    if (tonePlayer) {
        tonePlayer.stopAll();
    }
};

const runs = new Map();

const stopToggle = (toggle) => {
    if (!(toggle instanceof HTMLInputElement)) return;
    if (!toggle.checked) return;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
};

const stopActiveSongToggles = (activeViewId = null) => {
    document.querySelectorAll('.song-view .song-play-toggle:checked').forEach((toggle) => {
        const view = toggle.closest('.song-view');
        if (activeViewId && view?.id === activeViewId) return;
        stopToggle(toggle);
    });
};

const parseSeconds = (raw, fallback = 0) => {
    if (typeof raw !== 'string') return fallback;
    const trimmed = raw.trim();
    if (!trimmed) return fallback;
    const normalized = trimmed.endsWith('s') ? trimmed.slice(0, -1) : trimmed;
    const seconds = Number.parseFloat(normalized);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : fallback;
};

const getSongSequence = (view) => {
    return Array.from(view.querySelectorAll('.song-note'))
        .map((noteEl) => {
            const pitch = noteEl.querySelector('.song-note-pitch')?.textContent?.trim();
            const duration = parseSeconds(noteEl.style.getPropertyValue('--note-duration'), 0.5);
            return { pitch, duration };
        })
        .filter((note) => Boolean(note.pitch));
};

const playAlong = async (toggle, sequence) => {
    if (!(toggle instanceof HTMLInputElement) || !toggle.checked) return;
    if (!Array.isArray(sequence) || !sequence.length) return;
    if (!isSoundEnabled()) return;
    const player = getTonePlayer();
    if (!player) return;

    const token = ++playbackToken;
    for (const note of sequence) {
        if (token !== playbackToken || !toggle.checked) return;
        const duration = Number.isFinite(note.duration) ? note.duration : 0.5;
        const playableSeconds = clamp(duration * NOTE_DURATION_SCALE, NOTE_MIN_SECONDS, NOTE_MAX_SECONDS);
        const played = await player.playNote(note.pitch, {
            duration: playableSeconds,
            volume: 0.16,
            type: 'triangle',
        });
        if (token !== playbackToken || !toggle.checked) return;

        if (!played) {
            await wait(Math.max(120, duration * 1000));
            continue;
        }

        const remainderMs = Math.max(0, (duration * 1000) - (playableSeconds * 1000 + NOTE_RELEASE_MS));
        if (remainderMs > 4) {
            await wait(remainderMs);
        }
    }
};

const startPlayAlong = (toggle, sequence) => {
    stopPlayAlongAudio();
    playAlong(toggle, sequence).catch(() => {});
};

const bindGlobalPlaybackListeners = () => {
    if (globalListenersBound) return;
    globalListenersBound = true;

    window.addEventListener('hashchange', (event) => {
        let nextSongViewId = null;
        try {
            const nextHash = new URL(event.newURL).hash || '';
            if (nextHash.startsWith('#view-song-')) {
                nextSongViewId = nextHash.slice(1);
            }
        } catch {
            // Ignore invalid URL parse errors.
        }
        stopActiveSongToggles(nextSongViewId);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopActiveSongToggles();
        }
    });

    window.addEventListener('pagehide', (event) => {
        if (isBfcachePagehide(event)) return;
        stopActiveSongToggles();
    });

    document.addEventListener(SOUNDS_CHANGE, (event) => {
        if (event.detail?.enabled === false) {
            stopPlayAlongAudio();
        }
    });
};

const startRun = (songId, duration, toggle) => {
    if (!songId || !duration) return;
    const existing = runs.get(songId);
    if (existing?.timeoutId) clearTimeout(existing.timeoutId);
    const view = toggle?.closest('.song-view');
    const tempo = Number(view?.dataset?.songTempo);
    const sectionId = view?.dataset?.songSectionId || null;
    const attemptType = sectionId && sectionId !== 'full' ? 'section' : 'full';
    const start = performance.now();
    const timeoutId = window.setTimeout(() => {
        if (toggle?.checked) {
            stopToggle(toggle);
            return;
        }
        finishRun(songId, 100, duration, duration);
    }, duration * 1000);
    runs.set(songId, {
        start,
        duration,
        timeoutId,
        logged: false,
        toggle,
        tempo: Number.isFinite(tempo) ? tempo : null,
        sectionId,
        attemptType,
    });
};

const finishRun = (songId, accuracy, duration, elapsed) => {
    const run = runs.get(songId);
    if (!run || run.logged) return;
    if (run.timeoutId) clearTimeout(run.timeoutId);
    run.logged = true;
    runs.delete(songId);
    const timingAccuracy = clamp(Math.round(accuracy + (run.sectionId ? 4 : 0)), 0, 100);
    const intonationAccuracy = clamp(Math.round(accuracy - (run.tempo && run.tempo > 112 ? 4 : 0)), 0, 100);
    const assessment = assessSongAttempt({
        accuracy,
        timingAccuracy,
        intonationAccuracy,
        tempo: run.tempo,
        attemptType: run.attemptType,
    });
    recordSongEvent(
        songId,
        {
            ...assessment,
            sectionId: run.sectionId,
            duration,
            elapsed,
        },
        duration,
        elapsed,
        updateBestAccuracyUI,
    );
};

const handleToggle = (toggle, songId, duration, sequence) => {
    if (toggle.checked) {
        startRun(songId, duration, toggle);
        startPlayAlong(toggle, sequence);
        return;
    }

    stopPlayAlongAudio();
    const run = runs.get(songId);
    if (!run) return;
    const elapsed = (performance.now() - run.start) / 1000;
    const accuracy = run.duration ? (elapsed / run.duration) * 100 : 0;
    saveSongCheckpoint(songId, {
        sectionId: run.sectionId || null,
        elapsed,
        tempo: run.tempo || null,
    }).catch(() => {});
    finishRun(songId, accuracy, run.duration, elapsed);
};

const initSongProgress = () => {
    bindGlobalPlaybackListeners();
    const views = document.querySelectorAll('.song-view');
    views.forEach((view) => {
        if (view.dataset.songProgressBound === 'true') return;
        view.dataset.songProgressBound = 'true';

        const toggle = view.querySelector('.song-play-toggle');
        const sheet = view.querySelector('.song-sheet');
        const playhead = view.querySelector('.song-playhead');
        const songId = getSongIdFromViewId(view?.id);
        const duration = parseDuration(sheet);
        const sequence = getSongSequence(view);

        if (!toggle || !songId || !duration) return;

        toggle.addEventListener('change', () => handleToggle(toggle, songId, duration, sequence));

        if (playhead) {
            playhead.addEventListener('animationend', () => {
                stopToggle(toggle);
            });
        }
    });

    loadEvents().then(updateBestAccuracyUI).catch(() => {});
};

export const init = initSongProgress;
