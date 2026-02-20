import { reportSequenceSession } from './sequence-game-reporting.js';
import { createSequenceCallbackState } from './sequence-game-callback-state.js';
import { resetSequenceSessionState } from './sequence-game-reset.js';

export const createSequenceGameSessionHandlers = ({
    id,
    comboTarget,
    reportResult,
    stage,
    difficulty,
    runtime,
    runtimeApi,
    onReset,
    markChecklist,
    markChecklistIf,
    stopTonePlayer,
    buildSequence,
    updateTargets,
    updateScoreboard,
}) => {
    const reportSession = () => {
        reportSequenceSession({
            id,
            score: runtime.score,
            combo: runtime.combo,
            comboTarget,
            reportResult,
            stage,
            difficulty,
            sessionStartedAt: runtime.sessionStartedAt,
            misses: runtime.misses,
        });
    };

    const callbackState = createSequenceCallbackState({
        getCombo: () => runtime.combo,
        getScore: () => runtime.score,
        getSeqIndex: () => runtime.seqIndex,
        getSequence: () => runtime.sequence,
        hitNotes: runtime.hitNotes,
        getLastCorrectNote: () => runtime.lastCorrectNote,
        setLastCorrectNote: (value) => {
            runtimeApi.setLastCorrectNote(value);
        },
        markChecklist,
        markChecklistIf,
    });

    const resetSession = () => {
        resetSequenceSessionState({
            stopTonePlayer,
            resetCoreState: () => {
                runtimeApi.resetCoreState();
            },
            hitNotes: runtime.hitNotes,
            setLastCorrectNote: (value) => {
                runtimeApi.setLastCorrectNote(value);
            },
            setSessionStartedAt: (value) => {
                runtimeApi.setSessionStartedAt(value);
            },
            onReset,
            callbackState,
            buildSequence,
            updateTargets,
            updateScoreboard,
        });
    };

    return {
        reportSession,
        callbackState,
        resetSession,
    };
};
