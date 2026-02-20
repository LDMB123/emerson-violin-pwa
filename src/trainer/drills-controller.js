import { createPostureDrillController } from './drills-controller-posture.js';
import { createBowingDrillController } from './drills-controller-bowing.js';

export const createDrillsController = () => {
    const postureController = createPostureDrillController();
    const bowingController = createBowingDrillController();

    return {
        setElements(elements = {}) {
            postureController.setElements(elements);
            bowingController.setElements(elements);
        },
        bindControls() {
            bowingController.bindControls();
            postureController.bindControls();
        },
        syncUi() {
            postureController.syncUi();
            bowingController.syncUi();
        },
        refreshTuning() {
            postureController.refreshTuningState();
            bowingController.refreshTuningState();
        },
        refreshTuningById(id) {
            if (id === 'trainer-posture') {
                postureController.refreshTuningState();
            }
            if (id === 'bowing-coach') {
                bowingController.refreshTuningState();
            }
        },
        handlePagehide() {
            postureController.handlePagehide();
        },
        handleHashChange(hash) {
            postureController.handleHashChange(hash);
            bowingController.handleHashChange(hash);
        },
    };
};
