export const updateSequenceTargets = ({
    targets,
    targetDataAttr,
    sequence,
    seqIndex,
    comboTarget,
    statusEl,
    message,
    sequenceEl,
}) => {
    const targetNote = sequence[seqIndex];
    targets.forEach((target) => {
        target.classList.toggle(
            'is-target',
            target.dataset[targetDataAttr] === targetNote,
        );
    });
    if (statusEl) {
        statusEl.textContent =
            message || `Target: ${targetNote} string · Combo goal x${comboTarget}.`;
    }
    if (sequenceEl) {
        sequenceEl.textContent = `Sequence: ${sequence.join(' · ')}`;
    }
};
