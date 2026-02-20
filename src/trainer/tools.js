import { hasAudioContextSupport } from '../audio/audio-context.js';
import { createMetronomeController } from './metronome-controller.js';
import { createDrillsController } from './drills-controller.js';
import {
    bindRangeFillInputs,
    bindTrainerAudioCards,
    resolveTrainerToolElements,
} from './tools-view.js';
import { attachTrainerGlobalListeners } from './tools-global-listeners.js';
import {
    isPracticeView as isPracticeViewUtil,
} from './trainer-utils.js';

let audioCards = [];

let globalListenersBound = false;

const metronomeController = createMetronomeController();
const drillsController = createDrillsController();

const isPracticeView = () => {
    const viewId = window.location.hash.replace('#', '') || 'view-home';
    return isPracticeViewUtil(viewId);
};

const resolveElements = () => {
    const resolved = resolveTrainerToolElements();

    metronomeController.setElements({
        slider: resolved.metronome.slider,
        bpmLabel: resolved.metronome.bpmLabel,
        toggle: resolved.metronome.toggle,
        tap: resolved.metronome.tap,
        status: resolved.metronome.status,
        dialNumber: resolved.metronome.dialNumber,
        visual: resolved.metronome.visual,
    });

    drillsController.setElements(resolved.drills);

    audioCards = resolved.audioCards;
};

const bindRangeInputs = () => bindRangeFillInputs();

const bindAudioCards = () => bindTrainerAudioCards({
    audioCards,
    metronomeController,
});

const refreshMetronomeTuningState = ({ resetUserSet = false } = {}) => {
    metronomeController.refreshTuningState({ resetUserSet });
};

const refreshTrainerTuning = ({ resetMetronomeUserSet = false } = {}) => {
    refreshMetronomeTuningState({ resetUserSet: resetMetronomeUserSet });
    drillsController.refreshTuning();
};

const refreshTrainerTuningById = (id) => {
    if (id === 'trainer-metronome') {
        refreshMetronomeTuningState();
        return;
    }
    drillsController.refreshTuningById(id);
};

const bindGlobalListeners = () => {
    if (globalListenersBound) return;
    globalListenersBound = true;

    attachTrainerGlobalListeners({
        metronomeController,
        drillsController,
        isPracticeView,
        refreshTrainerTuningById,
        onMlReset: () => {
            resolveElements();
            bindRangeInputs();
            metronomeController.bindControls();
            bindAudioCards();
            drillsController.bindControls();
            refreshTrainerTuning({ resetMetronomeUserSet: true });
        },
    });
};

const initTrainerTools = () => {
    resolveElements();
    bindGlobalListeners();

    if (!hasAudioContextSupport()) {
        metronomeController.disableControls('Audio tools are not supported on this device.');
    }

    bindRangeInputs();
    metronomeController.bindControls();
    bindAudioCards();
    drillsController.bindControls();

    metronomeController.updateDisplay();
    metronomeController.syncRunningState();
    drillsController.syncUi();

    refreshTrainerTuning();
};

export const init = initTrainerTools;
