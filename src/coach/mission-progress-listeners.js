import {
    GAME_RECORDED,
    LESSON_COMPLETE,
    LESSON_STEP,
    PRACTICE_RECORDED,
    SONG_RECORDED,
} from '../utils/event-names.js';
import { inferGoalFromActivity } from './mission-progress-goals.js';

let listenersBound = false;

export const bindMissionProgressListeners = ({
    handleLessonStep,
    updateMissionStatus,
    handleGoalFromActivity,
    maybeInsertRemediation,
}) => {
    if (listenersBound) return;
    listenersBound = true;

    document.addEventListener(LESSON_STEP, (event) => {
        handleLessonStep(event).catch(() => {});
    });

    document.addEventListener(LESSON_COMPLETE, () => {
        updateMissionStatus();
    });

    document.addEventListener(GAME_RECORDED, (event) => {
        const goalId = inferGoalFromActivity(event);
        handleGoalFromActivity(goalId);
        maybeInsertRemediation(event).catch(() => {});
    });

    document.addEventListener(SONG_RECORDED, (event) => {
        handleGoalFromActivity('goal-song');
        maybeInsertRemediation(event).catch(() => {});
    });

    document.addEventListener(PRACTICE_RECORDED, (event) => {
        const practiceId = event.detail?.id;
        if (typeof practiceId === 'string' && practiceId.startsWith('goal-step-focus-')) {
            handleGoalFromActivity('goal-warmup');
        }
    });
};
