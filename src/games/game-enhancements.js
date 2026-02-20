import { GAME_META, GAME_OBJECTIVE_TIERS } from './game-config.js';
import { loadGameMasteryState } from './game-mastery.js';
import { renderDifficultyPickers } from './difficulty-picker.js';
import { GAME_MASTERY_UPDATED } from '../utils/event-names.js';
import {
    OBJECTIVE_LABELS,
    attachSessionTimer,
    buildCoachPanel,
    injectHeaderControls,
    resetGameView,
} from './game-enhancements-view.js';

const activeSessions = new Map();
let lifecycleBound = false;
let masteryBound = false;
let masteryStateCache = { games: {} };

const objectiveTierFromMastery = (tier) => {
    if (tier === 'gold') return 'mastery';
    if (tier === 'silver') return 'core';
    return 'foundation';
};

const tierIndex = (tier) => {
    const index = GAME_OBJECTIVE_TIERS.indexOf(tier);
    return index >= 0 ? index : 0;
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
