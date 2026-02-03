import { getJSON, setJSON } from '@core/persistence/storage.js';
import { cloneTemplate } from '@core/utils/templates.js';

const EVENT_KEY = 'panda-violin:events:v1';
const metricsTemplate = document.querySelector('#song-metrics-template');
const metricTemplate = document.querySelector('#song-metric-template');
const metaTemplate = document.querySelector('#song-meta-template');

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const todayDay = () => Math.floor(Date.now() / 86400000);

const loadEvents = async () => {
    const stored = await getJSON(EVENT_KEY);
    return Array.isArray(stored) ? stored : [];
};

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
    document.dispatchEvent(new CustomEvent('panda:song-recorded', { detail: entry }));
    updateSongMetricsUI(events);
};

const parseDuration = (sheet) => {
    if (!sheet) return 0;
    const raw = sheet.style.getPropertyValue('--song-duration') || getComputedStyle(sheet).getPropertyValue('--song-duration');
    if (!raw) return 0;
    const value = Number.parseFloat(raw);
    return Number.isNaN(value) ? 0 : value;
};

const getSongId = (section) => {
    if (!section?.id) return '';
    return section.id.replace('view-song-', '');
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

const computeLastBySong = (events) => {
    return events.reduce((acc, event) => {
        if (event?.type !== 'song' || !event?.id) return acc;
        const existing = acc[event.id];
        if (!existing || (event.timestamp || 0) > (existing.timestamp || 0)) {
            acc[event.id] = event;
        }
        return acc;
    }, {});
};

const ensureSongMetric = (container, key, label) => {
    if (!container) return null;
    let metric = container.querySelector(`[data-song-metric="${key}"]`);
    if (!metric) {
        metric = cloneTemplate(metricTemplate);
        if (!metric) return null;
        metric.dataset.songMetric = key;
        const labelEl = metric.querySelector('[data-song-metric-label]') || metric.querySelector('.song-metric-label');
        if (labelEl) labelEl.textContent = label;
        container.appendChild(metric);
    }
    return metric.querySelector('[data-song-metric-value]') || metric.querySelector('.song-metric-value');
};

const ensureSongMetaBlock = (meta, key, label) => {
    if (!meta) return null;
    let block = meta.querySelector(`[data-song-meta="${key}"]`);
    if (!block) {
        block = cloneTemplate(metaTemplate);
        if (!block) return null;
        block.dataset.songMeta = key;
        const labelEl = block.querySelector('[data-song-meta-label]') || block.querySelector('.song-meta-label');
        if (labelEl) labelEl.textContent = label;
        meta.appendChild(block);
    }
    return block.querySelector('[data-song-meta-value]') || block.querySelector('.song-meta-value');
};

const updateSongMetricsUI = (events) => {
    const bestBySong = computeBestBySong(events);
    const lastBySong = computeLastBySong(events);
    const songIds = new Set([...Object.keys(bestBySong), ...Object.keys(lastBySong)]);

    songIds.forEach((songId) => {
        const best = bestBySong[songId];
        const last = lastBySong[songId];
        const bestRounded = clamp(Math.round(best ?? 0), 0, 100);
        const lastRounded = clamp(Math.round(last?.accuracy ?? 0), 0, 100);

        const card = document.querySelector(`.song-card[data-song="${songId}"]`);
        if (card) {
            const legacy = card.querySelector('.song-best');
            if (legacy) legacy.remove();
            let metrics = card.querySelector('.song-metrics');
            if (!metrics) {
                metrics = cloneTemplate(metricsTemplate);
                if (!metrics) return;
                card.appendChild(metrics);
            }
            const bestEl = ensureSongMetric(metrics, 'best', 'Best');
            if (bestEl) bestEl.textContent = `${bestRounded}%`;
            const lastEl = ensureSongMetric(metrics, 'last', 'Last');
            if (lastEl) lastEl.textContent = last ? `${lastRounded}%` : '—';
        }

        const view = document.getElementById(`view-song-${songId}`);
        if (view) {
            const meta = view.querySelector('.song-meta');
            const bestValueEl = ensureSongMetaBlock(meta, 'best', 'Best');
            if (bestValueEl) bestValueEl.textContent = `${bestRounded}%`;
            const lastValueEl = ensureSongMetaBlock(meta, 'last', 'Last');
            if (lastValueEl) lastValueEl.textContent = last ? `${lastRounded}%` : '—';
        }
    });
};

const initSongProgress = () => {
    const views = document.querySelectorAll('.song-view');
    views.forEach((view) => {
        const toggle = view.querySelector('.song-play-toggle');
        const sheet = view.querySelector('.song-sheet');
        const playhead = view.querySelector('.song-playhead');
        const songId = getSongId(view);
        const duration = parseDuration(sheet);

        if (!toggle || !songId || !duration) return;

        toggle.addEventListener('change', () => handleToggle(toggle, songId, duration));

        if (playhead) {
            playhead.addEventListener('animationend', () => {
                finishRun(songId, 100, duration, duration);
            });
        }
    });
    loadEvents().then(updateSongMetricsUI);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSongProgress);
} else {
    initSongProgress();
}
