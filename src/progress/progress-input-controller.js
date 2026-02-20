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

export const createProgressInputController = ({
    loadEvents,
    saveEvents,
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

        const entry = {
            type: 'practice',
            id: input.id,
            minutes: minutesForInput(input),
            day: todayDay(),
            timestamp: Date.now(),
        };

        events.push(entry);
        await saveEvents(events);
        document.dispatchEvent(new CustomEvent(practiceRecordedEventName, { detail: entry }));
        await onEventsUpdated(events);
    };

    const recordAchievementEvent = async (id) => {
        if (!id) return;
        const events = await loadEvents();
        const already = collectEventIds(events, 'achievement');
        if (already.has(id)) return;

        events.push({ type: 'achievement', id, day: todayDay(), timestamp: Date.now() });
        await saveEvents(events);
        await onEventsUpdated(events);
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
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;
        if (input.type !== 'checkbox') return;
        if (!input.checked) return;
        if (shouldIgnoreProgressInput(input)) return;

        recordPracticeEvent(input);
        checkMilestoneAchievements();
    };

    return {
        handleChange,
        recordAchievementEvent,
    };
};
