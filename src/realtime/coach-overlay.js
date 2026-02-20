import { RT_CUE, RT_STATE } from '../utils/event-names.js';

const FALLBACK_ASSET = './assets/illustrations/mascot-happy.webp';
const LISTENING_PULSE_INTERVAL_MS = 750;

const DEFAULT_STATE_MAP = Object.freeze({
    listening: FALLBACK_ASSET,
    steady: './assets/illustrations/mascot-focus.webp',
    'adjust-up': './assets/illustrations/mascot-encourage.webp',
    'adjust-down': './assets/illustrations/mascot-encourage.webp',
    'retry-calm': './assets/illustrations/mascot-focus.webp',
    'celebrate-lock': './assets/illustrations/mascot-celebrate.webp',
});

let overlay = null;
let cueText = null;
let cueAvatar = null;
let hideTimer = null;
let stateMap = { ...DEFAULT_STATE_MAP };
let globalBound = false;
let lastListeningPulseAt = 0;

const prefersReducedMotion = () => {
    const explicit = document.querySelector('#setting-reduce-motion');
    if (explicit?.checked) return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const ensureOverlay = () => {
    if (overlay?.isConnected) return overlay;
    overlay = document.createElement('aside');
    overlay.className = 'rt-coach-pill';
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-atomic', 'true');
    overlay.hidden = true;
    overlay.innerHTML = `
        <img class="rt-coach-pill-avatar" src="${FALLBACK_ASSET}" alt="Panda Coach" width="80" height="80" decoding="async" loading="lazy">
        <div class="rt-coach-pill-text">Listening…</div>
    `;
    cueAvatar = overlay.querySelector('.rt-coach-pill-avatar');
    cueText = overlay.querySelector('.rt-coach-pill-text');
    document.body.appendChild(overlay);
    return overlay;
};

const showOverlay = (message, cueState, dwellMs = 1700) => {
    ensureOverlay();
    const asset = stateMap[cueState] || FALLBACK_ASSET;
    if (cueAvatar) cueAvatar.src = asset;
    if (cueText) cueText.textContent = message;

    overlay.hidden = false;
    overlay.classList.remove('is-entering');
    if (!prefersReducedMotion()) {
        overlay.classList.add('is-entering');
    }

    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
        if (!overlay) return;
        overlay.classList.remove('is-entering');
        overlay.hidden = true;
    }, Math.max(1000, dwellMs));
};

const hideOverlay = () => {
    if (!overlay) return;
    overlay.hidden = true;
    overlay.classList.remove('is-entering');
    window.clearTimeout(hideTimer);
};

const loadStateMap = async () => {
    try {
        const response = await fetch(new URL('./panda-state-map.json', import.meta.url));
        if (!response.ok) return;
        const json = await response.json();
        if (!json || typeof json !== 'object') return;
        const byState = json?.states || {};
        stateMap = { ...DEFAULT_STATE_MAP };
        Object.keys(byState).forEach((state) => {
            const tierOneAsset = byState[state]?.tier1;
            if (typeof tierOneAsset === 'string' && tierOneAsset.trim()) {
                stateMap[state] = tierOneAsset;
            }
        });
    } catch {
        stateMap = { ...DEFAULT_STATE_MAP };
    }
};

const bindGlobalListeners = () => {
    if (globalBound) return;
    globalBound = true;

    document.addEventListener(RT_CUE, (event) => {
        const cue = event.detail || {};
        const message = cue.message || 'Keep going.';
        lastListeningPulseAt = Date.now();
        showOverlay(message, cue.state, cue.dwellMs);
    });

    document.addEventListener(RT_STATE, (event) => {
        const detail = event.detail || {};
        if (!detail.listening && !detail.paused) {
            hideOverlay();
            return;
        }
        if (detail.paused) {
            showOverlay('Listening paused.', 'listening', 1600);
            return;
        }
        if (!overlay?.hidden) return;
        const now = Date.now();
        if (now - lastListeningPulseAt < LISTENING_PULSE_INTERVAL_MS) return;
        lastListeningPulseAt = now;
        showOverlay('Listening…', detail.cueState || 'listening', 1400);
    });
};

export const init = () => {
    ensureOverlay();
    bindGlobalListeners();
    loadStateMap();
};
