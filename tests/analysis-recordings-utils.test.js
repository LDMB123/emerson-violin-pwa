import { describe, expect, it } from 'vitest';
import { applyRecordingSlotState, buildRecordingSlotState } from '../src/utils/analysis-recordings-utils.js';

const createSlotElements = () => {
    document.body.innerHTML = `
        <div data-analysis="recording">
            <button class="recording-play" type="button"></button>
            <div data-analysis="recording-title"></div>
            <div data-analysis="recording-sub"></div>
            <button class="recording-save" type="button"></button>
        </div>
    `;
    const root = document.querySelector('[data-analysis="recording"]');
    return {
        playButton: root.querySelector('.recording-play'),
        saveButton: root.querySelector('.recording-save'),
        titleEl: root.querySelector('[data-analysis="recording-title"]'),
        subEl: root.querySelector('[data-analysis="recording-sub"]'),
    };
};

describe('analysis-recordings-utils', () => {
    it('builds saved recording state with sound-aware play button', () => {
        const state = buildRecordingSlotState({
            recording: { title: 'Twinkle', duration: 18, blobKey: 'blob:1' },
            item: null,
            index: 0,
            soundEnabled: false,
            songMap: new Map(),
        });

        expect(state.title).toBe('Twinkle');
        expect(state.sub).toBe('Saved clip · 18s');
        expect(state.playAvailable).toBe(true);
        expect(state.playDisabled).toBe(true);
        expect(state.saveDisabled).toBe(false);
        expect(state.recordingIndex).toBe('0');
    });

    it('builds empty slot state when there is no recording or recent event', () => {
        const state = buildRecordingSlotState({
            recording: null,
            item: null,
            index: 1,
            soundEnabled: true,
            songMap: new Map(),
        });

        expect(state.title).toBe('Recording');
        expect(state.sub).toBe('No recent play');
        expect(state.playAvailable).toBe(false);
        expect(state.playDisabled).toBe(true);
        expect(state.saveDisabled).toBe(true);
        expect(state.recordingIndex).toBe('1');
    });

    it('builds recent-play fallback state from song event when saved clip is unavailable', () => {
        const state = buildRecordingSlotState({
            recording: null,
            item: { id: 'twinkle', accuracy: 87.4 },
            index: 0,
            soundEnabled: true,
            songMap: new Map([['twinkle', 'Twinkle Twinkle']]),
        });

        expect(state.title).toBe('Recent Play');
        expect(state.sub).toBe('Twinkle Twinkle · 87%');
        expect(state.playAvailable).toBe(false);
        expect(state.playDisabled).toBe(true);
        expect(state.saveDisabled).toBe(true);
    });

    it('applies slot state to DOM and clears recordingAvailable when unavailable', () => {
        const elements = createSlotElements();
        elements.playButton.dataset.recordingAvailable = 'true';

        applyRecordingSlotState(elements, {
            title: 'Recent Play',
            sub: 'Song · 90%',
            playDisabled: true,
            playAvailable: false,
            saveDisabled: true,
            recordingIndex: '1',
        });

        expect(elements.titleEl.textContent).toBe('Recent Play');
        expect(elements.subEl.textContent).toBe('Song · 90%');
        expect(elements.playButton.disabled).toBe(true);
        expect(elements.playButton.dataset.recordingAvailable).toBeUndefined();
        expect(elements.playButton.dataset.recordingIndex).toBe('1');
        expect(elements.saveButton.disabled).toBe(true);
        expect(elements.saveButton.dataset.recordingIndex).toBe('1');
    });
});
