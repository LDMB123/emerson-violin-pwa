import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    ML_RESET,
    ML_UPDATE,
    SOUNDS_CHANGE,
} from '../../src/utils/event-names.js';
import { attachTrainerGlobalListeners } from '../../src/trainer/tools-global-listeners.js';
import { captureAddedListeners } from '../utils/test-listener-capture.js';

describe('trainer/tools-global-listeners', () => {
    let documentListenerCapture;
    let windowListenerCapture;

    beforeEach(() => {
        documentListenerCapture = captureAddedListeners(document);
        windowListenerCapture = captureAddedListeners(window);
    });

    afterEach(() => {
        documentListenerCapture?.restore();
        windowListenerCapture?.restore();
    });

    it('responds to sound and ML events', () => {
        const metronomeController = {
            report: vi.fn(),
            stop: vi.fn(),
            pauseForVisibility: vi.fn(),
            resumeForVisibility: vi.fn(),
            setStatus: vi.fn(),
        };
        const drillsController = {
            handlePagehide: vi.fn(),
            handleHashChange: vi.fn(),
        };
        const refreshTrainerTuningById = vi.fn();
        const onMlReset = vi.fn();

        attachTrainerGlobalListeners({
            metronomeController,
            drillsController,
            isPracticeView: () => true,
            refreshTrainerTuningById,
            onMlReset,
        });

        document.dispatchEvent(new CustomEvent(SOUNDS_CHANGE, {
            detail: { enabled: false },
        }));
        expect(metronomeController.stop).toHaveBeenCalledWith({ silent: true });
        expect(metronomeController.setStatus).toHaveBeenCalledWith('Sounds are off.');

        document.dispatchEvent(new CustomEvent(ML_UPDATE, {
            detail: { id: 'trainer-metronome' },
        }));
        expect(refreshTrainerTuningById).toHaveBeenCalledWith('trainer-metronome');

        document.dispatchEvent(new Event(ML_RESET));
        expect(onMlReset).toHaveBeenCalledTimes(1);
    });
});
