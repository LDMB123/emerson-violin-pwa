import { isSoundEnabled } from '../utils/sound-state.js';
import {
    shouldRetryPersist,
    formatBytes,
    isStandalone,
    getViewId,
    viewAllowsWake,
    getPreferredOrientation,
} from './platform-utils.js';
import { PERSIST_REQUEST_KEY } from '../persistence/storage-keys.js';
import { OFFLINE_MODE_CHANGE, SOUNDS_CHANGE, PERSIST_APPLIED } from '../utils/event-names.js';

const storageStatusEl = document.querySelector('[data-storage-status]');
const storageEstimateEl = document.querySelector('[data-storage-estimate]');
const storageRequestButton = document.querySelector('[data-storage-request]');
const networkStatusEl = document.querySelector('[data-network-status]');
const wakeToggle = document.querySelector('#setting-keep-awake');
const wakeStatusEl = document.querySelector('[data-wake-status]');
const orientationToggle = document.querySelector('#setting-orientation-lock');
const orientationStatusEl = document.querySelector('[data-orientation-status]');
const shareButton = document.querySelector('[data-share-summary]');
const shareStatusEl = document.querySelector('[data-share-status]');
const soundToggle = document.querySelector('#setting-sounds');
const rootStyle = document.documentElement?.style;
const root = document.documentElement;
const installStatusEl = document.querySelector('[data-install-status]');

const loadPersistRequest = () => {
    try {
        const raw = localStorage.getItem(PERSIST_REQUEST_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const savePersistRequest = (state) => {
    try {
        localStorage.setItem(PERSIST_REQUEST_KEY, JSON.stringify(state));
    } catch {
        // Ignore storage failures
    }
};

const setRootDataset = (key, value) => {
    if (!root) return;
    if (value === null || value === undefined) {
        delete root.dataset[key];
        return;
    }
    root.dataset[key] = String(value);
};


const requestPersistentStorage = async (reason) => {
    if (!navigator.storage?.persist) return false;
    if (document.hidden) return false;
    const previous = loadPersistRequest();
    if (!shouldRetryPersist(previous)) return false;
    const nextState = {
        lastAttempt: Date.now(),
        reason,
        persisted: false,
    };
    savePersistRequest(nextState);
    try {
        const persisted = await navigator.storage.persist();
        nextState.persisted = Boolean(persisted);
        savePersistRequest(nextState);
        return nextState.persisted;
    } catch {
        return false;
    }
};

const maybeAutoPersist = async (reason) => {
    if (!navigator.storage?.persisted) return;
    const persisted = await navigator.storage.persisted();
    if (persisted) return;
    const offlineMode = document.documentElement?.dataset?.offlineMode === 'on';
    const shouldAttempt = isStandalone() || offlineMode;
    if (!shouldAttempt) return;
    const didPersist = await requestPersistentStorage(reason);
    if (didPersist) {
        updateStorageStatus();
    }
};


const updateStorageEstimate = async () => {
    if (!navigator.storage?.estimate) {
        if (storageEstimateEl) {
            storageEstimateEl.textContent = 'Storage estimate unavailable on this device.';
        }
        setRootDataset('storagePressure', null);
        return;
    }
    try {
        const { usage, quota } = await navigator.storage.estimate();
        if (Number.isFinite(quota) && quota > 0) {
            const ratio = usage / quota;
            const pressure = ratio > 0.9 ? 'high' : ratio > 0.75 ? 'medium' : 'low';
            setRootDataset('storagePressure', pressure);
            if (storageEstimateEl) {
                const warning = pressure === 'high'
                    ? ' Storage nearly full — consider exporting recordings.'
                    : pressure === 'medium'
                        ? ' Storage starting to fill up.'
                        : '';
                storageEstimateEl.textContent = `Storage used: ${formatBytes(usage)} / ${formatBytes(quota)}.${warning}`;
            }
        } else {
            setRootDataset('storagePressure', null);
            if (storageEstimateEl) {
                storageEstimateEl.textContent = `Storage used: ${formatBytes(usage)}.`;
            }
        }
    } catch {
        if (storageEstimateEl) {
            storageEstimateEl.textContent = 'Storage estimate unavailable right now.';
        }
    }
};

const updateStorageStatus = async (request = false) => {
    if (!navigator.storage?.persisted) {
        if (storageStatusEl) {
            storageStatusEl.textContent = 'Persistent storage is not available on this device.';
        }
        if (storageRequestButton) storageRequestButton.disabled = true;
        setRootDataset('storagePersisted', 'unsupported');
        return { supported: false, persisted: false };
    }
    try {
        let persisted = await navigator.storage.persisted();
        if (!persisted && request && navigator.storage.persist) {
            persisted = await navigator.storage.persist();
        }
        setRootDataset('storagePersisted', persisted ? 'true' : 'false');
        if (storageRequestButton) {
            storageRequestButton.disabled = persisted || !navigator.storage.persist;
        }
        if (storageStatusEl) {
            storageStatusEl.textContent = persisted
                ? 'Offline storage is protected.'
                : 'Offline storage may be cleared if the device is low on space.';
        }
        return { supported: true, persisted };
    } catch {
        if (storageStatusEl) {
            storageStatusEl.textContent = 'Unable to confirm offline storage status.';
        }
        return { supported: true, persisted: false };
    }
};

const bindStorageUI = () => {
    updateStorageStatus();
    updateStorageEstimate();
    maybeAutoPersist('boot');
    if (storageRequestButton) {
        storageRequestButton.addEventListener('click', () => {
            updateStorageStatus(true).then(updateStorageEstimate);
        });
    }
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            updateStorageEstimate();
            updateStorageStatus();
            maybeAutoPersist('visible');
        }
    });
    window.addEventListener('online', () => {
        updateStorageEstimate();
        updateStorageStatus();
        maybeAutoPersist('online');
    }, { passive: true });
    document.addEventListener(OFFLINE_MODE_CHANGE, () => {
        maybeAutoPersist('offline-mode');
    });
};

const updateNetworkStatus = () => {
    if (!networkStatusEl) return;
    const online = navigator.onLine;
    const offlineMode = document.documentElement?.dataset?.offlineMode === 'on';
    if (offlineMode) {
        networkStatusEl.textContent = 'Network status: Offline mode enabled (cached-only).';
        return;
    }
    networkStatusEl.textContent = online
        ? 'Network status: Online (offline mode still available).'
        : 'Network status: Offline (local content is ready).';
};

const bindNetworkStatus = () => {
    if (!networkStatusEl) return;
    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus, { passive: true });
    window.addEventListener('offline', updateNetworkStatus, { passive: true });
    document.addEventListener(OFFLINE_MODE_CHANGE, updateNetworkStatus);
};

let wakeLock = null;


const releaseWakeLock = async () => {
    if (!wakeLock) return;
    try {
        await wakeLock.release();
    } catch {
        // Ignore release errors
    }
    wakeLock = null;
};

const updateWakeStatus = (message) => {
    if (wakeStatusEl) wakeStatusEl.textContent = message;
};

const requestWakeLock = async () => {
    if (!wakeToggle) return;
    if (!wakeToggle.checked) {
        await releaseWakeLock();
        updateWakeStatus('Screen stays on during practice sessions.');
        return;
    }
    if (!('wakeLock' in navigator)) {
        updateWakeStatus('Screen wake lock not available on this device.');
        return;
    }
    if (document.hidden) return;
    const viewId = getViewId();
    if (!viewAllowsWake(viewId)) {
        await releaseWakeLock();
        updateWakeStatus('Enable this while practicing to keep the screen awake.');
        return;
    }
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        updateWakeStatus('Screen will stay awake while you practice.');
        wakeLock.addEventListener('release', () => {
            if (wakeToggle.checked && !document.hidden) {
                requestWakeLock();
            }
        });
    } catch {
        updateWakeStatus('Screen wake lock unavailable right now.');
    }
};

const bindWakeLock = () => {
    if (!wakeToggle) return;
    wakeToggle.addEventListener('change', requestWakeLock);
    window.addEventListener('hashchange', requestWakeLock, { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            releaseWakeLock();
        } else {
            requestWakeLock();
        }
    });
    window.addEventListener('pagehide', () => {
        releaseWakeLock();
    });
    requestWakeLock();
};

let orientationLocked = false;

const updateOrientationStatus = (message) => {
    if (orientationStatusEl) orientationStatusEl.textContent = message;
};


const unlockOrientation = () => {
    if (screen.orientation?.unlock) {
        screen.orientation.unlock();
    }
    orientationLocked = false;
};

const requestOrientationLock = async () => {
    if (!orientationToggle) return;
    if (!orientationToggle.checked) {
        unlockOrientation();
        updateOrientationStatus('Orientation follows device settings.');
        return;
    }
    if (!screen.orientation?.lock) {
        updateOrientationStatus('Orientation lock not available on this device.');
        return;
    }
    if (document.hidden) return;
    const viewId = getViewId();
    if (!viewAllowsWake(viewId)) {
        unlockOrientation();
        updateOrientationStatus('Enable this while practicing to keep the orientation fixed.');
        return;
    }
    try {
        await screen.orientation.lock(getPreferredOrientation());
        orientationLocked = true;
        updateOrientationStatus('Orientation locked for practice sessions.');
    } catch {
        updateOrientationStatus('Orientation lock unavailable right now. Use Control Center if needed.');
    }
};

const bindOrientationLock = () => {
    if (!orientationToggle) return;
    orientationToggle.addEventListener('change', requestOrientationLock);
    window.addEventListener('hashchange', requestOrientationLock, { passive: true });
    window.addEventListener('orientationchange', () => {
        if (orientationToggle.checked && orientationLocked) {
            requestOrientationLock();
        }
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            unlockOrientation();
        } else {
            requestOrientationLock();
        }
    });
    window.addEventListener('pagehide', () => {
        unlockOrientation();
    });
    requestOrientationLock();
};

const buildShareSummary = () => {
    const weekSummary = document.querySelector('[data-parent="week-summary"]')?.textContent?.trim();
    const goalValue = document.querySelector('[data-parent="goal-value"]')?.textContent?.trim();
    const goalTitle = document.querySelector('[data-parent-goal-title]')?.textContent?.trim();
    const skillLines = Array.from(document.querySelectorAll('.overview-skill')).map((skill) => {
        const name = skill.querySelector('.skill-name')?.textContent?.trim();
        const stars = skill.querySelector('.skill-stars')?.textContent?.trim();
        if (!name || !stars) return null;
        return `${name}: ${stars}`;
    }).filter(Boolean);

    const lines = [
        'Panda Violin — Weekly Summary',
        weekSummary || 'Weekly practice summary',
    ];
    if (goalTitle) lines.push(`Recital focus: ${goalTitle}`);
    if (goalValue) lines.push(`Goal progress: ${goalValue}`);
    if (skillLines.length) {
        lines.push('Skills:');
        lines.push(...skillLines);
    }
    return lines.join('\n');
};

const bindShareSummary = () => {
    if (!shareButton) return;
    shareButton.addEventListener('click', async () => {
        const text = buildShareSummary();
        if (!text) return;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Panda Violin Summary',
                    text,
                });
                if (shareStatusEl) shareStatusEl.textContent = 'Shared.';
                return;
            } catch {
                // User cancelled or share failed; continue to fallback
            }
        }
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                if (shareStatusEl) shareStatusEl.textContent = 'Summary copied to clipboard.';
                return;
            } catch {
                // fall through
            }
        }
        if (shareStatusEl) shareStatusEl.textContent = 'Sharing not available on this device.';
    });
};

const buildAudioLabel = (audio) => {
    if (!audio) return 'Practice Audio';
    const labelledBy = audio.getAttribute('aria-labelledby');
    if (labelledBy) {
        const labelEl = document.getElementById(labelledBy);
        if (labelEl?.textContent) return labelEl.textContent.trim();
    }
    const tone = audio.dataset.toneAudio;
    if (tone) return `Reference tone ${tone}`;
    const panelTitle = audio.closest('.audio-panel')?.querySelector('h3')?.textContent?.trim();
    if (panelTitle) return panelTitle;
    return 'Practice Audio';
};

const bindMediaSession = () => {
    if (!('mediaSession' in navigator)) return;
    const audios = Array.from(document.querySelectorAll('audio'));
    if (!audios.length) return;
    let currentAudio = null;

    const updateState = (state) => {
        try {
            navigator.mediaSession.playbackState = state;
        } catch {
            // Ignore unsupported playback state errors
        }
    };

    const applyMetadata = (audio) => {
        const label = buildAudioLabel(audio);
        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: label,
                artist: 'Panda Violin',
                album: 'Practice Tools',
            });
        } catch {
            // Ignore metadata failures
        }
    };

    audios.forEach((audio) => {
        audio.addEventListener('play', () => {
            currentAudio = audio;
            applyMetadata(audio);
            updateState('playing');
        });
        audio.addEventListener('pause', () => {
            if (currentAudio === audio) updateState('paused');
        });
        audio.addEventListener('ended', () => {
            if (currentAudio === audio) updateState('none');
        });
    });

    try {
        navigator.mediaSession.setActionHandler('play', async () => {
            if (!isSoundEnabled()) return;
            if (currentAudio) {
                await currentAudio.play().catch(() => {});
            }
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            if (currentAudio) currentAudio.pause();
        });
        navigator.mediaSession.setActionHandler('stop', () => {
            if (currentAudio) currentAudio.pause();
            updateState('none');
        });
    } catch {
        // Some action handlers may not be supported on this device
    }
};

const bindAudioFocus = () => {
    const audios = Array.from(document.querySelectorAll('audio'));
    if (!audios.length) return;

    const pauseOthers = (current) => {
        audios.forEach((audio) => {
            if (audio !== current && !audio.paused) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
    };

    audios.forEach((audio) => {
        audio.addEventListener('play', () => {
            if (!isSoundEnabled()) {
                audio.pause();
                audio.currentTime = 0;
                return;
            }
            pauseOthers(audio);
        });
    });

    document.addEventListener(SOUNDS_CHANGE, (event) => {
        if (event.detail?.enabled === false) {
            pauseOthers(null);
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            pauseOthers(null);
        }
    });
    window.addEventListener('pagehide', () => {
        pauseOthers(null);
    });
    window.addEventListener('hashchange', () => {
        pauseOthers(null);
    }, { passive: true });
};

const resolveSoundState = () => (soundToggle ? soundToggle.checked : isSoundEnabled());

const updateSoundState = () => {
    const enabled = resolveSoundState();
    if (document.documentElement) {
        document.documentElement.dataset.sounds = enabled ? 'on' : 'off';
    }
    document.querySelectorAll('audio').forEach((audio) => {
        audio.muted = !enabled;
        if (!enabled && !audio.paused) {
            audio.pause();
            audio.currentTime = 0;
        }
    });
    document.dispatchEvent(new CustomEvent(SOUNDS_CHANGE, { detail: { enabled } }));
};

const bindSoundToggle = () => {
    if (soundToggle) {
        soundToggle.checked = isSoundEnabled();
        soundToggle.addEventListener('change', updateSoundState);
    }
    updateSoundState();
};

const updateInstallState = () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || window.matchMedia('(display-mode: fullscreen)').matches
        || window.navigator.standalone === true;
    if (document.documentElement) {
        document.documentElement.dataset.installed = isStandalone ? 'true' : 'false';
    }
    if (installStatusEl) {
        installStatusEl.textContent = isStandalone
            ? 'Install status: Installed on Home Screen.'
            : 'Install status: Use Add to Home Screen for the best offline experience.';
    }
    if (isStandalone) {
        updateStorageStatus(true);
        maybeAutoPersist('installed');
    }
};

const bindInstallState = () => {
    updateInstallState();
    window.addEventListener('appinstalled', updateInstallState);
    const media = window.matchMedia('(display-mode: standalone)');
    if (media?.addEventListener) {
        media.addEventListener('change', updateInstallState);
    }
};

const updateKeyboardOffset = () => {
    if (!rootStyle) return;
    const viewport = window.visualViewport;
    if (!viewport) {
        rootStyle.setProperty('--keyboard-offset', '0px');
        return;
    }
    const rawOffset = window.innerHeight - viewport.height - viewport.offsetTop;
    const offset = Math.max(0, Math.round(rawOffset));
    rootStyle.setProperty('--keyboard-offset', `${offset}px`);
};

const bindVisualViewport = () => {
    if (!window.visualViewport) {
        updateKeyboardOffset();
        return;
    }
    updateKeyboardOffset();
    window.visualViewport.addEventListener('resize', updateKeyboardOffset);
    window.visualViewport.addEventListener('scroll', updateKeyboardOffset);
    window.addEventListener('orientationchange', updateKeyboardOffset, { passive: true });
};

bindStorageUI();
bindNetworkStatus();
bindWakeLock();
bindOrientationLock();
bindShareSummary();
bindMediaSession();
bindAudioFocus();
bindVisualViewport();
bindInstallState();
bindSoundToggle();

document.addEventListener(PERSIST_APPLIED, () => {
    updateSoundState();
    requestWakeLock();
    requestOrientationLock();
});
