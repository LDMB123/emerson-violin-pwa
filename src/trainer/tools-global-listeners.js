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
    const handleSoundsChange = (event) => {
        runIfSoundDisabled(event, () => {
            metronomeController.stop({ silent: true });
            metronomeController.setStatus('Sounds are off.');
        });
    };
    const handleMlUpdate = (event) => {
        refreshTrainerTuningById(event.detail?.id);
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

    [
        [SOUNDS_CHANGE, handleSoundsChange],
        [ML_UPDATE, handleMlUpdate],
        [ML_RESET, onMlReset],
    ].forEach(([eventName, handler]) => {
        document.addEventListener(eventName, handler);
    });
};
