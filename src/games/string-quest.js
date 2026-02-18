import {
    cachedEl,
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

const stringScoreEl = cachedEl('[data-string="score"]');
const stringComboEl = cachedEl('[data-string="combo"]');

const updateStringQuest = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-string-quest input[id^="sq-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = stringScoreEl();
    const comboEl = stringComboEl();
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    const liveCombo = readLiveNumber(comboEl, 'liveCombo');
    if (scoreEl) {
        scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : (checked * 30 + (checked === inputs.length ? 30 : 0)));
    }
    if (comboEl) {
        const combo = Number.isFinite(liveCombo) ? liveCombo : checked;
        comboEl.textContent = `x${combo}`;
    }
};

const bindStringQuest = (difficulty = { speed: 1.0, complexity: 1 }) => {
    const stage = document.querySelector('#view-game-string-quest');
    if (!stage) return;
    const scoreEl = stage.querySelector('[data-string="score"]');
    const comboEl = stage.querySelector('[data-string="combo"]');
    const promptEl = stage.querySelector('[data-string="prompt"]');
    const sequenceEl = stage.querySelector('[data-string="sequence"]');
    const buttons = Array.from(stage.querySelectorAll('.string-btn'));
    const targets = Array.from(stage.querySelectorAll('[data-string-target]'));
    const notePool = ['G', 'D', 'A', 'E'];
    let sequence = ['G', 'D', 'A', 'E'];
    let seqIndex = 0;
    let combo = 0;
    let score = 0;
    let lastCorrectNote = null;
    // difficulty.speed: visual feedback only for this game (no timing loop to scale)
    // difficulty.complexity: adjusts sequenceLength; complexity=1 (medium) = 4 notes (current behavior)
    const complexitySeqLengths = [3, 4, 5];
    let comboTarget = 8;
    let sequenceLength = complexitySeqLengths[difficulty.complexity] ?? 4;

    const buildSequence = () => {
        sequence = buildNoteSequence(notePool, sequenceLength);
        seqIndex = 0;
    };

    const updateTargets = (message) => {
        const targetNote = sequence[seqIndex];
        targets.forEach((target) => {
            target.classList.toggle('is-target', target.dataset.stringTarget === targetNote);
        });
        if (promptEl) {
            promptEl.textContent = message || `Target: ${targetNote} string · Combo goal x${comboTarget}.`;
        }
        if (sequenceEl) {
            sequenceEl.textContent = `Sequence: ${sequence.join(' · ')}`;
        }
    };

    const updateScoreboard = () => updateScoreCombo(scoreEl, comboEl, score, combo);

    const reportResult = attachTuning('string-quest', (tuning) => {
        comboTarget = tuning.comboTarget ?? comboTarget;
        buildSequence();
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
        updateTargets();
    });

    const reportSession = () => {
        if (score <= 0) return;
        const accuracy = comboTarget ? Math.min(1, combo / comboTarget) * 100 : 0;
        reportResult({ accuracy, score });
        recordGameEvent('string-quest', { accuracy, score });
    };

    const resetSession = () => {
        combo = 0;
        score = 0;
        seqIndex = 0;
        lastCorrectNote = null;
        buildSequence();
        updateTargets();
        updateScoreboard();
    };

    updateTargets();

    buttons.forEach((button) => {
        bindTap(button, () => {
            const note = button.dataset.stringBtn;
            if (note) {
                playToneNote(note, { duration: 0.28, volume: 0.22, type: 'triangle' });
            }
            if (note === sequence[seqIndex]) {
                combo += 1;
                score += 20 + combo * 3;
                seqIndex = (seqIndex + 1) % sequence.length;
                if (note === 'G') markChecklist('sq-step-1');
                if (lastCorrectNote === 'D' && note === 'A') {
                    markChecklist('sq-step-2');
                }
                if (seqIndex === 0) {
                    const completedSequence = sequence.slice();
                    markChecklist('sq-step-3');
                    reportSession();
                    buildSequence();
                    playToneSequence(completedSequence, { tempo: 140, gap: 0.1, duration: 0.2, volume: 0.14, type: 'sine' });
                }
                lastCorrectNote = note;
                updateTargets();
            } else {
                combo = 0;
                score = Math.max(0, score - 5);
                updateTargets(`Missed. Aim for ${sequence[seqIndex]} next.`);
            }
            updateScoreboard();
            markChecklistIf(combo >= comboTarget, 'sq-step-4');
        });
    });

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#view-game-string-quest') {
            resetSession();
            return;
        }
        reportSession();
    }, { passive: true });
};

export { updateStringQuest as update, bindStringQuest as bind };
