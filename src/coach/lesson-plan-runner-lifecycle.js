import {
    ML_UPDATE,
    ML_RESET,
    ML_RECS,
    MISSION_UPDATED,
} from '../utils/event-names.js';
import { setRunnerControls } from './lesson-plan-runner-view.js';

/** Sets up lesson runner listeners and returns a teardown function. */
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
    const documentListeners = [
        [ML_UPDATE, onMlUpdate],
        [ML_RESET, onMlReset],
        [ML_RECS, onMlRecs],
        [MISSION_UPDATED, onMissionUpdated],
    ];
    documentListeners.forEach(([eventName, handler]) => {
        if (typeof handler === 'function') {
            document.addEventListener(eventName, handler);
        }
    });

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
            setRunnerControls({ startButton }, { startLabel: 'Start' });
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
        documentListeners.forEach(([eventName, handler]) => {
            if (typeof handler === 'function') {
                document.removeEventListener(eventName, handler);
            }
        });
        window.removeEventListener('hashchange', onHashChange);
        document.removeEventListener('visibilitychange', onVisibility);
    };
};
