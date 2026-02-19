import { isIPadOS, isStandalone, setRootDataset } from './platform-utils.js';

let statusEl = null;
let voiceToggle = null;
let voiceNote = null;
let globalsBound = false;

const resolveElements = () => {
    statusEl = document.querySelector('[data-platform-status]');
    voiceToggle = document.querySelector('#setting-voice');
    voiceNote = document.querySelector('[data-voice-note]');
};

const parseIPadOSVersion = () => {
    const match = navigator.userAgent.match(/OS (\d+)[_\.](\d+)/i);
    if (!match) return null;
    const major = Number.parseInt(match[1], 10);
    const minor = Number.parseInt(match[2], 10);
    if (Number.isNaN(major) || Number.isNaN(minor)) return null;
    return { major, minor, raw: `${major}.${minor}` };
};

const updateStandaloneState = () => {
    const standalone = isStandalone();
    setRootDataset('standalone', standalone ? 'true' : 'false');
    return standalone;
};

const updateVoiceSupport = () => {
    if (voiceToggle) voiceToggle.disabled = false;
    if (voiceNote) voiceNote.textContent = 'Spoken coach tips use built-in iPad voices and work offline.';
    setRootDataset('voiceSupport', 'true');
};

const updateStatus = () => {
    if (!statusEl) return;
    if (!isIPadOS()) {
        statusEl.textContent = 'Optimized for iPadOS 26.2 with offline-first storage.';
        return;
    }
    const version = parseIPadOSVersion();
    const versionLabel = version?.raw ? `iPadOS ${version.raw}` : 'iPadOS 26.2';
    const mode = updateStandaloneState() ? 'Home Screen' : 'Safari';
    statusEl.textContent = `${versionLabel} detected. Running in ${mode} mode.`;
};

const bindGlobalListeners = () => {
    if (globalsBound) return;
    globalsBound = true;
    window.matchMedia('(display-mode: standalone)').addEventListener('change', () => {
        updateStandaloneState();
        updateStatus();
    });
    window.addEventListener('appinstalled', () => {
        updateStandaloneState();
        updateStatus();
    });
};

const initIpadosCapabilities = () => {
    resolveElements();
    const ipados = isIPadOS();
    setRootDataset('platform', ipados ? 'ipados' : 'other');

    const version = parseIPadOSVersion();
    if (version) {
        setRootDataset('ipadosMajor', version.major);
        setRootDataset('ipadosMinor', version.minor);
    }

    setRootDataset('fsAccess', 'showOpenFilePicker' in window ? 'true' : 'false');
    setRootDataset('share', navigator.share ? 'true' : 'false');
    setRootDataset('badge', 'setAppBadge' in navigator ? 'true' : 'false');

    updateStandaloneState();
    updateStatus();
    updateVoiceSupport();
    bindGlobalListeners();
};

export const init = initIpadosCapabilities;
