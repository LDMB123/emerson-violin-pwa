const ensureCoachMissionStatus = () => {
    const coachView = document.getElementById('view-coach');
    if (!coachView) return null;
    let status = coachView.querySelector('[data-coach-mission-status]');
    if (status) return status;
    const stepper = coachView.querySelector('[data-coach-stepper]');
    if (!stepper?.parentElement) return null;

    status = document.createElement('p');
    status.className = 'coach-mission-status glass';
    status.dataset.coachMissionStatus = 'true';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Mission progress: 0/0 goals complete.';

    stepper.parentElement.insertBefore(status, stepper.nextSibling);
    return status;
};

const ensureCoachMissionTimeline = () => {
    const coachView = document.getElementById('view-coach');
    if (!coachView) return null;

    let timeline = coachView.querySelector('[data-coach-mission-timeline]');
    if (timeline) return timeline;

    const targetCard = coachView.querySelector('[data-coach-step-card="play"] .lesson-plan')
        || coachView.querySelector('[data-coach-step-card="play"]');
    if (!targetCard) return null;

    timeline = document.createElement('ol');
    timeline.className = 'mission-timeline';
    timeline.dataset.coachMissionTimeline = 'true';
    targetCard.appendChild(timeline);
    return timeline;
};

const ensureHomeMissionSummary = () => {
    const home = document.getElementById('view-home');
    if (!home) return null;
    let summary = home.querySelector('[data-home-mission-summary]');
    if (summary) return summary;

    const missionActions = home.querySelector('.mission-actions');
    if (!missionActions?.parentElement) return null;

    summary = document.createElement('p');
    summary.className = 'home-mission-summary';
    summary.dataset.homeMissionSummary = 'true';
    summary.setAttribute('aria-live', 'polite');
    summary.textContent = 'Mission ready.';
    missionActions.parentElement.insertBefore(summary, missionActions.nextSibling);
    return summary;
};

export const renderMissionTimeline = ({ missionState }) => {
    const timeline = ensureCoachMissionTimeline();
    if (!timeline) return;
    timeline.replaceChildren();

    const steps = missionState?.steps || [];
    if (!steps.length) {
        const empty = document.createElement('li');
        empty.className = 'mission-timeline-item';
        empty.textContent = 'Mission will appear after recommendations load.';
        timeline.appendChild(empty);
        return;
    }

    steps.forEach((step) => {
        const item = document.createElement('li');
        item.className = 'mission-timeline-item';
        item.dataset.state = step.status || 'not_started';
        item.dataset.source = step.source || 'plan';
        if (step.id === missionState.currentStepId) {
            item.setAttribute('aria-current', 'step');
        }

        const label = document.createElement('span');
        label.className = 'mission-timeline-label';
        label.textContent = step.label || 'Mission step';

        const meta = document.createElement('span');
        meta.className = 'mission-timeline-meta';
        const stateLabel = step.status === 'complete'
            ? 'Complete'
            : step.status === 'in_progress'
                ? 'In progress'
                : step.source === 'remediation'
                    ? 'Remediation'
                    : 'Queued';
        meta.textContent = stateLabel;

        item.append(label, meta);
        timeline.appendChild(item);
    });
};

export const renderMissionGoalList = ({
    goalList,
    missionState,
    goalSlotIds,
    goalSlotDefaults,
    previousChecked,
}) => {
    if (!goalList) return;
    const steps = missionState?.steps || [];
    goalList.replaceChildren();

    goalSlotIds.forEach((goalId, index) => {
        const step = steps[index] || null;
        const defaults = goalSlotDefaults[goalId] || { minutes: 3, label: `Goal ${index + 1}` };
        const item = document.createElement('li');
        item.className = 'game-check-item';
        item.dataset.goalItem = goalId.replace('goal-', '');

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = goalId;
        if (step?.id) {
            input.dataset.stepId = step.id;
        } else {
            input.removeAttribute('data-step-id');
        }
        input.checked = step
            ? (step.status || 'not_started') === 'complete'
            : Boolean(previousChecked.get(goalId));

        const label = document.createElement('label');
        label.setAttribute('for', goalId);

        const chip = document.createElement('span');
        chip.className = 'note-chip';
        chip.dataset.goalChip = 'true';
        chip.textContent = `${Math.max(1, Math.round(step?.minutes || defaults.minutes))} min`;

        const text = document.createElement('span');
        text.dataset.goalLabel = 'true';
        text.textContent = step?.label || defaults.label;

        label.append(chip, document.createTextNode(' '), text);
        item.append(input, label);
        goalList.appendChild(item);
    });
};

export const renderMissionStatus = ({ completed, total, complete }) => {
    const status = ensureCoachMissionStatus();
    if (!status) return;
    status.textContent = complete
        ? `Mission complete: ${completed}/${total} goals done.`
        : `Mission progress: ${completed}/${total} goals complete.`;
};

export const renderHomeMissionSummary = ({ missionState, complete }) => {
    const homeSummary = ensureHomeMissionSummary();
    if (!homeSummary) return;

    const currentStep = missionState?.steps?.find((step) => step.id === missionState?.currentStepId)
        || missionState?.steps?.find((step) => step.status === 'not_started')
        || missionState?.steps?.find((step) => step.status === 'in_progress')
        || null;

    if (complete) {
        homeSummary.textContent = 'Mission complete. Open Wins to celebrate and choose the next mission.';
        return;
    }
    if (currentStep) {
        homeSummary.textContent = `Next: ${currentStep.label}`;
        return;
    }
    homeSummary.textContent = 'Mission ready.';
};

export const ensureMissionUiNodes = () => {
    ensureCoachMissionStatus();
    ensureHomeMissionSummary();
};
