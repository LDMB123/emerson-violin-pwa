import { starString, buildChart, chartCaptionFor } from '../utils/session-review-utils.js';

export const createSessionReviewRenderer = () => {
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

    const hasRecordingSlots = () => recordingEls.length > 0;
    const getRecordingElements = () => recordingEls;

    const buildSongMap = () => {
        const map = new Map();
        document.querySelectorAll('.song-card[data-song]').forEach((card) => {
            const id = card.dataset.song;
            const title = card.querySelector('.song-title')?.textContent?.trim();
            if (id && title) map.set(id, title);
        });
        return map;
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

    const updateMinutes = (minutes) => {
        if (minutesEl) minutesEl.textContent = `${minutes} min`;
    };

    const updateAccuracy = (accuracyAvg) => {
        if (accuracyEl) accuracyEl.textContent = `${accuracyAvg}%`;
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

    const updateMissionStatus = (mission) => {
        if (!missionStatusEl) return;

        if (mission?.id) {
            const step = Array.isArray(mission.steps)
                ? mission.steps.find((item) => item.id === mission.currentStepId)
                : null;
            missionStatusEl.textContent = step
                ? `Mission: ${step.label} (${mission.completionPercent || 0}% complete)`
                : `Mission progress: ${mission.completionPercent || 0}%`;
            return;
        }

        missionStatusEl.textContent = 'Mission guidance will appear after your next activity.';
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

    const setCoachMessage = (message) => {
        if (coachMessageEl) coachMessageEl.textContent = message;
    };

    const setCoachAltMessage = (message) => {
        if (coachAltEl) coachAltEl.textContent = message;
    };

    return {
        resolveElements,
        hasRecordingSlots,
        getRecordingElements,
        buildSongMap,
        updateChart,
        updateMinutes,
        updateAccuracy,
        updateSkills,
        updateMissionStatus,
        renderNextActions,
        setCoachMessage,
        setCoachAltMessage,
    };
};
