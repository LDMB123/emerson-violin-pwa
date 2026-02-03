import { isIPadOS, parseIPadOSVersion } from './ipados.js';

const summaryEl = document.querySelector('[data-capability-summary]');
const listEl = document.querySelector('[data-capability-list]');
const root = document.documentElement;

let initPromise = null;

const getPerfMode = () => root?.dataset?.perfMode || 'balanced';
const getPowerPreference = () => (getPerfMode() === 'high' ? 'high-performance' : 'low-power');

const supportsCss = (prop, value) => {
    if (!('CSS' in window) || typeof CSS.supports !== 'function') return false;
    if (value !== undefined) return CSS.supports(prop, value);
    return CSS.supports(prop);
};

const supportsCommand = () => 'command' in HTMLButtonElement.prototype;
const supportsPopover = () => typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
const supportsDialog = () => typeof HTMLDialogElement !== 'undefined';
const supportsViewTransitions = () => 'startViewTransition' in document;
const supportsNavigationApi = () => 'navigation' in window;

const detectWebGPU = async () => {
    if (!navigator.gpu?.requestAdapter) return false;
    try {
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: getPowerPreference() });
        return Boolean(adapter);
    } catch {
        return false;
    }
};

const getChecks = () => ([
    {
        id: 'ipados',
        label: 'iPadOS detected',
        check: () => isIPadOS(),
        detail: () => {
            const version = parseIPadOSVersion();
            return version?.raw ? `iPadOS ${version.raw}` : 'iPadOS';
        },
    },
    {
        id: 'standalone',
        label: 'Home Screen mode',
        check: () => window.matchMedia?.('(display-mode: standalone)')?.matches || false,
        detail: () => 'Add to Home Screen for best offline support.',
    },
    {
        id: 'service-worker',
        label: 'Service Worker',
        check: () => 'serviceWorker' in navigator,
        detail: () => 'Offline app shell & updates.',
    },
    {
        id: 'cache-storage',
        label: 'Cache Storage',
        check: () => 'caches' in window,
        detail: () => 'Offline asset caching.',
    },
    {
        id: 'storage-persist',
        label: 'Storage persistence',
        check: () => Boolean(navigator.storage?.persist),
        detail: () => 'Protect offline data.',
    },
    {
        id: 'indexeddb',
        label: 'IndexedDB',
        check: () => 'indexedDB' in window,
        detail: () => 'Local practice data store.',
    },
    {
        id: 'webassembly',
        label: 'WebAssembly',
        check: () => 'WebAssembly' in window,
        detail: () => 'Low-latency compute.',
    },
    {
        id: 'webgpu',
        label: 'WebGPU',
        check: async () => detectWebGPU(),
        detail: () => 'On-device GPU compute.',
    },
    {
        id: 'audio-worklet',
        label: 'AudioWorklet',
        check: () => 'AudioWorkletNode' in window,
        detail: () => 'Realtime audio analysis.',
    },
    {
        id: 'speech',
        label: 'Speech synthesis',
        check: () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
        detail: () => 'Voice coach offline.',
    },
    {
        id: 'navigation-api',
        label: 'Navigation API',
        check: () => supportsNavigationApi(),
        detail: () => 'App-like navigation.',
    },
    {
        id: 'view-transitions',
        label: 'View Transitions',
        check: () => supportsViewTransitions(),
        detail: () => 'Native-feel transitions.',
    },
    {
        id: 'popover',
        label: 'Popover API',
        check: () => supportsPopover(),
        detail: () => 'Native popovers.',
    },
    {
        id: 'dialog',
        label: 'HTML dialog',
        check: () => supportsDialog(),
        detail: () => 'Native dialog element.',
    },
    {
        id: 'command',
        label: 'HTML command',
        check: () => supportsCommand(),
        detail: () => 'Native dialog/popover control.',
    },
    {
        id: 'field-sizing',
        label: 'CSS field sizing',
        check: () => supportsCss('field-sizing', 'content'),
        detail: () => 'Auto-resize inputs.',
    },
    {
        id: 'anchor-positioning',
        label: 'CSS anchor positioning',
        check: () => supportsCss('position-anchor', 'auto') || supportsCss('anchor-name', '--anchor'),
        detail: () => 'Precise tooltip anchoring.',
    },
]);

const formatStatus = (ready) => (ready ? 'Ready' : 'Unavailable');

const renderList = (results) => {
    if (!listEl) return;
    listEl.replaceChildren();
    results.forEach((result) => {
        const item = document.createElement('li');
        item.className = 'capability-item';
        item.dataset.status = result.ready ? 'ready' : 'missing';
        item.dataset.capability = result.id;

        const label = document.createElement('span');
        label.className = 'capability-label';
        label.textContent = result.label;

        const status = document.createElement('span');
        status.className = 'capability-status';
        status.textContent = formatStatus(result.ready);

        const detail = document.createElement('span');
        detail.className = 'capability-detail';
        detail.textContent = result.detail || '';

        item.appendChild(label);
        item.appendChild(status);
        item.appendChild(detail);
        listEl.appendChild(item);
    });
};

const renderSummary = (results) => {
    if (!summaryEl) return;
    const total = results.length;
    const ready = results.filter((item) => item.ready).length;
    summaryEl.textContent = `Capabilities: ${ready}/${total} ready · Perf mode: ${getPerfMode()}.`;
};

const runChecks = async () => {
    const checks = getChecks();
    const results = await Promise.all(
        checks.map(async (entry) => {
            try {
                const ready = await entry.check();
                const detail = typeof entry.detail === 'function' ? entry.detail(ready) : entry.detail;
                return { id: entry.id, label: entry.label, ready, detail };
            } catch {
                return { id: entry.id, label: entry.label, ready: false, detail: 'Unavailable.' };
            }
        })
    );
    return results;
};

const applyDataset = (results) => {
    if (!root) return;
    results.forEach((entry) => {
        const key = `cap${entry.id.replace(/[^a-z0-9]/gi, '')}`;
        root.dataset[key] = entry.ready ? 'true' : 'false';
    });
};

const initRegistry = async () => {
    if (summaryEl) summaryEl.textContent = 'Capabilities: checking…';
    const results = await runChecks();
    renderSummary(results);
    renderList(results);
    applyDataset(results);
    return results;
};

const runInit = () => {
    if (initPromise) return initPromise;
    initPromise = initRegistry().finally(() => {
        initPromise = null;
    });
    return initPromise;
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInit);
} else {
    runInit();
}

document.addEventListener('panda:performance-mode-change', () => {
    runInit();
});

export const getCapabilities = async () => runInit();
