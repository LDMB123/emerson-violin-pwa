const media = window.matchMedia('(prefers-reduced-data: reduce)');

const setRootFlag = (enabled) => {
    if (enabled) {
        document.documentElement.dataset.saveData = 'on';
    } else {
        delete document.documentElement.dataset.saveData;
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
    const saveData = media.matches;
    setRootFlag(saveData);
    updateAudioPreload(saveData);
};

evaluate();

media.addEventListener('change', evaluate);
