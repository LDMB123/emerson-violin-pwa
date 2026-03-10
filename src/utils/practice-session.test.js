import { describe, expect, it } from 'vitest';
import {
    FIRST_MISSION_COMPLETE_KEY,
    PRACTICE_DATE_KEY,
    PRACTICE_TIME_KEY,
    getPracticeSessionState,
    markPracticeSessionComplete,
} from './practice-session.js';

const createStorage = () => {
    const store = new Map();
    return {
        getItem: (key) => store.get(key) ?? null,
        setItem: (key, value) => store.set(key, value),
        removeItem: (key) => store.delete(key),
        dump: () => store,
    };
};

describe('practice-session', () => {
    it('marks a session complete and reports practiced today', () => {
        const storage = createStorage();
        const now = new Date('2026-03-10T12:00:00.000Z');

        markPracticeSessionComplete(storage, now);

        expect(storage.dump().get(PRACTICE_DATE_KEY)).toBe(JSON.stringify(now.toDateString()));
        expect(storage.dump().get(FIRST_MISSION_COMPLETE_KEY)).toBe(JSON.stringify(true));
        expect(typeof storage.dump().get(PRACTICE_TIME_KEY)).toBe('string');

        const state = getPracticeSessionState(storage, now);
        expect(state.practicedToday).toBe(true);
        expect(state.hasCompletedFirstMission).toBe(true);
    });

    it('falls back to legacy keys from earlier home-state storage', () => {
        const storage = createStorage();
        const now = new Date('2026-03-10T12:00:00.000Z');
        const twentySixHoursAgo = now.getTime() - (26 * 60 * 60 * 1000);

        storage.setItem('last-practice-date', now.toDateString());
        storage.setItem('last-practice-time', String(twentySixHoursAgo));
        storage.setItem('first-mission-completed', 'true');

        const state = getPracticeSessionState(storage, now);
        expect(state.practicedToday).toBe(true);
        expect(state.streakAtRisk).toBe(true);
        expect(state.hasCompletedFirstMission).toBe(true);
    });
});
