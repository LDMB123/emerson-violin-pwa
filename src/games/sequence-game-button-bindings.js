import { handleSequenceGameTap } from './sequence-game-input.js';
import { RT_STATE } from '../utils/event-names.js';
import { createTuningHitDetector } from '../utils/tuning-utils.js';


export const bindSequenceGameMicrophone = ({
    hashId,
    noteOptions,
    playToneNote,
    getRuntimeState,
    baseScore,
    comboMult,
    missPenalty,
    onCorrectHit,
    callbackState,
    completionChecklistId,
    comboChecklistId,
    comboTarget,
    markChecklist,
    markChecklistIf,
    reportSession,
    buildSequence,
    playToneSequence,
    seqOptions,
    updateTargets,
    updateScoreboard,
    applyTapResult,
}) => {
    const hitDetector = createTuningHitDetector({ centsMargin: 20, debounceMs: 300 });

    const onRealtimeState = (event) => {
        if (window.location.hash !== hashId) return;
        const tuning = event.detail?.lastFeature;
        if (!tuning || event.detail?.paused) return;

        const runtimeState = getRuntimeState();
        if (!runtimeState.sequence || runtimeState.sequence.length === 0) return;

        const targetNote = runtimeState.sequence[runtimeState.seqIndex];
        if (!targetNote) return;

        // Delegate hit detection to our utility
        if (!hitDetector.detectHit(tuning, targetNote)) {
            return;
        }

        const nextState = handleSequenceGameTap({
            note: targetNote,
            noteOptions,
            playToneNote,
            sequence: runtimeState.sequence,
            seqIndex: runtimeState.seqIndex,
            combo: runtimeState.combo,
            score: runtimeState.score,
            misses: runtimeState.misses,
            baseScore,
            comboMult,
            missPenalty,
            onCorrectHit,
            callbackState,
            completionChecklistId,
            comboChecklistId,
            comboTarget,
            markChecklist,
            markChecklistIf,
            reportSession,
            buildSequence,
            playToneSequence,
            seqOptions,
            updateTargets,
            updateScoreboard,
        });
        applyTapResult(nextState);
    };

    document.addEventListener(RT_STATE, onRealtimeState);

    return () => {
        document.removeEventListener(RT_STATE, onRealtimeState);
    };
};
