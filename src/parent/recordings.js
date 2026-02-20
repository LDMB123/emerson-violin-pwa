import { loadRecordings } from '../persistence/loaders.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { RECORDINGS_UPDATED, SOUNDS_CHANGE } from '../utils/event-names.js';
import { isBfcachePagehide } from '../utils/lifecycle-utils.js';
import { getVisibleRecordings } from './parent-recordings-data.js';
import { createParentRecordingsRenderer } from './parent-recordings-render.js';
import { createParentRecordingsInteractions } from './parent-recordings-interactions.js';

let globalListenersBound = false;
const renderer = createParentRecordingsRenderer();
const interactions = createParentRecordingsInteractions({
    requestRender: () => render(),
    setStatus: (message) => renderer.setStatus(message),
});

const render = async () => {
    renderer.resolveElements();
    if (!renderer.hasList()) return;

    const recordings = await loadRecordings();
    renderer.clearList();
    renderer.setClearEnabled(recordings.length > 0);

    if (!recordings.length) {
        renderer.setStatus('No recordings saved yet.');
        return;
    }

    const visibleRecordings = getVisibleRecordings(recordings);
    const descriptors = renderer.renderRows({
        recordings: visibleRecordings,
        soundEnabled: isSoundEnabled(),
    });
    interactions.bindRowActions(descriptors);
    renderer.setStatus(`Showing ${descriptors.length} of ${recordings.length} recordings.`);
};

const bindLocalListeners = () => {
    const clearButton = renderer.getClearButton();
    if (clearButton && clearButton.dataset.parentRecordingsBound !== 'true') {
        clearButton.dataset.parentRecordingsBound = 'true';
        clearButton.addEventListener('click', () => interactions.clearAll());
    }
};

const bindGlobalListeners = () => {
    if (globalListenersBound) return;
    globalListenersBound = true;

    const handleUpdate = () => {
        interactions.stop();
        render();
    };

    window.addEventListener(RECORDINGS_UPDATED, handleUpdate);
    document.addEventListener(SOUNDS_CHANGE, (event) => {
        if (event.detail?.enabled === false) {
            interactions.stop();
        }
        render();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) interactions.stop();
    });
    window.addEventListener('pagehide', (event) => {
        if (isBfcachePagehide(event)) return;
        interactions.stop();
    });
};

const initParentRecordings = () => {
    renderer.resolveElements();
    bindGlobalListeners();
    bindLocalListeners();
    render();
};

export const init = initParentRecordings;
