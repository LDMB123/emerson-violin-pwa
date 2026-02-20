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
        return `#view-game-${target}`;
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

    const setContinueHref = (continueBtn, target) => {
        const href = toHashRoute(target || document.documentElement.dataset.practiceContinueHref || 'view-coach');
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
            setContinueHref(continueBtn, document.documentElement.dataset.practiceContinueHref || 'view-coach');
            if (continueBtn.dataset.bound !== 'true') {
                continueBtn.dataset.bound = 'true';
                continueBtn.addEventListener('click', () => {
                    setContinueHref(continueBtn, document.documentElement.dataset.practiceContinueHref || 'view-coach');
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
                        setContinueHref(continueBtn, document.documentElement.dataset.practiceContinueHref || 'view-coach');
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
                tab.setAttribute('aria-pressed', active ? 'true' : 'false');
            });

            cards.forEach((card) => {
                const active = card.dataset.coachStepCard === target;
                card.classList.toggle('is-active', active);
                card.hidden = !active;
                card.setAttribute('aria-hidden', active ? 'false' : 'true');
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

            document.addEventListener('panda:rt-session-started', () => {
                if (!canAutoSwitch()) return;
                activateCoachStep('warmup');
            });

            document.addEventListener('panda:lesson-step', (event) => {
                if (!canAutoSwitch()) return;
                const state = event.detail?.state;
                if (state === 'start' || state === 'complete') {
                    activateCoachStep('play');
                }
            });

            document.addEventListener('panda:lesson-complete', () => {
                if (!canAutoSwitch()) return;
                activateCoachStep('play');
            });

            document.addEventListener('panda:game-recorded', () => {
                if (!canAutoSwitch()) return;
                activateCoachStep('play');
            });

            document.addEventListener('panda:coach-mission-complete', () => {
                if (!canAutoSwitch()) return;
                activateCoachStep('play');
            });
        }
    };

    return {
        bindChildHomeActions,
        bindCoachStepper,
        updatePracticeContinueCheckpoint,
    };
};
