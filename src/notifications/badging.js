import { PROGRESS_KEY, LESSON_PLAN_KEY, FOCUS_ACTIVE_KEY } from '../persistence/storage-keys.js';

/**
 * Badging API
 *
 * Shows app icon badge for incomplete practice tasks
 * Safari 26.2 / iOS 26.2: SUPPORTED since Safari 17.0
 */

/**
 * Check if Badging API is supported
 * Safari 26.2: SUPPORTED ✅
 * Chrome: SUPPORTED ✅
 */
export const supportsBadging = () => {
    return 'setAppBadge' in navigator && 'clearAppBadge' in navigator;
};

/**
 * Set app badge count
 *
 * @param {number} count - Badge count (0-99 recommended)
 */
export const setBadge = async (count) => {
    if (!supportsBadging()) {
        console.info('[Badging] API not available');
        return false;
    }

    try {
        if (count > 0) {
            await navigator.setAppBadge(count);
            console.info(`[Badging] Set: ${count}`);
        } else {
            await navigator.clearAppBadge();
            console.info('[Badging] Cleared');
        }
        return true;
    } catch (error) {
        console.warn('[Badging] Set failed:', error);
        return false;
    }
};

/**
 * Clear app badge
 */
export const clearBadge = async () => {
    if (!supportsBadging()) {
        return false;
    }

    try {
        await navigator.clearAppBadge();
        console.info('[Badging] Cleared');
        return true;
    } catch (error) {
        console.warn('[Badging] Clear failed:', error);
        return false;
    }
};

/**
 * Update badge based on incomplete practice tasks
 */
export const updatePracticeBadge = async () => {
    const incompleteTasks = await getIncompletePracticeTasks();
    return setBadge(incompleteTasks.length);
};

/**
 * Get incomplete practice tasks
 * From lesson plans, focus sessions, daily goals
 */
const getIncompletePracticeTasks = async () => {
    const tasks = [];

    try {
        // Check daily practice goal
        const today = new Date().toISOString().split('T')[0];
        const practiceToday = await checkPracticeToday(today);
        if (!practiceToday) {
            tasks.push({ type: 'daily-practice', label: 'Practice today' });
        }

        // Check lesson plan progress
        const lessonPlan = await getLessonPlan();
        if (lessonPlan?.steps) {
            const incomplete = lessonPlan.steps.filter((step) => !step.completed);
            tasks.push(
                ...incomplete.map((step) => ({
                    type: 'lesson-step',
                    label: step.title,
                }))
            );
        }

        // Check focus session goal
        const focusGoal = await getFocusGoal();
        if (focusGoal && !focusGoal.completed) {
            tasks.push({ type: 'focus-session', label: focusGoal.label });
        }

        return tasks.slice(0, 9); // Max 9 tasks (badge limit)
    } catch {
        return [];
    }
};

/**
 * Check if practiced today
 */
const checkPracticeToday = async (date) => {
    try {
        const stored = localStorage.getItem(PROGRESS_KEY);
        if (!stored) return false;

        const progress = JSON.parse(stored);
        const todayEntry = progress.days?.find((day) => day.date === date);
        return todayEntry && todayEntry.totalTime > 0;
    } catch {
        return false;
    }
};

/**
 * Get lesson plan
 */
const getLessonPlan = async () => {
    try {
        const stored = localStorage.getItem(LESSON_PLAN_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
};

/**
 * Get focus session goal
 */
const getFocusGoal = async () => {
    try {
        const stored = localStorage.getItem(FOCUS_ACTIVE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
};

/**
 * Initialize badging system
 * Updates badge on visibility change and practice completion
 */
export const initializeBadging = () => {
    if (!supportsBadging()) {
        console.info('[Badging] API not available');
        return;
    }

    // Update badge when app hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            updatePracticeBadge();
        }
    });

    // Update on practice completion
    document.addEventListener('panda:practice-completed', () => {
        updatePracticeBadge();
    });

    // Update on lesson step completion
    document.addEventListener('panda:lesson-step-completed', () => {
        updatePracticeBadge();
    });

    // Clear when app opened
    if (document.visibilityState === 'visible') {
        clearBadge();
    }

    console.info('[Badging] Initialized (Safari 26.2 compatible)');
};

/**
 * Get badging info
 */
export const getBadgingInfo = () => {
    return {
        supported: supportsBadging(),
        safari26Supported: true, // ✅ Since Safari 17.0
        chromeSupported: true, // ✅ Since Chrome 81
    };
};
