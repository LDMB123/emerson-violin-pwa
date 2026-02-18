import { GAME_META } from './game-config.js';
import { formatMinutes, createSessionTimer } from './session-timer.js';
import { renderDifficultyPickers } from './difficulty-picker.js';

const activeSessions = new Map();
let lifecycleBound = false;

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

    const liveKeys = ['liveScore', 'liveStars', 'liveCombo', 'liveMatches', 'liveCreativity'];
    view.querySelectorAll('[data-live-score], [data-live-stars], [data-live-combo], [data-live-matches], [data-live-creativity]').forEach((el) => {
        liveKeys.forEach((key) => delete el.dataset[key]);
    });
    view.querySelectorAll('[data-live]').forEach((el) => delete el.dataset.live);
};

const attachSessionTimer = (view, timerEl, fillEl, trackEl, targetMinutes, scoreEl, announceEl) => {
    const timer = createSessionTimer({
        targetMinutes,
        onUpdate: ({ percent, complete, timeLabel }) => {
            if (timerEl) timerEl.textContent = timeLabel;
            if (fillEl) {
                fillEl.style.width = `${percent}%`;
                if (trackEl) trackEl.setAttribute('aria-valuenow', String(percent));
            }
            if (scoreEl) {
                scoreEl.textContent = complete ? 'Session Complete' : 'Session Active';
            }
        },
        onMilestone: (_id, message) => {
            if (announceEl) announceEl.textContent = message;
        },
    });

    const start = () => {
        view.dataset.session = 'active';
        if (announceEl) announceEl.textContent = 'Session started';
        timer.start();
    };

    const stop = () => {
        timer.stop();
        view.dataset.session = 'idle';
        if (scoreEl) scoreEl.textContent = scoreEl.dataset.defaultScore || 'Guided Drill';
    };

    const reset = () => {
        timer.reset();
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

const initGameEnhancements = () => {
    bindGameEnhancements();
    renderDifficultyPickers();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGameEnhancements);
} else {
    initGameEnhancements();
}
