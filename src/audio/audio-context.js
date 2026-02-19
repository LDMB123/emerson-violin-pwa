const resolveAudioContextCtor = () => {
    if (typeof window !== 'undefined') {
        const ctor = window.AudioContext || window.webkitAudioContext;
        if (typeof ctor === 'function') return ctor;
    }
    const fallback = globalThis.AudioContext || globalThis.webkitAudioContext;
    return typeof fallback === 'function' ? fallback : null;
};

export const hasAudioContextSupport = () => Boolean(resolveAudioContextCtor());

export const createAudioContext = (options = undefined) => {
    const Ctor = resolveAudioContextCtor();
    if (!Ctor) return null;

    if (options !== undefined) {
        try {
            return new Ctor(options);
        } catch {
            // Some prefixed implementations reject options; fallback below.
        }
    }

    try {
        return new Ctor();
    } catch {
        return null;
    }
};
