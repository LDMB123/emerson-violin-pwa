const CHALLENGE_UNLOCK_THRESHOLD = 75;
export const CHALLENGE_UNLOCK_REQUIRED = 3;

const CHALLENGE_READY_TIERS = new Set(['bronze', 'silver', 'gold']);

export const isChallengeReadinessScore = (score) => {
    const numericScore = Number(score);
    return Number.isFinite(numericScore) && numericScore >= CHALLENGE_UNLOCK_THRESHOLD;
};

const challengeReadinessCount = (songProgressState) => {
    const songs = songProgressState?.songs && typeof songProgressState.songs === 'object'
        ? songProgressState.songs
        : {};
    return Object.values(songs).filter((entry) => (
        CHALLENGE_READY_TIERS.has(entry?.tier)
        || isChallengeReadinessScore(entry?.bestAccuracy)
    )).length;
};

const hasMetChallengePrerequisites = (song, curriculumState) => {
    const completedUnitIds = Array.isArray(curriculumState?.completedUnitIds) ? curriculumState.completedUnitIds : [];
    const prerequisites = Array.isArray(song?.prerequisites) ? song.prerequisites : [];
    return prerequisites.every((id) => completedUnitIds.includes(id));
};

const normalizeUnlockOptions = ({
    curriculumState = null,
    songProgressState = null,
} = {}) => ({ curriculumState, songProgressState });

const isSongUnlockedForState = (song, options = {}) => {
    const { curriculumState, songProgressState } = normalizeUnlockOptions(options);
    if (!song || !song.id) return false;
    if (song.tier !== 'challenge') return true;
    if (!hasMetChallengePrerequisites(song, curriculumState)) return false;
    return challengeReadinessCount(songProgressState) >= CHALLENGE_UNLOCK_REQUIRED;
};

export const buildUnlockMapForCatalog = (catalog, options = {}) => {
    const { curriculumState, songProgressState } = normalizeUnlockOptions(options);
    const songs = Array.isArray(catalog?.songs) ? catalog.songs : [];
    const unlockMap = {};

    // Sequential to keep logic deterministic and simple.
    for (const song of songs) {
        unlockMap[song.id] = isSongUnlockedForState(song, {
            curriculumState,
            songProgressState,
        });
    }
    return unlockMap;
};
