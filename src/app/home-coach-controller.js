import {
    RT_SESSION_STARTED,
    LESSON_STEP,
    LESSON_COMPLETE,
    GAME_RECORDED,
    COACH_MISSION_COMPLETE,
} from '../utils/event-names.js';
import { gameViewHash } from '../utils/view-hash-utils.js';
import { setAriaPressed, setAriaHidden } from '../utils/dom-utils.js';

/** Creates the Home/Coach controller for continue actions and coach stepper state. */
export const createHomeCoachController = ({
    getViewId,
    getRouteMeta,
    toMissionCheckpointHref,
}) => {
    let coachStepperAutoBound = false;
    let activateCoachStep = null;

    const toHashRoute = (target) => {
        if (!target) return '#view-coach';
        if (target.startsWith('#')) return target;
        if (target.startsWith('view-')) return `#${target}`;
        return gameViewHash(target);
    };

    const getResumeLabel = (href) => {
        const viewId = getViewId(href);
        if (viewId.startsWith('view-game-')) return 'Resume Game';
        if (viewId.startsWith('view-song-')) return 'Resume Song';
        if (viewId === 'view-tuner') return 'Resume Tuner';
        if (viewId === 'view-progress') return 'See Wins';

        const meta = getRouteMeta(viewId);
        if (meta?.navGroup === 'games') return 'Resume Games';
        if (meta?.navGroup === 'songs') return 'Resume Songs';
        if (meta?.navGroup === 'practice') return 'Resume Mission';
        return 'Resume';
    };

    const getContinueTarget = () => document.documentElement.dataset.practiceContinueHref || 'view-coach';

    const setContinueHref = (continueBtn, target) => {
        const href = toHashRoute(target || getContinueTarget());
        document.documentElement.dataset.practiceContinueHref = href;
        if (continueBtn) {
            continueBtn.setAttribute('href', href);
            continueBtn.textContent = getResumeLabel(href);
        }
    };

    const updatePracticeContinueCheckpoint = (viewId) => {
        const checkpointHref = toMissionCheckpointHref(viewId);
        if (!checkpointHref) return;
        document.documentElement.dataset.practiceContinueHref = checkpointHref;
    };

    const bindChildHomeActions = (container) => {
        const startBtn = container.querySelector('[data-start-practice]');
        const continueBtn = container.querySelector('[data-continue-practice]');
        if (startBtn && startBtn.dataset.bound !== 'true') {
            startBtn.dataset.bound = 'true';
            startBtn.addEventListener('click', (event) => {
                event.preventDefault();
                window.location.hash = '#view-coach';
            });
        }

        if (continueBtn) {
            const refreshContinueHref = () => {
                setContinueHref(continueBtn, getContinueTarget());
            };
            refreshContinueHref();
            if (continueBtn.dataset.bound !== 'true') {
                continueBtn.dataset.bound = 'true';
                continueBtn.addEventListener('click', () => {
                    refreshContinueHref();
                });
            }
            if (continueBtn.dataset.recommendationBound !== 'true') {
                continueBtn.dataset.recommendationBound = 'true';
                import('../ml/recommendations.js')
                    .then(({ getLearningRecommendations }) => getLearningRecommendations())
                    .then((recs) => {
                        const missionStep = Array.isArray(recs?.mission?.steps)
                            ? recs.mission.steps.find((step) => step.id === recs?.mission?.currentStepId)
                            : null;
                        const missionTarget = missionStep?.target || missionStep?.cta;
                        const actionTarget = Array.isArray(recs?.nextActions)
                            ? recs.nextActions.find((action) => action?.href)?.href
                            : null;
                        const recommended = missionTarget || actionTarget || recs?.recommendedGameId || 'view-coach';
                        setContinueHref(continueBtn, recommended);
                    })
                    .catch(() => {
                        refreshContinueHref();
                    });
            }
        }
    };

    const bindCoachStepper = (container) => {
        const tabs = Array.from(container.querySelectorAll('[data-coach-step-target]'));
        const cards = Array.from(container.querySelectorAll('[data-coach-step-card]'));
        if (!tabs.length || !cards.length) return;

        const activate = (target) => {
            tabs.forEach((tab) => {
                const active = tab.dataset.coachStepTarget === target;
                tab.classList.toggle('is-active', active);
                setAriaPressed(tab, active);
            });

            cards.forEach((card) => {
                const active = card.dataset.coachStepCard === target;
                card.classList.toggle('is-active', active);
                card.hidden = !active;
                setAriaHidden(card, !active);
            });
        };

        activateCoachStep = activate;

        tabs.forEach((tab, index) => {
            if (tab.dataset.bound === 'true') return;
            tab.dataset.bound = 'true';
            tab.addEventListener('click', () => activate(tab.dataset.coachStepTarget));
            if (index === 0 && tab.classList.contains('is-active')) {
                activate(tab.dataset.coachStepTarget);
            }
        });

        if (!coachStepperAutoBound) {
            coachStepperAutoBound = true;
            const canAutoSwitch = () => window.location.hash === '#view-coach' && typeof activateCoachStep === 'function';
            const activatePlayIfAllowed = () => {
                if (!canAutoSwitch()) return;
                activateCoachStep('play');
            };

            document.addEventListener(RT_SESSION_STARTED, () => {
                if (!canAutoSwitch()) return;
                activateCoachStep('warmup');
            });

            document.addEventListener(LESSON_STEP, (event) => {
                if (!canAutoSwitch()) return;
                const state = event.detail?.state;
                if (state === 'start' || state === 'complete') {
                    activateCoachStep('play');
                }
            });

            document.addEventListener(LESSON_COMPLETE, activatePlayIfAllowed);
            document.addEventListener(GAME_RECORDED, activatePlayIfAllowed);
            document.addEventListener(COACH_MISSION_COMPLETE, activatePlayIfAllowed);
        }
    };

    return {
        bindChildHomeActions,
        bindCoachStepper,
        updatePracticeContinueCheckpoint,
    };
};
