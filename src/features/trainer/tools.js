import { getGameTuning, updateGameResult } from '@core/ml/adaptive-engine.js';
import { ensureDifficultyBadge } from '@core/utils/templates.js';
import { getJSON, setJSON, removeJSON } from '@core/persistence/storage.js';
import { createAudioContext } from '@core/audio/context.js';
import { getViewId, onViewChange } from '@core/utils/view-events.js';

const metronomeSlider = document.querySelector('[data-metronome="slider"]');
const metronomeBpmEl = document.querySelector('[data-metronome="bpm"]');
const metronomeToggle = document.querySelector('[data-metronome="toggle"]');
const metronomeTap = document.querySelector('[data-metronome="tap"]');
const metronomeStatus = document.querySelector('[data-metronome="status"]');
const dialNumber = document.querySelector('.trainer-dial .dial-number');
const metronomeVisual = document.querySelector('.trainer-metronome');
const metronomeSignature = document.querySelector('[data-metronome="signature"]');
const metronomeSubdivision = document.querySelector('[data-metronome="subdivision"]');
const metronomeAccent = document.querySelector('[data-metronome="accent"]');
const metronomeCountIn = document.querySelector('[data-metronome="count-in"]');
const metronomePresetInputs = Array.from(document.querySelectorAll('.metronome-preset-input'));

const postureInput = document.querySelector('#posture-capture');
const postureImage = document.querySelector('[data-posture-image]');
const postureClear = document.querySelector('[data-posture-clear]');
const postureHint = document.querySelector('.posture-hint');

const bowingView = document.querySelector('#view-bowing');
const bowingIntro = bowingView?.querySelector('.game-drill-intro');
const bowingChecks = Array.from(document.querySelectorAll('#view-bowing input[id^="bow-set-"]'));
const isSoundEnabled = () => document.documentElement?.dataset?.sounds !== 'off';
const isPracticeView = (explicit) => {
    const viewId = getViewId(explicit);
    if (viewId.startsWith('view-game-')) return true;
    if (viewId.startsWith('view-song-')) return true;
    return ['view-coach', 'view-games', 'view-songs', 'view-trainer', 'view-tuner', 'view-bowing', 'view-posture'].includes(viewId);
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const METRONOME_SETTINGS_KEY = 'panda-violin:metronome-settings:v1';
const METRONOME_PRESET_KEY = 'panda-violin:metronome-preset';
const METRONOME_PRESET_TTL = 10 * 60 * 1000;

let metronomeBpm = Number.parseInt(metronomeSlider?.value || '100', 10);
if (Number.isNaN(metronomeBpm)) metronomeBpm = 100;

const normalizeSignature = (value) => ([2, 3, 4, 6].includes(value) ? value : 4);
const normalizeSubdivision = (value) => ([1, 2, 3, 4].includes(value) ? value : 1);

let beatsPerMeasure = normalizeSignature(Number.parseInt(metronomeSignature?.value || '4', 10));
let subdivision = normalizeSubdivision(Number.parseInt(metronomeSubdivision?.value || '1', 10));
let accentEnabled = metronomeAccent ? metronomeAccent.checked : true;
let countInEnabled = metronomeCountIn ? metronomeCountIn.checked : true;

let metronomeTimer = null;
let metronomeNode = null;
let metronomeWorkletReady = null;
let metronomeWorkletFailed = false;
let metronomeUsingWorklet = false;
let audioContext = null;
let tapTimes = [];
let targetBpm = 90;
let metronomeReported = false;
let metronomeTouched = false;
let metronomeTick = 0;
let countInRemaining = 0;
let postureCount = 0;
let postureTarget = 2;
let postureReported = false;
let bowingTarget = 3;
let bowingReported = false;
let bowingLastReported = 0;

const isMetronomeRunning = () => Boolean(metronomeTimer || metronomeUsingWorklet);

const formatDifficulty = (value) => {
    const label = value || 'medium';
    return label.charAt(0).toUpperCase() + label.slice(1);
};

const setBadge = (container, difficulty, prefix) => {
    const badge = ensureDifficultyBadge(container, { prefix });
    if (!badge) return;
    badge.dataset.level = difficulty || 'medium';
    badge.textContent = `${prefix}: ${formatDifficulty(difficulty)}`;
};

const formatSignature = () => (beatsPerMeasure === 6 ? '6/8' : `${beatsPerMeasure}/4`);

const loadMetronomeSettings = async () => {
    const stored = await getJSON(METRONOME_SETTINGS_KEY);
    return stored || null;
};

const saveMetronomeSettings = async (settings) => {
    await setJSON(METRONOME_SETTINGS_KEY, { ...settings, updatedAt: Date.now() });
};

const applyMetronomeSettings = async () => {
    const stored = await loadMetronomeSettings();
    if (!stored) return;
    const signatureValue = normalizeSignature(Number.parseInt(stored.signature, 10));
    const subdivisionValue = normalizeSubdivision(Number.parseInt(stored.subdivision, 10));
    if (metronomeSignature) metronomeSignature.value = String(signatureValue);
    if (metronomeSubdivision) metronomeSubdivision.value = String(subdivisionValue);
    beatsPerMeasure = signatureValue;
    subdivision = subdivisionValue;
};

const updateMetronomeDisplay = () => {
    if (metronomeBpmEl) metronomeBpmEl.textContent = `${metronomeBpm} BPM`;
    if (dialNumber) dialNumber.textContent = String(metronomeBpm);
    if (metronomeSlider) {
        metronomeSlider.setAttribute('aria-valuenow', String(metronomeBpm));
        metronomeSlider.setAttribute('aria-valuetext', `${metronomeBpm} BPM`);
    }
    if (metronomeVisual) {
        const duration = 60 / metronomeBpm;
        metronomeVisual.style.setProperty('--metronome-speed', `${duration}s`);
    }
};

const setMetronomeStatus = (message) => {
    if (metronomeStatus) metronomeStatus.textContent = message;
};

const reportMetronome = () => {
    if (metronomeReported || !targetBpm || !metronomeTouched) return;
    metronomeReported = true;
    metronomeTouched = false;
    const delta = Math.abs(metronomeBpm - targetBpm) / Math.max(targetBpm, 1);
    const accuracy = clamp((1 - delta) * 100, 0, 100);
    updateGameResult('trainer-metronome', { accuracy, score: metronomeBpm }).catch(() => {});
};

const applyMetronomeTuning = async () => {
    const tuning = await getGameTuning('trainer-metronome');
    targetBpm = tuning.targetBpm ?? targetBpm;
    setBadge(document.querySelector('#metronome-loops .audio-panel-header'), tuning.difficulty, 'Tempo');
    if (metronomeSlider && !metronomeSlider.dataset.userSet) {
        updateBpm(targetBpm);
    }
    if (!isMetronomeRunning()) {
        setMetronomeStatus(`Suggested tempo: ${targetBpm} BPM.`);
    }
};

const ensureAudioContext = () => {
    if (!audioContext) {
        audioContext = createAudioContext();
        if (!audioContext) return null;
    }
    return audioContext;
};

const getMetronomeStatusText = () => `Running at ${metronomeBpm} BPM (${formatSignature()}).`;

const handleMetronomeTick = (data) => {
    if (!metronomeUsingWorklet) return;
    if (data?.countInActive) {
        const remaining = Number.isFinite(data.countInRemaining) ? data.countInRemaining : countInRemaining;
        countInRemaining = remaining;
        if (countInRemaining > 0) {
            setMetronomeStatus(`Count-in: ${countInRemaining}...`);
            return;
        }
    }
    if (countInRemaining !== 0) countInRemaining = 0;
    setMetronomeStatus(getMetronomeStatusText());
};

const handleMetronomeMessage = (event) => {
    const data = event.data || {};
    if (data.type === 'tick') {
        handleMetronomeTick(data);
    }
};

const sendMetronomeConfig = () => {
    if (!metronomeNode) return;
    metronomeNode.port.postMessage({
        type: 'config',
        bpm: metronomeBpm,
        subdivision,
        beatsPerMeasure,
        accentEnabled,
    });
};

const ensureMetronomeWorklet = async (ctx) => {
    if (metronomeNode) return metronomeNode;
    if (metronomeWorkletFailed) return null;
    if (!ctx?.audioWorklet) {
        metronomeWorkletFailed = true;
        return null;
    }
    if (!metronomeWorkletReady) {
        metronomeWorkletReady = ctx.audioWorklet
            .addModule(new URL('../../core/worklets/metronome-processor.js', import.meta.url))
            .catch((error) => {
                metronomeWorkletFailed = true;
                console.error('[Metronome] AudioWorklet unavailable', error);
                throw error;
            });
    }
    try {
        await metronomeWorkletReady;
    } catch {
        return null;
    }
    try {
        metronomeNode = new AudioWorkletNode(ctx, 'metronome-processor');
    } catch (error) {
        metronomeWorkletFailed = true;
        console.error('[Metronome] AudioWorklet node failed', error);
        return null;
    }
    metronomeNode.port.onmessage = handleMetronomeMessage;
    metronomeNode.connect(ctx.destination);
    sendMetronomeConfig();
    return metronomeNode;
};

const playClick = ({ accent = false, subdivision: isSubdivision = false } = {}) => {
    if (!isSoundEnabled()) return;
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (accent) {
        osc.frequency.value = 980;
        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    } else if (isSubdivision) {
        osc.frequency.value = 640;
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    } else {
        osc.frequency.value = 820;
        gain.gain.setValueAtTime(0.17, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    }
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
};

const stopMetronome = ({ silent = false } = {}) => {
    if (!silent) {
        reportMetronome();
    }
    if (metronomeTimer) {
        clearInterval(metronomeTimer);
        metronomeTimer = null;
    }
    if (metronomeNode && metronomeUsingWorklet) {
        metronomeNode.port.postMessage({ type: 'stop' });
    }
    metronomeUsingWorklet = false;
    metronomeTick = 0;
    countInRemaining = 0;
    if (audioContext) {
        audioContext.suspend().catch(() => {});
    }
    tapTimes = [];
    if (metronomeToggle) {
        metronomeToggle.checked = false;
    }
    if (!silent) setMetronomeStatus('Metronome paused.');
};

const startMetronome = async ({ skipCountIn = false } = {}) => {
    if (isMetronomeRunning()) return;
    if (!isSoundEnabled()) {
        setMetronomeStatus('Sounds are off. Turn on Sounds to hear the click.');
        if (metronomeToggle) metronomeToggle.checked = false;
        return;
    }
    const ctx = ensureAudioContext();
    if (!ctx) {
        setMetronomeStatus('Audio not supported on this device.');
        if (metronomeToggle) metronomeToggle.checked = false;
        return;
    }
    await ctx.resume();
    metronomeTick = 0;
    countInRemaining = countInEnabled && !skipCountIn ? beatsPerMeasure : 0;
    if (countInRemaining > 0) {
        setMetronomeStatus(`Count-in: ${countInRemaining}...`);
    }

    let startedWorklet = false;
    const workletNode = await ensureMetronomeWorklet(ctx);
    if (workletNode) {
        sendMetronomeConfig();
        workletNode.port.postMessage({ type: 'start', countIn: countInRemaining > 0 });
        metronomeUsingWorklet = true;
        startedWorklet = true;
    } else {
        metronomeUsingWorklet = false;
    }

    const runTick = () => {
        const subIndex = metronomeTick % Math.max(1, subdivision);
        const beatIndex = Math.floor(metronomeTick / Math.max(1, subdivision)) % Math.max(1, beatsPerMeasure);
        const isMainBeat = subIndex === 0;

        if (countInRemaining > 0) {
            if (isMainBeat) {
                playClick({ accent: true });
                countInRemaining -= 1;
                if (countInRemaining > 0) {
                    setMetronomeStatus(`Count-in: ${countInRemaining}...`);
                } else {
                    setMetronomeStatus(getMetronomeStatusText());
                }
            }
            metronomeTick += 1;
            return;
        }

        const shouldAccent = accentEnabled && isMainBeat && beatIndex === 0;
        playClick({ accent: shouldAccent, subdivision: !isMainBeat });
        metronomeTick += 1;
    };

    if (!startedWorklet) {
        const interval = Math.round(60000 / (metronomeBpm * Math.max(1, subdivision)));
        runTick();
        metronomeTimer = window.setInterval(runTick, interval);
    }
    if (metronomeToggle) metronomeToggle.checked = true;
    if (!countInRemaining) {
        setMetronomeStatus(getMetronomeStatusText());
    }
};

const refreshMetronome = () => {
    if (metronomeUsingWorklet && metronomeNode) {
        metronomeTick = 0;
        countInRemaining = 0;
        sendMetronomeConfig();
        metronomeNode.port.postMessage({ type: 'stop' });
        metronomeNode.port.postMessage({ type: 'start', countIn: false });
        setMetronomeStatus(getMetronomeStatusText());
        return;
    }
    if (metronomeTimer) {
        stopMetronome({ silent: true });
        startMetronome({ skipCountIn: true });
        return;
    }
    updateMetronomeDisplay();
};

const syncPresetInputs = () => {
    if (!metronomePresetInputs.length) return;
    metronomePresetInputs.forEach((input) => {
        const bpm = Number.parseInt(input.dataset.metronomeBpm || input.value || '0', 10);
        input.checked = Number.isFinite(bpm) && bpm === metronomeBpm;
    });
};

const updateBpm = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return;
    metronomeBpm = clamp(parsed, 50, 140);
    if (metronomeSlider) metronomeSlider.value = String(metronomeBpm);
    syncPresetInputs();
    updateMetronomeDisplay();
    refreshMetronome();
};

const syncMetronomeOptions = ({ refresh = false, persist = false } = {}) => {
    if (metronomeSignature) {
        const signatureValue = normalizeSignature(Number.parseInt(metronomeSignature.value || '4', 10));
        beatsPerMeasure = signatureValue;
    }
    if (metronomeSubdivision) {
        const subdivisionValue = normalizeSubdivision(Number.parseInt(metronomeSubdivision.value || '1', 10));
        subdivision = subdivisionValue;
    }
    accentEnabled = metronomeAccent ? metronomeAccent.checked : accentEnabled;
    countInEnabled = metronomeCountIn ? metronomeCountIn.checked : countInEnabled;
    if (metronomeUsingWorklet && metronomeNode) {
        sendMetronomeConfig();
    }
    if (persist) {
        saveMetronomeSettings({ signature: beatsPerMeasure, subdivision });
    }
    if (refresh) {
        refreshMetronome();
    }
};

const loadPreset = async () => {
    const stored = await getJSON(METRONOME_PRESET_KEY);
    if (!stored) return null;
    const expiresAt = stored.expiresAt;
    if (expiresAt && Date.now() > expiresAt) {
        await removeJSON(METRONOME_PRESET_KEY);
        return null;
    }
    const raw = stored.bpm ?? stored;
    const bpm = Number.parseInt(String(raw), 10);
    if (!Number.isFinite(bpm)) return null;
    return bpm;
};

const savePreset = async (bpm) => {
    if (!Number.isFinite(bpm) || bpm <= 0) return;
    await setJSON(METRONOME_PRESET_KEY, {
        bpm,
        expiresAt: Date.now() + METRONOME_PRESET_TTL,
    });
};

const applyStoredPreset = async () => {
    const bpm = await loadPreset();
    if (!Number.isFinite(bpm)) return;
    if (metronomeSlider) metronomeSlider.dataset.userSet = 'true';
    metronomeReported = false;
    metronomeTouched = true;
    updateBpm(bpm);
    setMetronomeStatus(`Preset loaded: ${bpm} BPM.`);
    await removeJSON(METRONOME_PRESET_KEY);
};

const applyPresetBpm = (bpm, { announce = true } = {}) => {
    if (!Number.isFinite(bpm) || bpm <= 0) return;
    if (metronomeSlider) metronomeSlider.dataset.userSet = 'true';
    metronomeReported = false;
    metronomeTouched = true;
    updateBpm(bpm);
    if (announce) {
        setMetronomeStatus(`Tempo set to ${metronomeBpm} BPM.`);
    }
};

if (metronomeSlider) {
    metronomeSlider.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        metronomeSlider.dataset.userSet = 'true';
        metronomeReported = false;
        metronomeTouched = true;
        updateBpm(target.value);
    });
}

metronomeSignature?.addEventListener('change', () => {
    syncMetronomeOptions({ refresh: true, persist: true });
    setMetronomeStatus(`Time signature set to ${formatSignature()}.`);
});

metronomeSubdivision?.addEventListener('change', () => {
    syncMetronomeOptions({ refresh: true, persist: true });
    const label = metronomeSubdivision.selectedOptions?.[0]?.textContent || `${subdivision}x`;
    setMetronomeStatus(`Subdivision set to ${label}.`);
});

metronomeAccent?.addEventListener('change', () => {
    syncMetronomeOptions({ refresh: false });
    setMetronomeStatus(`Downbeat accent ${accentEnabled ? 'on' : 'off'}.`);
});

metronomeCountIn?.addEventListener('change', () => {
    syncMetronomeOptions({ refresh: false });
    setMetronomeStatus(`Count-in ${countInEnabled ? 'on' : 'off'}.`);
});

metronomeToggle?.addEventListener('change', () => {
    if (!metronomeToggle) return;
    if (!metronomeToggle.checked) {
        stopMetronome();
        return;
    }
    metronomeTouched = true;
    startMetronome();
});

metronomePresetInputs.forEach((input) => {
    input.addEventListener('change', () => {
        if (!input.checked) return;
        const bpm = Number.parseInt(input.dataset.metronomeBpm || input.value || '0', 10);
        if (!Number.isFinite(bpm) || bpm <= 0) return;
        savePreset(bpm);
        if (metronomeSlider) {
            applyPresetBpm(bpm, { announce: true });
        }
    });
});

document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest('[data-metronome-bpm]');
    if (!button || button.classList.contains('metronome-preset-text') || button.classList.contains('metronome-preset-input')) return;
    const bpm = Number.parseInt(button.dataset.metronomeBpm || '0', 10);
    if (!Number.isFinite(bpm) || bpm <= 0) return;
    savePreset(bpm);
    if (metronomeSlider) {
        applyPresetBpm(bpm, { announce: true });
    }
});

document.addEventListener('panda:metronome-set', (event) => {
    const bpm = Number.parseInt(event.detail?.bpm || '0', 10);
    if (!Number.isFinite(bpm) || bpm <= 0) return;
    applyPresetBpm(bpm, { announce: false });
});

metronomeTap?.addEventListener('click', () => {
    const now = performance.now();
    if (tapTimes.length && now - tapTimes[tapTimes.length - 1] > 2000) {
        tapTimes = [];
    }
    tapTimes.push(now);
    if (tapTimes.length > 5) tapTimes.shift();
    if (tapTimes.length >= 2) {
        const intervals = tapTimes.slice(1).map((time, index) => time - tapTimes[index]);
        const avg = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
        const bpm = Math.round(60000 / avg);
        if (metronomeSlider) metronomeSlider.dataset.userSet = 'true';
        metronomeReported = false;
        metronomeTouched = true;
        updateBpm(bpm);
        setMetronomeStatus(`Tempo set to ${metronomeBpm} BPM.`);
        reportMetronome();
    } else {
        setMetronomeStatus('Tap again to set tempo.');
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopMetronome({ silent: true });
    }
});

window.addEventListener('pagehide', () => {
    reportMetronome();
    stopMetronome({ silent: true });
});

onViewChange((viewId) => {
    if (!isPracticeView(viewId)) {
        reportMetronome();
        stopMetronome({ silent: true });
    }
});

document.addEventListener('panda:sounds-change', (event) => {
    if (event.detail?.enabled === false) {
        stopMetronome({ silent: true });
        setMetronomeStatus('Sounds are off.');
    }
});

const initMetronomeState = async () => {
    await applyMetronomeSettings();
    syncMetronomeOptions({ refresh: false });
    syncPresetInputs();
    await applyStoredPreset();
    updateMetronomeDisplay();
    applyMetronomeTuning();
    applyPostureTuning();
    applyBowingTuning();
};

initMetronomeState();

onViewChange((viewId) => {
    if (viewId !== 'view-posture') {
        reportPosture();
    }
    if (viewId !== 'view-bowing') {
        reportBowing();
    }
});

document.addEventListener('panda:ml-update', (event) => {
    if (event.detail?.id === 'trainer-metronome') {
        metronomeReported = false;
        applyMetronomeTuning();
    }
    if (event.detail?.id === 'trainer-posture') {
        postureReported = false;
        applyPostureTuning();
    }
    if (event.detail?.id === 'bowing-coach') {
        bowingReported = false;
        applyBowingTuning();
    }
});

document.addEventListener('panda:ml-reset', () => {
    if (metronomeSlider) delete metronomeSlider.dataset.userSet;
    metronomeReported = false;
    applyMetronomeTuning();
    postureReported = false;
    applyPostureTuning();
    bowingReported = false;
    applyBowingTuning();
});

document.addEventListener('panda:persist-applied', () => {
    syncMetronomeOptions({ refresh: false });
});

const audioCards = Array.from(document.querySelectorAll('.audio-card'));
audioCards.forEach((card) => {
    const audio = card.querySelector('audio');
    if (!audio) return;
    audio.addEventListener('play', () => {
        if (isMetronomeRunning()) {
            stopMetronome({ silent: true });
            setMetronomeStatus('Metronome paused while audio plays.');
        }
    });
});

if (bowingChecks.length) {
    bowingChecks.forEach((input) => {
        input.addEventListener('change', () => {
            bowingReported = false;
            updateBowingIntro();
            const completed = bowingChecks.filter((item) => item.checked).length;
            if (completed >= bowingTarget) {
                reportBowing();
            }
        });
    });
}

let postureUrl = null;
const clearPosturePreview = () => {
    if (postureUrl) {
        URL.revokeObjectURL(postureUrl);
        postureUrl = null;
    }
    if (postureImage) postureImage.removeAttribute('src');
    if (postureInput) postureInput.value = '';
};

const updatePostureHint = () => {
    if (!postureHint) return;
    const remaining = Math.max(0, postureTarget - postureCount);
    if (postureCount === 0) {
        postureHint.textContent = `Suggested: ${postureTarget} snapshot${postureTarget === 1 ? '' : 's'} this week. Photos stay on your device.`;
        return;
    }
    if (remaining > 0) {
        postureHint.textContent = `Nice! ${remaining} more snapshot${remaining === 1 ? '' : 's'} to reach your goal.`;
        return;
    }
    postureHint.textContent = 'Posture goal met. Great alignment today!';
};

const reportPosture = () => {
    if (postureReported || postureCount === 0) return;
    postureReported = true;
    const accuracy = clamp((postureCount / postureTarget) * 100, 0, 100);
    updateGameResult('trainer-posture', { accuracy, score: postureCount * 20 }).catch(() => {});
};

const applyPostureTuning = async () => {
    const tuning = await getGameTuning('trainer-posture');
    postureTarget = tuning.targetChecks ?? postureTarget;
    setBadge(document.querySelector('#view-posture .view-header'), tuning.difficulty, 'Posture');
    updatePostureHint();
};

const updateBowingIntro = () => {
    if (!bowingIntro) return;
    const base = bowingIntro.dataset.baseText || bowingIntro.textContent || '';
    if (!bowingIntro.dataset.baseText) bowingIntro.dataset.baseText = base;
    bowingIntro.textContent = `${base} Goal: ${bowingTarget} sets.`;
};

const reportBowing = () => {
    if (bowingReported || !bowingChecks.length) return;
    const completed = bowingChecks.filter((input) => input.checked).length;
    if (!completed || completed === bowingLastReported) return;
    bowingReported = true;
    bowingLastReported = completed;
    const accuracy = clamp((completed / bowingTarget) * 100, 0, 100);
    updateGameResult('bowing-coach', { accuracy, score: completed * 25 }).catch(() => {});
};

const applyBowingTuning = async () => {
    const tuning = await getGameTuning('bowing-coach');
    bowingTarget = tuning.targetSets ?? bowingTarget;
    setBadge(document.querySelector('#view-bowing .view-header'), tuning.difficulty, 'Bowing');
    updateBowingIntro();
};

postureInput?.addEventListener('change', () => {
    const file = postureInput.files?.[0];
    if (!file) {
        clearPosturePreview();
        return;
    }
    clearPosturePreview();
    postureUrl = URL.createObjectURL(file);
    if (postureImage) postureImage.src = postureUrl;
    postureCount += 1;
    postureReported = false;
    updatePostureHint();
});

postureClear?.addEventListener('click', () => {
    clearPosturePreview();
    reportPosture();
});

window.addEventListener('pagehide', () => {
    reportPosture();
    clearPosturePreview();
});

const hasAudioContext = Boolean(window.AudioContext || window.webkitAudioContext);
if (!hasAudioContext) {
    if (metronomeToggle) metronomeToggle.disabled = true;
    if (metronomeTap) metronomeTap.disabled = true;
    setMetronomeStatus('Audio tools are not supported on this device.');
}
