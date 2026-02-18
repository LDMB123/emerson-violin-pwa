import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAudioController } from '../src/utils/audio-utils.js';

// Mock HTMLAudioElement
class MockAudio {
    constructor() {
        this.preload = '';
        this.paused = true;
        this.currentTime = 0;
        this.pause = vi.fn(() => { this.paused = true; });
    }
}

beforeEach(() => {
    global.Audio = MockAudio;
    global.URL = { revokeObjectURL: vi.fn() };
});

describe('createAudioController', () => {
    it('returns an object with audio, stop, and setUrl', () => {
        const controller = createAudioController();
        expect(controller).toHaveProperty('audio');
        expect(controller).toHaveProperty('stop');
        expect(controller).toHaveProperty('setUrl');
        expect(typeof controller.stop).toBe('function');
        expect(typeof controller.setUrl).toBe('function');
    });

    it('sets preload to "none" on the audio element', () => {
        const { audio } = createAudioController();
        expect(audio.preload).toBe('none');
    });

    describe('stop()', () => {
        it('does not call pause when audio is already paused', () => {
            const { audio, stop } = createAudioController();
            audio.paused = true;
            stop();
            expect(audio.pause).not.toHaveBeenCalled();
        });

        it('pauses and resets currentTime when audio is playing', () => {
            const { audio, stop } = createAudioController();
            audio.paused = false;
            audio.currentTime = 5;
            stop();
            expect(audio.pause).toHaveBeenCalledOnce();
            expect(audio.currentTime).toBe(0);
        });

        it('revokes the URL when one is set', () => {
            const { stop, setUrl } = createAudioController();
            setUrl('blob:http://localhost/abc');
            stop();
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/abc');
        });

        it('does not call revokeObjectURL when no URL is set', () => {
            const { stop } = createAudioController();
            stop();
            expect(URL.revokeObjectURL).not.toHaveBeenCalled();
        });

        it('clears the URL after revoking', () => {
            const { stop, setUrl } = createAudioController();
            setUrl('blob:http://localhost/abc');
            stop();
            vi.clearAllMocks();
            // Second stop should not revoke again
            stop();
            expect(URL.revokeObjectURL).not.toHaveBeenCalled();
        });
    });

    describe('setUrl()', () => {
        it('stores the URL so stop() can revoke it', () => {
            const { stop, setUrl } = createAudioController();
            setUrl('blob:http://localhost/xyz');
            stop();
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/xyz');
        });

        it('revokes a previous blob URL when overwriting it', () => {
            const { stop, setUrl } = createAudioController();
            setUrl('blob:http://localhost/first');
            setUrl('blob:http://localhost/second');

            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/first');
            vi.clearAllMocks();
            stop();
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/second');
        });

        it('does not call revokeObjectURL for non-blob URLs', () => {
            const { stop, setUrl } = createAudioController();
            setUrl('https://example.com/audio.mp3');
            stop();
            expect(URL.revokeObjectURL).not.toHaveBeenCalled();
        });
    });
});
