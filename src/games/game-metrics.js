import '../styles/games.css';
import { stopTonePlayer } from './shared.js';
import {
    GAME_MASTERY_UPDATED,
    GAME_RECORDED,
    PERSIST_APPLIED,
    SOUNDS_CHANGE,
} from '../utils/event-names.js';
import { getDifficulty } from './difficulty.js';
import { DEFAULT_MASTERY_THRESHOLDS, GAME_META } from './game-config.js';
import { loadGameMasteryState } from './game-mastery.js';

const gameModules = {
    'view-game-pitch-quest': () => import('./pitch-quest.js'),
    'view-game-note-memory': () => import('./note-memory.js'),
    'view-game-rhythm-dash': () => import('./rhythm-dash.js'),
    'view-game-ear-trainer': () => import('./ear-trainer.js'),
    'view-game-bow-hero': () => import('./bow-hero.js'),
    'view-game-string-quest': () => import('./string-quest.js'),
    'view-game-rhythm-painter': () => import('./rhythm-painter.js'),
    'view-game-story-song': () => import('./story-song.js'),
    'view-game-pizzicato': () => import('./pizzicato.js'),
    'view-game-tuning-time': () => import('./tuning-time.js'),
    'view-game-melody-maker': () => import('./melody-maker.js'),
    'view-game-scale-practice': () => import('./scale-practice.js'),
    'view-game-duet-challenge': () => import('./duet-challenge.js'),
};

const loaded = new Map();
const updates = new Set();
let initialized = false;
let masteryState = null;

let updateScheduled = false;
const scheduleUpdateAll = () => {
    if (updateScheduled) return;
    updateScheduled = true;
    requestAnimationFrame(() => {
        updateScheduled = false;
        updates.forEach((fn) => fn());
    });
};

const LEVEL_BY_TIER = Object.freeze({
    foundation: { label: 'Foundation', badge: 'Foundation', objectiveTier: 'foundation' },
    bronze: { label: 'Bronze', badge: 'Bronze', objectiveTier: 'foundation' },
    silver: { label: 'Silver', badge: 'Silver', objectiveTier: 'core' },
    gold: { label: 'Gold', badge: 'Gold', objectiveTier: 'mastery' },
});

const ensureCardMeta = (card) => {
    let meta = card.querySelector('[data-game-mastery-meta]');
    if (meta) return meta;

    meta = document.createElement('div');
    meta.className = 'game-mastery-meta';
    meta.dataset.gameMasteryMeta = 'true';
    meta.innerHTML = `
        <div class="game-mastery-topline">
            <span class="game-mastery-badge" data-game-mastery-badge>Foundation</span>
            <span class="game-mastery-days" data-game-mastery-days>0/3 days</span>
        </div>
        <div class="game-mastery-objectives" data-game-mastery-objectives>Objectives not started.</div>
        <div class="game-mastery-prereq" data-game-mastery-prereq>Complete objectives to unlock higher tiers.</div>
    `;
    card.appendChild(meta);
    return meta;
};

const objectiveProgressLabel = ({ entry, level, objectiveTotal }) => {
    if (!entry) {
        return `Objectives: 0/${objectiveTotal} • Validation: 0/${DEFAULT_MASTERY_THRESHOLDS.distinctDays} days`;
    }

    const distinctDays = DEFAULT_MASTERY_THRESHOLDS.distinctDays;
    let dayProgress = 0;
    if (level.objectiveTier === 'mastery') dayProgress = entry.goldDays || 0;
    else if (level.objectiveTier === 'core') dayProgress = entry.silverDays || 0;
    else dayProgress = entry.bronzeDays || 0;

    const objectiveProgress = Math.min(objectiveTotal, dayProgress);
    return `Objectives: ${objectiveProgress}/${objectiveTotal} • Validation: ${dayProgress}/${distinctDays} days`;
};

const prerequisiteLabel = (tier) => {
    if (tier === 'gold') {
        return 'Gold mastery validated across 3 distinct days.';
    }
    if (tier === 'silver') {
        return 'Mastery tier unlocked. Reach 92% on 3 distinct days for Gold.';
    }
    if (tier === 'bronze') {
        return 'Core tier unlocked. Reach 80% on 3 distinct days for Silver.';
    }
    return 'Reach 60% on 3 distinct days to unlock Bronze.';
};

const renderGameMasteryCards = () => {
    const cards = Array.from(document.querySelectorAll('.game-card[data-game-id]'));
    if (!cards.length) return;

    cards.forEach((card) => {
        const gameId = card.dataset.gameId;
        const entry = masteryState?.games?.[gameId] || null;
        const tier = entry?.tier || 'foundation';
        const level = LEVEL_BY_TIER[tier] || LEVEL_BY_TIER.foundation;
        const objectivePack = GAME_META?.[gameId]?.objectivePacks?.[level.objectiveTier] || [];
        const objectiveTotal = Math.max(1, objectivePack.length || 1);

        card.dataset.masteryTier = tier;
        const meta = ensureCardMeta(card);
        const badge = meta.querySelector('[data-game-mastery-badge]');
        const days = meta.querySelector('[data-game-mastery-days]');
        const objectives = meta.querySelector('[data-game-mastery-objectives]');
        const prereq = meta.querySelector('[data-game-mastery-prereq]');

        if (badge) badge.textContent = level.badge;

        const daysDone = tier === 'gold'
            ? (entry?.goldDays || 0)
            : tier === 'silver'
                ? (entry?.silverDays || 0)
                : (entry?.bronzeDays || 0);
        if (days) {
            days.textContent = `${Math.min(DEFAULT_MASTERY_THRESHOLDS.distinctDays, daysDone)}/${DEFAULT_MASTERY_THRESHOLDS.distinctDays} days`;
        }
        if (objectives) {
            objectives.textContent = objectiveProgressLabel({ entry, level, objectiveTotal });
        }
        if (prereq) {
            prereq.textContent = prerequisiteLabel(tier);
        }
    });
};

const refreshGameMastery = async () => {
    try {
        masteryState = await loadGameMasteryState();
    } catch {
        masteryState = { games: {} };
    }
    renderGameMasteryCards();
};

const loadGame = (viewId) => {
    if (loaded.has(viewId)) return loaded.get(viewId);
    const loader = gameModules[viewId];
    if (!loader) return Promise.resolve();
    const promise = loader()
        .then((mod) => {
            if (typeof mod?.update === 'function') {
                updates.add(mod.update);
            }
            return mod;
        })
        .catch((error) => {
            loaded.delete(viewId);
            console.warn(`[game-metrics] Failed to load ${viewId}`, error);
            return null;
        });
    loaded.set(viewId, promise);
    return promise;
};

const bindGame = (viewId) => {
    if (!gameModules[viewId]) return Promise.resolve();
    return loadGame(viewId).then((mod) => {
        if (!mod) return;
        if (typeof mod.bind === 'function') {
            const gameId = viewId.replace('view-game-', '');
            mod.bind(getDifficulty(gameId));
        }
        if (typeof mod.update === 'function') {
            mod.update();
        }
        scheduleUpdateAll();
    });
};

const loadGamesForView = (viewId) => {
    if (viewId === 'view-games') {
        return;
    }
    if (gameModules[viewId]) {
        bindGame(viewId);
    }
};

const handleChange = (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.type !== 'checkbox') return;
    if (!input.closest('[id^="view-game-"]')) return;
    scheduleUpdateAll();
};

const initMetrics = () => {
    const hash = window.location.hash.slice(1);
    loadGamesForView(hash);
    refreshGameMastery().catch(() => {});

    if (!initialized) {
        initialized = true;
        window.addEventListener('hashchange', () => {
            const view = window.location.hash.slice(1);
            loadGamesForView(view);
            renderGameMasteryCards();
        }, { passive: true });

        document.addEventListener('change', handleChange);
    }
};

export const init = initMetrics;

document.addEventListener(PERSIST_APPLIED, () => {
    scheduleUpdateAll();
    refreshGameMastery().catch(() => {});
});

document.addEventListener(GAME_RECORDED, () => {
    refreshGameMastery().catch(() => {});
});

document.addEventListener(GAME_MASTERY_UPDATED, (event) => {
    const id = event?.detail?.id;
    const game = event?.detail?.mastery;
    if (!id || !game) {
        refreshGameMastery().catch(() => {});
        return;
    }
    const nextGames = {
        ...(masteryState?.games || {}),
        [id]: game,
    };
    masteryState = {
        version: masteryState?.version || 1,
        games: nextGames,
    };
    renderGameMasteryCards();
});

document.addEventListener(SOUNDS_CHANGE, (event) => {
    if (event.detail?.enabled === false) {
        stopTonePlayer();
    }
});
