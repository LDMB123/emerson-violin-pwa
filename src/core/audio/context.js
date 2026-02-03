const getLatencyHint = () => (document.documentElement?.dataset?.perfMode === 'high' ? 'interactive' : 'balanced');

export const createAudioContext = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    try {
        return new AudioCtx({ latencyHint: getLatencyHint() });
    } catch {
        return new AudioCtx();
    }
};
