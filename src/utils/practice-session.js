export const PRACTICE_DATE_KEY = 'panda-violin:last-practice-date';
export const PRACTICE_TIME_KEY = 'panda-violin:last-practice-time';
export const FIRST_MISSION_COMPLETE_KEY = 'panda-violin:first-mission-completed';
const LEGACY_PRACTICE_DATE_KEY = 'last-practice-date';
const LEGACY_PRACTICE_TIME_KEY = 'last-practice-time';
const LEGACY_FIRST_MISSION_COMPLETE_KEY = 'first-mission-completed';

const readStorageValue = (storage, key) => {
    if (!storage) return null;
    const rawValue = storage.getItem(key);
    if (typeof rawValue !== 'string') return null;
    try {
        return JSON.parse(rawValue);
    } catch {
        return rawValue;
    }
};

const toDayStamp = (value) => {
    if (value instanceof Date) return value.toDateString();
    const parsed = new Date(value || Date.now());
    return parsed.toDateString();
};

const readFirstDefinedValue = (storage, keys) => {
    for (const key of keys) {
        const value = readStorageValue(storage, key);
        if (value !== null && value !== undefined && value !== '') {
            return value;
        }
    }
    return null;
};

const isCompletedFlag = (value) => (
    value === true
    || value === 'true'
    || value === 1
    || value === '1'
);

const isSamePracticeDay = (value, now) => {
    if (value === null || value === undefined || value === '') return false;

    const nextDayStamp = toDayStamp(now);
    if (value === nextDayStamp) return true;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return false;
    return toDayStamp(parsed) === nextDayStamp;
};

/** Returns the learner's current practice-session state from local storage. */
export const getPracticeSessionState = (storage = globalThis?.localStorage, now = new Date()) => {
    const lastPracticeDate = readFirstDefinedValue(storage, [
        PRACTICE_DATE_KEY,
        LEGACY_PRACTICE_DATE_KEY,
    ]);
    const lastPracticeTime = Number(readFirstDefinedValue(storage, [
        PRACTICE_TIME_KEY,
        LEGACY_PRACTICE_TIME_KEY,
    ]) || 0);
    const hasCompletedFirstMission = isCompletedFlag(readFirstDefinedValue(storage, [
        FIRST_MISSION_COMPLETE_KEY,
        LEGACY_FIRST_MISSION_COMPLETE_KEY,
    ]));

    const practicedToday = isSamePracticeDay(lastPracticeDate, now);

    const hoursSinceLastPractice = lastPracticeTime > 0
        ? ((now instanceof Date ? now.getTime() : Date.now()) - lastPracticeTime) / (1000 * 60 * 60)
        : Infinity;

    return {
        practicedToday,
        streakAtRisk: hoursSinceLastPractice > 24 && hoursSinceLastPractice < 48,
        hasCompletedFirstMission,
        lastPracticeDate,
        lastPracticeTime,
    };
};

/** Persists a completed practice session so Home and badges stay in sync. */
export const markPracticeSessionComplete = (storage = globalThis?.localStorage, now = new Date()) => {
    if (!storage) return;
    const timestamp = now instanceof Date ? now.getTime() : Date.now();
    storage.setItem(PRACTICE_DATE_KEY, JSON.stringify(toDayStamp(now)));
    storage.setItem(PRACTICE_TIME_KEY, JSON.stringify(timestamp));
    storage.setItem(FIRST_MISSION_COMPLETE_KEY, JSON.stringify(true));
};
