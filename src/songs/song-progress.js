import { whenReady } from '../utils/dom-ready.js';
import { setJSON } from '../persistence/storage.js';
import { loadEvents } from '../persistence/loaders.js';
import { clamp, todayDay } from '../utils/math.js';
import { EVENTS_KEY as EVENT_KEY } from '../persistence/storage-keys.js';
import { SONG_RECORDED } from '../utils/event-names.js';
import { getSongIdFromViewId, parseDuration } from '../utils/recording-export.js';

const saveEvents = async (events) => {
    await setJSON(EVENT_KEY, events);
};

const tierFromAccuracy = (accuracy) => {
    if (accuracy >= 95) return 100;
    if (accuracy >= 75) return 75;
    if (accuracy >= 50) return 50;
    if (accuracy >= 25) return 25;
    return 0;
};

const recordSongEvent = async (songId, accuracy, duration, elapsed) => {
    const events = await loadEvents();
    const rounded = clamp(Math.round(accuracy), 0, 100);
    const entry = {
        type: 'song',
        id: songId,
        accuracy: rounded,
        tier: tierFromAccuracy(rounded),
        duration,
        elapsed,
        day: todayDay(),
        timestamp: Date.now(),
    };
    events.push(entry);
    await saveEvents(events);
    document.dispatchEvent(new CustomEvent(SONG_RECORDED, { detail: entry }));
    updateBestAccuracyUI(events);
};

const runs = new Map();

const startRun = (songId, duration) => {
    if (!songId || !duration) return;
    const existing = runs.get(songId);
    if (existing?.timeoutId) clearTimeout(existing.timeoutId);
    const start = performance.now();
    const timeoutId = window.setTimeout(() => {
        finishRun(songId, 100, duration, duration);
    }, duration * 1000);
    runs.set(songId, { start, duration, timeoutId, logged: false });
};

const finishRun = (songId, accuracy, duration, elapsed) => {
    const run = runs.get(songId);
    if (!run || run.logged) return;
    if (run.timeoutId) clearTimeout(run.timeoutId);
    run.logged = true;
    runs.delete(songId);
    recordSongEvent(songId, accuracy, duration, elapsed);
};

const handleToggle = (toggle, songId, duration) => {
    if (toggle.checked) {
        startRun(songId, duration);
        return;
    }

    const run = runs.get(songId);
    if (!run) return;
    const elapsed = (performance.now() - run.start) / 1000;
    const accuracy = run.duration ? (elapsed / run.duration) * 100 : 0;
    finishRun(songId, accuracy, run.duration, elapsed);
};

const computeBestBySong = (events) => {
    return events.reduce((acc, event) => {
        if (event?.type !== 'song' || !event?.id) return acc;
        const score = Number.isFinite(event.accuracy) ? event.accuracy : 0;
        if (!acc[event.id] || score > acc[event.id]) {
            acc[event.id] = score;
        }
        return acc;
    }, {});
};

const updateBestAccuracyUI = (events) => {
    const bestBySong = computeBestBySong(events);
    Object.entries(bestBySong).forEach(([songId, best]) => {
        const rounded = clamp(Math.round(best), 0, 100);
        const card = document.querySelector(`.song-card[data-song="${songId}"]`);
        if (card) {
            let bestEl = card.querySelector('.song-best');
            if (!bestEl) {
                bestEl = document.createElement('div');
                bestEl.className = 'song-best';
                card.appendChild(bestEl);
            }
            bestEl.textContent = `Best ${rounded}%`;
        }

        const view = document.getElementById(`view-song-${songId}`);
        if (view) {
            const meta = view.querySelector('.song-meta');
            if (meta) {
                let block = meta.querySelector('.song-meta-best');
                if (!block) {
                    block = document.createElement('div');
                    block.className = 'song-meta-best';
                    const labelEl = document.createElement('span');
                    labelEl.className = 'song-meta-label';
                    labelEl.textContent = 'Best';
                    const valueEl = document.createElement('strong');
                    valueEl.className = 'song-meta-value';
                    block.appendChild(labelEl);
                    block.appendChild(valueEl);
                    meta.appendChild(block);
                }
                const valueEl = block.querySelector('.song-meta-value');
                if (valueEl) valueEl.textContent = `${rounded}%`;
            }
        }
    });
};

const initSongProgress = () => {
    const views = document.querySelectorAll('.song-view');
    views.forEach((view) => {
        const toggle = view.querySelector('.song-play-toggle');
        const sheet = view.querySelector('.song-sheet');
        const playhead = view.querySelector('.song-playhead');
        const songId = getSongIdFromViewId(view?.id);
        const duration = parseDuration(sheet);

        if (!toggle || !songId || !duration) return;

        toggle.addEventListener('change', () => handleToggle(toggle, songId, duration));

        if (playhead) {
            playhead.addEventListener('animationend', () => {
                finishRun(songId, 100, duration, duration);
            });
        }
    });
    loadEvents().then(updateBestAccuracyUI);
};

whenReady(initSongProgress);
