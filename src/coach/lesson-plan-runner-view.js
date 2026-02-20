import { formatTime } from '../games/session-timer.js';
import {
    toLessonLink,
    computeStepDuration,
    computeStepProgress,
    computeOverallProgress,
    formatStepLabel,
    formatStepCue,
} from '../utils/lesson-plan-utils.js';

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

export const setRunnerCta = (ctaButton, href, label = 'Open activity') => {
    if (!ctaButton) return;
    ctaButton.setAttribute('href', href);
    ctaButton.textContent = label;
};

export const updateRunnerProgress = ({
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

export const syncRunnerStepList = ({
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

export const renderEmptyRunnerStep = ({
    stepEl,
    cueEl,
    timerEl,
    startButton,
    nextButton,
    ctaButton,
    updateProgress,
}) => {
    if (stepEl) stepEl.textContent = formatStepLabel(0, 0);
    if (cueEl) cueEl.textContent = 'Practice a game to unlock a custom plan.';
    if (timerEl) timerEl.textContent = '00:00';
    setRunnerCta(ctaButton, '#view-games');
    if (startButton) startButton.disabled = true;
    if (nextButton) nextButton.disabled = true;
    updateProgress();
};

export const renderRunnerStep = ({
    step,
    currentIndex,
    stepsLength,
    recommendedGameId,
    remainingSeconds,
    completedSteps,
    stepEl,
    cueEl,
    timerEl,
    startButton,
    nextButton,
    ctaButton,
    updateProgress,
}) => {
    if (!step) {
        renderEmptyRunnerStep({
            stepEl,
            cueEl,
            timerEl,
            startButton,
            nextButton,
            ctaButton,
            updateProgress,
        });
        return;
    }

    if (stepEl) stepEl.textContent = formatStepLabel(currentIndex, stepsLength);
    if (cueEl) cueEl.textContent = formatStepCue(step);
    const ctaTarget = step?.cta || recommendedGameId;
    setRunnerCta(ctaButton, toLessonLink(ctaTarget), step?.ctaLabel || 'Open activity');
    if (timerEl) {
        const duration = computeStepDuration(step?.minutes);
        timerEl.textContent = formatTime((remainingSeconds || duration) * 1000);
    }
    if (startButton) startButton.disabled = false;
    if (nextButton) nextButton.disabled = completedSteps >= stepsLength;
};
