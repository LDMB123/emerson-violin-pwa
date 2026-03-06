import { emitEvent } from '../utils/event-names.js';
import { getCheckboxInput } from '../utils/dom-utils.js';

const MILESTONE_CHECKS = [
    {
        achievement: 'pitch_perfect',
        ids: ['pq-step-1', 'pq-step-2', 'pq-step-3', 'pq-step-4', 'pq-step-5', 'pq-step-6'],
    },
    {
        achievement: 'rhythm_master',
        ids: ['rd-set-1', 'rd-set-2', 'rd-set-3'],
    },
    {
        achievement: 'bow_hero',
        ids: ['bh-step-1', 'bh-step-2', 'bh-step-3', 'bh-step-4', 'bh-step-5'],
    },
    {
        achievement: 'ear_training',
        ids: ['et-step-1', 'et-step-2', 'et-step-3', 'et-step-4'],
    },
];

const IGNORED_PROGRESS_INPUT_IDS = new Set(['parent-reminder-toggle', 'focus-timer']);
const IGNORED_PROGRESS_INPUT_PREFIXES = ['setting-', 'song-play-'];

const shouldIgnoreProgressInput = (input) => !input.id
    || IGNORED_PROGRESS_INPUT_IDS.has(input.id)
    || IGNORED_PROGRESS_INPUT_PREFIXES.some((prefix) => input.id.startsWith(prefix))
    || input.dataset.progressIgnore === 'true';

/**
 * Creates the progress input controller that records practice events from tracked checkboxes.
 */
export const createProgressInputController = ({
    loadEvents,
    saveEvents,
    appendEvent,
    collectEventIds,
    minutesForInput,
    todayDay,
    practiceRecordedEventName,
    onEventsUpdated,
}) => {
    const recordPracticeEvent = async (input) => {
        const events = await loadEvents();
        const earned = collectEventIds(events, 'practice');
        const allowRepeat = /^goal-step-focus-/.test(input.id);
        if (!allowRepeat && earned.has(input.id)) return;
        const day = todayDay();
        const timestamp = Date.now();

        const entry = {
            type: 'practice',
            id: input.id,
            minutes: minutesForInput(input),
            day,
            timestamp,
        };

        const storedEntry = appendEvent
            ? await appendEvent(entry)
            : entry;
        if (!storedEntry) return;
        const nextEvents = [...events, storedEntry];
        if (!appendEvent) {
            await saveEvents(nextEvents);
        }
        emitEvent(practiceRecordedEventName, storedEntry);
        await onEventsUpdated(nextEvents);
    };

    const recordAchievementEvent = async (id) => {
        if (!id) return;
        const events = await loadEvents();
        const already = collectEventIds(events, 'achievement');
        if (already.has(id)) return;
        const timestamp = Date.now();
        const day = todayDay();

        const storedEntry = appendEvent
            ? await appendEvent({ type: 'achievement', id, timestamp, day })
            : { type: 'achievement', id, timestamp, day };
        if (!storedEntry) return;
        const nextEvents = [...events, storedEntry];
        if (!appendEvent) {
            await saveEvents(nextEvents);
        }
        await onEventsUpdated(nextEvents);
    };

    const checkMilestoneAchievements = () => {
        MILESTONE_CHECKS.forEach(({ achievement, ids }) => {
            const done = ids.every((id) => document.getElementById(id)?.checked);
            if (done) {
                recordAchievementEvent(achievement);
            }
        });
    };

    const handleChange = (event) => {
        const input = getCheckboxInput(event.target, { requireChecked: true });
        if (!input) return;
        if (shouldIgnoreProgressInput(input)) return;

        recordPracticeEvent(input);
        checkMilestoneAchievements();
    };

    return {
        handleChange,
        recordAchievementEvent,
    };
};
