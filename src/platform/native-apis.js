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
const installStatusEl = document.querySelector('[data-install-status]');
const isSoundEnabled = () => document.documentElement?.dataset?.sounds !== 'off';

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
    if (!storageEstimateEl) return;
    if (!navigator.storage?.estimate) {
        storageEstimateEl.textContent = 'Storage estimate unavailable on this device.';
        return;
    }
    try {
        const { usage, quota } = await navigator.storage.estimate();
        if (Number.isFinite(quota)) {
            storageEstimateEl.textContent = `Storage used: ${formatBytes(usage)} / ${formatBytes(quota)}.`;
        } else {
            storageEstimateEl.textContent = `Storage used: ${formatBytes(usage)}.`;
        }
    } catch {
        storageEstimateEl.textContent = 'Storage estimate unavailable right now.';
    }
};

const updateStorageStatus = async (request = false) => {
    if (!storageStatusEl) return;
    if (!navigator.storage?.persisted) {
        storageStatusEl.textContent = 'Persistent storage is not available on this device.';
        if (storageRequestButton) storageRequestButton.disabled = true;
        return;
    }
    try {
        let persisted = await navigator.storage.persisted();
        if (!persisted && request && navigator.storage.persist) {
            persisted = await navigator.storage.persist();
        }
        if (persisted) {
            storageStatusEl.textContent = 'Offline storage is protected.';
            if (storageRequestButton) storageRequestButton.disabled = true;
        } else {
            storageStatusEl.textContent = 'Offline storage may be cleared if the device is low on space.';
        }
    } catch {
        storageStatusEl.textContent = 'Unable to confirm offline storage status.';
    }
};

const bindStorageUI = () => {
    if (!storageStatusEl && !storageEstimateEl) return;
    updateStorageStatus();
    updateStorageEstimate();
    if (storageRequestButton) {
        storageRequestButton.addEventListener('click', () => {
            updateStorageStatus(true).then(updateStorageEstimate);
        });
    }
};

const updateNetworkStatus = () => {
    if (!networkStatusEl) return;
    const online = navigator.onLine;
    networkStatusEl.textContent = online
        ? 'Network status: Online (offline mode still available).'
        : 'Network status: Offline (local content is ready).';
};

const bindNetworkStatus = () => {
    if (!networkStatusEl) return;
    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus, { passive: true });
    window.addEventListener('offline', updateNetworkStatus, { passive: true });
};

let wakeLock = null;

const getViewId = () => {
    const hash = window.location.hash.replace('#', '').trim();
    return hash || 'view-home';
};

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

document.addEventListener('panda:persist-applied', () => {
    updateSoundState();
    requestWakeLock();
    requestOrientationLock();
});
