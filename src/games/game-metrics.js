const formatStars = (count, total) => '★'.repeat(count) + '☆'.repeat(Math.max(0, total - count));
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const soundToggle = document.querySelector('#setting-sounds');

const isSoundEnabled = () => {
    if (!soundToggle) return true;
    return soundToggle.checked;
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

const updatePitchQuest = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-pitch-quest input[id^="pq-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const total = inputs.length;
    const scoreEl = document.querySelector('[data-pitch="score"]');
    const starsEl = document.querySelector('[data-pitch="stars"]');
    if (scoreEl) scoreEl.textContent = String(checked * 15 + (checked === total ? 10 : 0));
    if (starsEl) {
        const stars = Math.min(3, Math.ceil(checked / 2));
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
    if (matchesEl) matchesEl.textContent = `${pairs}/6`;
    if (scoreEl) scoreEl.textContent = String(pairs * 60);
};

const updateEarTrainer = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-ear-trainer input[id^="et-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const questionEl = document.querySelector('[data-ear="question"]');
    if (questionEl && checked > 0 && !questionEl.dataset.live) {
        questionEl.textContent = `Rounds complete: ${checked}/4`;
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

const shouldUpdate = (id) => {
    return /^(pq-step-|rd-set-|nm-card-|et-step-|bh-step-|sq-step-|rp-pattern-|ss-step-|pz-step-|tt-step-|mm-step-|sp-step-|dc-step-)/.test(id);
};

const bindRhythmDash = () => {
    const stage = document.querySelector('#view-game-rhythm-dash');
    if (!stage) return;
    const tapButton = stage.querySelector('.rhythm-tap');
    const runToggle = stage.querySelector('#rhythm-run');
    const scoreEl = stage.querySelector('[data-rhythm="score"]');
    const comboEl = stage.querySelector('[data-rhythm="combo"]');
    const bpmEl = stage.querySelector('[data-rhythm="bpm"]');

    let combo = 0;
    let score = 0;
    let lastTap = 0;

    if (!tapButton) return;

    tapButton.addEventListener('click', () => {
        if (runToggle && !runToggle.checked) return;
        const now = performance.now();
        const delta = lastTap ? now - lastTap : 0;
        combo = delta > 0 && delta < 1200 ? combo + 1 : 1;
        score += 12 + combo * 2;
        setLiveNumber(scoreEl, 'liveScore', score);
        setLiveNumber(comboEl, 'liveCombo', combo, (value) => `x${value}`);
        if (delta > 0 && bpmEl) {
            const bpm = clamp(Math.round(60000 / delta), 50, 160);
            bpmEl.textContent = String(bpm);
        }
        lastTap = now;
    });
};

const bindEarTrainer = () => {
    const stage = document.querySelector('#view-game-ear-trainer');
    if (!stage) return;
    const playButton = stage.querySelector('[data-ear="play"]');
    const questionEl = stage.querySelector('[data-ear="question"]');
    const dots = Array.from(stage.querySelectorAll('.ear-dot'));
    const choices = Array.from(stage.querySelectorAll('.ear-choice'));
    const audioA = stage.querySelector('audio[aria-labelledby="ear-a-label"]');
    const audioE = stage.querySelector('audio[aria-labelledby="ear-e-label"]');

    let currentIndex = 0;
    let currentTone = null;

    const setActiveDot = () => {
        dots.forEach((dot, index) => {
            dot.classList.toggle('is-active', index === currentIndex);
        });
    };

    const setQuestion = (text) => {
        if (!questionEl) return;
        questionEl.textContent = text;
        questionEl.dataset.live = 'true';
    };

    setActiveDot();

    playButton?.addEventListener('click', () => {
        if (!isSoundEnabled()) {
            setQuestion('Sounds are off. Turn on Sounds to play.');
            return;
        }
        currentTone = Math.random() < 0.5 ? 'A' : 'E';
        const audio = currentTone === 'A' ? audioA : audioE;
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
        const total = dots.length || 10;
        setQuestion(`Question ${Math.min(currentIndex + 1, total)} of ${total} · Tap the matching note.`);
    });

    choices.forEach((choice) => {
        choice.addEventListener('change', () => {
            if (!currentTone) {
                setQuestion('Tap Play to hear the note.');
                return;
            }
            const selected = choice.id.includes('a') ? 'A' : 'E';
            const dot = dots[currentIndex];
            if (dot) {
                dot.classList.toggle('is-correct', selected === currentTone);
                dot.classList.toggle('is-wrong', selected !== currentTone);
            }
            currentTone = null;
            currentIndex = Math.min(currentIndex + 1, dots.length);
            setActiveDot();
            if (currentIndex >= dots.length) {
                setQuestion('Great job! All 10 rounds complete.');
            } else {
                setQuestion(`Question ${currentIndex + 1} of ${dots.length}`);
            }
        });
    });
};

const bindBowHero = () => {
    const stage = document.querySelector('#view-game-bow-hero');
    if (!stage) return;
    const strokeButton = stage.querySelector('.bow-stroke');
    const stars = Array.from(stage.querySelectorAll('.bow-star'));
    const starsEl = stage.querySelector('[data-bow="stars"]');
    let starCount = 0;

    strokeButton?.addEventListener('click', () => {
        starCount = Math.min(stars.length, starCount + 1);
        stars.forEach((star, index) => {
            star.classList.toggle('is-lit', index < starCount);
        });
        setLiveNumber(starsEl, 'liveStars', starCount);
    });
};

const bindStringQuest = () => {
    const stage = document.querySelector('#view-game-string-quest');
    if (!stage) return;
    const scoreEl = stage.querySelector('[data-string="score"]');
    const comboEl = stage.querySelector('[data-string="combo"]');
    const buttons = Array.from(stage.querySelectorAll('.string-btn'));
    const targets = Array.from(stage.querySelectorAll('[data-string-target]'));
    const sequence = ['G', 'D', 'A', 'E'];
    let seqIndex = 0;
    let combo = 0;
    let score = 0;

    const updateTargets = () => {
        const targetNote = sequence[seqIndex];
        targets.forEach((target) => {
            target.classList.toggle('is-target', target.dataset.stringTarget === targetNote);
        });
    };

    const updateScoreboard = () => {
        setLiveNumber(scoreEl, 'liveScore', score);
        setLiveNumber(comboEl, 'liveCombo', combo, (value) => `x${value}`);
    };

    updateTargets();

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            const note = button.dataset.stringBtn;
            if (note === sequence[seqIndex]) {
                combo += 1;
                score += 20 + combo * 3;
                seqIndex = (seqIndex + 1) % sequence.length;
            } else {
                combo = 0;
                score = Math.max(0, score - 5);
            }
            updateTargets();
            updateScoreboard();
        });
    });
};

const bindRhythmPainter = () => {
    const stage = document.querySelector('#view-game-rhythm-painter');
    if (!stage) return;
    const dots = Array.from(stage.querySelectorAll('.paint-dot'));
    const scoreEl = stage.querySelector('[data-painter="score"]');
    const creativityEl = stage.querySelector('[data-painter="creativity"]');
    const meter = stage.querySelector('.painter-meter');
    let score = 0;
    let creativity = 0;

    const update = () => {
        setLiveNumber(scoreEl, 'liveScore', score);
        setLiveNumber(creativityEl, 'liveCreativity', creativity, (value) => `${value}%`);
        const angle = (creativity / 100) * 180 - 90;
        meter?.style.setProperty('--painter-angle', `${angle}deg`);
    };

    dots.forEach((dot) => {
        dot.addEventListener('click', () => {
            score += 30;
            creativity = Math.min(100, score > 0 ? creativity + 8 : creativity);
            dot.classList.add('is-hit');
            setTimeout(() => dot.classList.remove('is-hit'), 220);
            update();
        });
    });
};

const bindPizzicato = () => {
    const stage = document.querySelector('#view-game-pizzicato');
    if (!stage) return;
    const scoreEl = stage.querySelector('[data-pizzicato="score"]');
    const comboEl = stage.querySelector('[data-pizzicato="combo"]');
    const buttons = Array.from(stage.querySelectorAll('.pizzicato-btn'));
    const targets = Array.from(stage.querySelectorAll('[data-pizzicato-target]'));
    const sequence = ['G', 'D', 'A', 'E'];
    let seqIndex = 0;
    let combo = 0;
    let score = 0;

    const updateTargets = () => {
        const targetNote = sequence[seqIndex];
        targets.forEach((target) => {
            target.classList.toggle('is-target', target.dataset.pizzicatoTarget === targetNote);
        });
    };

    const updateScoreboard = () => {
        setLiveNumber(scoreEl, 'liveScore', score);
        setLiveNumber(comboEl, 'liveCombo', combo, (value) => `x${value}`);
    };

    updateTargets();

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            const note = button.dataset.pizzicatoBtn;
            if (note === sequence[seqIndex]) {
                combo += 1;
                score += 18 + combo * 2;
                seqIndex = (seqIndex + 1) % sequence.length;
            } else {
                combo = 0;
                score = Math.max(0, score - 4);
            }
            updateTargets();
            updateScoreboard();
        });
    });
};

const bindMelodyMaker = () => {
    const stage = document.querySelector('#view-game-melody-maker');
    if (!stage) return;
    const buttons = Array.from(stage.querySelectorAll('.melody-btn'));
    const trackEl = stage.querySelector('[data-melody="track"]');
    const scoreEl = stage.querySelector('[data-melody="score"]');
    const track = [];
    let score = 0;

    const updateTrack = () => {
        if (trackEl) trackEl.textContent = track.length ? track.join(' · ') : 'Tap notes to build a melody.';
    };

    const updateScore = () => {
        setLiveNumber(scoreEl, 'liveScore', score);
    };

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            const note = button.dataset.melodyNote;
            if (!note) return;
            track.push(note);
            if (track.length > 5) track.shift();
            score += 20;
            updateTrack();
            updateScore();
        });
    });
};

const bindScalePractice = () => {
    const stage = document.querySelector('#view-game-scale-practice');
    if (!stage) return;
    const slider = stage.querySelector('[data-scale="slider"]');
    const tempoEl = stage.querySelector('[data-scale="tempo"]');

    const updateTempo = () => {
        if (!slider || !tempoEl) return;
        tempoEl.textContent = `${slider.value} BPM`;
    };

    slider?.addEventListener('input', updateTempo);
    updateTempo();
};

const bindDuetChallenge = () => {
    const stage = document.querySelector('#view-game-duet-challenge');
    if (!stage) return;
    const playButton = stage.querySelector('[data-duet="play"]');
    const buttons = Array.from(stage.querySelectorAll('.duet-btn'));
    const promptEl = stage.querySelector('[data-duet="prompt"]');
    const scoreEl = stage.querySelector('[data-duet="score"]');
    const comboEl = stage.querySelector('[data-duet="combo"]');
    const sequence = ['G', 'D', 'A', 'E'];
    let seqIndex = 0;
    let combo = 0;
    let score = 0;
    let active = false;

    const updateScoreboard = () => {
        setLiveNumber(scoreEl, 'liveScore', score);
        setLiveNumber(comboEl, 'liveCombo', combo, (value) => `x${value}`);
    };

    playButton?.addEventListener('click', () => {
        active = true;
        seqIndex = 0;
        if (promptEl) promptEl.textContent = 'Partner plays: G · D · A · E';
    });

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            if (!active) {
                if (promptEl) promptEl.textContent = 'Press play to hear the partner line.';
                return;
            }
            const note = button.dataset.duetNote;
            if (note === sequence[seqIndex]) {
                combo += 1;
                score += 15 + combo * 2;
                seqIndex += 1;
                if (seqIndex >= sequence.length) {
                    active = false;
                    if (promptEl) promptEl.textContent = 'Great duet! Play again for a new combo.';
                } else {
                    if (promptEl) promptEl.textContent = `Your turn: ${sequence.slice(seqIndex).join(' · ')}`;
                }
            } else {
                combo = 0;
                if (promptEl) promptEl.textContent = 'Try again from the start.';
            }
            updateScoreboard();
        });
    });
};

const bindTuningTime = () => {
    const stage = document.querySelector('#view-game-tuning-time');
    if (!stage) return;
    const statusEl = stage.querySelector('[data-tuning="status"]');
    const buttons = Array.from(stage.querySelectorAll('.tuning-btn'));
    const audioMap = {
        G: stage.querySelector('audio[aria-labelledby="tuning-g-label"]'),
        D: stage.querySelector('audio[aria-labelledby="tuning-d-label"]'),
        A: stage.querySelector('audio[aria-labelledby="tuning-a-label"]'),
        E: stage.querySelector('audio[aria-labelledby="tuning-e-label"]'),
    };

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
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
            if (statusEl) statusEl.textContent = `Tuning ${note} · listen for a steady ring.`;
        });
    });
};

const bindInteractions = () => {
    bindRhythmDash();
    bindEarTrainer();
    bindBowHero();
    bindStringQuest();
    bindRhythmPainter();
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
    updateAll();
};

const initMetrics = () => {
    bindInteractions();
    updateAll();
    document.addEventListener('change', handleChange);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMetrics);
} else {
    initMetrics();
}

document.addEventListener('panda:persist-applied', () => {
    updateAll();
});
