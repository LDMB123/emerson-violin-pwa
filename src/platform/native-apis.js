import { PERSIST_APPLIED } from '../utils/event-names.js';
import { createStorageController } from './storage-controller.js';
import { createPowerControls } from './power-controls.js';
import { createMediaSoundController } from './media-sound-controller.js';
import { createShareSummaryController } from './share-summary-controller.js';
import { createInstallStateController } from './install-state-controller.js';
import { createViewportOffsetController } from './viewport-offset-controller.js';

let globalsBound = false;

const storageController = createStorageController();
const powerControls = createPowerControls();
const mediaSoundController = createMediaSoundController();
const shareSummaryController = createShareSummaryController();
const installStateController = createInstallStateController();
const viewportOffsetController = createViewportOffsetController();

const resolveElements = () => {
    storageController.setElements({
        statusEl: document.querySelector('[data-storage-status]'),
        estimateEl: document.querySelector('[data-storage-estimate]'),
        requestButton: document.querySelector('[data-storage-request]'),
        networkStatusEl: document.querySelector('[data-network-status]'),
    });

    powerControls.setElements({
        wakeToggle: document.querySelector('#setting-keep-awake'),
        wakeStatusEl: document.querySelector('[data-wake-status]'),
        orientationToggle: document.querySelector('#setting-orientation-lock'),
        orientationStatusEl: document.querySelector('[data-orientation-status]'),
    });

    mediaSoundController.setElements({
        soundToggle: document.querySelector('#setting-sounds'),
    });

    shareSummaryController.setElements({
        shareButton: document.querySelector('[data-share-summary]'),
        shareStatusEl: document.querySelector('[data-share-status]'),
    });

    installStateController.setElement(document.querySelector('[data-install-status]'));
};

const bindGlobalListeners = () => {
    if (globalsBound) return;
    globalsBound = true;
    document.addEventListener(PERSIST_APPLIED, () => {
        mediaSoundController.updateSoundState();
        powerControls.requestWakeLock();
        powerControls.requestOrientationLock();
    });
};

const initNativeApis = () => {
    resolveElements();
    storageController.bindStorageUI();
    storageController.bindNetworkStatus();
    powerControls.bindWakeLock();
    powerControls.bindOrientationLock();
    shareSummaryController.bind();
    mediaSoundController.bindMediaSession();
    mediaSoundController.bindAudioFocus();
    viewportOffsetController.bind();
    installStateController.bind(storageController);
    mediaSoundController.bindSoundToggle();
    bindGlobalListeners();
};

export const init = initNativeApis;
