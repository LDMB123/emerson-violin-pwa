import { getJSON, setJSON, removeJSON } from '../persistence/storage.js';

const MODEL_KEY = 'panda-violin:ml:adaptive-v1';
const LOG_KEY = 'panda-violin:ml:events:v1';
const DEFAULT_MODEL = {
    version: 1,
    updatedAt: 0,
    games: {},
};
const LOG_LIMIT = 120;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const GAME_CONFIG = {
    'pitch-quest': {
        tolerance: { easy: 8, medium: 6, hard: 4 },
    },
    'rhythm-dash': {
        targetBpm: { easy: 70, medium: 90, hard: 110 },
    },
    'note-memory': {
        timeLimit: { easy: 60, medium: 45, hard: 35 },
    },
    'ear-trainer': {
        rounds: { easy: 6, medium: 8, hard: 10 },
    },
    'bow-hero': {
        timeLimit: { easy: 120, medium: 105, hard: 90 },
    },
    'scale-practice': {
        targetTempo: { easy: 70, medium: 85, hard: 105 },
    },
    'string-quest': {
        comboTarget: { easy: 4, medium: 6, hard: 8 },
    },
    'pizzicato': {
        comboTarget: { easy: 4, medium: 6, hard: 8 },
    },
    'melody-maker': {
        lengthTarget: { easy: 4, medium: 5, hard: 6 },
    },
    'duet-challenge': {
        comboTarget: { easy: 2, medium: 3, hard: 4 },
    },
    tuner: {
        tolerance: { easy: 10, medium: 8, hard: 6 },
    },
    'coach-focus': {
        focusMinutes: { easy: 5, medium: 10, hard: 15 },
    },
    'trainer-metronome': {
        targetBpm: { easy: 70, medium: 90, hard: 110 },
    },
    'trainer-posture': {
        targetChecks: { easy: 1, medium: 2, hard: 3 },
    },
    'rhythm-painter': {
        creativityTarget: { easy: 55, medium: 70, hard: 85 },
    },
    'story-song': {
        stageSeconds: { easy: 5, medium: 4, hard: 3 },
    },
    'tuning-time': {
        targetStrings: { easy: 2, medium: 3, hard: 4 },
    },
    'bowing-coach': {
        targetSets: { easy: 2, medium: 3, hard: 4 },
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
        if (globalThis.scheduler?.postTask) {
            globalThis.scheduler.postTask(() => setJSON(MODEL_KEY, model), { priority: 'background' });
        } else {
            setJSON(MODEL_KEY, model);
        }
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

const getTuningFor = (id, model) => {
    const game = getGameState(model, id);
    const difficulty = resolveDifficulty(game.ema ?? 0.5);
    const config = GAME_CONFIG[id] || {};
    const tuning = { difficulty };

    Object.keys(config).forEach((key) => {
        const values = config[key];
        if (values && typeof values === 'object') {
            tuning[key] = values[difficulty] ?? values.medium;
        }
    });

    return tuning;
};

export const getGameTuning = async (id) => {
    const model = await getModel();
    return getTuningFor(id, model);
};

export const updateGameResult = async (id, payload = {}) => {
    if (!id) return null;
    const model = await getModel();
    const game = getGameState(model, id);
    const normalized = normalizeScore(payload);
    const alpha = 0.2;
    game.ema = game.samples ? (game.ema * (1 - alpha) + normalized * alpha) : normalized;
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
        score: payload.score,
        accuracy: payload.accuracy,
        stars: payload.stars,
        ema: game.ema,
        samples: game.samples,
    };
    logDecision(entry).catch(() => {});
    document.dispatchEvent(new CustomEvent('panda:ml-update', { detail: entry }));
    return tuning;
};

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

export const getAdaptiveLog = async () => loadLogs();

export const resetAdaptiveModel = async () => {
    cachedModel = null;
    await Promise.all([
        removeJSON(MODEL_KEY),
        removeJSON(LOG_KEY),
    ]);
    document.dispatchEvent(new CustomEvent('panda:ml-reset'));
};
