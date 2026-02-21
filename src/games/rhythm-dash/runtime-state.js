export const createRhythmDashRuntimeState = ({ targetBpm, beatInterval }) => ({
    combo: 0,
    score: 0,
    lastTap: 0,
    wasRunning: false,
    tapCount: 0,
    runStartedAt: 0,
    mistakes: 0,
    tapHistory: [],
    realtimeTempoHistory: [],
    targetBpm,
    reported: false,
    timingScores: [],
    beatInterval,
    paused: false,
    pausedByVisibility: false,
    realtimeListening: false,
    level: 1,
    energy: 100,
});

export const applyRhythmDashBeatRuntimeState = (runtime, nextState) => {
    runtime.combo = nextState.combo;
    runtime.score = nextState.score;
    runtime.tapCount = nextState.tapCount;
    runtime.mistakes = nextState.mistakes;
    runtime.timingScores = nextState.timingScores;
    if (nextState.energy !== undefined) runtime.energy = nextState.energy;
    if (nextState.level !== undefined) {
        runtime.level = nextState.level;
        runtime.targetBpm = nextState.targetBpm;
        runtime.beatInterval = nextState.beatInterval;
    }
};

export const resetRhythmDashIdleState = (runtime) => {
    runtime.lastTap = 0;
    runtime.tapHistory.length = 0;
    runtime.realtimeTempoHistory.length = 0;
    runtime.timingScores = [];
    runtime.tapCount = 0;
    runtime.runStartedAt = 0;
};

export const resetRhythmDashRunState = (runtime) => {
    runtime.combo = 0;
    runtime.score = 0;
    runtime.lastTap = 0;
    runtime.tapCount = 0;
    runtime.mistakes = 0;
    runtime.runStartedAt = 0;
    runtime.tapHistory.length = 0;
    runtime.realtimeTempoHistory.length = 0;
    runtime.timingScores = [];
    runtime.reported = false;
    runtime.paused = false;
    runtime.pausedByVisibility = false;
    runtime.level = 1;
    runtime.energy = 100;
    return { score: runtime.score, combo: runtime.combo };
};
