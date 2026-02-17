import '../styles/games.css';
import { stopTonePlayer } from './shared.js';
import { PERSIST_APPLIED, SOUNDS_CHANGE } from '../utils/event-names.js';

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

const shouldUpdate = (id) =>
    /^(pq-step-|rd-set-|nm-card-|et-step-|bh-step-|sq-step-|rp-pattern-|ss-step-|pz-step-|tt-step-|mm-step-|sp-step-|dc-step-)/.test(id);

const loaded = new Map();
const updates = [];

let updateScheduled = false;
const scheduleUpdateAll = () => {
    if (updateScheduled) return;
    updateScheduled = true;
    requestAnimationFrame(() => {
        updateScheduled = false;
        updates.forEach((fn) => fn());
    });
};

const loadGame = async (viewId) => {
    if (loaded.has(viewId)) return;
    const loader = gameModules[viewId];
    if (!loader) return;
    loaded.set(viewId, null);
    const mod = await loader();
    loaded.set(viewId, mod);
    updates.push(mod.update);
    mod.bind();
    scheduleUpdateAll();
};

const loadGamesForView = (viewId) => {
    if (viewId === 'view-games') {
        return;
    }
    if (gameModules[viewId]) {
        loadGame(viewId);
    }
};

const handleChange = (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.type !== 'checkbox' || !input.id) return;
    if (!shouldUpdate(input.id)) return;
    scheduleUpdateAll();
};

const initMetrics = () => {
    const hash = window.location.hash.slice(1);
    loadGamesForView(hash);

    window.addEventListener('hashchange', () => {
        const view = window.location.hash.slice(1);
        loadGamesForView(view);
    }, { passive: true });

    document.addEventListener('change', handleChange);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMetrics);
} else {
    initMetrics();
}

document.addEventListener(PERSIST_APPLIED, () => {
    scheduleUpdateAll();
});

document.addEventListener(SOUNDS_CHANGE, (event) => {
    if (event.detail?.enabled === false) {
        stopTonePlayer();
    }
});
