import { formatTime } from '../games/session-timer.js';
import {
    toLessonLink,
    computeStepDuration,
    computeStepProgress,
    computeOverallProgress,
    formatStepLabel,
    formatStepCue,
} from '../utils/lesson-plan-utils.js';
import { setDisabled } from '../utils/dom-utils.js';

/** Creates the root DOM markup for the guided lesson runner widget. */
/** Creates the base lesson runner markup container. */
export const createRunnerMarkup = () => {
    const runner = document.createElement('div');
    runner.className = 'lesson-runner';
    runner.dataset.lessonRunner = 'true';
    runner.innerHTML = `
        <div class="lesson-runner-header">
            <span class="lesson-runner-title">Guided Lesson</span>
            <span class="lesson-runner-status" data-lesson-runner-status>Ready</span>
        </div>
        <div class="lesson-runner-body">
            <div class="lesson-runner-step" data-lesson-runner-step>Step 1 of 1</div>
            <div class="lesson-runner-cue" data-lesson-runner-cue>Tap Start to begin the first step.</div>
        </div>
        <div class="lesson-runner-timer" data-lesson-runner-timer>00:00</div>
        <div class="lesson-runner-progress" data-lesson-runner-track role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <span class="lesson-runner-fill" data-lesson-runner-fill style="width:0%"></span>
        </div>
        <div class="lesson-runner-actions">
            <button class="btn btn-primary" type="button" data-lesson-runner-start>Start</button>
            <button class="btn btn-secondary" type="button" data-lesson-runner-next disabled>Next step</button>
            <a class="btn btn-ghost" data-lesson-runner-cta href="#view-games">Open activity</a>
        </div>
    `;
    return runner;
};

/** Collects the DOM nodes the lesson runner uses for rendering and controls. */
/** Collects the DOM references used by the lesson runner view. */
export const createRunnerViewState = ({ runner, stepsList }) => ({
    statusEl: runner.querySelector('[data-lesson-runner-status]'),
    stepEl: runner.querySelector('[data-lesson-runner-step]'),
    cueEl: runner.querySelector('[data-lesson-runner-cue]'),
    timerEl: runner.querySelector('[data-lesson-runner-timer]'),
    trackEl: runner.querySelector('[data-lesson-runner-track]'),
    fillEl: runner.querySelector('[data-lesson-runner-fill]'),
    startButton: runner.querySelector('[data-lesson-runner-start]'),
    nextButton: runner.querySelector('[data-lesson-runner-next]'),
    ctaButton: runner.querySelector('[data-lesson-runner-cta]'),
    stepsList,
});

const setRunnerCta = (ctaButton, href, label = 'Open activity') => {
    if (!ctaButton) return;
    ctaButton.setAttribute('href', href);
    ctaButton.textContent = label;
};

/** Renders the runner countdown timer from a remaining-seconds value. */
/** Renders the lesson runner countdown timer text. */
export const renderRunnerTimer = (timerEl, seconds = 0) => {
    if (!timerEl) return;
    timerEl.textContent = formatTime(Math.max(0, Number(seconds) || 0) * 1000);
};

/** Updates lesson runner button labels and enabled states in one call. */
/** Updates lesson runner button labels and disabled state. */
export const setRunnerControls = (
    { startButton, nextButton } = {},
    { startLabel = null, startDisabled, nextDisabled } = {},
) => {
    if (startLabel !== null && startButton) startButton.textContent = startLabel;
    if (typeof startDisabled === 'boolean') setDisabled(startButton, startDisabled);
    if (typeof nextDisabled === 'boolean') setDisabled(nextButton, nextDisabled);
};

const updateRunnerProgress = ({
    steps,
    currentStep,
    completedSteps,
    remainingSeconds,
    timerId,
    fillEl,
    trackEl,
}) => {
    if (!steps.length) return;
    const duration = computeStepDuration(currentStep?.minutes);
    const stepProgress = computeStepProgress(duration, remainingSeconds, !!timerId);
    const overall = computeOverallProgress(completedSteps, stepProgress, steps.length);
    const percent = Math.round(overall * 100);
    if (fillEl) fillEl.style.width = `${percent}%`;
    if (trackEl) trackEl.setAttribute('aria-valuenow', String(percent));
};

const syncRunnerStepList = ({
    stepsList,
    steps,
    completedSteps,
    currentStepId,
}) => {
    if (!stepsList) return;
    const items = Array.from(stepsList.querySelectorAll('.lesson-step'));
    items.forEach((item, index) => {
        const step = steps[index];
        const complete = step?.status === 'complete' || index < completedSteps;
        const active = step?.id === currentStepId;
        item.classList.toggle('is-complete', complete);
        item.classList.toggle('is-active', active);
        item.classList.toggle('is-remediation', step?.source === 'remediation');
        if (active) {
            item.setAttribute('aria-current', 'step');
        } else {
            item.removeAttribute('aria-current');
        }
    });
};

const renderEmptyRunnerStep = ({
    updateProgress,
    ctaButton,
    nextButton,
    startButton,
    timerEl,
    cueEl,
    stepEl,
}) => {
    if (stepEl) stepEl.textContent = formatStepLabel(0, 0);
    if (cueEl) cueEl.textContent = 'Practice a game to unlock a custom plan.';
    renderRunnerTimer(timerEl);
    setRunnerCta(ctaButton, '#view-games');
    setRunnerControls(
        { startButton, nextButton },
        { startDisabled: true, nextDisabled: true },
    );
    updateProgress();
};

const renderRunnerStep = ({
    step,
    currentIndex,
    stepsLength,
    recommendedGameId,
    remainingSeconds,
    completedSteps,
    runnerView,
}) => {
    const {
        stepEl,
        cueEl,
        timerEl,
        startButton,
        nextButton,
        ctaButton,
    } = runnerView || {};

    if (!step) {
        renderEmptyRunnerStep(runnerView || {});
        return;
    }

    if (stepEl) stepEl.textContent = formatStepLabel(currentIndex, stepsLength);
    if (cueEl) cueEl.textContent = formatStepCue(step);
    const ctaTarget = step?.cta || recommendedGameId;
    setRunnerCta(ctaButton, toLessonLink(ctaTarget), step?.ctaLabel || 'Open activity');
    renderRunnerTimer(timerEl, remainingSeconds || computeStepDuration(step?.minutes));
    setRunnerControls(
        { startButton, nextButton },
        { startDisabled: false, nextDisabled: completedSteps >= stepsLength },
    );
};

/** Builds the renderer callbacks that keep runner state and DOM in sync. */
/** Creates the lesson runner render functions bound to state and DOM refs. */
export const createRunnerRenderers = ({
    runnerState,
    runnerView,
    getCurrentStep,
}) => {
    const updateProgress = () => {
        updateRunnerProgress({
            steps: runnerState.steps,
            currentStep: getCurrentStep(),
            completedSteps: runnerState.completedSteps,
            remainingSeconds: runnerState.remainingSeconds,
            timerId: runnerState.timerId,
            fillEl: runnerView.fillEl,
            trackEl: runnerView.trackEl,
        });
    };

    const syncStepList = () => {
        syncRunnerStepList({
            stepsList: runnerView.stepsList,
            steps: runnerState.steps,
            completedSteps: runnerState.completedSteps,
            currentStepId: getCurrentStep()?.id || null,
        });
    };

    const updateStepDetails = () => {
        if (!runnerState.steps.length) {
            renderEmptyRunnerStep({
                ...runnerView,
                updateProgress,
            });
            return;
        }

        renderRunnerStep({
            runnerView,
            step: getCurrentStep(),
            currentIndex: runnerState.currentIndex,
            stepsLength: runnerState.steps.length,
            recommendedGameId: runnerState.recommendedGameId,
            remainingSeconds: runnerState.remainingSeconds,
            completedSteps: runnerState.completedSteps,
        });
        syncStepList();
        updateProgress();
    };

    return {
        updateProgress,
        syncStepList,
        updateStepDetails,
    };
};
