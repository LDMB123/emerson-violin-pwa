import {
    cachedEl,
    readLiveNumber,
    setLiveNumber,
    markChecklistIf,
    setDifficultyBadge,
    recordGameEvent,
    attachTuning,
    bindTap,
    playToneNote,
    playToneSequence,
} from './shared.js';
import { clamp } from '../utils/math.js';

const painterScoreEl = cachedEl('[data-painter="score"]');
const painterCreativityEl = cachedEl('[data-painter="creativity"]');

const updateRhythmPainter = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-rhythm-painter input[id^="rp-pattern-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = painterScoreEl();
    const creativityEl = painterCreativityEl();
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    const liveCreativity = readLiveNumber(creativityEl, 'liveCreativity');
    const creativity = Math.min(100, checked * 25);

    if (scoreEl) scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : checked * 120);
    if (creativityEl) {
        const value = Number.isFinite(liveCreativity) ? liveCreativity : creativity;
        creativityEl.textContent = `${value}%`;
    }
};

const bindRhythmPainter = (difficulty = { speed: 1.0, complexity: 1 }) => {
    const stage = document.querySelector('#view-game-rhythm-painter');
    if (!stage) return;
    const dots = Array.from(stage.querySelectorAll('.paint-dot'));
    const scoreEl = stage.querySelector('[data-painter="score"]');
    const creativityEl = stage.querySelector('[data-painter="creativity"]');
    const roundsEl = stage.querySelector('[data-painter="rounds"]');
    const meter = stage.querySelector('.painter-meter');
    const statusEl = stage.querySelector('[data-painter="status"]');
    const dotNotes = {
        blue: 'G',
        green: 'D',
        yellow: 'A',
        red: 'E',
    };
    let score = 0;
    let creativity = 0;
    let tapCount = 0;
    let rounds = 0;
    const tappedDots = new Set();
    // difficulty.speed: scales flourish playback tempo; speed=1.0 = 180 BPM (current behavior)
    // difficulty.complexity: adjusts creativityTarget; complexity=1 (medium) = 70 (current behavior)
    const flourishTempo = Math.round(180 * difficulty.speed);
    const complexityCreativityTargets = [50, 70, 90];
    let creativityTarget = complexityCreativityTargets[difficulty.complexity] ?? 70;
    let reported = false;
    let flourishPlayed = false;

    const update = () => {
        setLiveNumber(scoreEl, 'liveScore', score);
        setLiveNumber(creativityEl, 'liveCreativity', creativity, (value) => `${value}%`);
        if (roundsEl) roundsEl.textContent = String(rounds);
        const angle = (creativity / 100) * 180 - 90;
        if (meter) {
            meter.style.setProperty('--painter-angle', `${angle}deg`);
            meter.setAttribute('aria-valuenow', String(Math.round(creativity)));
            meter.setAttribute('aria-valuetext', `${creativity}% creativity`);
        }
        if (statusEl) {
            if (creativity >= creativityTarget) {
                statusEl.textContent = 'Fantastic rhythm flow!';
            } else if (creativity >= 50) {
                statusEl.textContent = 'Nice groove — keep layering.';
            } else {
                statusEl.textContent = 'Tap each dot to paint the beat.';
            }
        }
    };

    const reportResult = attachTuning('rhythm-painter', (tuning) => {
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
        update();
    });

    const reportSession = () => {
        if (reported || tapCount === 0) return;
        reported = true;
        const accuracy = clamp((creativity / creativityTarget) * 100, 0, 100);
        reportResult({ accuracy, score });
        recordGameEvent('rhythm-painter', { accuracy, score });
    };

    const resetSession = () => {
        score = 0;
        creativity = 0;
        tapCount = 0;
        rounds = 0;
        tappedDots.clear();
        reported = false;
        flourishPlayed = false;
        dots.forEach((dot) => dot.classList.remove('is-hit'));
        update();
    };

    dots.forEach((dot) => {
        bindTap(dot, () => {
            score += 30;
            creativity = Math.min(100, score > 0 ? creativity + 8 : creativity);
            tapCount += 1;
            rounds = Math.floor(tapCount / 4);
            const note = dotNotes[dot.dataset.painterDot];
            if (note) {
                playToneNote(note, { duration: 0.2, volume: 0.16, type: 'triangle' });
            }
            tappedDots.add(dot.dataset.painterDot || dot.dataset.painter || dot.className);
            dot.classList.add('is-hit');
            setTimeout(() => dot.classList.remove('is-hit'), 220);
            update();
            markChecklistIf(tappedDots.size >= 4, 'rp-pattern-1');
            markChecklistIf(tapCount >= 4, 'rp-pattern-2');
            markChecklistIf(creativity >= 70, 'rp-pattern-3');
            markChecklistIf(rounds >= 3, 'rp-pattern-4');
            if (creativity >= creativityTarget) {
                if (!flourishPlayed) {
                    flourishPlayed = true;
                    playToneSequence(['G', 'D', 'A', 'E'], { tempo: flourishTempo, gap: 0.08, duration: 0.16, volume: 0.18, type: 'sine' });
                }
                reportSession();
            }
        });
    });

    update();

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#view-game-rhythm-painter') {
            resetSession();
            return;
        }
        reportSession();
    }, { passive: true });
};

export { updateRhythmPainter as update, bindRhythmPainter as bind };
