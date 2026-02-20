import { applyRealtimeRhythmFrame } from './helpers.js';

export const createRhythmDashRealtimeHandler = ({
    expectedHash,
    runToggle,
    setStatus,
    getBeatInterval,
    realtimeTempoHistory,
    suggestedEl,
    bpmEl,
    processBeat,
    getTargetBpm,
    setRealtimeListening,
}) => (event) => {
    if (window.location.hash !== expectedHash) return;
    const detail = event.detail || {};
    const realtimeListening = applyRealtimeRhythmFrame({
        detail,
        runToggle,
        setStatus,
        beatInterval: getBeatInterval(),
        realtimeTempoHistory,
        suggestedEl,
        bpmEl,
        processBeat,
        targetBpm: getTargetBpm(),
    });
    setRealtimeListening(realtimeListening);
};
