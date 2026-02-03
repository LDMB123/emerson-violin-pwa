import { getJSON, setJSON } from '../persistence/storage.js';
import { isStandalone } from './ipados.js';
import { getViewId, onViewChange } from '../utils/view-events.js';

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
const offlineToggle = document.querySelector('#setting-offline-mode');
const offlineIndicator = document.querySelector('[data-offline-indicator]');
const rootStyle = document.documentElement?.style;
const rootEl = document.documentElement;
const installStatusEl = document.querySelector('[data-install-status]');
const isSoundEnabled = () => document.documentElement?.dataset?.sounds !== 'off';
const PERSIST_REQUEST_KEY = 'panda-violin:persist-request-v1';

const loadPersistRequest = async () => getJSON(PERSIST_REQUEST_KEY);

const savePersistRequest = async (state) => {
    await setJSON(PERSIST_REQUEST_KEY, state);
};

const shouldRetryPersist = (state) => {
    if (!state) return true;
    if (state.persisted) return false;
    if (!state.lastAttempt) return true;
    const week = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - state.lastAttempt > week;
};

const requestPersistentStorage = async (reason) => {
    if (!navigator.storage?.persist) return false;
    if (document.hidden) return false;
    const previous = await loadPersistRequest();
    if (!shouldRetryPersist(previous)) return false;
    const nextState = {
        lastAttempt: Date.now(),
        reason,
        persisted: false,
    };
    await savePersistRequest(nextState);
    try {
        const persisted = await navigator.storage.persist();
        nextState.persisted = Boolean(persisted);
        await savePersistRequest(nextState);
        return nextState.persisted;
    } catch {
        return false;
    }
};

const maybeAutoPersist = async (reason) => {
    if (!navigator.storage?.persisted) return;
    const persisted = await navigator.storage.persisted();
    if (persisted) return;
    const offlineMode = Boolean(offlineToggle?.checked);
    const shouldAttempt = isStandalone() || offlineMode;
    if (!shouldAttempt) return;
    const didPersist = await requestPersistentStorage(reason);
    if (didPersist) {
        updateStorageStatus();
    }
};

const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes)) return '0 MB';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index += 1;
    }
    const precision = value < 10 && index > 0 ? 1 : 0;
    return `${value.toFixed(precision)} ${units[index]}`;
};

const updateStorageEstimate = async () => {
    if (!navigator.storage?.estimate) {
        if (storageEstimateEl) {
            storageEstimateEl.textContent = 'Storage estimate unavailable on this device.';
        }
        return;
    }
    try {
        const { usage, quota } = await navigator.storage.estimate();
        if (Number.isFinite(quota) && quota > 0) {
            const ratio = usage / quota;
            const pressure = ratio > 0.9 ? 'high' : ratio > 0.75 ? 'medium' : 'low';
            if (storageEstimateEl) {
                const warning = pressure === 'high'
                    ? ' Storage nearly full — consider exporting recordings.'
                    : pressure === 'medium'
                        ? ' Storage starting to fill up.'
                        : '';
                storageEstimateEl.textContent = `Storage used: ${formatBytes(usage)} / ${formatBytes(quota)}.${warning}`;
            }
        } else {
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
        if (rootEl) {
            rootEl.dataset.storagePersistSupported = 'false';
            delete rootEl.dataset.storagePersisted;
        }
        if (storageStatusEl) {
            storageStatusEl.textContent = 'Persistent storage is not available on this device.';
        }
        if (storageRequestButton) storageRequestButton.disabled = true;
        document.dispatchEvent(new CustomEvent('panda:storage-persist', { detail: { supported: false, persisted: false } }));
        return { supported: false, persisted: false };
    }
    try {
        let persisted = await navigator.storage.persisted();
        if (!persisted && request && navigator.storage.persist) {
            persisted = await navigator.storage.persist();
        }
        if (rootEl) {
            rootEl.dataset.storagePersistSupported = 'true';
            rootEl.dataset.storagePersisted = persisted ? 'true' : 'false';
        }
        if (storageRequestButton) {
            storageRequestButton.disabled = persisted || !navigator.storage.persist;
        }
        if (storageStatusEl) {
            storageStatusEl.textContent = persisted
                ? 'Offline storage is protected.'
                : 'Offline storage may be cleared if the device is low on space.';
        }
        document.dispatchEvent(new CustomEvent('panda:storage-persist', { detail: { supported: true, persisted } }));
        return { supported: true, persisted };
    } catch {
        if (rootEl) {
            rootEl.dataset.storagePersistSupported = 'true';
            rootEl.dataset.storagePersisted = 'false';
        }
        if (storageStatusEl) {
            storageStatusEl.textContent = 'Unable to confirm offline storage status.';
        }
        document.dispatchEvent(new CustomEvent('panda:storage-persist', { detail: { supported: true, persisted: false } }));
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
    document.addEventListener('panda:offline-mode-change', () => {
        maybeAutoPersist('offline-mode');
    });
};

const updateNetworkStatus = () => {
    if (!networkStatusEl) return;
    const online = navigator.onLine;
    const offlineMode = Boolean(offlineToggle?.checked);
    if (offlineMode) {
        networkStatusEl.textContent = 'Network status: Offline mode enabled (cached-only).';
        if (offlineIndicator) {
            offlineIndicator.textContent = 'Offline mode';
            offlineIndicator.dataset.state = 'offline-mode';
        }
        return;
    }
    networkStatusEl.textContent = online
        ? 'Network status: Online (offline mode still available).'
        : 'Network status: Offline (local content is ready).';
    if (offlineIndicator) {
        offlineIndicator.textContent = online ? 'Online' : 'Offline';
        offlineIndicator.dataset.state = online ? 'online' : 'offline';
    }
};

const bindNetworkStatus = () => {
    if (!networkStatusEl) return;
    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus, { passive: true });
    window.addEventListener('offline', updateNetworkStatus, { passive: true });
    document.addEventListener('panda:offline-mode-change', updateNetworkStatus);
};

let wakeLock = null;

const viewAllowsWake = (viewId) => {
    if (viewId.startsWith('view-game-')) return true;
    if (viewId.startsWith('view-song-')) return true;
    return ['view-coach', 'view-songs', 'view-trainer', 'view-tuner', 'view-session-review'].includes(viewId);
};

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

const requestWakeLock = async (viewIdOverride = null) => {
    if (!wakeToggle) return;
    if (wakeToggle.disabled) return;
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
    const viewId = getViewId(viewIdOverride);
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
    if (!('wakeLock' in navigator)) {
        wakeToggle.disabled = true;
        updateWakeStatus('Screen wake lock not available on this device.');
        return;
    }
    wakeToggle.addEventListener('change', () => requestWakeLock());
    onViewChange((viewId) => requestWakeLock(viewId));
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

const getPreferredOrientation = () => {
    const current = screen.orientation?.type;
    if (current) return current;
    const landscape = window.matchMedia('(orientation: landscape)').matches;
    return landscape ? 'landscape-primary' : 'portrait-primary';
};

const unlockOrientation = () => {
    if (screen.orientation?.unlock) {
        screen.orientation.unlock();
    }
    orientationLocked = false;
};

const requestOrientationLock = async (viewIdOverride = null) => {
    if (!orientationToggle) return;
    if (orientationToggle.disabled) return;
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
    const viewId = getViewId(viewIdOverride);
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
    if (!screen.orientation?.lock) {
        orientationToggle.disabled = true;
        updateOrientationStatus('Orientation lock not available on this device.');
        return;
    }
    orientationToggle.addEventListener('change', () => requestOrientationLock());
    onViewChange((viewId) => requestOrientationLock(viewId));
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
    if (!navigator.share && !navigator.clipboard?.writeText) {
        shareButton.disabled = true;
        if (shareStatusEl) shareStatusEl.textContent = 'Sharing not available on this device.';
        return;
    }
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

    document.addEventListener('panda:sounds-change', (event) => {
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
    onViewChange(() => {
        pauseOthers(null);
    });
};

const updateSoundState = () => {
    if (!soundToggle) return;
    const enabled = soundToggle.checked;
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
    document.dispatchEvent(new CustomEvent('panda:sounds-change', { detail: { enabled } }));
};

const bindSoundToggle = () => {
    if (!soundToggle) return;
    soundToggle.addEventListener('change', updateSoundState);
    updateSoundState();
};

const updateInstallState = () => {
    const standalone = isStandalone();
    if (document.documentElement) {
        document.documentElement.dataset.installed = standalone ? 'true' : 'false';
    }
    if (installStatusEl) {
        installStatusEl.textContent = standalone
            ? 'Install status: Installed on Home Screen.'
            : 'Install status: Use Add to Home Screen for the best offline experience.';
    }
    if (standalone) {
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

let keyboardOffsetRaf = null;
let lastKeyboardOffset = null;

const commitKeyboardOffset = (offset) => {
    if (!rootStyle) return;
    if (lastKeyboardOffset === offset) return;
    lastKeyboardOffset = offset;
    rootStyle.setProperty('--keyboard-offset', `${offset}px`);
};

const updateKeyboardOffset = () => {
    if (!rootStyle) return;
    const viewport = window.visualViewport;
    if (!viewport) {
        commitKeyboardOffset(0);
        return;
    }
    const rawOffset = window.innerHeight - viewport.height - viewport.offsetTop;
    const offset = Math.max(0, Math.round(rawOffset));
    commitKeyboardOffset(offset);
};

const scheduleKeyboardOffset = () => {
    if (keyboardOffsetRaf) return;
    keyboardOffsetRaf = window.requestAnimationFrame(() => {
        keyboardOffsetRaf = null;
        updateKeyboardOffset();
    });
};

const bindVisualViewport = () => {
    if (!window.visualViewport) {
        updateKeyboardOffset();
        return;
    }
    updateKeyboardOffset();
    window.visualViewport.addEventListener('resize', scheduleKeyboardOffset, { passive: true });
    window.visualViewport.addEventListener('scroll', scheduleKeyboardOffset, { passive: true });
    window.addEventListener('orientationchange', scheduleKeyboardOffset, { passive: true });
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

document.addEventListener('panda:persist-applied', () => {
    updateSoundState();
    requestWakeLock();
    requestOrientationLock();
});
