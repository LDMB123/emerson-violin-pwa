const PRACTICE_VIEW_PREFIXES = [
    '#view-home',
    '#view-coach',
    '#view-games',
    '#view-songs',
    '#view-tuner',
    '#view-progress',
    '#view-analysis',
    '#view-game-',
    '#view-song-',
];

export const createRealtimeSessionState = () => ({
    sessionId: '',
    active: false,
    paused: false,
    listening: false,
    starting: false,
    startedAt: 0,
    stoppedAt: 0,
    sourceView: 'view-coach',
    cueState: 'listening',
    confidenceBand: 'low',
    lastFeature: null,
    lastCue: null,
    fallbackMode: null,
    quality: {
        latencies: [],
        sampleCount: 0,
        cues: 0,
        corrections: 0,
        falseCorrections: 0,
        fallbackCount: 0,
    },
    policyCache: null,
    calibration: {
        pitchBiasCents: 0,
        rhythmBiasMs: 0,
        samples: 0,
    },
});

export const isPracticeHash = (hash) => PRACTICE_VIEW_PREFIXES.some((prefix) => hash.startsWith(prefix));

export const createRealtimeSessionId = () => `rt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
