import { getGameTuning, updateGameResult } from '../ml/adaptive-engine.js';
import { getJSON, setJSON } from '../persistence/storage.js';

const formatStars = (count, total) => '★'.repeat(count) + '☆'.repeat(Math.max(0, total - count));
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const EVENT_KEY = 'panda-violin:events:v1';
const MAX_EVENTS = 500;
const todayDay = () => Math.floor(Date.now() / 86400000);
const formatCountdown = (seconds) => {
    const safe = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(safe / 60);
    const remaining = safe % 60;
    return `${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
};

const soundToggle = document.querySelector('#setting-sounds');

const isSoundEnabled = () => {
    if (!soundToggle) return true;
    return soundToggle.checked;
};

const bindTap = (element, handler, { threshold = 160, clickIgnoreWindow = 420 } = {}) => {
    if (!element || typeof handler !== 'function') return;
    let lastTap = 0;
    let lastPointerTap = 0;
    const invoke = (event) => {
        const now = performance.now();
        if (now - lastTap < threshold) return;
        lastTap = now;
        handler(event);
    };
    element.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        event.preventDefault();
        lastPointerTap = performance.now();
        invoke(event);
    }, { passive: false });
    element.addEventListener('click', (event) => {
        const now = performance.now();
        if (now - lastPointerTap < clickIgnoreWindow && event.detail !== 0) return;
        invoke(event);
    });
};

const readLiveNumber = (el, key) => {
    if (!el || !el.dataset) return null;
    const value = Number(el.dataset[key]);
    return Number.isFinite(value) ? value : null;
};

const setLiveNumber = (el, key, value, formatter) => {
    if (!el) return;
    el.dataset[key] = String(value);
    el.textContent = formatter ? formatter(value) : String(value);
};

const markChecklist = (id) => {
    if (!id) return;
    const input = document.getElementById(id);
    if (!input || input.checked) return;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
};

const markChecklistIf = (condition, id) => {
    if (condition) markChecklist(id);
};

const formatDifficulty = (value) => {
    const label = value || 'medium';
    return label.charAt(0).toUpperCase() + label.slice(1);
};

const setDifficultyBadge = (container, difficulty, prefix = 'Adaptive') => {
    if (!container) return;
    let badge = container.querySelector('.difficulty-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'difficulty-badge';
        container.appendChild(badge);
    }
    badge.dataset.level = difficulty || 'medium';
    badge.textContent = `${prefix}: ${formatDifficulty(difficulty)}`;
};

const recordGameEvent = async (id, payload = {}) => {
    if (!id) return;
    const events = await getJSON(EVENT_KEY);
    const list = Array.isArray(events) ? events : [];
    const entry = {
        type: 'game',
        id,
        day: todayDay(),
        timestamp: Date.now(),
    };
    if (Number.isFinite(payload.score)) entry.score = Math.round(payload.score);
    if (Number.isFinite(payload.accuracy)) entry.accuracy = Math.round(payload.accuracy);
    if (Number.isFinite(payload.stars)) entry.stars = Math.round(payload.stars);
    list.push(entry);
    if (list.length > MAX_EVENTS) {
        list.splice(0, list.length - MAX_EVENTS);
    }
    await setJSON(EVENT_KEY, list);
    document.dispatchEvent(new CustomEvent('panda:game-recorded', { detail: entry }));
};

const attachTuning = (id, onUpdate) => {
    const apply = (tuning) => {
        if (!tuning) return;
        onUpdate(tuning);
    };
    const refresh = () => {
        getGameTuning(id).then(apply).catch(() => {});
    };
    refresh();
    document.addEventListener('panda:ml-reset', refresh);
    const report = (payload) => updateGameResult(id, payload).then(apply).catch(() => {});
    report.refresh = refresh;
    return report;
};

const updatePitchQuest = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-pitch-quest input[id^="pq-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const total = inputs.length;
    const scoreEl = document.querySelector('[data-pitch="score"]');
    const starsEl = document.querySelector('[data-pitch="stars"]');
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

const updateRhythmDash = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-rhythm-dash input[id^="rd-set-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = document.querySelector('[data-rhythm="score"]');
    const comboEl = document.querySelector('[data-rhythm="combo"]');
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    const liveCombo = readLiveNumber(comboEl, 'liveCombo');

    if (scoreEl) {
        scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : (checked * 25 + (checked === inputs.length ? 20 : 0)));
    }
    if (comboEl) {
        const combo = Number.isFinite(liveCombo) ? liveCombo : checked;
        comboEl.textContent = `x${combo}`;
    }
};

const updateNoteMemory = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-note-memory input[id^="nm-card-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const pairs = Math.floor(checked / 2);
    const matchesEl = document.querySelector('[data-memory="matches"]');
    const scoreEl = document.querySelector('[data-memory="score"]');
    const liveMatches = readLiveNumber(matchesEl, 'liveMatches');
    const liveScore = readLiveNumber(scoreEl, 'liveScore');

    if (matchesEl) {
        const value = Number.isFinite(liveMatches) ? liveMatches : pairs;
        matchesEl.textContent = `${value}/6`;
    }
    if (scoreEl) {
        const score = Number.isFinite(liveScore) ? liveScore : pairs * 60;
        scoreEl.textContent = String(score);
    }
};

const updateEarTrainer = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-ear-trainer input[id^="et-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const questionEl = document.querySelector('[data-ear="question"]');
    if (questionEl && checked > 0 && !questionEl.dataset.live) {
        questionEl.textContent = `Rounds complete: ${checked}/${inputs.length}`;
    }
};

const updateBowHero = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-bow-hero input[id^="bh-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const starsEl = document.querySelector('[data-bow="stars"]');
    const liveStars = readLiveNumber(starsEl, 'liveStars');
    if (starsEl) starsEl.textContent = String(Number.isFinite(liveStars) ? liveStars : checked);
};

const updateStringQuest = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-string-quest input[id^="sq-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = document.querySelector('[data-string="score"]');
    const comboEl = document.querySelector('[data-string="combo"]');
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

const updateRhythmPainter = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-rhythm-painter input[id^="rp-pattern-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = document.querySelector('[data-painter="score"]');
    const creativityEl = document.querySelector('[data-painter="creativity"]');
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    const liveCreativity = readLiveNumber(creativityEl, 'liveCreativity');
    const creativity = Math.min(100, checked * 25);

    if (scoreEl) scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : checked * 120);
    if (creativityEl) {
        const value = Number.isFinite(liveCreativity) ? liveCreativity : creativity;
        creativityEl.textContent = `${value}%`;
    }
};

const updateStorySong = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-story-song input[id^="ss-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const banner = document.querySelector('#view-game-story-song .story-banner');
    if (banner) {
        banner.textContent = checked === inputs.length ? 'Story Song Lab · Complete!' : 'Story Song Lab';
    }
};

const bindStorySong = () => {
    const stage = document.querySelector('#view-game-story-song');
    if (!stage) return;
    const toggle = stage.querySelector('#story-play');
    const statusEl = stage.querySelector('[data-story="status"]');
    const steps = Array.from(stage.querySelectorAll('input[id^="ss-step-"]'));
    let playTimer = null;
    let pageTimer = null;
    let stageSeconds = 4;
    let reported = false;
    let wasPlaying = false;

    const updateStatus = () => {
        if (!statusEl) return;
        if (toggle?.checked) {
            statusEl.textContent = 'Play-along running — follow the notes.';
        } else {
            statusEl.textContent = 'Press Play-Along to start.';
        }
    };

    const stopTimer = () => {
        if (playTimer) {
            clearTimeout(playTimer);
            playTimer = null;
        }
        if (pageTimer) {
            clearTimeout(pageTimer);
            pageTimer = null;
        }
    };

    const reportResult = attachTuning('story-song', (tuning) => {
        stageSeconds = tuning.stageSeconds ?? stageSeconds;
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
    });

    const reportSession = () => {
        if (reported) return;
        const completed = steps.filter((input) => input.checked).length;
        if (!completed) return;
        reported = true;
        const accuracy = steps.length ? (completed / steps.length) * 100 : 0;
        const score = completed * 25;
        reportResult({ accuracy, score });
        recordGameEvent('story-song', { accuracy, score });
    };

    toggle?.addEventListener('change', () => {
        updateStatus();
        if (toggle.checked) {
            reported = false;
            markChecklist('ss-step-1');
            stopTimer();
            playTimer = window.setTimeout(() => {
                markChecklist('ss-step-2');
            }, stageSeconds * 1000);
            pageTimer = window.setTimeout(() => {
                if (toggle.checked) markChecklist('ss-step-3');
            }, stageSeconds * 2 * 1000);
        } else {
            markChecklist('ss-step-4');
            stopTimer();
            reportSession();
        }
    });
    updateStatus();

    document.addEventListener('visibilitychange', () => {
        if (!toggle) return;
        if (document.hidden) {
            wasPlaying = toggle.checked;
            stopTimer();
            if (toggle.checked) {
                toggle.checked = false;
            }
            updateStatus();
        } else if (wasPlaying) {
            wasPlaying = false;
            if (statusEl) {
                statusEl.textContent = 'Play-along paused. Tap Play-Along to resume.';
            }
        }
    });

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#view-game-story-song') {
            reported = false;
            return;
        }
        stopTimer();
        reportSession();
        if (toggle) {
            toggle.checked = false;
        }
        updateStatus();
    }, { passive: true });
};

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

const updateTuningTime = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-tuning-time input[id^="tt-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = document.querySelector('[data-tuning="score"]');
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    if (scoreEl) scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : checked * 25);
};

const updateMelodyMaker = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-melody-maker input[id^="mm-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = document.querySelector('[data-melody="score"]');
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    if (scoreEl) scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : checked * 30);
};

const updateScalePractice = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-scale-practice input[id^="sp-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = document.querySelector('[data-scale="score"]');
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    if (scoreEl) scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : checked * 28);
};

const updateDuetChallenge = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-duet-challenge input[id^="dc-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = document.querySelector('[data-duet="score"]');
    const comboEl = document.querySelector('[data-duet="combo"]');
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    const liveCombo = readLiveNumber(comboEl, 'liveCombo');
    if (scoreEl) scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : checked * 22);
    if (comboEl) {
        const combo = Number.isFinite(liveCombo) ? liveCombo : checked;
        comboEl.textContent = `x${combo}`;
    }
};

const updates = [
    updatePitchQuest,
    updateRhythmDash,
    updateNoteMemory,
    updateEarTrainer,
    updateBowHero,
    updateStringQuest,
    updateRhythmPainter,
    updateStorySong,
    updatePizzicato,
    updateTuningTime,
    updateMelodyMaker,
    updateScalePractice,
    updateDuetChallenge,
];

const updateAll = () => {
    updates.forEach((fn) => fn());
};

let updateScheduled = false;
const scheduleUpdateAll = () => {
    if (updateScheduled) return;
    updateScheduled = true;
    requestAnimationFrame(() => {
        updateScheduled = false;
        updateAll();
    });
};

const shouldUpdate = (id) => {
    return /^(pq-step-|rd-set-|nm-card-|et-step-|bh-step-|sq-step-|rp-pattern-|ss-step-|pz-step-|tt-step-|mm-step-|sp-step-|dc-step-)/.test(id);
};

const bindPitchQuest = () => {
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
    let tolerance = 6;
    let attempts = 0;
    let hits = 0;
    let reported = false;

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
        const nextTolerance = tuning.tolerance ?? tolerance;
        if (!(toleranceSlider && toleranceSlider.dataset.userSet)) {
            updateTolerance(nextTolerance);
        }
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
        });
    });

    bindTap(checkButton, () => {
        const activeTarget = targets.find((radio) => radio.checked);
        if (!activeTarget) {
            if (statusEl) statusEl.textContent = 'Pick a target note before checking.';
            return;
        }
        const cents = slider ? setOffset(slider.value) : 0;
        const matched = Math.abs(cents) <= tolerance;
        attempts += 1;
        if (matched) {
            hits += 1;
            streak += 1;
            score += 18 + streak * 3;
            stars = Math.max(stars, Math.min(3, Math.ceil(streak / 2)));
            markNoteChecklist();
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

const bindNoteMemory = () => {
    const stage = document.querySelector('#view-game-note-memory');
    if (!stage) return;
    const cards = Array.from(stage.querySelectorAll('.memory-card'));
    const timerEl = stage.querySelector('[data-memory="timer"]');
    const matchesEl = stage.querySelector('[data-memory="matches"]');
    const scoreEl = stage.querySelector('[data-memory="score"]');
    const streakEl = stage.querySelector('[data-memory="streak"]');
    const resetButton = stage.querySelector('[data-memory="reset"]');

    if (!cards.length) return;
    const totalPairs = Math.floor(cards.length / 2);
    const noteValues = cards.map((card) => card.querySelector('.memory-back')?.textContent?.trim() || '');
    let flipped = [];
    let lock = false;
    let matches = 0;
    let score = 0;
    let matchStreak = 0;
    let timeLimit = 45;
    let timeLeft = timeLimit;
    let timerId = null;
    let endTime = null;
    let ended = false;
    let reported = false;
    let paused = false;
    let mismatchTimer = null;

    const updateHud = () => {
        if (matchesEl) {
            matchesEl.dataset.liveMatches = String(matches);
            matchesEl.textContent = `${matches}/${totalPairs}`;
        }
        setLiveNumber(scoreEl, 'liveScore', score);
        if (streakEl) streakEl.textContent = String(matchStreak);
        if (timerEl) timerEl.textContent = formatCountdown(timeLeft);
    };

    const reportResult = attachTuning('note-memory', (tuning) => {
        timeLimit = tuning.timeLimit ?? timeLimit;
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
        if (!timerId && !ended) {
            timeLeft = timeLimit;
            updateHud();
        }
    });

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
            timeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        }
        stopTimer();
        paused = true;
    };

    const resumeTimer = () => {
        if (!paused || ended) return;
        if (window.location.hash !== '#view-game-note-memory') return;
        if (timeLeft <= 0) return;
        paused = false;
        startTimer();
    };

    const finalizeGame = () => {
        if (reported) return;
        reported = true;
        const accuracy = totalPairs ? (matches / totalPairs) * 100 : 0;
        reportResult({ accuracy, score });
        recordGameEvent('note-memory', { accuracy, score });
    };

    const startTimer = () => {
        if (timerId) return;
        paused = false;
        endTime = Date.now() + timeLeft * 1000;
        timerId = window.setInterval(() => {
            if (!endTime) return;
            timeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            if (timeLeft <= 0) {
                timeLeft = 0;
                ended = true;
                lock = false;
                stopTimer();
                finalizeGame();
            }
            updateHud();
        }, 300);
    };

    const resetGame = () => {
        stopTimer();
        if (mismatchTimer) {
            clearTimeout(mismatchTimer);
            mismatchTimer = null;
        }
        flipped = [];
        lock = false;
        matches = 0;
        score = 0;
        matchStreak = 0;
        timeLeft = timeLimit;
        ended = false;
        reported = false;
        cards.forEach((card) => {
            card.classList.remove('is-matched');
            const input = card.querySelector('input');
            if (input) {
                input.checked = false;
                input.disabled = false;
            }
        });
        const values = [...noteValues];
        for (let i = values.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [values[i], values[j]] = [values[j], values[i]];
        }
        cards.forEach((card, index) => {
            const back = card.querySelector('.memory-back');
            if (back && values[index]) back.textContent = values[index];
        });
        updateHud();
    };

    const noteForCard = (card) => {
        const value = card.querySelector('.memory-back')?.textContent?.trim();
        return value || '';
    };

    const handleMatch = () => {
        matches += 1;
        matchStreak += 1;
        score += 120 + matchStreak * 10;
        flipped.forEach(({ card, input }) => {
            card.classList.add('is-matched');
            if (input) input.disabled = true;
        });
        flipped = [];
        lock = false;
        if (matches >= totalPairs) {
            ended = true;
            stopTimer();
            finalizeGame();
        }
        updateHud();
    };

    const handleMismatch = () => {
        score = Math.max(0, score - 10);
        matchStreak = 0;
        const current = [...flipped];
        flipped = [];
        if (mismatchTimer) clearTimeout(mismatchTimer);
        mismatchTimer = window.setTimeout(() => {
            current.forEach(({ input }) => {
                if (input) input.checked = false;
            });
            lock = false;
            updateHud();
        }, 600);
    };

    cards.forEach((card) => {
        const input = card.querySelector('input');
        if (!input) return;
        input.addEventListener('change', () => {
            if (!input.checked) return;
            if (lock) {
                input.checked = false;
                return;
            }
            if (ended) {
                resetGame();
                input.checked = false;
                return;
            }
            if (input.disabled) return;
            if (!timerId) startTimer();
            const note = noteForCard(card);
            flipped.push({ card, input, note });
            if (flipped.length === 2) {
                lock = true;
                if (flipped[0].note && flipped[0].note === flipped[1].note) {
                    handleMatch();
                } else {
                    handleMismatch();
                }
            }
        });
    });

    bindTap(resetButton, () => {
        resetGame();
    });

    updateHud();

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#view-game-note-memory') {
            resetGame();
            return;
        }
        if (matches > 0 || score > 0) {
            finalizeGame();
        }
        stopTimer();
        if (mismatchTimer) {
            clearTimeout(mismatchTimer);
            mismatchTimer = null;
        }
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            pauseTimer();
        } else {
            resumeTimer();
        }
    });

    if (window.location.hash === '#view-game-note-memory') {
        resetGame();
    }
};

const bindRhythmDash = () => {
    const stage = document.querySelector('#view-game-rhythm-dash');
    if (!stage) return;
    const tapButton = stage.querySelector('.rhythm-tap');
    const runToggle = stage.querySelector('#rhythm-run');
    const pauseButton = stage.querySelector('[data-rhythm="pause"]');
    const settingsButton = stage.querySelector('[data-rhythm="settings"]');
    const scoreEl = stage.querySelector('[data-rhythm="score"]');
    const comboEl = stage.querySelector('[data-rhythm="combo"]');
    const bpmEl = stage.querySelector('[data-rhythm="bpm"]');
    const suggestedEl = stage.querySelector('[data-rhythm="suggested"]');
    const statusEl = stage.querySelector('[data-rhythm="status"]');
    const ratingEl = stage.querySelector('[data-rhythm="rating"]');
    const meterFill = stage.querySelector('[data-rhythm="meter"]');
    const meterTrack = stage.querySelector('.rhythm-meter');
    const targetSlider = stage.querySelector('[data-rhythm="target-slider"]');
    const targetValue = stage.querySelector('[data-rhythm="target-value"]');
    const settingsReset = stage.querySelector('[data-rhythm="settings-reset"]');

    let combo = 0;
    let score = 0;
    let lastTap = 0;
    let wasRunning = false;
    let tapCount = 0;
    let runStartedAt = 0;
    const tapHistory = [];
    let targetBpm = 90;
    let coachTarget = targetBpm;
    let reported = false;
    let timingScores = [];
    let beatInterval = 60000 / targetBpm;
    let paused = false;
    let pausedByVisibility = false;

    if (!tapButton) return;

    const setStatus = (message) => {
        if (statusEl) statusEl.textContent = message;
    };

    const setRating = (label, level, scoreValue) => {
        if (ratingEl) {
            ratingEl.textContent = `Timing: ${label}`;
            if (level) ratingEl.dataset.level = level;
        }
        if (meterFill) {
            const percent = clamp(scoreValue * 100, 0, 100);
            meterFill.style.width = `${percent}%`;
            if (meterTrack) {
                meterTrack.setAttribute('aria-valuenow', String(Math.round(percent)));
            }
        }
    };

    const updateTargetBpm = (value, { user = false } = {}) => {
        const next = clamp(Number(value) || targetBpm, 60, 140);
        targetBpm = next;
        beatInterval = 60000 / targetBpm;
        stage.style.setProperty('--beat-interval', `${(60 / targetBpm).toFixed(2)}s`);
        stage.style.setProperty('--beat-cycle', `${(60 / targetBpm * 8).toFixed(2)}s`);
        if (targetSlider) {
            targetSlider.value = String(next);
            targetSlider.setAttribute('aria-valuenow', String(next));
            targetSlider.setAttribute('aria-valuetext', `${next} BPM`);
            if (user) targetSlider.dataset.userSet = 'true';
        }
        if (targetValue) targetValue.textContent = `${next} BPM`;
        if (!wasRunning) {
            setStatus(`Tap Start to begin the run. Target ${targetBpm} BPM.`);
        }
    };

    const reportResult = attachTuning('rhythm-dash', (tuning) => {
        coachTarget = tuning.targetBpm ?? coachTarget;
        if (!(targetSlider && targetSlider.dataset.userSet)) {
            updateTargetBpm(coachTarget);
        } else if (suggestedEl) {
            suggestedEl.textContent = String(coachTarget);
        }
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
        if (suggestedEl && !tapHistory.length) suggestedEl.textContent = String(coachTarget);
        if (!wasRunning) {
            setStatus(`Tap Start to begin the run. Target ${targetBpm} BPM.`);
        }
    });

    const computeAccuracy = () => {
        if (timingScores.length) {
            const avg = timingScores.reduce((sum, value) => sum + value, 0) / timingScores.length;
            return clamp(avg * 100, 0, 100);
        }
        if (!tapHistory.length) return 0;
        const average = tapHistory.reduce((sum, value) => sum + value, 0) / tapHistory.length;
        const delta = Math.abs(average - targetBpm) / Math.max(targetBpm, 1);
        return clamp((1 - delta) * 100, 0, 100);
    };

    const reportSession = () => {
        if (reported || tapCount === 0) return;
        reported = true;
        const accuracy = computeAccuracy();
        reportResult({ score, accuracy });
        recordGameEvent('rhythm-dash', { accuracy, score });
    };

    const updateRunningState = () => {
        const running = runToggle?.checked;
        const wasActive = wasRunning;
        stage.classList.toggle('is-running', Boolean(running));
        if (running) {
            if (paused) {
                paused = false;
                setStatus('Run resumed. Tap the beat in the hit zone.');
            } else {
                setStatus('Run started. Tap the beat in the hit zone.');
                if (!runStartedAt) runStartedAt = Date.now();
                reported = false;
                timingScores = [];
                setRating('--', 'off', 0);
            }
        } else {
            if (!paused && wasActive && tapCount > 0) {
                reportSession();
            }
            if (paused) {
                setStatus('Run paused. Tap Start to resume.');
            } else {
                setStatus(wasActive ? 'Run paused. Tap Start to resume.' : `Tap Start to begin the run. Target ${targetBpm} BPM.`);
                lastTap = 0;
                tapHistory.length = 0;
                timingScores = [];
                tapCount = 0;
                runStartedAt = 0;
            }
        }
        wasRunning = Boolean(running);
    };

    const resetRun = () => {
        combo = 0;
        score = 0;
        lastTap = 0;
        tapCount = 0;
        runStartedAt = 0;
        tapHistory.length = 0;
        timingScores = [];
        reported = false;
        paused = false;
        pausedByVisibility = false;
        if (runToggle) runToggle.checked = false;
        wasRunning = false;
        setLiveNumber(scoreEl, 'liveScore', score);
        setLiveNumber(comboEl, 'liveCombo', combo, (value) => `x${value}`);
        if (bpmEl) bpmEl.textContent = '--';
        setRating('--', 'off', 0);
        if (meterTrack) {
            meterTrack.setAttribute('aria-valuenow', '0');
            meterTrack.setAttribute('aria-valuetext', '0%');
        }
        updateRunningState();
    };

    runToggle?.addEventListener('change', updateRunningState);
    updateRunningState();
    if (targetSlider) {
        updateTargetBpm(targetSlider.value);
    }

    const pauseRun = (message) => {
        if (!runToggle?.checked) return;
        paused = true;
        runToggle.checked = false;
        updateRunningState();
        if (message) setStatus(message);
    };

    pauseButton?.addEventListener('click', () => {
        if (!runToggle) return;
        if (runToggle.checked) {
            pauseRun('Run paused. Tap Start to resume.');
            return;
        }
        if (paused) {
            runToggle.checked = true;
            updateRunningState();
            return;
        }
        paused = false;
        runToggle.checked = true;
        updateRunningState();
    });

    settingsButton?.addEventListener('click', () => {
        setStatus('Tip: watch the hit zone and tap evenly for combos.');
    });

    targetSlider?.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        updateTargetBpm(target.value, { user: true });
    });

    settingsReset?.addEventListener('click', () => {
        if (targetSlider) delete targetSlider.dataset.userSet;
        updateTargetBpm(coachTarget);
        setStatus(`Target reset to ${coachTarget} BPM.`);
    });

    bindTap(tapButton, () => {
        if (runToggle && !runToggle.checked) {
            setStatus('Tap Start to run the lanes.');
            return;
        }
        const now = performance.now();
        const delta = lastTap ? now - lastTap : 0;
        let timingScore = 0;
        let rating = 'Off';
        let level = 'off';
        if (delta > 0) {
            const deviation = Math.abs(delta - beatInterval);
            timingScore = clamp(1 - deviation / beatInterval, 0, 1);
            if (timingScore >= 0.9) {
                rating = 'Perfect';
                level = 'perfect';
            } else if (timingScore >= 0.75) {
                rating = 'Great';
                level = 'great';
            } else if (timingScore >= 0.6) {
                rating = 'Good';
                level = 'good';
            }
        }
        if (delta > 0 && timingScore >= 0.6) {
            combo += 1;
        } else {
            combo = 1;
        }
        const base = timingScore >= 0.9 ? 22 : timingScore >= 0.75 ? 16 : timingScore >= 0.6 ? 12 : 6;
        score += base + combo * 2;
        tapCount += 1;
        setLiveNumber(scoreEl, 'liveScore', score);
        setLiveNumber(comboEl, 'liveCombo', combo, (value) => `x${value}`);
        if (delta > 0 && bpmEl) {
            const bpm = clamp(Math.round(60000 / delta), 50, 160);
            bpmEl.textContent = String(bpm);
            tapHistory.push(bpm);
            if (tapHistory.length > 4) tapHistory.shift();
            if (suggestedEl && tapHistory.length >= 2) {
                const avg = Math.round(tapHistory.reduce((sum, value) => sum + value, 0) / tapHistory.length);
                suggestedEl.textContent = String(avg);
            }
        }
        lastTap = now;
        if (delta > 0) {
            timingScores.push(timingScore);
            if (timingScores.length > 12) timingScores.shift();
            setRating(rating, level, timingScore);
        }
        if (combo >= 3) {
            setStatus(`Nice streak! ${rating} timing · Combo x${combo}.`);
        } else {
            setStatus(`Timing: ${rating}. Keep the beat steady.`);
        }
        markChecklistIf(tapCount >= 8, 'rd-set-1');
        markChecklistIf(combo >= 10, 'rd-set-2');
        const elapsed = runStartedAt ? (Date.now() - runStartedAt) : 0;
        markChecklistIf(tapCount >= 16 || elapsed >= 20000, 'rd-set-3');
    });

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#view-game-rhythm-dash') {
            resetRun();
            return;
        }
        if (runToggle?.checked) {
            runToggle.checked = false;
            runToggle.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            reportSession();
        }
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (runToggle?.checked) {
                pausedByVisibility = true;
                pauseRun('Paused while app is in the background.');
            }
        } else if (pausedByVisibility) {
            pausedByVisibility = false;
            setStatus('Run paused. Tap Start to resume.');
        }
    });
};

const bindEarTrainer = () => {
    const stage = document.querySelector('#view-game-ear-trainer');
    if (!stage) return;
    const playButton = stage.querySelector('[data-ear="play"]');
    const questionEl = stage.querySelector('[data-ear="question"]');
    const streakEl = stage.querySelector('[data-ear="streak"]');
    const dots = Array.from(stage.querySelectorAll('.ear-dot'));
    const choices = Array.from(stage.querySelectorAll('.ear-choice'));
    const audioG = stage.querySelector('audio[aria-labelledby="ear-g-label"]');
    const audioD = stage.querySelector('audio[aria-labelledby="ear-d-label"]');
    const audioA = stage.querySelector('audio[aria-labelledby="ear-a-label"]');
    const audioE = stage.querySelector('audio[aria-labelledby="ear-e-label"]');
    const audioMap = {
        G: audioG,
        D: audioD,
        A: audioA,
        E: audioE,
    };
    const tonePool = ['G', 'D', 'A', 'E'];
    const checklistMap = {
        G: 'et-step-1',
        D: 'et-step-2',
        A: 'et-step-3',
        E: 'et-step-4',
    };

    let currentIndex = 0;
    let currentTone = null;
    let correctStreak = 0;
    let correctCount = 0;
    let totalAnswered = 0;
    let rounds = dots.length;
    let reported = false;

    const setActiveDot = () => {
        dots.forEach((dot, index) => {
            dot.classList.toggle('is-active', index === currentIndex && index < rounds);
            dot.classList.toggle('is-disabled', index >= rounds);
        });
    };

    const applyRounds = (nextRounds) => {
        const resolved = Math.min(dots.length, nextRounds || dots.length);
        rounds = resolved;
        if (currentIndex > rounds) {
            currentIndex = rounds;
        }
        setActiveDot();
    };

    const setQuestion = (text) => {
        if (!questionEl) return;
        questionEl.textContent = text;
        questionEl.dataset.live = 'true';
    };

    const updateStreak = () => {
        if (streakEl) streakEl.textContent = String(correctStreak);
    };

    const reportResult = attachTuning('ear-trainer', (tuning) => {
        applyRounds(tuning.rounds ?? rounds);
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
        if (!totalAnswered && !currentTone) {
            setQuestion(`Question 1 of ${rounds}`);
        }
    });

    setActiveDot();

    const reportSession = () => {
        if (reported || totalAnswered === 0) return;
        reported = true;
        const accuracy = totalAnswered ? (correctCount / totalAnswered) * 100 : 0;
        reportResult({ accuracy, score: correctCount * 10 });
        recordGameEvent('ear-trainer', { accuracy, score: correctCount * 10 });
    };

    const resetTrainer = (message = `Question 1 of ${rounds}`) => {
        currentIndex = 0;
        currentTone = null;
        correctStreak = 0;
        correctCount = 0;
        totalAnswered = 0;
        reported = false;
        dots.forEach((dot) => {
            dot.classList.remove('is-correct', 'is-wrong');
        });
        choices.forEach((choice) => {
            choice.checked = false;
        });
        setActiveDot();
        setQuestion(message);
        updateStreak();
    };

    const updateSoundState = () => {
        const enabled = isSoundEnabled();
        if (playButton) playButton.disabled = !enabled;
        choices.forEach((choice) => {
            choice.disabled = !enabled;
        });
    };

    updateSoundState();

    document.addEventListener('panda:sounds-change', (event) => {
        if (event.detail?.enabled === false) {
            setQuestion('Sounds are off. Turn on Sounds to play.');
            Object.values(audioMap).forEach((audio) => {
                if (audio && !audio.paused) {
                    audio.pause();
                    audio.currentTime = 0;
                }
            });
        }
        updateSoundState();
    });

    bindTap(playButton, () => {
        if (!isSoundEnabled()) {
            setQuestion('Sounds are off. Turn on Sounds to play.');
            return;
        }
        if (currentIndex >= rounds) {
            resetTrainer('New round! Listen and tap the matching note.');
        }
        currentTone = tonePool[Math.floor(Math.random() * tonePool.length)];
        const audio = currentTone ? audioMap[currentTone] : null;
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
        const total = rounds || 10;
        setQuestion(`Question ${Math.min(currentIndex + 1, total)} of ${total} · Tap the matching note.`);
    });

    choices.forEach((choice) => {
        choice.addEventListener('change', () => {
            if (!currentTone) {
                setQuestion('Tap Play to hear the note.');
                return;
            }
            const selected = choice.dataset.earNote || '';
            const dot = dots[currentIndex];
            const isCorrect = selected === currentTone;
            if (dot) {
                dot.classList.toggle('is-correct', isCorrect);
                dot.classList.toggle('is-wrong', !isCorrect);
            }
            totalAnswered += 1;
            if (isCorrect) {
                correctStreak += 1;
                correctCount += 1;
                const checklistId = checklistMap[selected];
                if (checklistId) markChecklist(checklistId);
                markChecklistIf(correctStreak >= 3, 'et-step-5');
            } else {
                correctStreak = 0;
            }
            currentTone = null;
            currentIndex = Math.min(currentIndex + 1, rounds);
            choices.forEach((choiceItem) => {
                choiceItem.checked = false;
            });
            setActiveDot();
            if (currentIndex >= rounds) {
                markChecklist('et-step-6');
                setQuestion(`Great job! All ${rounds} rounds complete. Tap Play to restart.`);
                if (!reported) {
                    reported = true;
                    const accuracy = rounds ? (correctCount / rounds) * 100 : 0;
                    reportResult({ accuracy, score: correctCount * 10 });
                    recordGameEvent('ear-trainer', { accuracy, score: correctCount * 10 });
                }
            } else {
                setQuestion(`Question ${currentIndex + 1} of ${rounds}`);
            }
            updateStreak();
        });
    });

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#view-game-ear-trainer') {
            resetTrainer();
            return;
        }
        reportSession();
    }, { passive: true });

    if (window.location.hash === '#view-game-ear-trainer') {
        resetTrainer();
    }
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
    let timeLimit = 105;
    let remaining = timeLimit;
    let timerId = null;
    let endTime = null;
    let runStartedAt = 0;
    let reported = false;
    let paused = false;
    let pausedAt = 0;

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
        setStatus('Nice stroke! Keep going.');
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

const bindStringQuest = () => {
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
    let comboTarget = 8;
    let sequenceLength = 4;

    const buildSequence = () => {
        const next = [];
        for (let i = 0; i < sequenceLength; i += 1) {
            const options = notePool.filter((note) => note !== next[i - 1]);
            const choice = options[Math.floor(Math.random() * options.length)];
            next.push(choice);
        }
        sequence = next;
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

    const updateScoreboard = () => {
        setLiveNumber(scoreEl, 'liveScore', score);
        setLiveNumber(comboEl, 'liveCombo', combo, (value) => `x${value}`);
    };

    const reportResult = attachTuning('string-quest', (tuning) => {
        comboTarget = tuning.comboTarget ?? comboTarget;
        sequenceLength = comboTarget >= 7 ? 5 : 4;
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
            if (note === sequence[seqIndex]) {
                combo += 1;
                score += 20 + combo * 3;
                seqIndex = (seqIndex + 1) % sequence.length;
                if (note === 'G') markChecklist('sq-step-1');
                if (lastCorrectNote === 'D' && note === 'A') {
                    markChecklist('sq-step-2');
                }
                if (seqIndex === 0) {
                    markChecklist('sq-step-3');
                    reportSession();
                    buildSequence();
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

const bindRhythmPainter = () => {
    const stage = document.querySelector('#view-game-rhythm-painter');
    if (!stage) return;
    const dots = Array.from(stage.querySelectorAll('.paint-dot'));
    const scoreEl = stage.querySelector('[data-painter="score"]');
    const creativityEl = stage.querySelector('[data-painter="creativity"]');
    const roundsEl = stage.querySelector('[data-painter="rounds"]');
    const meter = stage.querySelector('.painter-meter');
    const statusEl = stage.querySelector('[data-painter="status"]');
    let score = 0;
    let creativity = 0;
    let tapCount = 0;
    let rounds = 0;
    const tappedDots = new Set();
    let creativityTarget = 70;
    let reported = false;

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
        creativityTarget = tuning.creativityTarget ?? creativityTarget;
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
        dots.forEach((dot) => dot.classList.remove('is-hit'));
        update();
    };

    dots.forEach((dot) => {
        bindTap(dot, () => {
            score += 30;
            creativity = Math.min(100, score > 0 ? creativity + 8 : creativity);
            tapCount += 1;
            rounds = Math.floor(tapCount / 4);
            tappedDots.add(dot.className);
            dot.classList.add('is-hit');
            setTimeout(() => dot.classList.remove('is-hit'), 220);
            update();
            markChecklistIf(tappedDots.size >= 4, 'rp-pattern-1');
            markChecklistIf(tapCount >= 4, 'rp-pattern-2');
            markChecklistIf(creativity >= 70, 'rp-pattern-3');
            markChecklistIf(rounds >= 3, 'rp-pattern-4');
            if (creativity >= creativityTarget) {
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

const bindPizzicato = () => {
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
    let comboTarget = 6;

    const buildSequence = () => {
        const next = [];
        for (let i = 0; i < 4; i += 1) {
            const options = notePool.filter((note) => note !== next[i - 1]);
            next.push(options[Math.floor(Math.random() * options.length)]);
        }
        sequence = next;
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

    const updateScoreboard = () => {
        setLiveNumber(scoreEl, 'liveScore', score);
        setLiveNumber(comboEl, 'liveCombo', combo, (value) => `x${value}`);
    };

    const reportResult = attachTuning('pizzicato', (tuning) => {
        comboTarget = tuning.comboTarget ?? comboTarget;
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
            if (note === sequence[seqIndex]) {
                combo += 1;
                score += 18 + combo * 2;
                seqIndex = (seqIndex + 1) % sequence.length;
                hitNotes.add(note);
                markChecklistIf(hitNotes.size >= 4, 'pz-step-1');
                if (seqIndex === 0) {
                    markChecklist('pz-step-2');
                    reportSession();
                    buildSequence();
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

const bindMelodyMaker = () => {
    const stage = document.querySelector('#view-game-melody-maker');
    if (!stage) return;
    const buttons = Array.from(stage.querySelectorAll('.melody-btn'));
    const trackEl = stage.querySelector('[data-melody="track"]');
    const scoreEl = stage.querySelector('[data-melody="score"]');
    const targetEl = stage.querySelector('[data-melody="target"]');
    const clearButton = stage.querySelector('[data-melody="clear"]');
    const track = [];
    let score = 0;
    let lastSequence = '';
    let repeatMarked = false;
    const uniqueNotes = new Set();
    let lengthTarget = 4;
    let reported = false;
    let targetMotif = ['G', 'A', 'B', 'C'];
    let matchCount = 0;
    const notePool = buttons.map((button) => button.dataset.melodyNote).filter(Boolean);

    const updateTrack = () => {
        if (trackEl) trackEl.textContent = track.length ? track.join(' · ') : 'Tap notes to build a melody.';
    };

    const updateScore = () => {
        setLiveNumber(scoreEl, 'liveScore', score);
    };

    const updateTarget = () => {
        if (!targetEl) return;
        targetEl.textContent = `Target: ${targetMotif.join(' · ')}`;
    };

    const buildTarget = () => {
        if (!notePool.length) return;
        const next = [];
        for (let i = 0; i < lengthTarget; i += 1) {
            const options = notePool.filter((note) => note !== next[i - 1]);
            next.push(options[Math.floor(Math.random() * options.length)]);
        }
        targetMotif = next;
        matchCount = 0;
        updateTarget();
    };

    const reportResult = attachTuning('melody-maker', (tuning) => {
        lengthTarget = tuning.lengthTarget ?? lengthTarget;
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
        buildTarget();
    });

    const reportSession = () => {
        if (reported || score <= 0) return;
        reported = true;
        const accuracy = lengthTarget ? Math.min(1, track.length / lengthTarget) * 100 : 0;
        reportResult({ accuracy, score });
        recordGameEvent('melody-maker', { accuracy, score });
    };

    const resetSession = (message = 'Tap notes to build a melody.') => {
        track.length = 0;
        score = 0;
        lastSequence = '';
        repeatMarked = false;
        uniqueNotes.clear();
        reported = false;
        matchCount = 0;
        updateTrack();
        updateScore();
        buildTarget();
        if (trackEl) trackEl.textContent = message;
    };

    buttons.forEach((button) => {
        bindTap(button, () => {
            const note = button.dataset.melodyNote;
            if (!note) return;
            track.push(note);
            if (track.length > 5) track.shift();
            score += 20;
            uniqueNotes.add(note);
            updateTrack();
            updateScore();
            if (track.length >= lengthTarget) {
                markChecklist('mm-step-1');
                const currentSequence = track.slice(-lengthTarget).join('');
                if (lastSequence && currentSequence === lastSequence && !repeatMarked) {
                    repeatMarked = true;
                    markChecklist('mm-step-2');
                }
                lastSequence = currentSequence;
            }
            markChecklistIf(uniqueNotes.size >= 3, 'mm-step-3');
            markChecklistIf(score >= 100, 'mm-step-4');

            if (track.length >= targetMotif.length) {
                const attempt = track.slice(-targetMotif.length).join('');
                const target = targetMotif.join('');
                if (attempt === target) {
                    matchCount += 1;
                    score += 50;
                    updateScore();
                    if (matchCount >= 1) markChecklist('mm-step-1');
                    if (matchCount >= 2) markChecklist('mm-step-2');
                    if (matchCount >= 3) reportSession();
                    buildTarget();
                }
            }
        });
    });

    bindTap(clearButton, () => {
        reportSession();
        resetSession('Melody cleared. Tap notes to build a new one.');
    });

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#view-game-melody-maker') {
            resetSession();
            return;
        }
        reportSession();
    }, { passive: true });

    updateTrack();
    updateScore();
    buildTarget();
};

const bindScalePractice = () => {
    const stage = document.querySelector('#view-game-scale-practice');
    if (!stage) return;
    const slider = stage.querySelector('[data-scale="slider"]');
    const tempoEl = stage.querySelector('[data-scale="tempo"]');
    const statusEl = stage.querySelector('[data-scale="status"]');
    const scoreEl = stage.querySelector('[data-scale="score"]');
    const tapButton = stage.querySelector('[data-scale="tap"]');
    const ratingEl = stage.querySelector('[data-scale="rating"]');
    const tempoTags = new Set();
    let targetTempo = 85;
    let reported = false;
    let lastTap = 0;
    let score = 0;
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
        targetTempo = tuning.targetTempo ?? targetTempo;
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
        if (slider && !slider.dataset.userSet) {
            slider.value = String(targetTempo);
            updateTempo();
        }
    });

    const reportSession = (accuracy, score) => {
        if (reported) return;
        reported = true;
        recordGameEvent('scale-practice', { accuracy, score });
    };

    const resetSession = () => {
        score = 0;
        lastTap = 0;
        timingScores.length = 0;
        reported = false;
        if (scoreEl) scoreEl.textContent = '0';
        if (ratingEl) ratingEl.textContent = 'Timing: --';
    };

    slider?.addEventListener('input', () => {
        if (slider) slider.dataset.userSet = 'true';
        updateTempo();
    });
    slider?.addEventListener('change', () => {
        const tempo = slider ? Number.parseInt(slider.value, 10) : 0;
        const delta = Math.abs(tempo - targetTempo) / Math.max(targetTempo, 1);
        const accuracy = clamp((1 - delta) * 100, 0, 100);
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

const bindDuetChallenge = () => {
    const stage = document.querySelector('#view-game-duet-challenge');
    if (!stage) return;
    const playButton = stage.querySelector('[data-duet="play"]');
    const buttons = Array.from(stage.querySelectorAll('.duet-btn'));
    const promptEl = stage.querySelector('[data-duet="prompt"]');
    const roundEl = stage.querySelector('[data-duet="round"]');
    const scoreEl = stage.querySelector('[data-duet="score"]');
    const comboEl = stage.querySelector('[data-duet="combo"]');
    const notesEl = stage.querySelector('.duet-notes');
    const audioMap = new Map(
        Array.from(stage.querySelectorAll('[data-duet-audio]')).map((audio) => [audio.dataset.duetAudio, audio])
    );
    const notePool = ['G', 'D', 'A', 'E'];
    let sequence = ['G', 'D', 'A', 'E'];
    let seqIndex = 0;
    let combo = 0;
    let score = 0;
    let active = false;
    let isPlayingPartner = false;
    let partnerToken = 0;
    let comboTarget = 3;
    let reported = false;
    let round = 1;
    let mistakes = 0;

    const updateScoreboard = () => {
        setLiveNumber(scoreEl, 'liveScore', score);
        setLiveNumber(comboEl, 'liveCombo', combo, (value) => `x${value}`);
    };

    const reportResult = attachTuning('duet-challenge', (tuning) => {
        comboTarget = tuning.comboTarget ?? comboTarget;
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
    });

    const buildSequence = () => {
        const next = [];
        for (let i = 0; i < 4; i += 1) {
            const options = notePool.filter((note) => note !== next[i - 1]);
            next.push(options[Math.floor(Math.random() * options.length)]);
        }
        sequence = next;
        if (notesEl) notesEl.textContent = sequence.join(' · ');
        if (roundEl) roundEl.textContent = `Round ${round}`;
        seqIndex = 0;
        mistakes = 0;
    };

    const updateSoundState = () => {
        if (playButton) playButton.disabled = !isSoundEnabled();
    };

    const playTone = (audio, token) => new Promise((resolve) => {
        if (!audio) {
            resolve();
            return;
        }
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            audio.removeEventListener('ended', finish);
            resolve();
        };
        if (token !== partnerToken) {
            resolve();
            return;
        }
        audio.addEventListener('ended', finish);
        audio.currentTime = 0;
        audio.play().catch(() => {
            finish();
        });
        setTimeout(finish, 900);
    });

    const stopPartnerPlayback = () => {
        partnerToken += 1;
        isPlayingPartner = false;
        audioMap.forEach((audio) => {
            if (audio && !audio.paused) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
        if (playButton) playButton.disabled = false;
    };

    const playPartnerSequence = async () => {
        if (isPlayingPartner) return;
        if (!isSoundEnabled()) {
            if (promptEl) promptEl.textContent = 'Sounds are off. Turn on Sounds to hear the partner.';
            return;
        }
        const token = partnerToken + 1;
        partnerToken = token;
        isPlayingPartner = true;
        if (playButton) playButton.disabled = true;
        if (promptEl) promptEl.textContent = 'Partner playing… get ready to respond.';
        for (const note of sequence) {
            if (token !== partnerToken) break;
            const audio = audioMap.get(note);
            await playTone(audio, token);
        }
        if (token === partnerToken) {
            if (playButton) playButton.disabled = false;
            isPlayingPartner = false;
        }
    };

    const setButtonsDisabled = (disabled) => {
        buttons.forEach((button) => {
            button.disabled = disabled;
        });
    };

    const reportSession = () => {
        if (reported || score <= 0) return;
        reported = true;
        const accuracy = sequence.length ? (Math.max(0, sequence.length - mistakes) / sequence.length) * 100 : 0;
        reportResult({ accuracy, score });
        recordGameEvent('duet-challenge', { accuracy, score });
    };

    const resetSession = () => {
        combo = 0;
        score = 0;
        seqIndex = 0;
        active = false;
        reported = false;
        round = 1;
        mistakes = 0;
        stopPartnerPlayback();
        updateScoreboard();
        buildSequence();
        if (promptEl) promptEl.textContent = 'Press play to hear the partner line.';
        setButtonsDisabled(true);
    };

    bindTap(playButton, () => {
        if (!isSoundEnabled()) {
            if (promptEl) promptEl.textContent = 'Sounds are off. Turn on Sounds to hear the partner.';
            return;
        }
        active = false;
        buildSequence();
        reported = false;
        if (promptEl) promptEl.textContent = `Partner plays: ${sequence.join(' · ')}`;
        setButtonsDisabled(true);
        playPartnerSequence().then(() => {
            active = true;
            setButtonsDisabled(false);
            if (promptEl) promptEl.textContent = `Your turn: ${sequence.join(' · ')}`;
        });
        markChecklist('dc-step-1');
    });

    buttons.forEach((button) => {
        bindTap(button, () => {
            if (isPlayingPartner) {
                if (promptEl) promptEl.textContent = 'Wait for the partner line to finish.';
                return;
            }
            if (!active) {
                if (promptEl) promptEl.textContent = 'Press play to hear the partner line.';
                return;
            }
            const note = button.dataset.duetNote;
            if (note === sequence[seqIndex]) {
                combo += 1;
                score += 15 + combo * 2;
                seqIndex += 1;
                if (seqIndex === 1) markChecklist('dc-step-2');
                if (combo >= comboTarget) markChecklist('dc-step-3');
                if (seqIndex >= sequence.length) {
                    active = false;
                    if (promptEl) promptEl.textContent = 'Great duet! Play again for a new combo.';
                    markChecklist('dc-step-4');
                    if (!reported) {
                        reportSession();
                    }
                    round += 1;
                } else {
                    if (promptEl) promptEl.textContent = `Your turn: ${sequence.slice(seqIndex).join(' · ')}`;
                }
            } else {
                combo = 0;
                mistakes += 1;
                seqIndex = 0;
                if (promptEl) promptEl.textContent = 'Try again from the start.';
            }
            updateScoreboard();
        });
    });

    document.addEventListener('panda:sounds-change', (event) => {
        if (event.detail?.enabled === false) {
            stopPartnerPlayback();
        }
        updateSoundState();
    });

    updateSoundState();
    setButtonsDisabled(true);
    buildSequence();

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#view-game-duet-challenge') {
            resetSession();
            return;
        }
        stopPartnerPlayback();
        reportSession();
    }, { passive: true });
};

const bindTuningTime = () => {
    const stage = document.querySelector('#view-game-tuning-time');
    if (!stage) return;
    const statusEl = stage.querySelector('[data-tuning="status"]');
    const progressEl = stage.querySelector('[data-tuning="progress"]');
    const buttons = Array.from(stage.querySelectorAll('.tuning-btn'));
    const audioMap = {
        G: stage.querySelector('audio[aria-labelledby="tuning-g-label"]'),
        D: stage.querySelector('audio[aria-labelledby="tuning-d-label"]'),
        A: stage.querySelector('audio[aria-labelledby="tuning-a-label"]'),
        E: stage.querySelector('audio[aria-labelledby="tuning-e-label"]'),
    };
    const checklistMap = {
        G: 'tt-step-1',
        D: 'tt-step-2',
        A: 'tt-step-3',
        E: 'tt-step-4',
    };
    const tunedNotes = new Set();
    let targetStrings = 3;
    let reported = false;

    const reportResult = attachTuning('tuning-time', (tuning) => {
        targetStrings = tuning.targetStrings ?? targetStrings;
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
        if (statusEl && tunedNotes.size === 0) {
            statusEl.textContent = `Tune ${targetStrings} strings to warm up.`;
        }
        if (progressEl) {
            const percent = clamp((tunedNotes.size / targetStrings) * 100, 0, 100);
            progressEl.style.width = `${percent}%`;
        }
    });

    const reportSession = () => {
        if (reported || tunedNotes.size === 0) return;
        reported = true;
        const accuracy = clamp((tunedNotes.size / targetStrings) * 100, 0, 100);
        const score = tunedNotes.size * 25;
        reportResult({ accuracy, score });
        recordGameEvent('tuning-time', { accuracy, score });
    };

    buttons.forEach((button) => {
        bindTap(button, () => {
            const note = button.dataset.tuningNote;
            if (!note) return;
            if (!isSoundEnabled()) {
                if (statusEl) statusEl.textContent = 'Sounds are off. Enable Sounds to hear the tone.';
                return;
            }
            const audio = audioMap[note];
            if (audio) {
                audio.currentTime = 0;
                audio.play().catch(() => {});
            }
            tunedNotes.add(note);
            if (statusEl) {
                const remaining = Math.max(0, targetStrings - tunedNotes.size);
                statusEl.textContent = remaining
                    ? `Tuning ${note} · ${remaining} more string${remaining === 1 ? '' : 's'} to go.`
                    : 'All target strings tuned. Great job!';
            }
            if (progressEl) {
                const percent = clamp((tunedNotes.size / targetStrings) * 100, 0, 100);
                progressEl.style.width = `${percent}%`;
            }
            markChecklist(checklistMap[note]);
            if (tunedNotes.size >= targetStrings) {
                reportSession();
            }
        });
    });

    document.addEventListener('panda:sounds-change', (event) => {
        if (event.detail?.enabled === false && statusEl) {
            statusEl.textContent = 'Sounds are off. Enable Sounds to hear tones.';
        }
    });

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#view-game-tuning-time') {
            tunedNotes.clear();
            reported = false;
            if (statusEl) {
                statusEl.textContent = `Tune ${targetStrings} strings to warm up.`;
            }
            if (progressEl) progressEl.style.width = '0%';
            return;
        }
        reportSession();
    }, { passive: true });
};

const bindInteractions = () => {
    bindPitchQuest();
    bindNoteMemory();
    bindRhythmDash();
    bindEarTrainer();
    bindBowHero();
    bindStringQuest();
    bindRhythmPainter();
    bindStorySong();
    bindPizzicato();
    bindMelodyMaker();
    bindScalePractice();
    bindDuetChallenge();
    bindTuningTime();
};

const handleChange = (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.type !== 'checkbox' || !input.id) return;
    if (!shouldUpdate(input.id)) return;
    scheduleUpdateAll();
};

const initMetrics = () => {
    bindInteractions();
    scheduleUpdateAll();
    document.addEventListener('change', handleChange);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMetrics);
} else {
    initMetrics();
}

document.addEventListener('panda:persist-applied', () => {
    scheduleUpdateAll();
});
