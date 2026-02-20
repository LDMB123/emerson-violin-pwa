import { setupLessonPlan } from './lesson-plan-runner.js';

let teardown = () => {};

const initLessonPlan = () => {
    teardown();
    teardown = setupLessonPlan();
};

export const init = initLessonPlan;
