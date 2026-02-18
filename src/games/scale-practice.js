import {
    readLiveNumber,
    markChecklist,
    markChecklistIf,
    setDifficultyBadge,
    recordGameEvent,
    attachTuning,
    bindTap,
    playToneNote,
} from './shared.js';
import { clamp, deviationAccuracy } from '../utils/math.js';

const updateScalePractice = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-scale-practice input[id^="sp-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = document.querySelector('[data-scale="score"]');
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    if (scoreEl) scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : checked * 28);
};

const bindScalePractice = (difficulty = { speed: 1.0, complexity: 1 }) => {
    const stage = document.querySelector('#view-game-scale-practice');
    if (!stage) return;
    const slider = stage.querySelector('[data-scale="slider"]');
    const tempoEl = stage.querySelector('[data-scale="tempo"]');
    const statusEl = stage.querySelector('[data-scale="status"]');
    const scoreEl = stage.querySelector('[data-scale="score"]');
    const tapButton = stage.querySelector('[data-scale="tap"]');
    const ratingEl = stage.querySelector('[data-scale="rating"]');
    const tempoTags = new Set();
    const scaleNotes = ['G', 'A', 'B', 'C', 'D', 'E', 'F#', 'G'];
    // difficulty.speed: scales targetTempo; speed=1.0 keeps targetTempo=85 (current behavior)
    // difficulty.complexity: visual feedback only for this game (single scale, no content pool to select)
    let targetTempo = Math.round(85 * difficulty.speed);
    let reported = false;
    let lastTap = 0;
    let score = 0;
    let scaleIndex = 0;
    const timingScores = [];

    const updateTempo = () => {
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

    const reportResult = attachTuning('scale-practice', (tuning) => {
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
    });

    const reportSession = (accuracy, score) => {
        if (reported) return;
        reported = true;
        recordGameEvent('scale-practice', { accuracy, score });
    };

    const resetSession = () => {
        score = 0;
        lastTap = 0;
        scaleIndex = 0;
        timingScores.length = 0;
        reported = false;
        if (scoreEl) scoreEl.textContent = '0';
        if (ratingEl) ratingEl.textContent = 'Timing: --';
    };

    slider?.addEventListener('input', () => {
        if (slider) slider.dataset.userSet = 'true';
        scaleIndex = 0;
        updateTempo();
    });
    slider?.addEventListener('change', () => {
        const tempo = slider ? Number.parseInt(slider.value, 10) : 0;
        const accuracy = deviationAccuracy(tempo, targetTempo);
        reportResult({ accuracy, score: tempo });
        reportSession(accuracy, tempo);
    });

    bindTap(tapButton, () => {
        const now = performance.now();
        if (lastTap) {
            const interval = now - lastTap;
            const ideal = 60000 / targetTempo;
            const deviation = Math.abs(interval - ideal);
            const timingScore = clamp(1 - deviation / ideal, 0, 1);
            timingScores.push(timingScore);
            if (timingScores.length > 8) timingScores.shift();
            let label = 'Off';
            if (timingScore >= 0.9) label = 'Perfect';
            else if (timingScore >= 0.75) label = 'Great';
            else if (timingScore >= 0.6) label = 'Good';
            score += Math.round(8 + timingScore * 12);
            if (scoreEl) scoreEl.textContent = String(score);
            if (ratingEl) ratingEl.textContent = `Timing: ${label}`;
            if (timingScore >= 0.75) markChecklist('sp-step-2');
            if (timingScore >= 0.6) markChecklist('sp-step-1');
            if (timingScore >= 0.9) markChecklist('sp-step-4');
            if (timingScore >= 0.75) {
                const note = scaleNotes[scaleIndex % scaleNotes.length];
                playToneNote(note, { duration: 0.22, volume: 0.18, type: 'triangle' });
                scaleIndex += 1;
            } else if (timingScore > 0) {
                playToneNote('F', { duration: 0.18, volume: 0.12, type: 'sawtooth' });
            }
            const accuracy = clamp((timingScores.reduce((sum, value) => sum + value, 0) / timingScores.length) * 100, 0, 100);
            reportResult({ accuracy, score });
            if (timingScores.length >= 4) {
                reportSession(accuracy, score);
            }
        }
        lastTap = now;
    });
    updateTempo();

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#view-game-scale-practice') {
            resetSession();
        }
    }, { passive: true });
};

export { updateScalePractice as update, bindScalePractice as bind };
