import { getLearningRecommendations } from '../ml/recommendations.js';
import { getBlob } from '../persistence/storage.js';
import { loadEvents, loadRecordings, resolveRecordingSource } from '../persistence/loaders.js';
import { getCore } from '../wasm/load-core.js';
import { SOUNDS_CHANGE, RECORDINGS_UPDATED } from '../utils/event-names.js';
import { createSkillProfileUtils } from '../utils/skill-profile.js';
import { exportRecording } from '../utils/recording-export.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { clamp, todayDay } from '../utils/math.js';
import {
    starString,
    coachMessageFor,
    buildChart,
    chartCaptionFor,
    filterSongEvents,
    getRecentEvents,
} from '../utils/session-review-utils.js';
import { createAudioController } from '../utils/audio-utils.js';
import { buildRecordingSlotState, applyRecordingSlotState } from '../utils/analysis-recordings-utils.js';

let chartLine = null;
let chartPoints = null;
let chartCaption = null;
let minutesEl = null;
let accuracyEl = null;
let coachMessageEl = null;
let coachAltEl = null;
let recordingEls = [];
let skillEls = [];
let missionStatusEl = null;
let nextActionsEl = null;

const { audio: playbackAudio, stop: stopPlayback, setUrl: setPlaybackUrl } = createAudioController();
let soundListenerBound = false;
let currentRecordings = [];
let teardown = () => {};

const resolveElements = () => {
    chartLine = document.querySelector('[data-analysis="chart-line"]');
    chartPoints = document.querySelector('[data-analysis="chart-points"]');
    chartCaption = document.querySelector('[data-analysis="chart-caption"]');
    minutesEl = document.querySelector('[data-analysis="minutes"]');
    accuracyEl = document.querySelector('[data-analysis="accuracy"]');
    coachMessageEl = document.querySelector('[data-analysis="coach-message"]');
    coachAltEl = document.querySelector('[data-analysis="coach-message-alt"]');
    recordingEls = Array.from(document.querySelectorAll('[data-analysis="recording"]'));
    skillEls = Array.from(document.querySelectorAll('[data-analysis="skill"]'));
    missionStatusEl = document.querySelector('[data-analysis="mission-status"]');
    nextActionsEl = document.querySelector('[data-analysis="next-actions"]');
};

const updatePlaybackButtons = (enabled) => {
    recordingEls.forEach((el) => {
        const button = el.querySelector('.recording-play');
        if (!button || button.dataset.recordingAvailable !== 'true') return;
        button.disabled = !enabled;
    });
};

const syncPlaybackSound = (enabled = isSoundEnabled()) => {
    playbackAudio.muted = !enabled;
    updatePlaybackButtons(enabled);
};

const updateChart = (values) => {
    if (!chartLine || !chartPoints || !chartCaption) return;
    const chart = buildChart(values);
    if (!chart) return;

    chartLine.setAttribute('d', chart.path);
    chartPoints.replaceChildren();
    chart.points.forEach((point) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x.toFixed(1));
        circle.setAttribute('cy', point.y.toFixed(1));
        circle.setAttribute('r', '6');
        chartPoints.appendChild(circle);
    });

    const latest = values[values.length - 1];
    chartCaption.textContent = chartCaptionFor(latest);
};

const updateRecordings = (events, songMap, recordings) => {
    const recentRecordings = Array.isArray(recordings) ? recordings.slice(0, 2) : [];
    currentRecordings = recentRecordings;

    const songEvents = filterSongEvents(events);
    const recent = getRecentEvents(songEvents, 2);
    const soundEnabled = isSoundEnabled();

    recordingEls.forEach((el, index) => {
        const slotState = buildRecordingSlotState({
            recording: recentRecordings[index],
            item: recent[index],
            index,
            soundEnabled,
            songMap,
        });
        applyRecordingSlotState({
            playButton: el.querySelector('.recording-play'),
            saveButton: el.querySelector('.recording-save'),
            titleEl: el.querySelector('[data-analysis="recording-title"]'),
            subEl: el.querySelector('[data-analysis="recording-sub"]'),
        }, slotState);
    });
};

const bindRecordingPlayback = () => {
    syncPlaybackSound();

    if (!soundListenerBound) {
        soundListenerBound = true;
        document.addEventListener(SOUNDS_CHANGE, (event) => {
            const enabled = event.detail?.enabled;
            syncPlaybackSound(enabled);
            if (!enabled) stopPlayback();
        });
    }

    recordingEls.forEach((el, index) => {
        const button = el.querySelector('.recording-play');
        if (!button || button.dataset.bound === 'true') return;

        button.dataset.bound = 'true';
        button.addEventListener('click', async () => {
            if (!isSoundEnabled()) return;

            const recording = currentRecordings[index];
            if (!recording?.dataUrl && !recording?.blobKey) return;

            const source = await resolveRecordingSource(recording);
            if (!source) return;

            stopPlayback();
            setPlaybackUrl(source.revoke ? source.url : '');
            playbackAudio.src = source.url;
            if (source.revoke) {
                playbackAudio.addEventListener('ended', () => stopPlayback(), { once: true });
            }
            syncPlaybackSound();
            if (!isSoundEnabled()) return;
            playbackAudio.play().catch(() => {});
        });
    });
};

const bindRecordingExport = () => {
    recordingEls.forEach((el, index) => {
        const button = el.querySelector('.recording-save');
        if (!button || button.dataset.exportBound === 'true') return;

        button.dataset.exportBound = 'true';
        button.addEventListener('click', async () => {
            if (button.disabled) return;

            const recording = currentRecordings[index];
            if (!recording?.dataUrl && !recording?.blobKey) return;

            button.disabled = true;
            const original = button.textContent;
            button.textContent = '…';

            try {
                const blob = recording.blobKey ? await getBlob(recording.blobKey) : null;
                await exportRecording(recording, index, blob);
                button.textContent = '✓';
            } catch {
                button.textContent = '!';
            } finally {
                setTimeout(() => {
                    button.textContent = original || '⬇';
                    button.disabled = false;
                }, 1200);
            }
        });
    });
};

const updateSkills = (profile) => {
    const scoreMap = {
        bowing: profile.bow_control,
        fingering: profile.reading,
        rhythm: profile.rhythm,
        intonation: profile.pitch,
    };

    skillEls.forEach((el) => {
        const key = el.dataset.skill;
        const score = scoreMap[key] ?? 50;
        const starsEl = el.querySelector('[data-analysis="skill-stars"]');
        if (starsEl) starsEl.textContent = starString(score);
    });
};

const buildSongMap = () => {
    const map = new Map();
    document.querySelectorAll('.song-card[data-song]').forEach((card) => {
        const id = card.dataset.song;
        const title = card.querySelector('.song-title')?.textContent?.trim();
        if (id && title) map.set(id, title);
    });
    return map;
};

const renderNextActions = (recommendations) => {
    if (!nextActionsEl) return;
    nextActionsEl.replaceChildren();
    const actions = Array.isArray(recommendations?.nextActions) ? recommendations.nextActions.slice(0, 3) : [];
    if (!actions.length) {
        const item = document.createElement('li');
        item.textContent = 'Complete one mission step to unlock tailored next actions.';
        nextActionsEl.appendChild(item);
        return;
    }

    actions.forEach((action) => {
        const item = document.createElement('li');
        if (action?.href) {
            const link = document.createElement('a');
            link.href = action.href;
            link.textContent = action.label || 'Next action';
            item.appendChild(link);
        } else {
            item.textContent = action?.label || 'Next action';
        }
        if (action?.rationale) {
            item.append(` — ${action.rationale}`);
        }
        nextActionsEl.appendChild(item);
    });
};

const initSessionReview = async () => {
    teardown();
    resolveElements();

    if (!recordingEls.length) return;

    const { SkillProfile, SkillCategory } = await getCore();
    const { updateSkillProfile } = createSkillProfileUtils(SkillCategory);

    const events = await loadEvents();
    const recordings = await loadRecordings();
    const songMap = buildSongMap();

    const songEvents = events.filter((event) => event.type === 'song');
    const recentAccuracies = songEvents.slice(-6).map((event) => clamp(event.accuracy || 0, 0, 100));
    if (recentAccuracies.length) updateChart(recentAccuracies);

    updateRecordings(events, songMap, recordings);
    bindRecordingPlayback();
    bindRecordingExport();

    const refreshRecordings = async () => {
        stopPlayback();
        const fresh = await loadRecordings();
        resolveElements();
        updateRecordings(events, songMap, fresh);
        bindRecordingPlayback();
        bindRecordingExport();
    };

    const onHashChange = () => stopPlayback();
    const onPageHide = () => stopPlayback();
    const onVisibilityChange = () => {
        if (document.hidden) stopPlayback();
    };

    window.addEventListener(RECORDINGS_UPDATED, refreshRecordings);
    window.addEventListener('hashchange', onHashChange, { passive: true });
    window.addEventListener('pagehide', onPageHide, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    const today = todayDay();
    const minutes = events.reduce((sum, event) => {
        if (event.day !== today) return sum;
        if (event.type === 'practice') return sum + (event.minutes || 0);
        if (event.type === 'song') return sum + Math.round((event.elapsed || event.duration || 0) / 60);
        return sum;
    }, 0);
    if (minutesEl) minutesEl.textContent = `${minutes} min`;

    const accuracyAvg = songEvents.length
        ? Math.round(songEvents.slice(-5).reduce((sum, event) => sum + (event.accuracy || 0), 0) / Math.min(5, songEvents.length))
        : 0;
    if (accuracyEl) accuracyEl.textContent = `${accuracyAvg}%`;

    const profile = new SkillProfile();
    events
        .filter((event) => event.type === 'practice')
        .forEach((event) => updateSkillProfile(profile, event.id, event.minutes || 0));

    songEvents.forEach((event) => {
        const accuracy = clamp(event.accuracy || 0, 0, 100);
        profile.update_skill(SkillCategory.Reading, clamp(accuracy, 30, 100));
        profile.update_skill(SkillCategory.Pitch, clamp(accuracy * 0.85, 25, 100));
    });

    events
        .filter((event) => event.type === 'game')
        .forEach((event) => {
            const score = clamp(event.accuracy || event.score || 0, 0, 100);
            if (event.id === 'rhythm-dash') profile.update_skill(SkillCategory.Rhythm, score);
            if (event.id === 'bow-hero') profile.update_skill(SkillCategory.BowControl, score);
        });

    updateSkills(profile);

    const weakest = profile.weakest_skill();
    const message = coachMessageFor(weakest);
    if (coachMessageEl) coachMessageEl.textContent = message;

    const recommendations = await getLearningRecommendations().catch(() => null);
    const mission = recommendations?.mission || null;
    if (missionStatusEl) {
        if (mission?.id) {
            const step = Array.isArray(mission.steps)
                ? mission.steps.find((item) => item.id === mission.currentStepId)
                : null;
            missionStatusEl.textContent = step
                ? `Mission: ${step.label} (${mission.completionPercent || 0}% complete)`
                : `Mission progress: ${mission.completionPercent || 0}%`;
        } else {
            missionStatusEl.textContent = 'Mission guidance will appear after your next activity.';
        }
    }
    renderNextActions(recommendations);
    if (coachAltEl) coachAltEl.textContent = 'Keep your tempo steady and enjoy the melody.';

    const recs = await getLearningRecommendations();
    if (recs?.coachMessage && coachMessageEl) {
        coachMessageEl.textContent = recs.coachMessage;
    }
    if (recs?.coachActionMessage && coachAltEl) {
        coachAltEl.textContent = recs.coachActionMessage;
    }

    teardown = () => {
        window.removeEventListener(RECORDINGS_UPDATED, refreshRecordings);
        window.removeEventListener('hashchange', onHashChange);
        window.removeEventListener('pagehide', onPageHide);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        stopPlayback();
    };
};

export const init = initSessionReview;
