import { whenReady } from '../utils/dom-ready.js';
import '../styles/games.css';
import { stopTonePlayer } from './shared.js';
import { PERSIST_APPLIED, SOUNDS_CHANGE } from '../utils/event-names.js';
import { getDifficulty } from './difficulty.js';

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

let updateScheduled = false;
const scheduleUpdateAll = () => {
    if (updateScheduled) return;
    updateScheduled = true;
    requestAnimationFrame(() => {
        updateScheduled = false;
        updates.forEach((fn) => fn());
    });
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
            if (typeof mod?.bind === 'function') {
                const gameId = viewId.replace('view-game-', '');
                mod.bind(getDifficulty(gameId));
            }
            scheduleUpdateAll();
        })
        .catch((error) => {
            loaded.delete(viewId);
            console.warn(`[game-metrics] Failed to load ${viewId}`, error);
        });
    loaded.set(viewId, promise);
    return promise;
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
    if (input.type !== 'checkbox') return;
    if (!input.closest('[id^="view-game-"]')) return;
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

whenReady(initMetrics);

document.addEventListener(PERSIST_APPLIED, () => {
    scheduleUpdateAll();
});

document.addEventListener(SOUNDS_CHANGE, (event) => {
    if (event.detail?.enabled === false) {
        stopTonePlayer();
    }
});
