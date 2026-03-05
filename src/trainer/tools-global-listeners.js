import { SOUNDS_CHANGE, ML_UPDATE, ML_RESET } from '../utils/event-names.js';
import { bindHiddenAndPagehide } from '../utils/lifecycle-utils.js';
import { isSoundDisabledEvent } from '../utils/sound-state.js';

export const attachTrainerGlobalListeners = ({
    metronomeController,
    drillsController,
    isPracticeView,
    refreshTrainerTuningById,
    onMlReset,
}) => {
    bindHiddenAndPagehide({
        onHidden: () => {
            metronomeController.stop({ silent: true });
        },
        onPagehide: () => {
            metronomeController.report();
            metronomeController.stop({ silent: true });
            drillsController.handlePagehide();
        },
    });

    window.addEventListener('hashchange', () => {
        if (!isPracticeView()) {
            metronomeController.report();
            metronomeController.stop({ silent: true });
        }
        drillsController.handleHashChange(window.location.hash);
    }, { passive: true });

    document.addEventListener(SOUNDS_CHANGE, (event) => {
        if (isSoundDisabledEvent(event)) {
            metronomeController.stop({ silent: true });
            metronomeController.setStatus('Sounds are off.');
        }
    });

    document.addEventListener(ML_UPDATE, (event) => {
        refreshTrainerTuningById(event.detail?.id);
    });

    document.addEventListener(ML_RESET, onMlReset);
};
