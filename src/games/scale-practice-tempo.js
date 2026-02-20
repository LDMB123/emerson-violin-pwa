export const applyScalePracticeTempoUpdate = ({
    slider,
    tempoEl,
    statusEl,
    targetTempo,
    tempoTags,
    markChecklist,
    markChecklistIf,
}) => {
    if (!slider || !tempoEl) return;
    const tempo = Number.parseInt(slider.value, 10);
    tempoEl.textContent = `${tempo} BPM`;
    slider.setAttribute('aria-valuenow', String(tempo));
    slider.setAttribute('aria-valuetext', `${tempo} BPM`);
    if (statusEl) statusEl.textContent = `Tempo set to ${tempo} BPM · Goal ${targetTempo} BPM.`;
    if (tempo <= 70) {
        tempoTags.add('slow');
        markChecklist('sp-step-1');
    }
    if (tempo >= 80 && tempo <= 95) {
        tempoTags.add('target');
        markChecklist('sp-step-2');
    }
    if (tempo >= 100) {
        tempoTags.add('fast');
        markChecklist('sp-step-3');
    }
    markChecklistIf(tempoTags.size >= 3, 'sp-step-4');
};
