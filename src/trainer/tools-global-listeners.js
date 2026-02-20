import { SOUNDS_CHANGE, ML_UPDATE, ML_RESET } from '../utils/event-names.js';
import { isBfcachePagehide } from './trainer-utils.js';

export const attachTrainerGlobalListeners = ({
    metronomeController,
    drillsController,
    isPracticeView,
    refreshTrainerTuningById,
    onMlReset,
}) => {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            metronomeController.stop({ silent: true });
        }
    });

    window.addEventListener('pagehide', (event) => {
        if (isBfcachePagehide(event)) return;
        metronomeController.report();
        metronomeController.stop({ silent: true });
        drillsController.handlePagehide();
    });

    window.addEventListener('hashchange', () => {
        if (!isPracticeView()) {
            metronomeController.report();
            metronomeController.stop({ silent: true });
        }
        drillsController.handleHashChange(window.location.hash);
    }, { passive: true });

    document.addEventListener(SOUNDS_CHANGE, (event) => {
        if (event.detail?.enabled === false) {
            metronomeController.stop({ silent: true });
            metronomeController.setStatus('Sounds are off.');
        }
    });

    document.addEventListener(ML_UPDATE, (event) => {
        refreshTrainerTuningById(event.detail?.id);
    });

    document.addEventListener(ML_RESET, onMlReset);
};
