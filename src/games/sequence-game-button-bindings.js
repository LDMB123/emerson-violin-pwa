import { bindTap } from './shared.js';
import { handleSequenceGameTap } from './sequence-game-input.js';
import { RT_STATE } from '../utils/event-names.js';

export const bindSequenceGameButtons = ({
    buttons,
    btnDataAttr,
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
    buttons.forEach((button) => {
        bindTap(button, () => {
            const note = button.dataset[btnDataAttr];
            const runtimeState = getRuntimeState();
            const nextState = handleSequenceGameTap({
                note,
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
        });
    });
};

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
    let debounceStart = 0;
    let lastPlayedNote = null;

    const onRealtimeState = (event) => {
        if (window.location.hash !== hashId) return;
        const tuning = event.detail?.lastFeature;
        if (!tuning || event.detail?.paused) return;

        const runtimeState = getRuntimeState();
        if (!runtimeState.sequence || runtimeState.sequence.length === 0) return;

        const targetNote = runtimeState.sequence[runtimeState.seqIndex];
        if (!targetNote) return;

        const cents = Math.round(tuning.cents || 0);
        const currentNote = tuning.note ? tuning.note.replace(/\d+$/, '') : null;

        // If there's no note, or it's out of tune, or it is the wrong note, bail
        if (!currentNote || Math.abs(cents) >= 20 || currentNote !== targetNote) {
            debounceStart = 0;
            if (!currentNote) {
                lastPlayedNote = null; // They stopped playing, allow a new articulation
            }
            return;
        }

        // We hear the target note in tune!
        // Prevent continuous rapid-firing if they hold the note
        if (lastPlayedNote === currentNote) {
            // Require them to hold it for at least 300ms to count as a deliberate "tap" 
            // if they just arrived at this target note and hadn't stopped playing.
            if (debounceStart === 0) {
                debounceStart = Date.now();
                return;
            }
            if (Date.now() - debounceStart < 300) {
                return;
            }
        }

        // Emulate a perfect tap of the target note!
        lastPlayedNote = currentNote;
        debounceStart = 0;

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
