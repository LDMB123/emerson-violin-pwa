import { RT_STATE } from '../../utils/event-names.js';

export const createRhythmDashBindingState = ({ lifecycle }) => {
    let realtimeStateHandler = null;
    let tuningReport = null;

    const cleanup = () => {
        lifecycle.cleanup();
        if (realtimeStateHandler) {
            document.removeEventListener(RT_STATE, realtimeStateHandler);
            realtimeStateHandler = null;
        }
        if (tuningReport?.dispose) {
            tuningReport.dispose();
        }
        tuningReport = null;
    };

    return {
        cleanup,
        setRealtimeStateHandler: (handler) => {
            realtimeStateHandler = handler;
        },
        getTuningReport: () => tuningReport,
        setTuningReport: (nextTuningReport) => {
            tuningReport = nextTuningReport;
        },
    };
};
