import { describe, expect, it, vi } from 'vitest';
import {
    getAudioPath,
    getAudioPathCandidates,
    isAudioAssetPath,
    prepareAudioElementSource,
} from '../src/audio/format-detection.js';

const extractExt = (path) => path.split('?')[0].split('#')[0].split('.').pop();

describe('audio format detection', () => {
    it('builds candidate paths and keeps query/hash suffixes', () => {
        const input = './assets/audio/violin-a4.wav?cache=1#frag';
        const candidates = getAudioPathCandidates(input);

        expect(candidates.length).toBe(3);
        expect(candidates[0]).toBe(getAudioPath(input));
        expect(candidates[0]).toContain('?cache=1#frag');
        expect(new Set(candidates.map(extractExt))).toEqual(new Set(['mp3', 'opus', 'wav']));
    });

    it('identifies audio asset paths', () => {
        expect(isAudioAssetPath('./assets/audio/violin-a4.wav')).toBe(true);
        expect(isAudioAssetPath('/assets/audio/violin-a4.mp3')).toBe(true);
        expect(isAudioAssetPath('/assets/icons/icon-192.png')).toBe(false);
    });

    it('rewrites audio source and falls back through candidates on error', () => {
        const audio = document.createElement('audio');
        audio.setAttribute('src', './assets/audio/violin-a4.wav');
        audio.load = vi.fn();

        prepareAudioElementSource(audio);
        const candidates = (audio.dataset.audioCandidates || '').split('|').filter(Boolean);

        expect(candidates.length).toBe(3);
        expect(audio.getAttribute('src')).toBe(candidates[0]);

        audio.dispatchEvent(new Event('error'));
        expect(audio.getAttribute('src')).toBe(candidates[1]);

        audio.dispatchEvent(new Event('error'));
        expect(audio.getAttribute('src')).toBe(candidates[2]);

        audio.dispatchEvent(new Event('error'));
        expect(audio.getAttribute('src')).toBe(candidates[2]);
    });
});
