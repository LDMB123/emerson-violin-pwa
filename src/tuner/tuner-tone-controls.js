import { isSoundEnabled } from '../utils/sound-state.js';

const playToneSample = ({ tone, toneSamples, setStatus }) => {
    const sample = toneSamples.get(tone);
    if (!sample) return;

    if (!isSoundEnabled()) {
        setStatus('Sounds are off. Turn on Sounds to hear this tone.');
        return;
    }

    toneSamples.forEach((audio) => {
        if (!audio.paused) {
            audio.pause();
            audio.currentTime = 0;
        }
        audio.closest('.audio-card')?.classList.remove('is-playing');
    });

    const card = sample.closest('.audio-card');
    sample.currentTime = 0;
    sample.play().catch(() => {});
    card?.classList.add('is-playing');
    sample.onended = () => card?.classList.remove('is-playing');
};

export const bindToneButtons = ({ toneButtons, refToneButtons, toneSamples, setStatus }) => {
    toneButtons.forEach((button) => {
        if (button.dataset.tunerToneBound === 'true') return;
        button.dataset.tunerToneBound = 'true';
        button.addEventListener('click', () => {
            playToneSample({ tone: button.dataset.tone, toneSamples, setStatus });
        });
    });

    refToneButtons.forEach((button) => {
        if (button.dataset.tunerRefBound === 'true') return;
        button.dataset.tunerRefBound = 'true';
        button.addEventListener('click', () => {
            const tone = button.dataset.refTone;
            const card = button.closest('.audio-card');
            const sample = toneSamples.get(tone);

            if (sample && !sample.paused) {
                sample.pause();
                sample.currentTime = 0;
                card?.classList.remove('is-playing');
                return;
            }

            playToneSample({ tone, toneSamples, setStatus });
        });
    });
};
