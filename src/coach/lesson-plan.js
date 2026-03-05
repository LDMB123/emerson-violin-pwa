import { setupLessonPlan } from './lesson-plan-runner.js';

let teardown = () => {};

const initLessonPlan = () => {
    teardown();
    teardown = setupLessonPlan();
};

/** Initializes the coach lesson plan runner and refreshes previous bindings. */
export const init = initLessonPlan;
