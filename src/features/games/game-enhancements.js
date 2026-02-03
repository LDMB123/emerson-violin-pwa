import { GAME_META } from './game-meta.js';
import { cloneTemplate } from '@core/utils/templates.js';
import { registerUiTicker } from '@core/utils/ticker.js';
import { onViewChange } from '@core/utils/view-events.js';

const formatMinutes = (value) => `${Math.max(1, Math.round(value || 0))} min`;
const activeSessions = new Map();
let lifecycleBound = false;
const headerTemplate = document.querySelector('#game-header-actions-template');
const coachTemplate = document.querySelector('#game-coach-template');
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

const attachSessionTimer = (view, timerEl, trackEl, targetMinutes, scoreEl) => {
    let stopTicker = null;
    let startedAt = null;
    const safeTargetMinutes = Math.max(1, targetMinutes || 0);
    const targetMs = safeTargetMinutes * 60 * 1000;

    const update = () => {
        if (!startedAt) return;
        const elapsed = Date.now() - startedAt;
        if (timerEl) timerEl.textContent = formatTime(elapsed);
        const percent = Math.min(100, Math.round((elapsed / targetMs) * 100));
        if (trackEl) {
            if ('value' in trackEl) {
                trackEl.value = percent;
                if (!trackEl.max) trackEl.max = 100;
            } else {
                trackEl.setAttribute('aria-valuenow', String(percent));
            }
        }
        if (scoreEl) {
            scoreEl.textContent = elapsed >= targetMs ? 'Session Complete' : 'Session Active';
        }
    };

    const start = () => {
        if (stopTicker) return;
        startedAt = Date.now();
        view.dataset.session = 'active';
        update();
        stopTicker = registerUiTicker(update);
    };

    const stop = () => {
        if (!stopTicker) return;
        stopTicker();
        stopTicker = null;
        view.dataset.session = 'idle';
        if (scoreEl) scoreEl.textContent = scoreEl.dataset.defaultScore || 'Guided Drill';
    };

    const reset = () => {
        stop();
        startedAt = null;
        if (timerEl) timerEl.textContent = '00:00';
        if (trackEl) {
            if ('value' in trackEl) {
                trackEl.value = 0;
                if (!trackEl.max) trackEl.max = 100;
            } else {
                trackEl.setAttribute('aria-valuenow', '0');
            }
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

const handleLifecycle = (forceAll = false, viewId = null) => {
    const activeId = viewId || window.location.hash?.replace('#', '') || '';
    activeSessions.forEach((entry, viewId) => {
        if (forceAll || viewId !== activeId) {
            stopSessionEntry(entry);
        }
    });
};

const bindLifecycle = () => {
    if (lifecycleBound) return;
    lifecycleBound = true;
    onViewChange((viewId) => {
        handleLifecycle(false, viewId);
    });
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
            coachButton: existingControls.querySelector('[data-game-coach-jump]'),
        };
    }
    if (scoreEl && !scoreEl.dataset.defaultScore) {
        scoreEl.dataset.defaultScore = scoreEl.textContent || 'Guided Drill';
    }

    const controls = cloneTemplate(headerTemplate);
    if (!controls) return null;

    header.appendChild(controls);
    return {
        scoreEl,
        timerEl: controls.querySelector('[data-game-timer]'),
        resetButton: controls.querySelector('[data-game-reset]'),
        coachButton: controls.querySelector('[data-game-coach-jump]'),
    };
};

const buildCoachPanel = (view, meta) => {
    const content = view.querySelector('.game-content');
    if (!content || content.querySelector('[data-game-coach]')) return null;

    const panel = cloneTemplate(coachTemplate);
    if (!panel) return null;

    panel.id = `${view.id}-coach`;

    const titleEl = panel.querySelector('[data-game-coach-title]');
    if (titleEl) titleEl.textContent = `${meta.skill} · ${meta.goal}`;
    const goalEl = panel.querySelector('[data-game-coach-goal]');
    if (goalEl) goalEl.textContent = `Target session: ${formatMinutes(meta.targetMinutes)}`;
    const badge = panel.querySelector('[data-game-coach-badge]');
    if (badge) badge.textContent = meta.skill;

    const steps = panel.querySelector('[data-game-coach-steps]');
    const stepTemplate = panel.querySelector('[data-game-coach-step]');
    if (steps && stepTemplate) {
        steps.replaceChildren();
        meta.steps.forEach((step, index) => {
            const stepEl = stepTemplate.cloneNode(true);
            const indexEl = stepEl.querySelector('[data-step-index]');
            if (indexEl) indexEl.textContent = String(index + 1);
            const timeEl = stepEl.querySelector('[data-step-time]');
            if (timeEl) timeEl.textContent = formatMinutes(step.minutes);
            const textEl = stepEl.querySelector('[data-step-text]');
            if (textEl) textEl.textContent = step.label;
            const cueEl = stepEl.querySelector('[data-step-cue]');
            if (cueEl) {
                cueEl.textContent = step.cue || '';
                cueEl.toggleAttribute('data-empty', !step.cue);
            }
            steps.appendChild(stepEl);
        });
    }

    const sessionTarget = panel.querySelector('[data-game-session-target]');
    if (sessionTarget) sessionTarget.textContent = `/ ${formatMinutes(meta.targetMinutes)}`;

    const tipText = panel.querySelector('[data-game-coach-tip-text]');
    if (tipText) tipText.textContent = meta.tip;

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
        const scoreEl = headerControls?.scoreEl;
        const coachButton = headerControls?.coachButton;

        const session = attachSessionTimer(view, timerEl, trackEl, meta.targetMinutes, scoreEl);

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

        if (coachButton && panel) {
            coachButton.addEventListener('click', () => {
                panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
