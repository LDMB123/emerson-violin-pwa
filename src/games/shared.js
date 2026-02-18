import { getGameTuning, updateGameResult } from '../ml/adaptive-engine.js';
import { createTonePlayer } from '../audio/tone-player.js';
import { getJSON, setJSON } from '../persistence/storage.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { todayDay } from '../utils/math.js';
import { formatDifficulty } from '../tuner/tuner-utils.js';
import { EVENTS_KEY as EVENT_KEY } from '../persistence/storage-keys.js';
import { GAME_RECORDED, ML_RESET, SOUNDS_CHANGE } from '../utils/event-names.js';

export const formatStars = (count, total) => '★'.repeat(count) + '☆'.repeat(Math.max(0, total - count));
export const cachedEl = (selector) => { let el; return () => (el ??= document.querySelector(selector)); };
const MAX_EVENTS = 500;
export const formatCountdown = (seconds) => {
    const safe = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(safe / 60);
    const remaining = safe % 60;
    return `${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
};

let tonePlayer = null;
export const getTonePlayer = () => {
    if (tonePlayer) return tonePlayer;
    const created = createTonePlayer();
    if (!created) return null;
    tonePlayer = created;
    return tonePlayer;
};

export const stopTonePlayer = () => {
    if (tonePlayer) {
        tonePlayer.stopAll();
    }
};

export const playToneNote = (note, options) => {
    if (!isSoundEnabled()) return false;
    const player = getTonePlayer();
    if (!player) return false;
    player.playNote(note, options).catch(() => {});
    return true;
};

export const playToneSequence = (notes, options) => {
    if (!isSoundEnabled()) return false;
    const player = getTonePlayer();
    if (!player) return false;
    player.playSequence(notes, options).catch(() => {});
    return true;
};

export const bindTap = (element, handler, { threshold = 160, clickIgnoreWindow = 420 } = {}) => {
    if (!element || typeof handler !== 'function') return;
    let lastTap = 0;
    let lastPointerTap = 0;
    const invoke = (event) => {
        const now = performance.now();
        if (now - lastTap < threshold) return;
        lastTap = now;
        handler(event);
    };
    element.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        event.preventDefault();
        lastPointerTap = performance.now();
        invoke(event);
    }, { passive: false });
    element.addEventListener('click', (event) => {
        const now = performance.now();
        if (now - lastPointerTap < clickIgnoreWindow && event.detail !== 0) return;
        invoke(event);
    });
};

export const readLiveNumber = (el, key) => {
    if (!el) return null;
    const value = Number(el.dataset[key]);
    return Number.isFinite(value) ? value : null;
};

export const setLiveNumber = (el, key, value, formatter) => {
    if (!el) return;
    el.dataset[key] = String(value);
    el.textContent = formatter ? formatter(value) : String(value);
};

export const markChecklist = (id) => {
    if (!id) return;
    const input = document.getElementById(id);
    if (!input || input.checked) return;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
};

export const markChecklistIf = (condition, id) => {
    if (condition) markChecklist(id);
};

export const setDifficultyBadge = (container, difficulty, prefix = 'Adaptive') => {
    if (!container) return;
    let badge = container.querySelector('.difficulty-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'difficulty-badge';
        container.appendChild(badge);
    }
    badge.dataset.level = difficulty || 'medium';
    badge.textContent = `${prefix}: ${formatDifficulty(difficulty)}`;
};

export const buildNoteSequence = (pool, length) => {
    const next = [];
    for (let i = 0; i < length; i += 1) {
        const options = pool.filter((note) => note !== next[i - 1]);
        next.push(options[Math.floor(Math.random() * options.length)]);
    }
    return next;
};

export const updateScoreCombo = (scoreEl, comboEl, score, combo) => {
    setLiveNumber(scoreEl, 'liveScore', score);
    setLiveNumber(comboEl, 'liveCombo', combo, (value) => `x${value}`);
};

export const recordGameEvent = async (id, payload = {}) => {
    if (!id) return;
    const events = await getJSON(EVENT_KEY);
    const list = Array.isArray(events) ? events : [];
    const entry = {
        type: 'game',
        id,
        day: todayDay(),
        timestamp: Date.now(),
    };
    if (Number.isFinite(payload.score)) entry.score = Math.round(payload.score);
    if (Number.isFinite(payload.accuracy)) entry.accuracy = Math.round(payload.accuracy);
    if (Number.isFinite(payload.stars)) entry.stars = Math.round(payload.stars);
    list.push(entry);
    if (list.length > MAX_EVENTS) {
        list.splice(0, list.length - MAX_EVENTS);
    }
    await setJSON(EVENT_KEY, list);
    document.dispatchEvent(new CustomEvent(GAME_RECORDED, { detail: entry }));
};

export const createSoundsChangeBinding = () => {
    let _handler = null;
    return (handler) => {
        if (_handler) document.removeEventListener(SOUNDS_CHANGE, _handler);
        _handler = handler;
        document.addEventListener(SOUNDS_CHANGE, handler);
    };
};

export const attachTuning = (id, onUpdate) => {
    const apply = (tuning) => {
        if (!tuning) return;
        onUpdate(tuning);
    };
    const refresh = () => {
        getGameTuning(id).then(apply).catch(() => {});
    };
    const handleReset = () => {
        refresh();
    };
    let disposed = false;
    refresh();
    document.addEventListener(ML_RESET, handleReset);
    const report = (payload) => updateGameResult(id, payload).then(apply).catch(() => {});
    report.refresh = refresh;
    report.dispose = () => {
        if (disposed) return;
        disposed = true;
        document.removeEventListener(ML_RESET, handleReset);
    };
    return report;
};
