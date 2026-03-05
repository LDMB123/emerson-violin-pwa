import { atLeast1 } from '../utils/math.js';

const getCoachView = () => document.getElementById('view-coach');

const ensureCoachMissionStatus = () => {
    const coachView = getCoachView();
    if (!coachView) return null;
    let status = coachView.querySelector('[data-coach-mission-status]');
    if (status) return status;

    const anchor = coachView.querySelector('.coach-kid-layout');
    if (!anchor?.parentElement) return null;

    status = document.createElement('p');
    status.className = 'coach-mission-status glass';
    status.dataset.coachMissionStatus = 'true';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Mission progress: 0/0 goals complete.';

    anchor.parentElement.insertBefore(status, anchor.nextSibling);
    return status;
};

const ensureCoachMissionTimeline = () => {
    let timeline = getCoachView()?.querySelector('[data-coach-mission-timeline]');
    if (timeline) return timeline;

    const missionStatus = ensureCoachMissionStatus();
    if (!missionStatus?.parentElement) return null;

    timeline = document.createElement('ol');
    timeline.className = 'mission-timeline';
    timeline.dataset.coachMissionTimeline = 'true';
    missionStatus.parentElement.insertBefore(timeline, missionStatus.nextSibling);
    return timeline;
};

const ensureHomeMissionSummary = () => {
    const home = document.getElementById('view-home');
    if (!home) return null;
    let summary = home.querySelector('[data-home-mission-summary]');
    if (summary) return summary;

    const anchor = home.querySelector('.home-giant-actions');
    if (!anchor?.parentElement) return null;

    summary = document.createElement('p');
    summary.className = 'home-mission-summary';
    summary.dataset.homeMissionSummary = 'true';
    summary.setAttribute('aria-live', 'polite');
    summary.textContent = 'Mission ready.';
    anchor.parentElement.insertBefore(summary, anchor.nextSibling);
    return summary;
};

/** Renders the coach mission timeline list from the current mission state. */
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

/** Renders the coach goal checklist from mission steps and slot defaults. */
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

        const chip = Object.assign(document.createElement('span'), {
            className: 'note-chip',
        });
        chip.dataset.goalChip = 'true';
        chip.textContent = `${atLeast1(Math.round(step?.minutes || defaults.minutes))} min`;

        const text = document.createElement('span');
        text.dataset.goalLabel = 'true';
        text.textContent = step?.label || defaults.label;

        label.append(chip, document.createTextNode(' '), text);
        item.append(input, label);
        goalList.appendChild(item);
    });
};

/** Updates the coach mission status summary line. */
export const renderMissionStatus = ({ completed, total, complete }) => {
    const status = ensureCoachMissionStatus();
    if (!status) return;
    status.textContent = complete
        ? `Mission complete: ${completed}/${total} goals done.`
        : `Mission progress: ${completed}/${total} goals complete.`;
};

/** Updates the Home view summary text for the current mission. */
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

/** Ensures the mission summary/status containers exist before rendering into them. */
export const ensureMissionUiNodes = () => {
    ensureCoachMissionStatus();
    ensureHomeMissionSummary();
};
