import { handleSequenceGameTap } from './sequence-game-input.js';
import { RT_STATE } from '../utils/event-names.js';
import { createDefaultTuningHitDetector } from '../utils/tuning-utils.js';
import { buildSequenceTapPayload } from './sequence-game-tap-context.js';


export const bindSequenceGameMicrophone = ({
    hashId,
    getRuntimeState,
    tapContext,
    applyTapResult,
}) => {
    const hitDetector = createDefaultTuningHitDetector();

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

        const nextState = handleSequenceGameTap(
            buildSequenceTapPayload({
                note: targetNote,
                runtimeState,
                tapContext,
            }),
        );
        applyTapResult(nextState);
    };

    document.addEventListener(RT_STATE, onRealtimeState);

    return () => {
        document.removeEventListener(RT_STATE, onRealtimeState);
    };
};
