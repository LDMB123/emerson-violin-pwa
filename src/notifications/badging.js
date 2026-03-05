import { PROGRESS_KEY } from '../persistence/storage-keys.js';
import { PRACTICE_RECORDED, LESSON_STEP } from '../utils/event-names.js';
import { getJSON } from '../persistence/storage.js';

/**
 * Badging API
 *
 * Shows an app icon badge when no practice time has been logged for today.
 * Availability is always checked via feature detection before use.
 */

const supportsBadging = () => {
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

const updatePracticeBadge = async () => {
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

const handleVisibilityChange = () => {
    const isHidden = document.visibilityState === 'hidden';
    if (!isHidden) return;
    updatePracticeBadge();
};

const addListener = ([target, eventName, listener]) => {
    target.addEventListener(eventName, listener);
};

const badgeRefreshListeners = [
    [document, 'visibilitychange', handleVisibilityChange],
    [document, PRACTICE_RECORDED, updatePracticeBadge],
    [document, LESSON_STEP, updatePracticeBadge],
];

const initializeBadging = () => {
    if (!supportsBadging()) return;

    badgeRefreshListeners.forEach(addListener);

    if (document.visibilityState === 'visible') {
        setBadge(0);
    }
};

initializeBadging();
