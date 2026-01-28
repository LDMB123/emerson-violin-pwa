const root = document.documentElement;
const statusEl = document.querySelector('[data-platform-status]');
const voiceToggle = document.querySelector('#setting-voice');
const voiceNote = document.querySelector('[data-voice-note]');

const isIPadOS = () => /iPad/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.navigator.standalone === true;

const parseIPadOSVersion = () => {
    const match = navigator.userAgent.match(/OS (\d+)[_\.](\d+)/i);
    if (!match) return null;
    const major = Number.parseInt(match[1], 10);
    const minor = Number.parseInt(match[2], 10);
    if (Number.isNaN(major) || Number.isNaN(minor)) return null;
    return { major, minor, raw: `${major}.${minor}` };
};

const setDataset = (key, value) => {
    if (!root) return;
    if (value === null || value === undefined) {
        delete root.dataset[key];
    } else {
        root.dataset[key] = String(value);
    }
};

const updateStandaloneState = () => {
    const standalone = isStandalone();
    setDataset('standalone', standalone ? 'true' : 'false');
    return standalone;
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
    setDataset('voiceCoach', supported ? 'true' : 'false');
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
    const ipados = isIPadOS();
    setDataset('platform', ipados ? 'ipados' : 'other');

    const version = parseIPadOSVersion();
    if (version) {
        setDataset('ipadosMajor', version.major);
        setDataset('ipadosMinor', version.minor);
    }

    setDataset('fsAccess', 'showOpenFilePicker' in window ? 'true' : 'false');
    setDataset('share', navigator.share ? 'true' : 'false');
    setDataset('badge', 'setAppBadge' in navigator ? 'true' : 'false');

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
