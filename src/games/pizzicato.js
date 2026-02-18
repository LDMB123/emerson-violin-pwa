import {
    readLiveNumber,
    markChecklist,
    markChecklistIf,
    setDifficultyBadge,
    recordGameEvent,
    attachTuning,
    bindTap,
    playToneNote,
    playToneSequence,
    buildNoteSequence,
    updateScoreCombo,
} from './shared.js';

const updatePizzicato = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-pizzicato input[id^="pz-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = document.querySelector('[data-pizzicato="score"]');
    const comboEl = document.querySelector('[data-pizzicato="combo"]');
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    const liveCombo = readLiveNumber(comboEl, 'liveCombo');
    if (scoreEl) scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : (checked * 40 + (checked === inputs.length ? 40 : 0)));
    if (comboEl) {
        const combo = Number.isFinite(liveCombo) ? liveCombo : checked;
        comboEl.textContent = `x${combo}`;
    }
};

const bindPizzicato = (difficulty = { speed: 1.0, complexity: 1 }) => {
    const stage = document.querySelector('#view-game-pizzicato');
    if (!stage) return;
    const scoreEl = stage.querySelector('[data-pizzicato="score"]');
    const comboEl = stage.querySelector('[data-pizzicato="combo"]');
    const statusEl = stage.querySelector('[data-pizzicato="status"]');
    const sequenceEl = stage.querySelector('[data-pizzicato="sequence"]');
    const buttons = Array.from(stage.querySelectorAll('.pizzicato-btn'));
    const targets = Array.from(stage.querySelectorAll('[data-pizzicato-target]'));
    const notePool = ['G', 'D', 'A', 'E'];
    let sequence = ['G', 'D', 'A', 'E'];
    let seqIndex = 0;
    let combo = 0;
    let score = 0;
    const hitNotes = new Set();
    // difficulty.speed: visual feedback only for this game (no timing loop to scale)
    // difficulty.complexity: adjusts sequence length; complexity=1 (medium) = length 4 (current behavior)
    const complexitySeqLengths = [3, 4, 5];
    const pizzicatoSeqLength = complexitySeqLengths[difficulty.complexity] ?? 4;
    let comboTarget = 6;

    const buildSequence = () => {
        sequence = buildNoteSequence(notePool, pizzicatoSeqLength);
        seqIndex = 0;
    };

    const updateTargets = (message) => {
        const targetNote = sequence[seqIndex];
        targets.forEach((target) => {
            target.classList.toggle('is-target', target.dataset.pizzicatoTarget === targetNote);
        });
        if (statusEl) {
            statusEl.textContent = message || `Target: ${targetNote} string · Combo goal x${comboTarget}.`;
        }
        if (sequenceEl) {
            sequenceEl.textContent = `Sequence: ${sequence.join(' · ')}`;
        }
    };

    const updateScoreboard = () => updateScoreCombo(scoreEl, comboEl, score, combo);

    const reportResult = attachTuning('pizzicato', (tuning) => {
        buildSequence();
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
        updateTargets();
    });

    const reportSession = () => {
        if (score <= 0) return;
        const accuracy = comboTarget ? Math.min(1, combo / comboTarget) * 100 : 0;
        reportResult({ accuracy, score });
        recordGameEvent('pizzicato', { accuracy, score });
    };

    const resetSession = () => {
        combo = 0;
        score = 0;
        seqIndex = 0;
        hitNotes.clear();
        buildSequence();
        updateTargets();
        updateScoreboard();
    };

    updateTargets();

    buttons.forEach((button) => {
        bindTap(button, () => {
            const note = button.dataset.pizzicatoBtn;
            if (note) {
                playToneNote(note, { duration: 0.26, volume: 0.2, type: 'triangle' });
            }
            if (note === sequence[seqIndex]) {
                combo += 1;
                score += 18 + combo * 2;
                seqIndex = (seqIndex + 1) % sequence.length;
                hitNotes.add(note);
                markChecklistIf(hitNotes.size >= 4, 'pz-step-1');
                if (seqIndex === 0) {
                    const completedSequence = sequence.slice();
                    markChecklist('pz-step-2');
                    reportSession();
                    buildSequence();
                    playToneSequence(completedSequence, { tempo: 150, gap: 0.1, duration: 0.18, volume: 0.14, type: 'sine' });
                }
                updateTargets();
            } else {
                combo = 0;
                score = Math.max(0, score - 4);
                updateTargets(`Missed. Aim for ${sequence[seqIndex]} next.`);
            }
            updateScoreboard();
            markChecklistIf(combo >= comboTarget, 'pz-step-3');
        });
    });

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#view-game-pizzicato') {
            resetSession();
            return;
        }
        reportSession();
    }, { passive: true });
};

export { updatePizzicato as update, bindPizzicato as bind };
