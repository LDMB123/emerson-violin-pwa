import { createSequenceGame } from './sequence-game.js';

const { update, bind } = createSequenceGame({
    id: 'pizzicato',
    prefix: 'pizzicato',
    viewId: '#view-game-pizzicato',
    buttonClass: '.pizzicato-btn',
    btnDataAttr: 'pizzicatoBtn',
    targetDataAttr: 'pizzicatoTarget',
    statusKey: 'status',
    comboTarget: 6,
    baseScore: 18,
    comboMult: 2,
    missPenalty: 4,
    noteOptions: { duration: 0.26, volume: 0.2, type: 'triangle' },
    seqOptions: { tempo: 150, gap: 0.1, duration: 0.18, volume: 0.14, type: 'sine' },
    completionChecklistId: 'pz-step-2',
    comboChecklistId: 'pz-step-3',
    stepPrefix: 'pz',
    stepScore: 40,
    onCorrectHit(note, state) {
        state.hitNotes.add(note);
        state.markChecklistIf(state.hitNotes.size >= 4, 'pz-step-1');
    },
});

export { update, bind };
