const GAME_META = {
    'pitch-quest': {
        skill: 'Pitch',
        goal: 'Match target notes with a centered tone.',
        targetMinutes: 6,
        steps: [
            { minutes: 1, label: 'Listen to the target tone', cue: 'Hear the ring before you play.' },
            { minutes: 3, see: 'view-game-pitch-quest', label: 'Match each target note', cue: 'Slide slowly until it locks in.' },
            { minutes: 2, label: 'Hold steady intonation', cue: 'Keep the bow speed even.' },
        ],
        tip: 'Use slow bows and relaxed fingers to keep the pitch steady.',
    },
    'rhythm-dash': {
        skill: 'Rhythm',
        goal: 'Lock in the beat and build a steady combo.',
        targetMinutes: 7,
        steps: [
            { minutes: 1, label: 'Clap the beat', cue: 'Count out loud: 1-2-3-4.' },
            { minutes: 3, label: 'Tap to the lane pulse', cue: 'Aim for clean hits in the zone.' },
            { minutes: 3, label: 'Hold a combo streak', cue: 'Stay relaxed and consistent.' },
        ],
        tip: 'If timing slips, pause and restart the pulse before playing again.',
    },
    'note-memory': {
        skill: 'Reading',
        goal: 'Match notes quickly and remember their places.',
        targetMinutes: 6,
        steps: [
            { minutes: 2, label: 'Name the notes out loud', cue: 'Say the note before you tap.' },
            { minutes: 2, label: 'Match pairs calmly', cue: 'Focus on two at a time.' },
            { minutes: 2, label: 'Replay faster', cue: 'Try to beat your time.' },
        ],
        tip: 'Eyes up on the staff, then drop fingers with confidence.',
    },
    'ear-trainer': {
        skill: 'Pitch',
        goal: 'Identify open strings by ear.',
        targetMinutes: 5,
        steps: [
            { minutes: 1, label: 'Listen to a reference tone', cue: 'Hum the pitch.' },
            { minutes: 2, label: 'Pick the matching string', cue: 'Trust your ear first.' },
            { minutes: 2, label: 'Confirm by playing', cue: 'Adjust the finger if needed.' },
        ],
        tip: 'Close your eyes to strengthen listening.',
    },
    'bow-hero': {
        skill: 'Bowing',
        goal: 'Keep the bow straight and controlled.',
        targetMinutes: 7,
        steps: [
            { minutes: 2, label: 'Set bow lane', cue: 'Parallel to the bridge.' },
            { minutes: 3, label: 'Follow the hero path', cue: 'Smooth bow changes.' },
            { minutes: 2, label: 'Finish with long bows', cue: 'Use full length strokes.' },
        ],
        tip: 'Lead from the elbow and keep the wrist soft.',
    },
    'string-quest': {
        skill: 'Bowing',
        goal: 'Travel through strings with clean crossings.',
        targetMinutes: 6,
        steps: [
            { minutes: 2, label: 'Map the string path', cue: 'G-D-A-E order.' },
            { minutes: 2, label: 'Play crossings slowly', cue: 'Move from the arm.' },
            { minutes: 2, label: 'Build a combo', cue: 'Keep the bow angle steady.' },
        ],
        tip: 'Prepare the next string before the crossing.',
    },
    'rhythm-painter': {
        skill: 'Rhythm',
        goal: 'Paint rhythmic patterns with precision.',
        targetMinutes: 6,
        steps: [
            { minutes: 2, label: 'Trace the pattern', cue: 'Tap on the beat grid.' },
            { minutes: 2, label: 'Layer a second rhythm', cue: 'Keep tempo steady.' },
            { minutes: 2, label: 'Play with a metronome', cue: 'Feel the pulse in your feet.' },
        ],
        tip: 'If the rhythm feels rushed, slow down and reset.',
    },
    'story-song': {
        skill: 'Reading',
        goal: 'Tell the story with expressive dynamics.',
        targetMinutes: 8,
        steps: [
            { minutes: 2, label: 'Read the story cues', cue: 'Circle the dynamic words.' },
            { minutes: 3, label: 'Play the melody slowly', cue: 'Shape the phrase.' },
            { minutes: 3, label: 'Add expression', cue: 'Use show-and-tell bowing.' },
        ],
        tip: 'Imagine the story scene as you play.',
    },
    pizzicato: {
        skill: 'Rhythm',
        goal: 'Pop the strings cleanly and keep time.',
        targetMinutes: 5,
        steps: [
            { minutes: 1, label: 'Set right-hand pizzicato', cue: 'Finger pulls across the string.' },
            { minutes: 2, label: 'Tap rhythm pattern', cue: 'Stay relaxed.' },
            { minutes: 2, label: 'Add dynamic pops', cue: 'Soft then loud.' },
        ],
        tip: 'Keep the wrist loose and let the finger do the work.',
    },
    'tuning-time': {
        skill: 'Pitch',
        goal: 'Center each string with calm listening.',
        targetMinutes: 6,
        steps: [
            { minutes: 2, label: 'Tune each open string', cue: 'Listen for the beats to disappear.' },
            { minutes: 2, label: 'Check with tuner', cue: 'Aim for the center line.' },
            { minutes: 2, label: 'Play slow double stops', cue: 'Listen for resonance.' },
        ],
        tip: 'Breathe out as the pitch locks in.',
    },
    'melody-maker': {
        skill: 'Reading',
        goal: 'Build a melody with strong note choices.',
        targetMinutes: 7,
        steps: [
            { minutes: 2, label: 'Pick a starting note', cue: 'Start on an open string.' },
            { minutes: 3, label: 'Add 4-6 notes', cue: 'Keep stepwise motion.' },
            { minutes: 2, label: 'Play it back smoothly', cue: 'Keep a steady bow.' },
        ],
        tip: 'Sing the melody before you play it.',
    },
    'scale-practice': {
        skill: 'Pitch',
        goal: 'Play the scale with even tone and tempo.',
        targetMinutes: 8,
        steps: [
            { minutes: 2, label: 'Finger map the scale', cue: 'Name the notes.' },
            { minutes: 3, label: 'Play with metronome', cue: 'One bow per note.' },
            { minutes: 3, label: 'Repeat with dynamics', cue: 'Crescendo then decrescendo.' },
        ],
        tip: 'Aim for consistent bow speed on each note.',
    },
    'duet-challenge': {
        skill: 'Rhythm',
        goal: 'Play in sync with the duet partner.',
        targetMinutes: 7,
        steps: [
            { minutes: 2, label: 'Listen to the partner line', cue: 'Clap the rhythm first.' },
            { minutes: 3, label: 'Play your line slowly', cue: 'Stay with the pulse.' },
            { minutes: 2, label: 'Combine both parts', cue: 'Balance your volume.' },
        ],
        tip: 'Keep eyes on the beat grid to stay together.',
    },
};

const formatMinutes = (value) => `${Math.max(1, Math.round(value || 0))} min`;
const activeSessions = new Map();
let lifecycleBound = false;
const formatTime = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const resetGameView = (view, { forceEvents = false } = {}) => {
    if (!view) return;
    const inputs = Array.from(view.querySelectorAll('input[type="checkbox"], input[type="radio"]'));
    inputs.forEach((input) => {
        const nextChecked = input.defaultChecked ?? false;
        const changed = input.checked !== nextChecked;
        if (changed) {
            input.checked = nextChecked;
        }
        if (forceEvents || changed) {
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    view.querySelectorAll('[data-live-score], [data-live-stars], [data-live-combo], [data-live-matches], [data-live-creativity]').forEach((el) => {
        delete el.dataset.liveScore;
        delete el.dataset.liveStars;
        delete el.dataset.liveCombo;
        delete el.dataset.liveMatches;
        delete el.dataset.liveCreativity;
    });
    view.querySelectorAll('[data-live]').forEach((el) => {
        delete el.dataset.live;
    });
};

const attachSessionTimer = (view, timerEl, fillEl, trackEl, targetMinutes, scoreEl, announceEl) => {
    let interval = null;
    let startedAt = null;
    const safeTargetMinutes = Math.max(1, targetMinutes || 0);
    const targetMs = safeTargetMinutes * 60 * 1000;
    const halfMs = targetMs / 2;
    const oneMinMs = 60 * 1000;
    const announced = new Set();

    const announce = (msg) => {
        if (announceEl) announceEl.textContent = msg;
    };

    const checkMilestones = (elapsed) => {
        if (!announceEl) return;
        const remaining = targetMs - elapsed;
        if (elapsed >= targetMs && !announced.has('end')) {
            announced.add('end');
            announce('Session complete');
        } else if (remaining > 0 && remaining <= oneMinMs && !announced.has('1min')) {
            announced.add('1min');
            announce('1 minute remaining');
        } else if (elapsed >= halfMs && !announced.has('half')) {
            announced.add('half');
            announce('Halfway there');
        }
    };

    const update = () => {
        if (!startedAt) return;
        const elapsed = Date.now() - startedAt;
        if (timerEl) timerEl.textContent = formatTime(elapsed);
        if (fillEl) {
            const percent = Math.min(100, Math.round((elapsed / targetMs) * 100));
            fillEl.style.width = `${percent}%`;
            if (trackEl) trackEl.setAttribute('aria-valuenow', String(percent));
        }
        if (scoreEl) {
            scoreEl.textContent = elapsed >= targetMs ? 'Session Complete' : 'Session Active';
        }
        checkMilestones(elapsed);
    };

    const start = () => {
        if (interval) return;
        startedAt = Date.now();
        announced.clear();
        view.dataset.session = 'active';
        announce('Session started');
        update();
        interval = window.setInterval(update, 1000);
    };

    const stop = () => {
        if (!interval) return;
        window.clearInterval(interval);
        interval = null;
        view.dataset.session = 'idle';
        if (scoreEl) scoreEl.textContent = scoreEl.dataset.defaultScore || 'Guided Drill';
    };

    const reset = () => {
        stop();
        startedAt = null;
        announced.clear();
        if (timerEl) timerEl.textContent = '00:00';
        if (announceEl) announceEl.textContent = '';
        if (fillEl) {
            fillEl.style.width = '0%';
            if (trackEl) trackEl.setAttribute('aria-valuenow', '0');
        }
    };

    return { start, stop, reset };
};

const stopSessionEntry = (entry) => {
    if (!entry) return;
    entry.session.stop();
    if (entry.startButton && entry.stopButton) {
        entry.startButton.disabled = false;
        entry.stopButton.disabled = true;
    }
};

const handleLifecycle = (forceAll = false) => {
    const activeId = window.location.hash?.replace('#', '') || '';
    activeSessions.forEach((entry, viewId) => {
        if (forceAll || viewId !== activeId) {
            stopSessionEntry(entry);
        }
    });
};

const bindLifecycle = () => {
    if (lifecycleBound) return;
    lifecycleBound = true;
    window.addEventListener('hashchange', () => handleLifecycle(false), { passive: true });
    window.addEventListener('pagehide', () => handleLifecycle(true), { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) handleLifecycle(true);
    }, { passive: true });
};

const injectHeaderControls = (view) => {
    const header = view.querySelector('.game-header');
    if (!header) return null;
    const existingControls = header.querySelector('[data-game-controls]');
    const scoreEl = header.querySelector('.game-score');
    if (existingControls) {
        return {
            scoreEl,
            timerEl: existingControls.querySelector('[data-game-timer]'),
            resetButton: existingControls.querySelector('[data-game-reset]'),
        };
    }
    if (scoreEl && !scoreEl.dataset.defaultScore) {
        scoreEl.dataset.defaultScore = scoreEl.textContent || 'Guided Drill';
    }

    const controls = document.createElement('div');
    controls.className = 'game-header-actions';
    controls.dataset.gameControls = 'true';

    const timer = document.createElement('div');
    timer.className = 'game-timer';
    timer.textContent = '00:00';
    timer.dataset.gameTimer = 'true';

    const timerAnnounce = document.createElement('div');
    timerAnnounce.className = 'sr-only';
    timerAnnounce.setAttribute('aria-live', 'polite');
    timerAnnounce.dataset.gameTimerAnnounce = 'true';

    const resetButton = document.createElement('button');
    resetButton.className = 'icon-btn';
    resetButton.type = 'button';
    resetButton.textContent = '↺';
    resetButton.setAttribute('aria-label', 'Reset session');
    resetButton.dataset.gameReset = 'true';

    const coachButton = document.createElement('button');
    coachButton.className = 'icon-btn';
    coachButton.type = 'button';
    coachButton.textContent = '✨';
    coachButton.setAttribute('aria-label', 'Jump to coach plan');
    coachButton.dataset.gameCoachJump = 'true';

    controls.appendChild(timer);
    controls.appendChild(timerAnnounce);
    controls.appendChild(coachButton);
    controls.appendChild(resetButton);

    header.appendChild(controls);

    const panel = view.querySelector('[data-game-coach]');
    if (panel) {
        coachButton.addEventListener('click', () => {
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    return { scoreEl, timerEl: timer, announceEl: timerAnnounce, resetButton };
};

const buildCoachPanel = (view, meta) => {
    const content = view.querySelector('.game-content');
    if (!content || content.querySelector('[data-game-coach]')) return null;

    const panel = document.createElement('div');
    panel.className = 'game-coach glass';
    panel.dataset.gameCoach = 'true';

    const header = document.createElement('div');
    header.className = 'game-coach-header';

    const headerText = document.createElement('div');
    headerText.className = 'game-coach-text';

    const kicker = document.createElement('span');
    kicker.className = 'game-coach-kicker';
    kicker.textContent = 'Coach Focus';

    const heading = document.createElement('h3');
    heading.textContent = `${meta.skill} · ${meta.goal}`;

    const goalP = document.createElement('p');
    goalP.className = 'game-coach-goal';
    goalP.textContent = `Target session: ${formatMinutes(meta.targetMinutes)}`;

    headerText.appendChild(kicker);
    headerText.appendChild(heading);
    headerText.appendChild(goalP);

    const badge = document.createElement('div');
    badge.className = 'game-coach-badge';
    badge.textContent = meta.skill;

    header.appendChild(headerText);
    header.appendChild(badge);

    const steps = document.createElement('div');
    steps.className = 'game-coach-steps';
    meta.steps.forEach((step, index) => {
        const stepEl = document.createElement('div');
        stepEl.className = 'game-coach-step';

        const stepIndex = document.createElement('span');
        stepIndex.className = 'game-coach-step-index';
        stepIndex.textContent = String(index + 1);

        const stepTime = document.createElement('span');
        stepTime.className = 'game-coach-step-time';
        stepTime.textContent = formatMinutes(step.minutes);

        const stepText = document.createElement('span');
        stepText.className = 'game-coach-step-text';
        stepText.textContent = step.label;

        const stepCue = document.createElement('span');
        stepCue.className = 'game-coach-step-cue';
        stepCue.textContent = step.cue || '';

        stepEl.appendChild(stepIndex);
        stepEl.appendChild(stepTime);
        stepEl.appendChild(stepText);
        stepEl.appendChild(stepCue);
        steps.appendChild(stepEl);
    });

    const session = document.createElement('div');
    session.className = 'game-session';

    const sessionRow = document.createElement('div');
    sessionRow.className = 'game-session-row';

    const sessionLabel = document.createElement('span');
    sessionLabel.className = 'game-session-label';
    sessionLabel.textContent = 'Session Timer';

    const sessionTime = document.createElement('span');
    sessionTime.className = 'game-session-time';
    sessionTime.dataset.gameSessionTime = '';
    sessionTime.textContent = '00:00';

    const sessionTarget = document.createElement('span');
    sessionTarget.className = 'game-session-target';
    sessionTarget.textContent = `/ ${formatMinutes(meta.targetMinutes)}`;

    sessionRow.appendChild(sessionLabel);
    sessionRow.appendChild(sessionTime);
    sessionRow.appendChild(sessionTarget);

    const sessionTrack = document.createElement('div');
    sessionTrack.className = 'game-session-track';
    sessionTrack.dataset.gameSessionTrack = '';
    sessionTrack.setAttribute('role', 'progressbar');
    sessionTrack.setAttribute('aria-valuemin', '0');
    sessionTrack.setAttribute('aria-valuemax', '100');
    sessionTrack.setAttribute('aria-valuenow', '0');

    const sessionFill = document.createElement('span');
    sessionFill.className = 'game-session-fill';
    sessionFill.dataset.gameSessionFill = '';
    sessionFill.style.width = '0%';

    sessionTrack.appendChild(sessionFill);

    const sessionActions = document.createElement('div');
    sessionActions.className = 'game-session-actions';

    const startBtn = document.createElement('button');
    startBtn.className = 'btn btn-primary';
    startBtn.type = 'button';
    startBtn.dataset.gameSessionStart = '';
    startBtn.textContent = 'Start session';

    const stopBtn = document.createElement('button');
    stopBtn.className = 'btn btn-secondary';
    stopBtn.type = 'button';
    stopBtn.dataset.gameSessionStop = '';
    stopBtn.disabled = true;
    stopBtn.textContent = 'Finish';

    sessionActions.appendChild(startBtn);
    sessionActions.appendChild(stopBtn);

    session.appendChild(sessionRow);
    session.appendChild(sessionTrack);
    session.appendChild(sessionActions);

    const tip = document.createElement('div');
    tip.className = 'game-coach-tip';
    const tipLabel = document.createElement('span');
    tipLabel.textContent = 'Coach tip:';
    tip.appendChild(tipLabel);
    tip.appendChild(document.createTextNode(` ${meta.tip}`));

    panel.appendChild(header);
    panel.appendChild(steps);
    panel.appendChild(session);
    panel.appendChild(tip);

    content.insertBefore(panel, content.firstChild);

    return panel;
};

const bindGameEnhancements = () => {
    document.querySelectorAll('.game-view').forEach((view) => {
        if (view.dataset.gameEnhanced === 'true') return;
        const id = view.id.replace('view-game-', '');
        const meta = GAME_META[id];
        if (!meta) return;

        const panel = buildCoachPanel(view, meta) || view.querySelector('[data-game-coach]');
        const headerControls = injectHeaderControls(view);
        const timerEl = panel?.querySelector('[data-game-session-time]');
        const trackEl = panel?.querySelector('[data-game-session-track]');
        const fillEl = panel?.querySelector('[data-game-session-fill]');
        const scoreEl = headerControls?.scoreEl;
        const announceEl = headerControls?.announceEl;

        const session = attachSessionTimer(view, timerEl, fillEl, trackEl, meta.targetMinutes, scoreEl, announceEl);

        const startButton = panel?.querySelector('[data-game-session-start]');
        const stopButton = panel?.querySelector('[data-game-session-stop]');
        const resetButtons = view.querySelectorAll('[data-game-reset]');

        if (startButton && stopButton) {
            startButton.addEventListener('click', () => {
                startButton.disabled = true;
                stopButton.disabled = false;
                session.start();
            });
            stopButton.addEventListener('click', () => {
                startButton.disabled = false;
                stopButton.disabled = true;
                session.stop();
            });
        }

        resetButtons.forEach((button) => {
            button.addEventListener('click', () => {
                session.reset();
                if (startButton && stopButton) {
                    startButton.disabled = false;
                    stopButton.disabled = true;
                }
                resetGameView(view, { forceEvents: true });
            });
        });

        activeSessions.set(view.id, { session, startButton, stopButton });
        bindLifecycle();

        view.dataset.gameEnhanced = 'true';
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindGameEnhancements);
} else {
    bindGameEnhancements();
}
