import { beforeEach, describe, expect, it, vi } from 'vitest';

const buildAudioCard = () => {
    document.body.innerHTML = `
        <main id="main-content">
            <div class="audio-card">
                <span class="audio-label">A4</span>
                <audio controls preload="none" src="/assets/audio/violin-a4.wav"></audio>
            </div>
        </main>
    `;
    const card = document.querySelector('.audio-card');
    const audio = card.querySelector('audio');
    let paused = true;

    Object.defineProperty(audio, 'paused', {
        configurable: true,
        get: () => paused,
    });

    audio.play = vi.fn(() => {
        paused = false;
        audio.dispatchEvent(new Event('play'));
        return Promise.resolve();
    });
    audio.pause = vi.fn(() => {
        paused = true;
        audio.dispatchEvent(new Event('pause'));
    });
    audio.currentTime = 0;

    return { card, audio };
};

describe('audio-player enhancement', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('disables play controls when sounds are off', async () => {
        document.documentElement.dataset.sounds = 'off';
        const { audio } = buildAudioCard();

        await import('../src/audio/audio-player.js');

        const button = document.querySelector('.tone-play-btn');
        expect(button).toBeTruthy();
        expect(button.disabled).toBe(true);

        button.click();
        expect(audio.play).not.toHaveBeenCalled();
    });

    it('stops active playback when sounds are turned off', async () => {
        document.documentElement.dataset.sounds = 'on';
        const { card, audio } = buildAudioCard();

        await import('../src/audio/audio-player.js');

        const button = document.querySelector('.tone-play-btn');
        button.click();
        expect(audio.play).toHaveBeenCalledTimes(1);
        expect(card.classList.contains('is-playing')).toBe(true);

        document.dispatchEvent(new CustomEvent('panda:sounds-change', { detail: { enabled: false } }));

        expect(audio.pause).toHaveBeenCalled();
        expect(button.disabled).toBe(true);
        expect(card.classList.contains('is-playing')).toBe(false);
    });
});
