import { createSequenceGame } from './sequence-game.js';

const { update, bind } = createSequenceGame({
    id: 'string-quest',
    prefix: 'string',
    viewId: '#view-game-string-quest',
    buttonClass: '.string-btn',
    btnDataAttr: 'stringBtn',
    targetDataAttr: 'stringTarget',
    statusKey: 'prompt',
    comboTarget: 8,
    baseScore: 20,
    comboMult: 3,
    missPenalty: 5,
    noteOptions: { duration: 0.28, volume: 0.22, type: 'triangle' },
    seqOptions: { tempo: 140, gap: 0.1, duration: 0.2, volume: 0.14, type: 'sine' },
    completionChecklistId: 'sq-step-3',
    comboChecklistId: 'sq-step-4',
    stepPrefix: 'sq',
    stepScore: 30,
    onCorrectHit(note, state) {
        if (note === 'G') state.markChecklist('sq-step-1');
        if (state.lastCorrectNote === 'D' && note === 'A') state.markChecklist('sq-step-2');
        state.lastCorrectNote = note;
    },
});

export { update, bind };
