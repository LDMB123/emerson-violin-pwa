import {
    applyDuetCorrectTurn,
    applyDuetIncorrectTurn,
} from './duet-challenge-turn.js';

export const resolveDuetChallengeTapTurn = ({
    note,
    sequence,
    seqIndex,
    combo,
    score,
    comboTarget,
    round,
    mistakes,
}) => {
    if (note === sequence[seqIndex]) {
        const nextState = applyDuetCorrectTurn({
            combo,
            score,
            seqIndex,
            sequence,
            comboTarget,
            round,
        });
        return {
            matched: true,
            combo: nextState.combo,
            score: nextState.score,
            seqIndex: nextState.seqIndex,
            round: nextState.round,
            prompt: nextState.prompt,
            markStep2: nextState.markStep2,
            markStep3: nextState.markStep3,
            markStep4: nextState.markStep4,
            completedRound: nextState.completedRound,
        };
    }

    const nextState = applyDuetIncorrectTurn({ mistakes });
    return {
        matched: false,
        combo: nextState.combo,
        seqIndex: nextState.seqIndex,
        mistakes: nextState.mistakes,
        prompt: nextState.prompt,
    };
};
