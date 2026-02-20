import { getGameTuning, updateGameResult } from '../ml/adaptive-engine.js';
import {
    RT_STATE,
    ML_UPDATE,
    ML_RESET,
} from '../utils/event-names.js';
import { setDifficultyBadge } from '../games/shared.js';
import {
    startSession,
    stopSession,
    getSessionState,
    init as initSessionController,
} from '../realtime/session-controller.js';
import {
    applyFrame,
    resetDisplay,
    realtimeRenderKey,
    setStatus,
    updateControlState,
} from './tuner-view.js';
import { bindToneButtons } from './tuner-tone-controls.js';

let livePanel = null;
let startButton = null;
let stopButton = null;
let noteEl = null;
let centsEl = null;
let freqEl = null;
let statusEl = null;
let toneButtons = [];
let toneSamples = new Map();
let refToneButtons = [];

let tolerance = 8;
let inTuneCount = 0;
let detectCount = 0;
let globalListenersBound = false;
let pendingRealtimeFrame = 0;
let pendingRealtimeState = null;
let lastRenderedStateKey = '';

const isTunerView = () => window.location.hash === '#view-tuner';
const isSessionListening = (session) => Boolean(session?.active) && !session?.paused;
const idleStatusText = () => `Tap Start Listening (±${tolerance}¢).`;
const listeningStatusText = () => `Listening… play a note (±${tolerance}¢).`;

const getDisplayRefs = () => ({
    livePanel,
    noteEl,
    centsEl,
    freqEl,
});

const getControlRefs = () => ({
    startButton,
    stopButton,
    livePanel,
});

const setStatusText = (text) => {
    setStatus(statusEl, text);
};

const resolveElements = () => {
    livePanel = document.querySelector('#tuner-live');
    startButton = document.querySelector('#tuner-start');
    stopButton = document.querySelector('#tuner-stop');
    noteEl = document.querySelector('#tuner-note');
    centsEl = document.querySelector('#tuner-cents');
    freqEl = document.querySelector('#tuner-frequency');
    statusEl = document.querySelector('#tuner-status');

    toneButtons = Array.from(document.querySelectorAll('[data-tone]'));
    toneSamples = new Map(
        Array.from(document.querySelectorAll('[data-tone-audio]')).map((audio) => [audio.dataset.toneAudio, audio]),
    );
    refToneButtons = Array.from(document.querySelectorAll('[data-ref-tone]'));
    lastRenderedStateKey = '';

    return Boolean(livePanel && startButton && stopButton);
};

const applyRealtimeState = (detail) => {
    const key = realtimeRenderKey(detail);
    if (key === lastRenderedStateKey) return;
    lastRenderedStateKey = key;
    const listening = Boolean(detail?.listening) && !detail?.paused;
    updateControlState(getControlRefs(), listening);
    applyFrame({
        frame: detail?.lastFeature,
        tolerance,
        viewRefs: getDisplayRefs(),
        listeningStatusText: listeningStatusText(),
        setStatusText,
        onDetection: (inTune) => {
            detectCount += 1;
            if (inTune) inTuneCount += 1;
        },
    });
};

const flushPendingRealtimeState = () => {
    if (pendingRealtimeFrame) {
        window.cancelAnimationFrame(pendingRealtimeFrame);
        pendingRealtimeFrame = 0;
    }
    pendingRealtimeState = null;
};

const scheduleRealtimeState = (detail) => {
    pendingRealtimeState = detail || {};
    if (pendingRealtimeFrame) return;
    if (typeof window.requestAnimationFrame !== 'function') {
        applyRealtimeState(pendingRealtimeState);
        pendingRealtimeState = null;
        return;
    }
    pendingRealtimeFrame = window.requestAnimationFrame(() => {
        pendingRealtimeFrame = 0;
        if (!isTunerView()) {
            pendingRealtimeState = null;
            return;
        }
        applyRealtimeState(pendingRealtimeState || {});
        pendingRealtimeState = null;
    });
};

const startTuner = async () => {
    if (!resolveElements()) return;
    inTuneCount = 0;
    detectCount = 0;
    setStatusText('Starting microphone…');
    const session = await startSession();
    updateControlState(getControlRefs(), session.active && !session.paused);
    if (!session.active) {
        setStatusText('Microphone unavailable. Try helper tones below.');
    }
};

const stopTuner = async () => {
    await stopSession('tuner-stop');
    flushPendingRealtimeState();
    lastRenderedStateKey = '';
    updateControlState(getControlRefs(), false);
    resetDisplay(getDisplayRefs());
    setStatusText(idleStatusText());

    if (detectCount > 0) {
        const accuracy = (inTuneCount / detectCount) * 100;
        await updateGameResult('tuner', { accuracy, score: Math.round(accuracy) });
    }
    inTuneCount = 0;
    detectCount = 0;
};

const bindLocalListeners = () => {
    if (!startButton || !stopButton) return;
    if (startButton.dataset.tunerBound !== 'true') {
        startButton.dataset.tunerBound = 'true';
        startButton.addEventListener('click', startTuner);
    }
    if (stopButton.dataset.tunerBound !== 'true') {
        stopButton.dataset.tunerBound = 'true';
        stopButton.addEventListener('click', stopTuner);
    }
    bindToneButtons({
        toneButtons,
        refToneButtons,
        toneSamples,
        setStatus: setStatusText,
    });
};

const applyTuning = async () => {
    const tuning = await getGameTuning('tuner');
    tolerance = tuning.tolerance ?? tolerance;
    setDifficultyBadge(document.querySelector('#tuner-live .tuner-card-header'), tuning.difficulty);
    setStatusText(idleStatusText());
};

const bindGlobalListeners = () => {
    if (globalListenersBound) return;
    globalListenersBound = true;

    window.addEventListener('hashchange', () => {
        if (!isTunerView()) return;
        const session = getSessionState();
        const listening = isSessionListening(session);
        applyRealtimeState({
            listening,
            paused: session.paused,
            lastFeature: session.lastFeature,
        });
        if (!listening) {
            setStatusText(idleStatusText());
        }
    }, { passive: true });

    document.addEventListener(RT_STATE, (event) => {
        if (!isTunerView()) return;
        const detail = event.detail || {};
        scheduleRealtimeState(detail);
    });

    document.addEventListener(ML_UPDATE, (event) => {
        if (event.detail?.id === 'tuner') {
            resolveElements();
            applyTuning();
        }
    });

    document.addEventListener(ML_RESET, () => {
        resolveElements();
        applyTuning();
    });
};

const initTuner = () => {
    initSessionController();
    resolveElements();
    bindGlobalListeners();
    if (!startButton || !stopButton) return;
    bindLocalListeners();
    const session = getSessionState();
    const active = isSessionListening(session);
    lastRenderedStateKey = '';
    updateControlState(getControlRefs(), active);
    if (session.lastFeature && active) {
        applyFrame({
            frame: session.lastFeature,
            tolerance,
            viewRefs: getDisplayRefs(),
            listeningStatusText: listeningStatusText(),
            setStatusText,
            onDetection: () => {},
        });
        lastRenderedStateKey = realtimeRenderKey({
            listening: active,
            paused: session.paused,
            lastFeature: session.lastFeature,
        });
    } else {
        resetDisplay(getDisplayRefs());
        setStatusText(idleStatusText());
        lastRenderedStateKey = realtimeRenderKey({
            listening: active,
            paused: session.paused,
            lastFeature: null,
        });
    }
    applyTuning();
};

export const init = initTuner;
