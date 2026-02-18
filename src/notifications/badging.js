import { PROGRESS_KEY } from '../persistence/storage-keys.js';
import { PRACTICE_RECORDED, LESSON_STEP } from '../utils/event-names.js';
import { getJSON } from '../persistence/storage.js';

/**
 * Badging API
 *
 * Shows app icon badge for incomplete practice tasks
 * Safari 26.2 / iOS 26.2: SUPPORTED since Safari 17.0
 */

export const supportsBadging = () => {
    return 'setAppBadge' in navigator && 'clearAppBadge' in navigator;
};

export const setBadge = async (count) => {
    if (!supportsBadging()) return false;

    try {
        if (count > 0) {
            await navigator.setAppBadge(count);
        } else {
            await navigator.clearAppBadge();
        }
        return true;
    } catch (error) {
        console.warn('[Badging] Set failed:', error);
        return false;
    }
};

export const updatePracticeBadge = async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
        const progress = await getJSON(PROGRESS_KEY);
        const todayEntry = progress?.days?.find((day) => day.date === today);
        const practiceToday = todayEntry && todayEntry.totalTime > 0;
        return setBadge(practiceToday ? 0 : 1);
    } catch {
        return setBadge(0);
    }
};

export const initializeBadging = () => {
    if (!supportsBadging()) return;

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            updatePracticeBadge();
        }
    });

    document.addEventListener(PRACTICE_RECORDED, () => {
        updatePracticeBadge();
    });

    document.addEventListener(LESSON_STEP, () => {
        updatePracticeBadge();
    });

    if (document.visibilityState === 'visible') {
        setBadge(0);
    }
};
