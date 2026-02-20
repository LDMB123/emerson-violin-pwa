import { createRealtimeReviewView } from './realtime-review-view.js';

let initialized = false;
const view = createRealtimeReviewView();

const refresh = () => {
    view.renderPreset();
    view.renderTimeline();
    view.renderQuality();
    view.renderCurriculumSummary();
};

const bindGlobal = () => {
    view.getRefreshEventNames().forEach((eventName) => {
        document.addEventListener(eventName, () => {
            refresh();
        });
    });
};

export const init = () => {
    const { section } = view.resolveElements();
    if (!section) return;

    view.bindPresets(() => {
        view.renderTimeline();
    });

    if (!initialized) {
        initialized = true;
        bindGlobal();
    }

    refresh();
};
