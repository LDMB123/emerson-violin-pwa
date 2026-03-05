import { SOUNDS_CHANGE, ML_UPDATE, ML_RESET } from '../utils/event-names.js';
import { bindHiddenAndPagehide, bindVisibleVisibilityChange } from '../utils/lifecycle-utils.js';
import { runIfSoundDisabled } from '../utils/sound-state.js';

export const attachTrainerGlobalListeners = ({
    metronomeController,
    drillsController,
    isPracticeView,
    refreshTrainerTuningById,
    onMlReset,
}) => {
    const stopAndReportMetronome = () => {
        metronomeController.report();
        metronomeController.stop({ silent: true });
    };

    bindHiddenAndPagehide({
        onHidden: () => {
            metronomeController.pauseForVisibility?.();
        },
        onPagehide: () => {
            stopAndReportMetronome();
            drillsController.handlePagehide();
        },
    });

    bindVisibleVisibilityChange(() => {
        if (!isPracticeView()) {
            return;
        }
        metronomeController.resumeForVisibility?.();
    });

    window.addEventListener('hashchange', () => {
        if (!isPracticeView()) {
            stopAndReportMetronome();
        }
        drillsController.handleHashChange(window.location.hash);
    }, { passive: true });

    document.addEventListener(SOUNDS_CHANGE, (event) => {
        runIfSoundDisabled(event, () => {
            metronomeController.stop({ silent: true });
            metronomeController.setStatus('Sounds are off.');
        });
    });

    document.addEventListener(ML_UPDATE, (event) => {
        refreshTrainerTuningById(event.detail?.id);
    });

    document.addEventListener(ML_RESET, onMlReset);
};
