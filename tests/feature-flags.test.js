import { describe, expect, it, afterEach } from 'vitest';
import { isVoiceCoachEnabled, isRecordingEnabled } from '../src/utils/feature-flags.js';

const resetDom = () => {
    delete document.documentElement.dataset.voiceCoach;
    delete document.documentElement.dataset.recordings;
    document.querySelectorAll('#setting-voice, #setting-recordings').forEach((node) => node.remove());
};

describe('feature-flags', () => {
    afterEach(() => {
        resetDom();
    });

    it('uses dataset value for voice coach toggle', () => {
        document.documentElement.dataset.voiceCoach = 'on';
        expect(isVoiceCoachEnabled()).toBe(true);
        document.documentElement.dataset.voiceCoach = 'off';
        expect(isVoiceCoachEnabled()).toBe(false);
    });

    it('falls back to voice checkbox when dataset is missing', () => {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = 'setting-voice';
        input.checked = true;
        document.body.appendChild(input);
        expect(isVoiceCoachEnabled()).toBe(true);
        input.checked = false;
        expect(isVoiceCoachEnabled()).toBe(false);
    });

    it('uses dataset value for recordings toggle', () => {
        document.documentElement.dataset.recordings = 'on';
        expect(isRecordingEnabled()).toBe(true);
        document.documentElement.dataset.recordings = 'off';
        expect(isRecordingEnabled()).toBe(false);
    });

    it('falls back to recordings checkbox when dataset is missing', () => {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = 'setting-recordings';
        input.checked = true;
        document.body.appendChild(input);
        expect(isRecordingEnabled()).toBe(true);
        input.checked = false;
        expect(isRecordingEnabled()).toBe(false);
    });
});
