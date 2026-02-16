import {
    cachedEl,
    formatCountdown,
    readLiveNumber,
    setLiveNumber,
    markChecklist,
    markChecklistIf,
    setDifficultyBadge,
    recordGameEvent,
    attachTuning,
    bindTap,
    playToneNote,
} from './shared.js';

const bowStarsEl = cachedEl('[data-bow="stars"]');

const updateBowHero = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-bow-hero input[id^="bh-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const starsEl = bowStarsEl();
    const liveStars = readLiveNumber(starsEl, 'liveStars');
    if (starsEl) starsEl.textContent = String(Number.isFinite(liveStars) ? liveStars : checked);
};

const bindBowHero = () => {
    const stage = document.querySelector('#view-game-bow-hero');
    if (!stage) return;
    const strokeButton = stage.querySelector('.bow-stroke');
    const runToggle = stage.querySelector('#bow-hero-run');
    const timerEl = stage.querySelector('[data-bow="timer"]');
    const stars = Array.from(stage.querySelectorAll('.bow-star'));
    const starsEl = stage.querySelector('[data-bow="stars"]');
    const statusEl = stage.querySelector('[data-bow="status"]');
    let starCount = 0;
    let strokeCount = 0;
    let targetTempo = 72;
    let timeLimit = 105;
    let remaining = timeLimit;
    let timerId = null;
    let endTime = null;
    let runStartedAt = 0;
    let reported = false;
    let paused = false;
    let pausedAt = 0;
    let lastStrokeAt = 0;
    let smoothStreak = 0;

    const resetStars = () => {
        starCount = 0;
        strokeCount = 0;
        reported = false;
        stars.forEach((star) => {
            star.classList.remove('is-lit');
        });
        setLiveNumber(starsEl, 'liveStars', starCount);
    };

    const setStatus = (message) => {
        if (statusEl) statusEl.textContent = message;
    };

    const updateTimer = () => {
        if (timerEl) timerEl.textContent = formatCountdown(remaining);
    };

    const reportResult = attachTuning('bow-hero', (tuning) => {
        timeLimit = tuning.timeLimit ?? timeLimit;
        targetTempo = tuning.targetTempo ?? targetTempo;
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
        if (!timerId) {
            remaining = timeLimit;
            updateTimer();
        }
    });

    const finalizeRun = () => {
        if (reported) return;
        reported = true;
        const accuracy = stars.length ? (starCount / stars.length) * 100 : 0;
        const score = starCount * 20 + strokeCount * 2;
        reportResult({ stars: starCount, score, accuracy });
        recordGameEvent('bow-hero', { stars: starCount, score, accuracy });
    };

    const stopTimer = () => {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
        endTime = null;
    };

    const pauseTimer = () => {
        if (!timerId) return;
        if (endTime) {
            remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        }
        stopTimer();
        paused = true;
        pausedAt = Date.now();
        setStatus('Paused while app is in the background.');
    };

    const resumeTimer = () => {
        if (!paused) return;
        if (!runToggle?.checked) return;
        if (window.location.hash !== '#view-game-bow-hero') return;
        if (remaining <= 0) return;
        if (pausedAt && runStartedAt) {
            runStartedAt += Date.now() - pausedAt;
        }
        paused = false;
        pausedAt = 0;
        startTimer();
    };

    const startTimer = () => {
        if (timerId) return;
        paused = false;
        if (remaining <= 0) remaining = timeLimit;
        if (remaining === timeLimit && starCount > 0) resetStars();
        if (!runStartedAt) runStartedAt = Date.now();
        endTime = Date.now() + remaining * 1000;
        timerId = window.setInterval(() => {
            if (!endTime) return;
            remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            updateTimer();
            if (remaining <= 0) {
                stopTimer();
                if (runToggle) runToggle.checked = false;
                setStatus('Time! Tap Start to begin another round.');
                markChecklist('bh-step-5');
                finalizeRun();
            }
            if (runStartedAt && Date.now() - runStartedAt >= 30000) {
                markChecklist('bh-step-4');
            }
        }, 300);
        updateTimer();
        setStatus('Timer running. Keep bow strokes steady.');
    };

    const resetRun = () => {
        stopTimer();
        runStartedAt = 0;
        paused = false;
        pausedAt = 0;
        lastStrokeAt = 0;
        smoothStreak = 0;
        remaining = timeLimit;
        resetStars();
        if (runToggle) runToggle.checked = false;
        updateTimer();
        setStatus('Press Start to begin the timer.');
    };

    bindTap(strokeButton, () => {
        starCount = Math.min(stars.length, starCount + 1);
        strokeCount += 1;
        stars.forEach((star, index) => {
            star.classList.toggle('is-lit', index < starCount);
        });
        setLiveNumber(starsEl, 'liveStars', starCount);
        const now = performance.now();
        if (lastStrokeAt) {
            const interval = now - lastStrokeAt;
            const bpm = Math.round(60000 / Math.max(120, interval));
            const deviation = Math.abs(bpm - targetTempo) / Math.max(targetTempo, 1);
            if (deviation <= 0.18) {
                smoothStreak += 1;
                setStatus(`Smooth strokes! ${bpm} BPM · streak x${smoothStreak}.`);
            } else {
                smoothStreak = 0;
                setStatus(`Aim for ${targetTempo} BPM · current ${bpm} BPM.`);
            }
        } else {
            setStatus('Nice stroke! Keep going.');
        }
        lastStrokeAt = now;
        const strokeNote = strokeCount % 2 === 0 ? 'A' : 'D';
        playToneNote(strokeNote, { duration: 0.16, volume: 0.12, type: 'triangle' });
        markChecklistIf(strokeCount >= 8, 'bh-step-1');
        markChecklistIf(strokeCount >= 16, 'bh-step-2');
        markChecklistIf(strokeCount >= 24, 'bh-step-3');
    });

    runToggle?.addEventListener('change', () => {
        if (runToggle.checked) {
            startTimer();
        } else {
            stopTimer();
            runStartedAt = 0;
            paused = false;
            pausedAt = 0;
            setStatus('Paused. Tap Start to resume.');
            if (strokeCount > 0) {
                finalizeRun();
            }
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            pauseTimer();
        } else {
            resumeTimer();
        }
    });

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#view-game-bow-hero') {
            resetRun();
            return;
        }
        if (strokeCount > 0) {
            finalizeRun();
        }
        stopTimer();
        runStartedAt = 0;
    }, { passive: true });

    setStatus('Press Start to begin the timer.');
};

export { updateBowHero as update, bindBowHero as bind };
