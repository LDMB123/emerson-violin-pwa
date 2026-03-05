import { handleSequenceGameTap } from './sequence-game-input.js';
import { RT_STATE } from '../utils/event-names.js';
import { createDefaultTuningHitDetector, getActiveTuningFeature } from '../utils/tuning-utils.js';
import { buildSequenceTapPayload } from './sequence-game-tap-context.js';


/** Binds microphone controls for a Sequence Game view. */
export const bindSequenceGameMicrophone = ({
    hashId,
    getRuntimeState,
    tapContext,
    applyTapResult,
}) => {
    const hitDetector = createDefaultTuningHitDetector();

    const onRealtimeState = (event) => {
        if (window.location.hash !== hashId) return;
        const tuningFeature = getActiveTuningFeature(event);
        if (!tuningFeature) return;

        const runtimeState = getRuntimeState();
        const sequence = runtimeState.sequence;
        if (!Array.isArray(sequence) || sequence.length === 0) return;

        const targetNote = sequence[runtimeState.seqIndex];
        if (!targetNote) return;

        // Delegate hit detection to our utility
        if (!hitDetector.detectHit(tuningFeature, targetNote)) {
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
