import {
    formatStars,
    cachedEl,
    readLiveNumber,
    setLiveNumber,
    markChecklist,
    setDifficultyBadge,
    recordGameEvent,
    attachTuning,
    bindTap,
    playToneNote,
} from './shared.js';
import { clamp } from '../utils/math.js';

const pitchScoreEl = cachedEl('[data-pitch="score"]');
const pitchStarsEl = cachedEl('[data-pitch="stars"]');

const updatePitchQuest = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-pitch-quest input[id^="pq-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const total = inputs.length;
    const scoreEl = pitchScoreEl();
    const starsEl = pitchStarsEl();
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    const liveStars = readLiveNumber(starsEl, 'liveStars');

    if (scoreEl) {
        const score = Number.isFinite(liveScore) ? liveScore : (checked * 15 + (checked === total ? 10 : 0));
        scoreEl.textContent = String(score);
    }

    if (starsEl) {
        const stars = Number.isFinite(liveStars) ? Math.round(liveStars) : Math.min(3, Math.ceil(checked / 2));
        starsEl.textContent = formatStars(stars, 3);
    }
};

const bindPitchQuest = (difficulty = { speed: 1.0, complexity: 1 }) => {
    const stage = document.querySelector('#view-game-pitch-quest');
    if (!stage) return;
    const slider = stage.querySelector('[data-pitch="slider"]');
    const toleranceSlider = stage.querySelector('[data-pitch="tolerance"]');
    const toleranceValue = stage.querySelector('[data-pitch="tolerance-value"]');
    const offsetEl = stage.querySelector('[data-pitch="offset"]');
    const feedbackEl = stage.querySelector('[data-pitch="feedback"]');
    const statusEl = stage.querySelector('[data-pitch="status"]');
    const checkButton = stage.querySelector('[data-pitch="check"]');
    const gauge = stage.querySelector('.pitch-gauge');
    const scoreEl = stage.querySelector('[data-pitch="score"]');
    const starsEl = stage.querySelector('[data-pitch="stars"]');
    const stabilityEl = stage.querySelector('[data-pitch="stability"]');
    const targets = Array.from(stage.querySelectorAll('.pitch-target-toggle'));
    const checklist = Array.from(stage.querySelectorAll('input[id^="pq-step-"]'));

    let score = readLiveNumber(scoreEl, 'liveScore') ?? 0;
    let stars = readLiveNumber(starsEl, 'liveStars') ?? 0;
    let streak = 0;
    let stabilityStreak = 0;
    let lastMatchAt = 0;
    // difficulty.speed: scales initial tolerance window; speed=1.0 keeps tolerance=6
    // difficulty.complexity: visual feedback only for this game (no content pool to select)
    let tolerance = Math.round(6 * difficulty.speed);
    let attempts = 0;
    let hits = 0;
    let reported = false;

    const targetNoteFromInput = (input) => {
        const raw = input?.id?.split('-').pop();
        return raw ? raw.toUpperCase() : null;
    };

    const updateTolerance = (value, { user = false } = {}) => {
        const next = clamp(Number(value) || tolerance, 3, 12);
        tolerance = next;
        if (toleranceValue) toleranceValue.textContent = `±${next}¢`;
        if (toleranceSlider) {
            toleranceSlider.value = String(next);
            toleranceSlider.setAttribute('aria-valuenow', String(next));
            toleranceSlider.setAttribute('aria-valuetext', `±${next} cents`);
            if (user) toleranceSlider.dataset.userSet = 'true';
        }
        updateTargetStatus();
        if (slider) setOffset(slider.value);
    };

    const setOffset = (raw) => {
        const cents = clamp(Number(raw) || 0, -50, 50);
        const angle = cents * 0.5;
        if (slider) {
            const sign = cents > 0 ? '+' : '';
            slider.setAttribute('aria-valuenow', String(cents));
            slider.setAttribute('aria-valuetext', `${sign}${cents} cents`);
        }
        if (gauge) gauge.style.setProperty('--pitch-offset', `${angle}deg`);
        if (offsetEl) {
            const sign = cents > 0 ? '+' : '';
            offsetEl.textContent = `${sign}${cents} cents`;
        }
        if (feedbackEl) {
            if (Math.abs(cents) <= tolerance) {
                feedbackEl.textContent = `In tune (±${tolerance}¢) ✨`;
            } else if (cents > 0) {
                feedbackEl.textContent = 'A little sharp — ease it down.';
            } else {
                feedbackEl.textContent = 'A little flat — lift it up.';
            }
        }
        return cents;
    };

    const updateTargetStatus = () => {
        if (!statusEl) return;
        const active = targets.find((radio) => radio.checked);
        if (!active) {
            statusEl.textContent = 'Pick a target note.';
            return;
        }
        const note = active.id.split('-').pop()?.toUpperCase() || '';
        statusEl.textContent = note ? `Target: ${note} · ±${tolerance}¢` : 'Pick a target note.';
    };

    const reportResult = attachTuning('pitch-quest', (tuning) => {
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
        updateTargetStatus();
    });

    const reportSession = () => {
        if (reported || attempts === 0) return;
        reported = true;
        const accuracy = attempts ? (hits / attempts) * 100 : 0;
        reportResult({ accuracy, score, stars });
        recordGameEvent('pitch-quest', { accuracy, score, stars });
    };

    const markNoteChecklist = () => {
        const next = checklist.find((input) => !input.checked && /pq-step-[1-4]/.test(input.id));
        if (!next) return;
        next.checked = true;
        next.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const updateStability = (value) => {
        if (!stabilityEl) return;
        stabilityEl.textContent = `${value}x`;
    };

    const randomizeOffset = () => {
        if (!slider) return;
        const value = Math.round((Math.random() * 40) - 20);
        slider.value = String(value);
        setOffset(value);
    };

    slider?.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        setOffset(target.value);
    });

    targets.forEach((radio) => {
        radio.addEventListener('change', () => {
            streak = 0;
            stabilityStreak = 0;
            randomizeOffset();
            updateTargetStatus();
            updateStability(stabilityStreak);
            const note = targetNoteFromInput(radio);
            if (note) {
                playToneNote(note, { duration: 0.3, volume: 0.18, type: 'triangle' });
            }
        });
    });

    bindTap(checkButton, () => {
        const activeTarget = targets.find((radio) => radio.checked);
        if (!activeTarget) {
            if (statusEl) statusEl.textContent = 'Pick a target note before checking.';
            return;
        }
        const cents = slider ? setOffset(slider.value) : 0;
        const targetNote = targetNoteFromInput(activeTarget);
        const matched = Math.abs(cents) <= tolerance;
        attempts += 1;
        if (matched) {
            hits += 1;
            streak += 1;
            score += 18 + streak * 3;
            stars = Math.max(stars, Math.min(3, Math.ceil(streak / 2)));
            markNoteChecklist();
            if (targetNote) {
                playToneNote(targetNote, { duration: 0.32, volume: 0.2, type: 'triangle' });
            }
            const now = Date.now();
            if (now - lastMatchAt <= 4000) {
                stabilityStreak += 1;
            } else {
                stabilityStreak = 1;
            }
            lastMatchAt = now;
            if (stabilityStreak >= 3) markChecklist('pq-step-5');
            if (streak >= 2) markChecklist('pq-step-6');
        } else {
            streak = 0;
            stabilityStreak = 0;
            score = Math.max(0, score - 6);
            const detuneNote = cents > 0 ? 'F#' : 'F';
            playToneNote(detuneNote, { duration: 0.2, volume: 0.14, type: 'sawtooth' });
        }
        const accuracy = attempts ? (hits / attempts) * 100 : 0;
        setLiveNumber(scoreEl, 'liveScore', score);
        if (starsEl) {
            starsEl.dataset.liveStars = String(stars);
            starsEl.textContent = formatStars(stars, 3);
        }
        updateStability(stabilityStreak);
        reportResult({ accuracy, score, stars });
        if (checklist.length && checklist.every((input) => input.checked)) {
            reportSession();
        }
    });

    if (slider) setOffset(slider.value);
    if (toleranceSlider) {
        updateTolerance(toleranceSlider.value);
        toleranceSlider.addEventListener('input', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) return;
            updateTolerance(target.value, { user: true });
        });
    }
    updateTargetStatus();
    updateStability(stabilityStreak);

    const resetSession = () => {
        score = 0;
        stars = 0;
        streak = 0;
        stabilityStreak = 0;
        attempts = 0;
        hits = 0;
        reported = false;
        setLiveNumber(scoreEl, 'liveScore', score);
        if (starsEl) {
            starsEl.dataset.liveStars = String(stars);
            starsEl.textContent = formatStars(stars, 3);
        }
        updateStability(stabilityStreak);
        updateTargetStatus();
        if (slider) {
            setOffset(slider.value);
        }
    };

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#view-game-pitch-quest') {
            resetSession();
            return;
        }
        reportSession();
    }, { passive: true });
};

export { updatePitchQuest as update, bindPitchQuest as bind };
