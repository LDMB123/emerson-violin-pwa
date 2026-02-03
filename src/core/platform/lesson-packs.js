import { cloneTemplate } from '../utils/templates.js';

const PACKS = [
    {
        id: 'practice-audio',
        version: '2026-02-03',
        title: 'Practice Audio',
        description: 'Metronome clicks and string tones for tuner drills.',
        assets: [
            './assets/audio/metronome-60.wav',
            './assets/audio/metronome-90.wav',
            './assets/audio/metronome-120.wav',
            './assets/audio/violin-g3.wav',
            './assets/audio/violin-d4.wav',
            './assets/audio/violin-a4.wav',
            './assets/audio/violin-e5.wav',
        ],
    },
    {
        id: 'coach-visuals',
        version: '2026-02-03',
        title: 'Coach Visuals',
        description: 'Mascot illustrations used across the coach views.',
        assets: [
            './assets/illustrations/mascot-happy.png',
            './assets/illustrations/mascot-focus.png',
            './assets/illustrations/mascot-encourage.png',
            './assets/illustrations/mascot-celebrate.png',
        ],
    },
    {
        id: 'rewards-badges',
        version: '2026-02-03',
        title: 'Rewards Badges',
        description: 'Achievement badges for streaks and milestones.',
        assets: [
            './assets/badges/badge_pitch_master_1769390924763.png',
            './assets/badges/badge_rhythm_star_1769390938421.png',
            './assets/badges/badge_practice_streak_1769390952199.png',
            './assets/badges/badge_bow_hero_1769390964607.png',
            './assets/badges/badge_ear_training_1769391019017.png',
        ],
    },
];

const PACK_INDEX = new Map(PACKS.map((pack) => [pack.id, pack]));
const listEl = document.querySelector('[data-pack-list]');
const summaryEl = document.querySelector('[data-pack-summary]');
const refreshButton = document.querySelector('[data-pack-refresh]');
const clearButton = document.querySelector('[data-pack-clear]');

const state = new Map();
const nodes = new Map();
const autoVerify = new Set();
const prefersReducedData = () => window.matchMedia?.('(prefers-reduced-data: reduce)').matches;
const isSaveDataEnabled = () => Boolean(navigator.connection?.saveData);
const canAutoFetch = () => navigator.onLine && !prefersReducedData() && !isSaveDataEnabled();

const setSummary = (text) => {
    if (summaryEl) summaryEl.textContent = text;
};

const formatCount = (value) => (Number.isFinite(value) ? value : 0);

const updateSummary = () => {
    const totals = { ready: 0, total: PACKS.length };
    PACKS.forEach((pack) => {
        const entry = state.get(pack.id);
        if (entry?.status === 'ready' && pack.assets.length) {
            totals.ready += 1;
        }
    });
    setSummary(`Lesson packs: ${totals.ready}/${totals.total} ready.`);
};

const setPackState = (packId, next) => {
    const entry = {
        cached: 0,
        total: 0,
        status: 'unknown',
        message: 'Checking…',
        ...state.get(packId),
        ...next,
    };
    state.set(packId, entry);
    const node = nodes.get(packId);
    if (!node) return;
    const { statusEl, progressEl, downloadBtn, removeBtn } = node;

    if (statusEl) statusEl.textContent = entry.message;
    if (progressEl) {
        progressEl.max = Math.max(1, entry.total || 1);
        progressEl.value = Math.min(entry.cached || 0, progressEl.max);
    }
    if (node.root) {
        node.root.dataset.packState = entry.status;
    }
    if (downloadBtn) {
        const isComplete = entry.total && entry.cached === entry.total;
        downloadBtn.disabled = entry.status === 'downloading' || (isComplete && entry.status !== 'stale');
    }
    if (removeBtn) {
        removeBtn.disabled = entry.status === 'downloading' || entry.cached === 0;
    }
    updateSummary();
};

const renderPack = (pack) => {
    if (!listEl) return;
    const node = cloneTemplate('#lesson-pack-template');
    if (!node) return;
    node.dataset.packId = pack.id;

    const titleEl = node.querySelector('[data-pack-title]');
    const descEl = node.querySelector('[data-pack-desc]');
    const sizeEl = node.querySelector('[data-pack-size]');
    const statusEl = node.querySelector('[data-pack-status]');
    const progressEl = node.querySelector('[data-pack-progress]');
    const downloadBtn = node.querySelector('[data-pack-download]');
    const removeBtn = node.querySelector('[data-pack-remove]');

    if (titleEl) titleEl.textContent = pack.title;
    if (descEl) descEl.textContent = pack.description;
    if (sizeEl) sizeEl.textContent = `${pack.assets.length} files · v${pack.version}`;
    if (progressEl) {
        progressEl.max = pack.assets.length || 1;
        progressEl.value = 0;
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            setPackState(pack.id, {
                status: 'downloading',
                cached: 0,
                total: pack.assets.length,
                message: 'Downloading…',
            });
            sendToServiceWorker({
                type: 'PACK_CACHE',
                packId: pack.id,
                version: pack.version,
                assets: pack.assets,
            });
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            setPackState(pack.id, {
                status: 'downloading',
                message: 'Removing…',
            });
            sendToServiceWorker({ type: 'PACK_CLEAR', packId: pack.id, assets: pack.assets });
        });
    }

    nodes.set(pack.id, {
        root: node,
        statusEl,
        progressEl,
        downloadBtn,
        removeBtn,
    });
    listEl.appendChild(node);
    setPackState(pack.id, {
        status: 'idle',
        cached: 0,
        total: pack.assets.length,
        message: 'Not downloaded yet.',
    });
};

const sendToServiceWorker = async (payload) => {
    if (!('serviceWorker' in navigator)) {
        setSummary('Lesson packs unavailable: service worker not supported.');
        return;
    }
    try {
        const registration = await navigator.serviceWorker.ready;
        const target = navigator.serviceWorker.controller || registration?.active;
        if (!target) {
            setSummary('Lesson packs unavailable: service worker not active yet.');
            return;
        }
        target.postMessage(payload);
    } catch {
        setSummary('Lesson packs unavailable right now.');
    }
};

const queueAutoVerify = (packId) => {
    if (!canAutoFetch()) return;
    const pack = PACK_INDEX.get(packId);
    if (!pack) return;
    if (autoVerify.has(packId)) return;
    autoVerify.add(packId);
    sendToServiceWorker({
        type: 'PACK_VERIFY',
        packId: pack.id,
        assets: pack.assets,
        version: pack.version,
    });
};

const handleMessage = (event) => {
    const data = event?.data;
    if (!data?.type) return;
    if (data.type === 'PACK_PROGRESS') {
        const cached = formatCount(data.cached);
        const total = formatCount(data.total);
        setPackState(data.packId, {
            status: 'downloading',
            cached,
            total,
            message: `Downloading ${cached}/${total}…`,
        });
        return;
    }
    if (data.type === 'PACK_COMPLETE') {
        autoVerify.delete(data.packId);
        const cached = formatCount(data.cached);
        const total = formatCount(data.total);
        const status = cached && cached === total ? 'ready' : 'partial';
        const message = cached && cached === total
            ? 'Ready offline.'
            : `Missing ${Math.max(0, total - cached)} files.`;
        setPackState(data.packId, {
            status,
            cached,
            total,
            message,
        });
        if (status === 'ready') {
            document.dispatchEvent(new CustomEvent('panda:pack-ready', { detail: { packId: data.packId } }));
        }
        return;
    }
    if (data.type === 'PACK_CLEAR_DONE') {
        autoVerify.delete(data.packId);
        setPackState(data.packId, {
            status: 'idle',
            cached: 0,
            total: formatCount(data.total),
            message: 'Not downloaded yet.',
        });
        return;
    }
    if (data.type === 'PACK_AUTO_REPAIR') {
        if (data.packId) {
            setPackState(data.packId, {
                status: 'partial',
                message: `Auto-repaired ${formatCount(data.missing)} files.`,
            });
        }
        requestSummary();
        return;
    }
    if (data.type === 'PACK_SUMMARY') {
        if (Array.isArray(data.packs)) {
            data.packs.forEach((pack) => {
                const cached = formatCount(pack.cached);
                const total = formatCount(pack.total);
                const stale = Boolean(pack.stale);
                const status = stale
                    ? 'stale'
                    : cached && cached === total
                        ? 'ready'
                        : 'partial';
                const message = stale
                    ? 'Update required. Download again.'
                    : cached && cached === total
                        ? 'Ready offline.'
                        : total
                            ? `Missing ${Math.max(0, total - cached)} files.`
                            : 'Not downloaded yet.';
                setPackState(pack.packId, {
                    status: cached ? status : 'idle',
                    cached,
                    total,
                    message,
                });
                if (stale) {
                    queueAutoVerify(pack.packId);
                }
            });
        }
        return;
    }
    if (data.type === 'PACK_ERROR') {
        setPackState(data.packId, {
            status: 'error',
            message: 'Download failed. Try again.',
        });
    }
};

const requestSummary = () => {
    sendToServiceWorker({
        type: 'PACK_SUMMARY_REQUEST',
        packs: PACKS.map((pack) => ({ id: pack.id, assets: pack.assets, version: pack.version })),
    });
};

const requestVerify = () => {
    PACKS.forEach((pack) => {
        setPackState(pack.id, {
            status: 'downloading',
            cached: 0,
            total: pack.assets.length,
            message: 'Verifying…',
        });
        sendToServiceWorker({
            type: 'PACK_VERIFY',
            packId: pack.id,
            assets: pack.assets,
            version: pack.version,
        });
    });
};

const clearAll = () => {
    sendToServiceWorker({ type: 'PACK_CLEAR_ALL' });
    PACKS.forEach((pack) => {
        setPackState(pack.id, {
            status: 'idle',
            cached: 0,
            total: pack.assets.length,
            message: 'Not downloaded yet.',
        });
    });
};

const init = () => {
    if (!listEl) return;
    PACKS.forEach(renderPack);
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', handleMessage);
    }
    window.addEventListener('online', requestSummary, { passive: true });
    if (refreshButton) {
        refreshButton.addEventListener('click', requestVerify);
    }
    if (clearButton) {
        clearButton.addEventListener('click', clearAll);
    }
    requestSummary();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
