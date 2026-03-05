export const isSoundEnabled = () => document.documentElement.dataset.sounds !== 'off';

export const isSoundDisabledEvent = (event) => event?.detail?.enabled === false;

export const runIfSoundDisabled = (event, onDisabled) => {
    if (!isSoundDisabledEvent(event)) return false;
    if (typeof onDisabled === 'function') {
        onDisabled(event);
    }
    return true;
};

export const playSourceWhenSoundEnabled = async ({
    controller,
    source,
    beforePlay = null,
} = {}) => {
    if (!source || typeof controller?.playSource !== 'function') return false;
    if (typeof beforePlay === 'function') {
        beforePlay();
    }
    if (!isSoundEnabled()) return false;
    await controller.playSource(source);
    return true;
};

export const resolveSoundEnabledValue = (resolver) => {
    if (!isSoundEnabled() || typeof resolver !== 'function') return null;
    return resolver() || null;
};
