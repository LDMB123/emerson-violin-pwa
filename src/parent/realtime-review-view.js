import {
    RT_CUE,
    RT_FALLBACK,
    RT_PARENT_OVERRIDE,
    RT_QUALITY,
    RT_SESSION_STARTED,
    RT_SESSION_STOPPED,
} from '../utils/event-names.js';
import { loadRealtimeEvents, loadRealtimeQuality } from '../realtime/event-log.js';
import { setParentPreset } from '../realtime/session-controller.js';
import { getPolicyState } from '../realtime/policy-engine.js';
import { getLearningRecommendations } from '../ml/recommendations.js';
import { loadCurriculumState } from '../curriculum/state.js';

const REVIEW_EVENT_TYPES = Object.freeze([
    RT_SESSION_STARTED,
    RT_SESSION_STOPPED,
    RT_CUE,
    RT_FALLBACK,
    RT_PARENT_OVERRIDE,
    RT_QUALITY,
]);

const PRESET_PREVIEWS = Object.freeze({
    gentle: 'Preview: Fewer corrections, more calm retries.',
    standard: 'Preview: Balanced correction and encouragement.',
    challenge: 'Preview: Tighter targets and faster correction cadence.',
});

const CONFIDENCE_BANDS = Object.freeze(['low', 'medium', 'high']);

const formatTime = (value) => {
    const date = new Date(value || Date.now());
    return Number.isNaN(date.getTime()) ? 'Now' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const toLabel = (eventType) => {
    switch (eventType) {
    case RT_SESSION_STARTED: return 'Session started';
    case RT_SESSION_STOPPED: return 'Session stopped';
    case RT_CUE: return 'Coach cue';
    case RT_FALLBACK: return 'Fallback';
    case RT_PARENT_OVERRIDE: return 'Parent preset';
    case RT_QUALITY: return 'Quality check';
    default: return 'Realtime event';
    }
};

const resolveElements = () => ({
    section: document.querySelector('[data-rt-review]'),
    list: document.querySelector('[data-rt-review-list]'),
    empty: document.querySelector('[data-rt-review-empty]'),
    quality: document.querySelector('[data-rt-quality]'),
    curriculumSummary: document.querySelector('[data-rt-curriculum-summary]'),
    presetStatus: document.querySelector('[data-rt-preset-status]'),
    presetPreview: document.querySelector('[data-rt-preset-preview]'),
    presetButtons: Array.from(document.querySelectorAll('[data-rt-preset]')),
});

const createTimelineCard = (event) => {
    const card = document.createElement('article');
    card.className = 'rt-review-card';
    const detail = event.detail || {};
    const confidenceRaw = typeof detail.confidenceBand === 'string' ? detail.confidenceBand : '';
    const confidence = CONFIDENCE_BANDS.includes(confidenceRaw) ? confidenceRaw : 'medium';
    const detailMessageRaw = detail.message || detail.reason || detail.preset || detail.mode || 'Update';
    const detailMessage = typeof detailMessageRaw === 'string' ? detailMessageRaw : 'Update';

    const head = document.createElement('header');
    head.className = 'rt-review-card-head';

    const title = document.createElement('strong');
    title.textContent = toLabel(event.type);

    const confidenceTag = document.createElement('span');
    confidenceTag.className = `rt-confidence rt-confidence-${confidence}`;
    confidenceTag.textContent = confidence;

    const message = document.createElement('p');
    message.className = 'rt-review-card-message';
    message.textContent = detailMessage;

    const time = document.createElement('span');
    time.className = 'rt-review-card-time';
    time.textContent = formatTime(event.timestamp || detail.at || Date.now());

    head.append(title, confidenceTag);
    card.append(head, message, time);
    return card;
};

const renderQuality = async () => {
    const { quality } = resolveElements();
    if (!quality) return;
    const snapshot = await loadRealtimeQuality();
    if (!snapshot) {
        quality.textContent = 'No quality snapshot yet.';
        return;
    }
    const latency = Math.round(snapshot.p95CueLatencyMs || 0);
    const falseRate = Math.round((snapshot.falseCorrectionRate || 0) * 100);
    const fallbackRate = Math.round((snapshot.fallbackRate || 0) * 100);
    quality.textContent = `p95 latency ${latency}ms • false corrections ${falseRate}% • fallback ${fallbackRate}%`;
};

const renderCurriculumSummary = async () => {
    const { curriculumSummary } = resolveElements();
    if (!curriculumSummary) return;
    const [recs, curriculumState] = await Promise.all([
        getLearningRecommendations().catch(() => null),
        loadCurriculumState().catch(() => null),
    ]);

    const completedUnits = Array.isArray(curriculumState?.completedUnitIds)
        ? curriculumState.completedUnitIds.length
        : 0;
    const mission = recs?.mission || null;
    if (!mission?.unitId) {
        curriculumSummary.textContent = `Completed units: ${completedUnits}. Start a mission to see next teaching actions.`;
        return;
    }

    const nextAction = Array.isArray(recs?.nextActions) ? recs.nextActions[0] : null;
    curriculumSummary.textContent = `Current unit: ${mission.unitId} • Mission ${mission.completionPercent || 0}% • Completed units: ${completedUnits}${nextAction?.label ? ` • Next: ${nextAction.label}` : ''}`;
};

const renderTimeline = async () => {
    const { list, empty } = resolveElements();
    if (!list) return;
    const events = await loadRealtimeEvents();
    const filtered = events
        .filter((event) => REVIEW_EVENT_TYPES.includes(event.type))
        .slice(-24)
        .reverse();

    list.replaceChildren();
    if (!filtered.length) {
        if (empty) empty.hidden = false;
        return;
    }

    if (empty) empty.hidden = true;
    filtered.forEach((event) => {
        list.appendChild(createTimelineCard(event));
    });
};

const renderPreset = () => {
    const { presetButtons, presetStatus, presetPreview } = resolveElements();
    const policy = getPolicyState();
    presetButtons.forEach((button) => {
        const active = button.dataset.rtPreset === policy.preset;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (presetStatus) {
        presetStatus.textContent = `Preset: ${policy.preset.charAt(0).toUpperCase()}${policy.preset.slice(1)}`;
    }
    if (presetPreview) {
        presetPreview.textContent = PRESET_PREVIEWS[policy.preset] || PRESET_PREVIEWS.standard;
    }
};

const bindPresets = (onPresetApplied) => {
    const { presetButtons } = resolveElements();
    presetButtons.forEach((button) => {
        if (button.dataset.rtPresetBound === 'true') return;
        button.dataset.rtPresetBound = 'true';
        button.addEventListener('click', async () => {
            const preset = button.dataset.rtPreset;
            if (!preset) return;
            await setParentPreset(preset, 'parent-zone');
            renderPreset();
            onPresetApplied?.();
        });
    });
};

export const createRealtimeReviewView = () => ({
    resolveElements,
    bindPresets,
    renderPreset,
    renderTimeline,
    renderQuality,
    renderCurriculumSummary,
    getRefreshEventNames: () => REVIEW_EVENT_TYPES,
});
