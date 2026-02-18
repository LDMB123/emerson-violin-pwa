const root = document.documentElement;
const media = window.matchMedia ? window.matchMedia('(prefers-reduced-data: reduce)') : null;

const setRootFlag = (enabled) => {
    if (!root) return;
    if (enabled) {
        root.dataset.saveData = 'on';
    } else {
        delete root.dataset.saveData;
    }
};

const updateAudioPreload = (saveData) => {
    const audios = document.querySelectorAll('audio[preload]');
    audios.forEach((audio) => {
        if (!audio.dataset.preloadDefault) {
            audio.dataset.preloadDefault = audio.getAttribute('preload') || 'auto';
        }
        audio.setAttribute('preload', saveData ? 'none' : audio.dataset.preloadDefault);
    });
};

const evaluate = () => {
    const saveData = Boolean(media?.matches);
    setRootFlag(saveData);
    updateAudioPreload(saveData);
};

evaluate();

media?.addEventListener('change', evaluate);
