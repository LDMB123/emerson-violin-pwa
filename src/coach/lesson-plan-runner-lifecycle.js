import {
    ML_UPDATE,
    ML_RESET,
    ML_RECS,
    MISSION_UPDATED,
} from '../utils/event-names.js';

export const setupLessonRunnerLifecycle = ({
    stepsList,
    syncStepList,
    stopTimer,
    pauseStep,
    startButton,
    onMlUpdate,
    onMlReset,
    onMlRecs,
    onMissionUpdated,
}) => {
    document.addEventListener(ML_UPDATE, onMlUpdate);
    document.addEventListener(ML_RESET, onMlReset);
    document.addEventListener(ML_RECS, onMlRecs);
    document.addEventListener(MISSION_UPDATED, onMissionUpdated);

    let observer = null;
    if (stepsList) {
        observer = new MutationObserver(() => {
            syncStepList();
        });
        observer.observe(stepsList, { childList: true, subtree: false });
    }

    const onHashChange = () => {
        if (window.location.hash !== '#view-coach') {
            stopTimer();
            if (startButton) startButton.textContent = 'Start';
        }
    };
    const onVisibility = () => {
        if (document.hidden) {
            pauseStep();
        }
    };

    window.addEventListener('hashchange', onHashChange, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
        observer?.disconnect();
        document.removeEventListener(ML_UPDATE, onMlUpdate);
        document.removeEventListener(ML_RESET, onMlReset);
        document.removeEventListener(ML_RECS, onMlRecs);
        document.removeEventListener(MISSION_UPDATED, onMissionUpdated);
        window.removeEventListener('hashchange', onHashChange);
        document.removeEventListener('visibilitychange', onVisibility);
    };
};
