import { getGameTuning, updateGameResult } from '../ml/adaptive-engine.js';
import { createTonePlayer } from '../audio/tone-player.js';
import { getJSON, setJSON } from '../persistence/storage.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { isVoiceCoachEnabled } from '../utils/feature-flags.js';
import { todayDay } from '../utils/math.js';
import { formatDifficulty } from '../tuner/tuner-utils.js';
import { EVENTS_KEY as EVENT_KEY } from '../persistence/storage-keys.js';
import { GAME_RECORDED, GAME_MASTERY_UPDATED, ML_RESET, SOUNDS_CHANGE } from '../utils/event-names.js';
import { updateGameMastery } from './game-mastery.js';

export const formatStars = (count, total) => '★'.repeat(count) + '☆'.repeat(Math.max(0, total - count));
export const cachedEl = (selector) => {
    let el;
    return () => {
        if (!el || !el.isConnected) {
            el = document.querySelector(selector);
        }
        return el;
    };
};
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
    player.playNote(note, options).catch(() => { });
    return true;
};

export const playToneSequence = (notes, options) => {
    if (!isSoundEnabled()) return false;
    const player = getTonePlayer();
    if (!player) return false;
    player.playSequence(notes, options).catch(() => { });
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

const speakReaction = (message) => {
    if (!isVoiceCoachEnabled() || document.hidden) return;
    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'en-US';
        utterance.rate = 1.05;
        utterance.pitch = 1.2;
        window.speechSynthesis.speak(utterance);
    } catch {
        // Ignore
    }
};

export const triggerMiniConfetti = (el) => {
    if (!el || document.hidden) return;
    if (document.documentElement.hasAttribute('data-reduced-motion')) return;

    // Find nearest relative container or view
    const view = el.closest('.view') || document.body;
    const rect = el.getBoundingClientRect();

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = `${rect.left + rect.width / 2}px`;
    container.style.top = `${rect.top}px`;
    container.style.width = '0';
    container.style.height = '0';
    container.style.overflow = 'visible';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '1000';

    const colors = ['#E95639', '#F9A93F', '#4FB69E', '#31D0A0'];
    const shapes = ['circle', 'small', 'large', ''];

    for (let i = 0; i < 12; i++) {
        const span = document.createElement('span');
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        span.className = `confetti-piece ${shape}`;
        span.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
        span.style.setProperty('--fall-dur', `${0.6 + Math.random() * 0.4}s`);
        span.style.setProperty('--fall-delay', '0s');
        span.style.left = `${(Math.random() - 0.5) * 100}px`;
        container.appendChild(span);
    }

    view.appendChild(container);
    setTimeout(() => container.remove(), 1200);
};

let lastReactionTime = 0;
export const updateScoreCombo = (scoreEl, comboEl, score, combo) => {
    const oldCombo = readLiveNumber(comboEl, 'liveCombo') || 0;

    setLiveNumber(scoreEl, 'liveScore', score);
    setLiveNumber(comboEl, 'liveCombo', combo, (value) => `x${value}`);

    const now = Date.now();
    if (now - lastReactionTime < 1500) return; // Prevent spamming

    if (combo >= 3 && combo > oldCombo) {
        if (combo % 5 === 0) {
            lastReactionTime = now;
            speakReaction('Incredible!');
            triggerMiniConfetti(comboEl);
        } else if (combo === 3) {
            lastReactionTime = now;
            speakReaction('Great job!');
            triggerMiniConfetti(comboEl);
        }
    } else if (combo === 0 && oldCombo >= 3) {
        lastReactionTime = now;
        speakReaction('Oops, keep trying!');
    }
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
    if (typeof payload.difficulty === 'string' && payload.difficulty.trim()) {
        entry.difficulty = payload.difficulty.trim();
    }
    if (typeof payload.tier === 'string' && payload.tier.trim()) {
        entry.tier = payload.tier.trim();
    }
    if (Number.isFinite(payload.sessionMs)) entry.sessionMs = Math.max(0, Math.round(payload.sessionMs));
    if (Number.isFinite(payload.objectiveTotal)) entry.objectiveTotal = Math.max(0, Math.round(payload.objectiveTotal));
    if (Number.isFinite(payload.objectivesCompleted)) entry.objectivesCompleted = Math.max(0, Math.round(payload.objectivesCompleted));
    if (Number.isFinite(payload.mistakes)) entry.mistakes = Math.max(0, Math.round(payload.mistakes));
    list.push(entry);
    if (list.length > MAX_EVENTS) {
        list.splice(0, list.length - MAX_EVENTS);
    }
    await setJSON(EVENT_KEY, list);
    const mastery = await updateGameMastery({
        gameId: id,
        score: Number.isFinite(entry.accuracy) ? entry.accuracy : entry.score || 0,
        day: entry.day,
    }).catch(() => null);
    document.dispatchEvent(new CustomEvent(GAME_RECORDED, { detail: entry }));
    if (mastery?.game) {
        document.dispatchEvent(new CustomEvent(GAME_MASTERY_UPDATED, {
            detail: {
                id,
                mastery: mastery.game,
            },
        }));
    }
};

export const bindSoundsChange = (handler, registerCleanup = null) => {
    if (typeof handler !== 'function') return () => { };
    document.addEventListener(SOUNDS_CHANGE, handler);
    const cleanup = () => {
        document.removeEventListener(SOUNDS_CHANGE, handler);
    };
    if (typeof registerCleanup === 'function') {
        registerCleanup(cleanup);
    }
    return cleanup;
};

export const createSoundsChangeBinding = () => {
    let currentCleanup = null;
    return (handler) => {
        if (typeof currentCleanup === 'function') {
            currentCleanup();
        }
        currentCleanup = bindSoundsChange(handler);
        return currentCleanup;
    };
};

export const attachTuning = (id, onUpdate) => {
    const apply = (tuning) => {
        if (!tuning) return;
        onUpdate(tuning);
    };
    const refresh = () => {
        getGameTuning(id).then(apply).catch(() => { });
    };
    const handleReset = () => {
        refresh();
    };
    let disposed = false;
    refresh();
    document.addEventListener(ML_RESET, handleReset);
    const report = (payload) => updateGameResult(id, payload).then(apply).catch(() => { });
    report.refresh = refresh;
    report.dispose = () => {
        if (disposed) return;
        disposed = true;
        document.removeEventListener(ML_RESET, handleReset);
    };
    return report;
};
