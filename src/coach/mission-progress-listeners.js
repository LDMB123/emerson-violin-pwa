import {
    GAME_RECORDED,
    LESSON_COMPLETE,
    LESSON_STEP,
    PRACTICE_RECORDED,
    SONG_RECORDED,
} from '../utils/event-names.js';
import { inferGoalFromActivity } from './mission-progress-goals.js';

let listenersBound = false;

/** Binds the shared lesson, game, song, and practice listeners for mission progress. */
export const bindMissionProgressListeners = ({
    handleLessonStep,
    updateMissionStatus,
    handleGoalFromActivity,
    maybeInsertRemediation,
}) => {
    const shouldBindListeners = listenersBound !== true;
    if (!shouldBindListeners) return;
    listenersBound = true;

    document.addEventListener(LESSON_STEP, (event) => {
        handleLessonStep(event).catch(() => {});
    });

    document.addEventListener(LESSON_COMPLETE, () => {
        updateMissionStatus();
    });

    const bindRemediationGoalListener = (eventName, resolveGoalId) => {
        document.addEventListener(eventName, (event) => {
            const goalId = resolveGoalId(event);
            handleGoalFromActivity(goalId);
            maybeInsertRemediation(event).catch(() => {});
        });
    };

    bindRemediationGoalListener(GAME_RECORDED, inferGoalFromActivity);
    bindRemediationGoalListener(SONG_RECORDED, () => 'goal-song');

    document.addEventListener(PRACTICE_RECORDED, (event) => {
        const practiceId = event.detail?.id;
        if (typeof practiceId === 'string' && practiceId.startsWith('goal-step-focus-')) {
            handleGoalFromActivity('goal-warmup');
        }
    });
};
