import { getGameTuning, updateGameResult } from '../ml/adaptive-engine.js';
import { createTonePlayer } from '../audio/tone-player.js';
import { appendEvent } from '../persistence/loaders.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { durationToMinutes, positiveRound, todayDay } from '../utils/math.js';
import { markCheckboxInputChecked } from '../utils/checkbox-utils.js';
import { speakVoiceCoachMessage } from '../utils/voice-coach-speech.js';
import { isGameView } from '../utils/view-hash-utils.js';
import { formatDifficulty } from '../tuner/tuner-utils.js';
import { GAME_RECORDED, GAME_MASTERY_UPDATED, ML_RESET, SOUNDS_CHANGE, emitEvent } from '../utils/event-names.js';
import { updateGameMastery } from './game-mastery.js';
import { bindGameStartStop } from './game-start-stop-bindings.js';

/**
 * Formats a star rating with filled and empty stars.
 *
 * @param {number} count
 * @param {number} total
 * @returns {string}
 */
/** Formats a filled and empty star string for score displays. */
export const formatStars = (count, total) => '★'.repeat(count) + '☆'.repeat(Math.max(0, total - count));

/**
 * Returns a lazy element lookup function that refreshes when the element is detached.
 *
 * @param {string} selector
 * @returns {() => Element | null}
 */
/** Returns a lazy DOM query function that reuses a live element reference. */
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

/**
 * Formats countdown seconds as `mm:ss`.
 *
 * @param {number} seconds
 * @returns {string}
 */
/** Formats a second count as countdown text in mm:ss form. */
export const formatCountdown = (seconds) => {
    const safe = Math.max(0, Math.ceil(seconds));
    const minutes = durationToMinutes(safe);
    const remaining = safe % 60;
    return `${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
};

let tonePlayer = null;

/**
 * Lazily creates and caches the shared tone player.
 *
 * @returns {any | null}
 */
/** Returns the shared tone player singleton, creating it on demand. */
export const getTonePlayer = () => {
    if (tonePlayer) return tonePlayer;
    const created = createTonePlayer();
    if (!created) return null;
    tonePlayer = created;
    return tonePlayer;
};

/**
 * Stops all active tone-player playback.
 *
 * @returns {void}
 */
/** Stops all active notes on the shared tone player. */
export const stopTonePlayer = () => {
    tonePlayer?.stopAll?.();
};

const playWithTonePlayer = (playback) => {
    if (!isSoundEnabled()) return false;
    const player = getTonePlayer();
    if (!player) return false;
    playback(player).catch(() => { });
    return true;
};

/**
 * Plays a single note through the shared tone player when sound is enabled.
 *
 * @param {string} note
 * @param {Object} options
 * @returns {boolean}
 */
/** Plays a single tone note when shared audio playback is enabled. */
export const playToneNote = (note, options) => {
    return playWithTonePlayer((player) => player.playNote(note, options));
};

/**
 * Plays a note sequence through the shared tone player when sound is enabled.
 *
 * @param {string[]} notes
 * @param {Object} options
 * @returns {boolean}
 */
/** Plays a tone sequence when shared audio playback is enabled. */
export const playToneSequence = (notes, options) => {
    return playWithTonePlayer((player) => player.playSequence(notes, options));
};

/**
 * Binds pointer and click handlers with duplicate-tap suppression.
 *
 * @param {Element | null | undefined} element
 * @param {(event: Event) => void} handler
 * @param {Object} [options={}]
 * @param {number} [options.threshold=160]
 * @param {number} [options.clickIgnoreWindow=420]
 * @returns {void}
 */
/** Binds pointer and click events into a deduplicated tap handler. */
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

/**
 * Reads a numeric `data-*` value from an element.
 *
 * @param {HTMLElement | null | undefined} el
 * @param {string} key
 * @returns {number | null}
 */
/** Reads a numeric live value from an element data attribute. */
export const readLiveNumber = (el, key) => {
    if (!el) return null;
    const value = Number(el.dataset[key]);
    return Number.isFinite(value) ? value : null;
};

/**
 * Writes a numeric `data-*` value and matching text content to an element.
 *
 * @param {HTMLElement | null | undefined} el
 * @param {string} key
 * @param {number} value
 * @param {(value: number) => string | undefined} formatter
 * @returns {void}
 */
/** Writes a numeric live value to an element data attribute and text node. */
export const setLiveNumber = (el, key, value, formatter) => {
    if (!el) return;
    el.dataset[key] = String(value);
    el.textContent = formatter ? formatter(value) : String(value);
};

/**
 * Marks a checklist checkbox as checked by id.
 *
 * @param {string} id
 * @returns {void}
 */
/** Marks a checklist checkbox as completed by id. */
export const markChecklist = (id) => {
    if (!id) return;
    const input = document.getElementById(id);
    markCheckboxInputChecked(input);
};

/**
 * Marks a checklist checkbox when the supplied condition is truthy.
 *
 * @param {boolean} condition
 * @param {string} id
 * @returns {void}
 */
/** Marks a checklist checkbox as completed when the condition is truthy. */
export const markChecklistIf = (condition, id) => {
    if (condition) markChecklist(id);
};

/**
 * Ensures a difficulty badge exists and updates its text/level state.
 *
 * @param {HTMLElement | null | undefined} container
 * @param {string} difficulty
 * @param {string} [prefix='Adaptive']
 * @returns {void}
 */
/** Creates or updates a difficulty badge within a game container. */
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

/**
 * Builds a note sequence without immediate repeats.
 *
 * @param {string[]} pool
 * @param {number} length
 * @returns {string[]}
 */
/** Builds a note sequence without repeating adjacent notes. */
export const buildNoteSequence = (pool, length) => {
    const next = [];
    for (let i = 0; i < length; i += 1) {
        const options = pool.filter((note) => note !== next[i - 1]);
        next.push(options[Math.floor(Math.random() * options.length)]);
    }
    return next;
};

const speakReaction = (message) => {
    speakVoiceCoachMessage(message, {
        rate: 1.05,
        pitch: 1.2,
    });
};

/**
 * Shows a short confetti burst near an element.
 *
 * @param {Element | null | undefined} el
 * @returns {void}
 */
/** Renders a short confetti burst near the supplied element. */
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

/**
 * Updates score/combo UI and triggers milestone reactions.
 *
 * @param {HTMLElement | null | undefined} scoreEl
 * @param {HTMLElement | null | undefined} comboEl
 * @param {number} score
 * @param {number} combo
 * @returns {void}
 */
/** Updates score and combo UI and triggers reaction feedback for streak changes. */
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

/**
 * Persists a game result, updates mastery, and emits related events.
 *
 * @param {string} id
 * @param {Object} [payload={}]
 * @returns {Promise<void>}
 */
/** Persists and emits a normalized game session event. */
export const recordGameEvent = async (id, payload = {}) => {
    if (!id) return;
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
    if (Number.isFinite(payload.sessionMs)) entry.sessionMs = positiveRound(payload.sessionMs);
    if (Number.isFinite(payload.objectiveTotal)) entry.objectiveTotal = positiveRound(payload.objectiveTotal);
    if (Number.isFinite(payload.objectivesCompleted)) entry.objectivesCompleted = positiveRound(payload.objectivesCompleted);
    if (Number.isFinite(payload.mistakes)) entry.mistakes = positiveRound(payload.mistakes);
    const storedEntry = await appendEvent(entry, { maxEntries: MAX_EVENTS });
    if (!storedEntry) return;
    const mastery = await updateGameMastery({
        gameId: id,
        score: Number.isFinite(storedEntry.accuracy) ? storedEntry.accuracy : storedEntry.score || 0,
        day: storedEntry.day,
    }).catch(() => null);
    emitEvent(GAME_RECORDED, storedEntry);
    if (mastery?.game) {
        emitEvent(GAME_MASTERY_UPDATED, {
            id,
            mastery: mastery.game,
        });
    }
};

const stopEngineAndRecordGameEvent = (engine, id, payload = {}) => {
    engine?.stop?.();
    recordGameEvent(id, payload);
};

/**
 * Stops an engine and records the result when a threshold is met.
 *
 * @param {Object} [options={}]
 * @param {{ stop?: () => void } | null} [options.engine]
 * @param {number} [options.value]
 * @param {number} [options.threshold]
 * @param {string} [options.id]
 * @param {Object} [options.payload={}]
 * @returns {boolean}
 */
/** Stops an engine and records a game event when a threshold is met. */
export const maybeStopEngineAndRecordThreshold = ({
    engine,
    value,
    threshold,
    id,
    payload = {},
} = {}) => {
    if (!Number.isFinite(value) || value < threshold) return false;
    stopEngineAndRecordGameEvent(engine, id, payload);
    return true;
};

const ensureGameStartStopBindings = ({
    state = null,
    bound = false,
    cleanupBindings = null,
    setBound = null,
    setCleanupBindings = null,
    startButton = null,
    engine = null,
    startLabel = 'Start',
    stopLabel = 'Stop',
    resetBeforeStart = null,
    isGameViewActive = () => true,
} = {}) => {
    const currentBound = state ? Boolean(state.bound) : bound;
    const currentCleanup = state ? state.cleanupBindings : cleanupBindings;
    if (currentBound) return currentCleanup;
    currentCleanup?.();
    const nextCleanup = bindGameStartStop({
        startButton,
        engine,
        startLabel,
        stopLabel,
        resetBeforeStart,
        isGameViewActive,
        onViewExit: () => {
            if (state) {
                state.bound = false;
                state.cleanupBindings = null;
            }
            if (typeof setBound === 'function') {
                setBound(false);
            }
            if (typeof setCleanupBindings === 'function') {
                setCleanupBindings(null);
            }
        },
    });
    if (state) {
        state.bound = true;
        state.cleanupBindings = nextCleanup;
    }
    if (typeof setCleanupBindings === 'function') {
        setCleanupBindings(nextCleanup);
    }
    if (typeof setBound === 'function') {
        setBound(true);
    }
    return nextCleanup;
};

/**
 * Creates mutable binding state for shared start/stop wiring.
 *
 * @returns {{ bound: boolean, cleanupBindings: (() => void) | null }}
 */
/** Creates mutable binding state for shared game start and stop controls. */
export const createStartStopBindingState = () => ({
    bound: false,
    cleanupBindings: null,
});

/**
 * Binds a game's start/stop button lifecycle to the current hash view.
 *
 * @param {Object} [options={}]
 * @param {string} [options.gameId='']
 * @returns {(() => void) | null}
 */
/** Binds shared start and stop behavior to a hash-scoped game view. */
export const bindHashViewGameStartStop = ({
    gameId = '',
    ...options
} = {}) => {
    if (!gameId) {
        return ensureGameStartStopBindings(options);
    }
    return ensureGameStartStopBindings({
        ...options,
        isGameViewActive: () => isGameView(window.location.hash, gameId),
    });
};

/**
 * Binds a handler to the shared sounds-change event.
 *
 * @param {(event: Event) => void} handler
 * @param {((cleanup: () => void) => void) | null} [registerCleanup=null]
 * @returns {() => void}
 */
/** Registers a sound-setting listener with optional cleanup tracking. */
export const bindSoundsChange = (handler, registerCleanup = null) => {
    return bindDocumentEvent(SOUNDS_CHANGE, handler, registerCleanup);
};

/**
 * Binds a document-level custom event and returns its cleanup function.
 *
 * @param {string} eventName
 * @param {(event: Event) => void} handler
 * @param {((cleanup: () => void) => void) | null} [registerCleanup=null]
 * @returns {() => void}
 */
/** Registers a document event listener with optional cleanup tracking. */
export const bindDocumentEvent = (eventName, handler, registerCleanup = null) => {
    if (!eventName || typeof handler !== 'function') return () => { };
    document.addEventListener(eventName, handler);
    const cleanup = () => {
        document.removeEventListener(eventName, handler);
    };
    if (typeof registerCleanup === 'function') {
        registerCleanup(cleanup);
    }
    return cleanup;
};

/**
 * Creates a realtime feature handler scoped to one game view.
 *
 * @param {string} gameId
 * @param {(feature: any, event: Event) => void} onFeature
 * @returns {(event?: any) => void}
 */
/** Creates a realtime feature event handler scoped to one game id. */
export const createRealtimeFeatureStateHandler = (gameId, onFeature) => {
    if (typeof onFeature !== 'function') {
        return () => { };
    }
    return (event) => {
        if (!isGameView(window.location.hash, gameId)) return;
        const feature = event.detail?.lastFeature;
        if (!feature || event.detail?.paused) return;
        onFeature(feature, event);
    };
};


/**
 * Connects a game to adaptive tuning updates and reset handling.
 *
 * @param {string} id
 * @param {(tuning: any) => void} onUpdate
 * @returns {((payload: any) => Promise<void>) & { refresh: () => void, dispose: () => void }}
 */
/** Attaches adaptive tuning updates for a game id and returns cleanup helpers. */
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

/**
 * Creates a standard score/combo updater for checkbox-driven games.
 *
 * @param {Object} options
 * @param {string} options.viewId
 * @param {string} options.inputPrefix
 * @param {string} options.scoreSelector
 * @param {string | null} [options.comboSelector=null]
 * @param {number} [options.scoreMultiplier=25]
 * @param {number} [options.bonusScore=0]
 * @returns {() => void}
 */
/** Creates the standard adaptive-update handler for a game view. */
export const createStandardGameUpdate = ({
    viewId,
    inputPrefix,
    scoreSelector,
    comboSelector = null,
    scoreMultiplier = 25,
    bonusScore = 0
}) => {
    const getScoreEl = scoreSelector ? cachedEl(scoreSelector) : () => null;
    const getComboEl = comboSelector ? cachedEl(comboSelector) : () => null;

    return () => {
        const inputs = Array.from(document.querySelectorAll(`${viewId} input[id^="${inputPrefix}"]`));
        const checked = inputs.length ? inputs.filter((input) => input.checked).length : 0;

        const scoreEl = getScoreEl();
        if (scoreEl) {
            const liveScore = readLiveNumber(scoreEl, 'liveScore');
            const scoreVal = checked * scoreMultiplier + (inputs.length && checked === inputs.length ? bonusScore : 0);
            scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : scoreVal);
        }

        const comboEl = getComboEl();
        if (comboEl) {
            const liveCombo = readLiveNumber(comboEl, 'liveCombo');
            const comboVal = Number.isFinite(liveCombo) ? liveCombo : checked;
            comboEl.textContent = `x${comboVal}`;
        }
    };
};
