import { getJSON, setJSON, removeJSON } from '../persistence/storage.js';
import { clamp as rawClamp } from '../utils/math.js';
import { ML_MODEL_KEY as MODEL_KEY, ML_LOG_KEY as LOG_KEY } from '../persistence/storage-keys.js';
import { ML_UPDATE, ML_RESET, emitEvent } from '../utils/event-names.js';
const DEFAULT_MODEL = {
    version: 1,
    updatedAt: 0,
    games: {},
};
const LOG_LIMIT = 120;

const clamp = (value, min = 0, max = 1) => rawClamp(value, min, max);

const GAME_CONFIG = {
    tuner: {
        tolerance: { easy: 10, medium: 8, hard: 6 },
    },
    'coach-focus': {
        focusMinutes: { easy: 5, medium: 10, hard: 15 },
    },
};

let cachedModel = null;
let saveTimer = null;

const normalizeScore = ({ score, accuracy, stars } = {}) => {
    if (Number.isFinite(accuracy)) return clamp(accuracy / 100);
    if (Number.isFinite(stars)) return clamp(stars / 5);
    if (Number.isFinite(score)) return clamp(score / 100);
    return 0.5;
};

const resolveDifficultyLevel = (ema) => {
    if (ema < 0.2) return 1;
    if (ema < 0.4) return 2;
    if (ema < 0.6) return 3;
    if (ema < 0.8) return 4;
    return 5;
};

const resolveDifficulty = (ema) => {
    if (ema < 0.45) return 'easy';
    if (ema < 0.7) return 'medium';
    return 'hard';
};

const getModel = async () => {
    if (cachedModel) return cachedModel;
    const stored = await getJSON(MODEL_KEY);
    cachedModel = stored && stored.version === DEFAULT_MODEL.version
        ? stored
        : { ...DEFAULT_MODEL };
    return cachedModel;
};

const scheduleSave = (model) => {
    if (saveTimer) return;
    const persist = () => {
        saveTimer = null;
        model.updatedAt = Date.now();
        setJSON(MODEL_KEY, model).catch(() => { });
    };
    saveTimer = window.setTimeout(persist, 120);
};

const getGameState = (model, id) => {
    if (!model.games[id]) {
        model.games[id] = {
            ema: 0.5,
            samples: 0,
            lastScore: 0,
            updatedAt: 0,
        };
    }
    return model.games[id];
};

const loadLogs = async () => {
    const stored = await getJSON(LOG_KEY);
    return Array.isArray(stored) ? stored : [];
};

const saveLogs = async (events) => {
    const trimmed = events.slice(-LOG_LIMIT);
    await setJSON(LOG_KEY, trimmed);
    return trimmed;
};

const logDecision = async (entry) => {
    const events = await loadLogs();
    events.push(entry);
    await saveLogs(events);
    return events;
};

const applyTimeDecay = (game) => {
    // Feature: Spaced Repetition Decay (The Forgetting Curve)
    // If a game hasn't been played in > 3 days, pull the EMA back toward 0.5 (medium)
    if (!game.updatedAt) return game.ema ?? 0.5;

    const daysSinceLastPlay = (Date.now() - game.updatedAt) / (1000 * 60 * 60 * 24);
    let ema = game.ema ?? 0.5;

    if (daysSinceLastPlay > 3) {
        // Decay strength increases the longer they are away, pulling toward 0.5 baseline
        const decayFactor = clamp((daysSinceLastPlay - 3) * 0.05, 0, 0.4);
        ema = ema * (1 - decayFactor) + (0.5 * decayFactor);
    }
    return ema;
};

const getTuningFor = (id, model) => {
    const game = getGameState(model, id);
    const decayedEma = applyTimeDecay(game);
    let difficulty = resolveDifficulty(decayedEma);
    let level = resolveDifficultyLevel(decayedEma);

    // Feature: Difficulty Overrides from Parent Settings
    try {
        const stored = localStorage.getItem('parent-settings-extended');
        if (stored) {
            const parsed = JSON.parse(stored);
            const override = parsed.difficultyOverrides?.[id];
            if (override && override !== 'auto') {
                difficulty = override;
                level = difficulty === 'hard' ? 5 : difficulty === 'medium' ? 3 : 1;
            }
        }
    } catch { }

    const config = GAME_CONFIG[id] || {};
    const tuning = { difficulty, level };

    Object.keys(config).forEach((key) => {
        const values = config[key];
        if (values && typeof values === 'object') {
            tuning[key] = values[difficulty] ?? values.medium;
        }
    });

    return tuning;
};

/** Returns the current adaptive tuning values for a game or trainer surface. */
export const getGameTuning = async (id) => {
    const model = await getModel();
    return getTuningFor(id, model);
};

/** Incorporates a result into the adaptive model and emits the next tuning. */
export const updateGameResult = async (id, payload = {}) => {
    if (!id) return null;
    const model = await getModel();
    const game = getGameState(model, id);
    const normalized = normalizeScore(payload);

    // Feature: Spaced Repetition - calculate decay before applying new score
    game.ema = applyTimeDecay(game);

    // Feature: Discrete Stepping (Spec constraint)
    // +1 step if >85%, -1 step if <50%, hold otherwise.
    if (!game.samples) {
        // Calibrate first play directly
        game.ema = normalized;
    } else if (normalized > 0.85) {
        // Step up (levels are 0.2 apart)
        game.ema = clamp(game.ema + 0.2, 0, 1);
    } else if (normalized < 0.50) {
        // Step down
        game.ema = clamp(game.ema - 0.2, 0, 1);
    }
    // "hold otherwise" means we do not alter game.ema if between 0.50 and 0.85

    game.samples += 1;
    game.lastScore = normalized;
    game.updatedAt = Date.now();
    scheduleSave(model);
    const tuning = getTuningFor(id, model);
    const entry = {
        type: 'adaptive',
        id,
        timestamp: Date.now(),
        difficulty: tuning.difficulty,
        level: tuning.level,
        score: payload.score,
        accuracy: payload.accuracy,
        stars: payload.stars,
        ema: game.ema,
        samples: game.samples,
    };
    logDecision(entry).catch(() => { });
    emitEvent(ML_UPDATE, entry);
    return tuning;
};

/** Returns a summary of the adaptive model plus recent adaptive events. */
export const getAdaptiveSummary = async () => {
    const [model, events] = await Promise.all([getModel(), loadLogs()]);
    const last = events.at(-1) || null;
    const byId = events.reduce((acc, event) => {
        if (!event?.id) return acc;
        acc[event.id] = (acc[event.id] || 0) + 1;
        return acc;
    }, {});
    return {
        model,
        total: events.length,
        last,
        counts: byId,
    };
};

/** Returns the persisted adaptive decision log. */
export const getAdaptiveLog = async () => loadLogs();

/** Clears the adaptive model and log, then broadcasts an adaptive reset event. */
export const resetAdaptiveModel = async () => {
    cachedModel = null;
    await Promise.all([
        removeJSON(MODEL_KEY),
        removeJSON(LOG_KEY),
    ]);
    emitEvent(ML_RESET);
};
