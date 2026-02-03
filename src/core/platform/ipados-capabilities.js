import { isIPadOS, isStandalone, parseIPadOSVersion } from './ipados.js';

const statusEl = document.querySelector('[data-platform-status]');
const voiceToggle = document.querySelector('#setting-voice');
const voiceNote = document.querySelector('[data-voice-note]');
const root = document.documentElement;

const updateStandaloneState = () => {
    return isStandalone();
};

const updatePlatformFlag = () => {
    if (!root) return;
    root.dataset.platform = isIPadOS() ? 'ipados' : 'other';
};

const updateVoiceSupport = () => {
    const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    if (voiceToggle) {
        voiceToggle.disabled = !supported;
        if (!supported) voiceToggle.checked = false;
    }
    if (voiceNote) {
        voiceNote.textContent = supported
            ? 'Spoken coach tips use built-in iPad voices and work offline.'
            : 'Voice coach is unavailable on this device.';
    }
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

const init = () => {
    updatePlatformFlag();
    updateStandaloneState();
    updateStatus();
    updateVoiceSupport();

    const media = window.matchMedia('(display-mode: standalone)');
    if (media?.addEventListener) {
        media.addEventListener('change', () => {
            updateStandaloneState();
            updateStatus();
        });
    }
    window.addEventListener('appinstalled', () => {
        updateStandaloneState();
        updateStatus();
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
