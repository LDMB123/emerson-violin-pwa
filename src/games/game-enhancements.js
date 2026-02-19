import { GAME_META, GAME_OBJECTIVE_TIERS } from './game-config.js';
import { loadGameMasteryState } from './game-mastery.js';
import { formatMinutes, createSessionTimer } from './session-timer.js';
import { renderDifficultyPickers } from './difficulty-picker.js';
import { GAME_MASTERY_UPDATED } from '../utils/event-names.js';

const activeSessions = new Map();
let lifecycleBound = false;
let masteryBound = false;
let masteryStateCache = { games: {} };

const OBJECTIVE_LABELS = Object.freeze({
    foundation: 'Foundation',
    core: 'Core',
    mastery: 'Mastery',
});

const objectiveTierFromMastery = (tier) => {
    if (tier === 'gold') return 'mastery';
    if (tier === 'silver') return 'core';
    return 'foundation';
};

const tierIndex = (tier) => {
    const index = GAME_OBJECTIVE_TIERS.indexOf(tier);
    return index >= 0 ? index : 0;
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
    window.addEventListener('pagehide', (event) => {
        if (event?.persisted) return;
        handleLifecycle(true);
    }, { passive: true });
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

    const objectivePacks = meta.objectivePacks || {
        foundation: meta.steps || [],
        core: meta.steps || [],
        mastery: meta.steps || [],
    };
    const tierHtml = GAME_OBJECTIVE_TIERS.map((tierKey) => {
        const objectives = objectivePacks[tierKey] || [];
        const items = objectives.map((step) => (
            `<li>${step.label}${step.cue ? ` — ${step.cue}` : ''}</li>`
        )).join('');
        return `
            <div class="game-objective-tier" data-objective-tier="${tierKey}" data-tier-active="false">
                <div class="game-objective-tier-head">
                    <span>${OBJECTIVE_LABELS[tierKey]}</span>
                    <span>${objectives.length} objectives</span>
                </div>
                <ul>${items || '<li>No objectives configured.</li>'}</ul>
            </div>
        `;
    }).join('');

    const panel = document.createElement('div');
    panel.className = 'game-coach glass';
    panel.dataset.gameCoach = 'true';
    panel.innerHTML = `
        <div class="game-coach-header">
            <div class="game-coach-text">
                <span class="game-coach-kicker">Coach Focus</span>
                <h3>${meta.skill} · ${meta.goal}</h3>
                <p class="game-coach-goal">Target session: ${formatMinutes(meta.targetMinutes)}</p>
                <p class="game-coach-goal" data-game-mastery-status>Mastery tier: Foundation</p>
            </div>
            <div class="game-coach-badge">${meta.skill}</div>
        </div>
        <div class="game-objective-tiers">${tierHtml}</div>
        <div class="game-session">
            <div class="game-session-row">
                <span class="game-session-label">Session Timer</span>
                <span class="game-session-time" data-game-session-time="">00:00</span>
                <span class="game-session-target">/ ${formatMinutes(meta.targetMinutes)}</span>
            </div>
            <div class="game-session-track" data-game-session-track=""
                role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                <span class="game-session-fill" data-game-session-fill="" style="width:0%"></span>
            </div>
            <div class="game-session-actions">
                <button class="btn btn-primary" type="button" data-game-session-start="">Start session</button>
                <button class="btn btn-secondary" type="button" data-game-session-stop="" disabled>Finish</button>
            </div>
        </div>
        <div class="game-coach-tip"><span>Coach tip:</span> ${meta.tip}</div>`;

    content.insertBefore(panel, content.firstChild);

    return panel;
};

const applyMasteryPanelState = (view, gameId) => {
    if (!view) return;
    const panel = view.querySelector('[data-game-coach]');
    if (!panel) return;
    const entry = masteryStateCache?.games?.[gameId] || null;
    const masteryTier = entry?.tier || 'foundation';
    const objectiveTier = objectiveTierFromMastery(masteryTier);
    const activeIndex = tierIndex(objectiveTier);
    view.dataset.gameObjectiveTier = objectiveTier;

    const status = panel.querySelector('[data-game-mastery-status]');
    if (status) {
        const days = masteryTier === 'gold'
            ? entry?.goldDays || 0
            : masteryTier === 'silver'
                ? entry?.silverDays || 0
                : entry?.bronzeDays || 0;
        status.textContent = `Mastery tier: ${OBJECTIVE_LABELS[objectiveTier]} (${Math.min(3, days)}/3 days validated)`;
    }

    panel.querySelectorAll('[data-objective-tier]').forEach((tierEl) => {
        const tier = tierEl.getAttribute('data-objective-tier');
        const currentIndex = tierIndex(tier);
        tierEl.dataset.tierActive = currentIndex === activeIndex ? 'true' : 'false';
        tierEl.dataset.tierUnlocked = currentIndex <= activeIndex ? 'true' : 'false';
    });
};

const refreshMasteryState = async () => {
    try {
        masteryStateCache = await loadGameMasteryState();
    } catch {
        masteryStateCache = { games: {} };
    }
};

const bindGameEnhancements = async () => {
    await refreshMasteryState();
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
        applyMasteryPanelState(view, id);

        view.dataset.gameEnhanced = 'true';
    });
};

const refreshMasteryPanels = () => {
    document.querySelectorAll('.game-view[data-game-enhanced="true"]').forEach((view) => {
        const id = view.id.replace('view-game-', '');
        applyMasteryPanelState(view, id);
    });
};

const bindMasteryListener = () => {
    if (masteryBound) return;
    masteryBound = true;
    document.addEventListener(GAME_MASTERY_UPDATED, async (event) => {
        const id = event?.detail?.id;
        const mastery = event?.detail?.mastery;
        if (id && mastery) {
            masteryStateCache = {
                ...(masteryStateCache || { games: {} }),
                games: {
                    ...(masteryStateCache?.games || {}),
                    [id]: mastery,
                },
            };
        } else {
            await refreshMasteryState();
        }
        refreshMasteryPanels();
    });
};

const initGameEnhancements = () => {
    const enhancePromise = bindGameEnhancements().catch(() => {});
    renderDifficultyPickers();
    bindMasteryListener();
    return enhancePromise;
};

export const init = initGameEnhancements;
