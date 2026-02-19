import { getLearningRecommendations } from '../ml/recommendations.js';
import { formatTime } from '../games/session-timer.js';
import { LESSON_STEP, LESSON_COMPLETE, ML_UPDATE, ML_RESET, ML_RECS } from '../utils/event-names.js';
import {
    toLessonLink,
    computeStepDuration,
    computeStepProgress,
    computeOverallProgress,
    formatStepLabel,
    formatStepCue,
} from '../utils/lesson-plan-utils.js';

let teardown = () => {};

const createRunnerMarkup = () => {
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

const setupLessonPlan = () => {
    const planPanel = document.querySelector('[data-lesson-plan="coach"]');
    if (!planPanel) return () => {};

    const existingRunner = planPanel.querySelector('[data-lesson-runner]');
    if (existingRunner) existingRunner.remove();

    const stepsList = planPanel.querySelector('[data-lesson-steps]');
    const planCta = planPanel.querySelector('[data-lesson="cta"]');
    const runner = createRunnerMarkup();

    if (planCta) {
        planPanel.insertBefore(runner, planCta);
    } else {
        planPanel.appendChild(runner);
    }

    const statusEl = runner.querySelector('[data-lesson-runner-status]');
    const stepEl = runner.querySelector('[data-lesson-runner-step]');
    const cueEl = runner.querySelector('[data-lesson-runner-cue]');
    const timerEl = runner.querySelector('[data-lesson-runner-timer]');
    const trackEl = runner.querySelector('[data-lesson-runner-track]');
    const fillEl = runner.querySelector('[data-lesson-runner-fill]');
    const startButton = runner.querySelector('[data-lesson-runner-start]');
    const nextButton = runner.querySelector('[data-lesson-runner-next]');
    const ctaButton = runner.querySelector('[data-lesson-runner-cta]');

    let steps = [];
    let currentIndex = 0;
    let completedSteps = 0;
    let remainingSeconds = 0;
    let timerId = null;
    let recommendedGameId = 'view-games';

    const stopTimer = () => {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
    };

    const updateProgress = () => {
        if (!steps.length) return;
        const step = steps[currentIndex];
        const duration = computeStepDuration(step?.minutes);
        const stepProgress = computeStepProgress(duration, remainingSeconds, !!timerId);
        const overall = computeOverallProgress(completedSteps, stepProgress, steps.length);
        const percent = Math.round(overall * 100);
        if (fillEl) fillEl.style.width = `${percent}%`;
        if (trackEl) trackEl.setAttribute('aria-valuenow', String(percent));
    };

    const syncStepList = () => {
        if (!stepsList) return;
        const items = Array.from(stepsList.querySelectorAll('.lesson-step'));
        items.forEach((item, index) => {
            item.classList.toggle('is-complete', index < completedSteps);
            item.classList.toggle('is-active', index === currentIndex && completedSteps < steps.length);
            if (index === currentIndex && completedSteps < steps.length) {
                item.setAttribute('aria-current', 'step');
            } else {
                item.removeAttribute('aria-current');
            }
        });
    };

    const dispatchLessonEvent = (state, step) => {
        document.dispatchEvent(new CustomEvent(LESSON_STEP, {
            detail: {
                state,
                step,
                index: currentIndex,
                total: steps.length,
            },
        }));
    };

    const setStatus = (message) => {
        if (statusEl) statusEl.textContent = message;
    };

    const setRunnerCta = (href, label = 'Open activity') => {
        if (!ctaButton) return;
        ctaButton.setAttribute('href', href);
        ctaButton.textContent = label;
    };

    const renderEmptyStep = () => {
        if (stepEl) stepEl.textContent = formatStepLabel(0, 0);
        if (cueEl) cueEl.textContent = 'Practice a game to unlock a custom plan.';
        if (timerEl) timerEl.textContent = '00:00';
        setRunnerCta('#view-games');
        if (startButton) startButton.disabled = true;
        if (nextButton) nextButton.disabled = true;
    };

    const renderCurrentStep = (step) => {
        if (stepEl) stepEl.textContent = formatStepLabel(currentIndex, steps.length);
        if (cueEl) cueEl.textContent = formatStepCue(step);
        const ctaTarget = step?.cta || recommendedGameId;
        setRunnerCta(toLessonLink(ctaTarget), step?.ctaLabel || 'Open activity');
        if (timerEl) {
            const duration = computeStepDuration(step?.minutes);
            timerEl.textContent = formatTime((remainingSeconds || duration) * 1000);
        }
        if (startButton) startButton.disabled = false;
        if (nextButton) nextButton.disabled = completedSteps >= steps.length;
    };

    const updateStepDetails = () => {
        if (!steps.length) {
            renderEmptyStep();
            return;
        }
        renderCurrentStep(steps[currentIndex]);
        syncStepList();
        updateProgress();
    };

    const markGoalComplete = (step) => {
        if (!step?.id) return;
        const input = document.getElementById(step.id);
        if (!input || input.checked) return;
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const completeStep = ({ auto = false } = {}) => {
        if (!steps.length) return;
        const step = steps[currentIndex];
        stopTimer();
        remainingSeconds = 0;
        markGoalComplete(step);
        dispatchLessonEvent('complete', step);
        completedSteps = Math.min(steps.length, completedSteps + 1);
        if (completedSteps >= steps.length) {
            setStatus('Lesson complete! Awesome work.');
            if (startButton) startButton.textContent = 'Restart';
            if (nextButton) nextButton.disabled = true;
            if (ctaButton) ctaButton.setAttribute('href', '#view-games');
            document.dispatchEvent(new CustomEvent(LESSON_COMPLETE));
        } else {
            currentIndex = completedSteps;
            setStatus(auto ? 'Step complete. Ready for the next one.' : 'Step marked complete. Tap Next to continue.');
            if (startButton) startButton.textContent = 'Start';
            if (nextButton) nextButton.disabled = false;
        }
        updateStepDetails();
    };

    const tick = () => {
        if (remainingSeconds <= 0) {
            completeStep({ auto: true });
            return;
        }
        remainingSeconds -= 1;
        if (timerEl) timerEl.textContent = formatTime(remainingSeconds * 1000);
        updateProgress();
    };

    const startStep = () => {
        if (!steps.length) return;
        if (completedSteps >= steps.length) {
            completedSteps = 0;
            currentIndex = 0;
        }
        const step = steps[currentIndex];
        const duration = computeStepDuration(step?.minutes);
        if (!remainingSeconds || remainingSeconds > duration) {
            remainingSeconds = duration;
        }
        stopTimer();
        setStatus('Step in progress.');
        if (startButton) startButton.textContent = 'Pause';
        if (nextButton) nextButton.disabled = false;
        dispatchLessonEvent('start', step);
        timerId = window.setInterval(tick, 1000);
        if (timerEl) timerEl.textContent = formatTime(remainingSeconds * 1000);
        updateProgress();
    };

    const pauseStep = () => {
        if (!timerId) return;
        stopTimer();
        setStatus('Paused. Tap Resume when ready.');
        if (startButton) startButton.textContent = 'Resume';
        if (nextButton) nextButton.disabled = false;
        dispatchLessonEvent('pause', steps[currentIndex]);
    };

    const handleStartClick = () => {
        if (!steps.length) return;
        if (completedSteps >= steps.length) {
            completedSteps = 0;
            currentIndex = 0;
            remainingSeconds = 0;
            setStatus('Lesson restarted.');
            updateStepDetails();
            startStep();
            return;
        }
        if (timerId) {
            pauseStep();
        } else {
            startStep();
        }
    };

    const handleNextClick = () => {
        if (!steps.length) return;
        if (timerId) {
            completeStep({ auto: false });
            return;
        }
        if (completedSteps >= steps.length) return;
        startStep();
    };

    const refreshPlan = async () => {
        const recs = await getLearningRecommendations();
        steps = Array.isArray(recs?.lessonSteps) ? recs.lessonSteps : [];
        recommendedGameId = recs?.recommendedGameId || recs?.recommendedGame || 'view-games';
        if (!steps.length) {
            completedSteps = 0;
            currentIndex = 0;
        } else if (currentIndex >= steps.length) {
            currentIndex = 0;
        }
        updateStepDetails();
    };

    startButton?.addEventListener('click', handleStartClick);
    nextButton?.addEventListener('click', handleNextClick);

    refreshPlan();

    const onMlUpdate = () => refreshPlan();
    const onMlReset = () => refreshPlan();
    const onMlRecs = () => refreshPlan();
    document.addEventListener(ML_UPDATE, onMlUpdate);
    document.addEventListener(ML_RESET, onMlReset);
    document.addEventListener(ML_RECS, onMlRecs);

    let observer = null;
    if (stepsList) {
        observer = new MutationObserver(() => {
            syncStepList();
        });
        observer.observe(stepsList, { childList: true, subtree: false });
    }

    const onHashChange = () => {
        if (window.location.hash !== '#view-coach') {
            stopTimer();
            if (startButton) startButton.textContent = 'Start';
        }
    };
    const onVisibility = () => {
        if (document.hidden) {
            pauseStep();
        }
    };

    window.addEventListener('hashchange', onHashChange, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
        stopTimer();
        observer?.disconnect();
        startButton?.removeEventListener('click', handleStartClick);
        nextButton?.removeEventListener('click', handleNextClick);
        document.removeEventListener(ML_UPDATE, onMlUpdate);
        document.removeEventListener(ML_RESET, onMlReset);
        document.removeEventListener(ML_RECS, onMlRecs);
        window.removeEventListener('hashchange', onHashChange);
        document.removeEventListener('visibilitychange', onVisibility);
    };
};

const initLessonPlan = () => {
    teardown();
    teardown = setupLessonPlan();
};

export const init = initLessonPlan;
