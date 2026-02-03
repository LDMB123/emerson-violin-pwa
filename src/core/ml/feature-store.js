import { getJSON, setJSON, removeJSON } from '../persistence/storage.js';
import { createFeatureFrame } from './feature-schema.js';

const STORE_KEY = 'panda-violin:ml:features-v1';
const STORE_LIMIT = 300;

let cachedFrames = null;
let loadPromise = null;
let saveTimer = null;

const trimFrames = (frames) => {
    if (!Array.isArray(frames)) return [];
    return frames.slice(-STORE_LIMIT);
};

const persistStore = async (frames) => {
    const payload = {
        updatedAt: Date.now(),
        frames: trimFrames(frames),
    };
    await setJSON(STORE_KEY, payload);
    return payload.frames;
};

export const loadFeatureFrames = async () => {
    if (Array.isArray(cachedFrames)) return cachedFrames;
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
        const stored = await getJSON(STORE_KEY);
        cachedFrames = Array.isArray(stored?.frames) ? stored.frames : [];
        loadPromise = null;
        return cachedFrames;
    })();
    return loadPromise;
};

const scheduleSave = () => {
    if (saveTimer) return;
    const persist = () => {
        saveTimer = null;
        const frames = Array.isArray(cachedFrames) ? cachedFrames : [];
        if (globalThis.scheduler?.postTask) {
            globalThis.scheduler.postTask(() => persistStore(frames), { priority: 'background' });
            return;
        }
        persistStore(frames).catch(() => {});
    };
    saveTimer = window.setTimeout(persist, 200);
};

export const appendFeatureFrame = async (partial = {}) => {
    const frame = createFeatureFrame(partial);
    const frames = await loadFeatureFrames();
    frames.push(frame);
    cachedFrames = trimFrames(frames);
    scheduleSave();
    return cachedFrames;
};

export const resetFeatureFrames = async () => {
    cachedFrames = null;
    loadPromise = null;
    await removeJSON(STORE_KEY);
};

export const getFeatureStoreMeta = async () => {
    const stored = await getJSON(STORE_KEY);
    return {
        updatedAt: stored?.updatedAt || 0,
        count: Array.isArray(stored?.frames) ? stored.frames.length : 0,
        limit: STORE_LIMIT,
    };
};
