const challengeReadinessCount = (songProgressState) => {
    const songs = songProgressState?.songs && typeof songProgressState.songs === 'object'
        ? songProgressState.songs
        : {};
    return Object.values(songs).filter((entry) => (
        entry?.tier === 'bronze'
        || entry?.tier === 'silver'
        || entry?.tier === 'gold'
        || (entry?.bestAccuracy || 0) >= 75
    )).length;
};

const hasMetChallengePrerequisites = (song, curriculumState) => {
    const completedUnitIds = Array.isArray(curriculumState?.completedUnitIds) ? curriculumState.completedUnitIds : [];
    const prerequisites = Array.isArray(song?.prerequisites) ? song.prerequisites : [];
    return prerequisites.every((id) => completedUnitIds.includes(id));
};

const isSongUnlockedForState = (song, {
    curriculumState = null,
    songProgressState = null,
} = {}) => {
    if (!song || !song.id) return false;
    if (song.tier !== 'challenge') return true;
    if (!hasMetChallengePrerequisites(song, curriculumState)) return false;
    return challengeReadinessCount(songProgressState) >= 3;
};

export const buildUnlockMapForCatalog = (catalog, {
    curriculumState = null,
    songProgressState = null,
} = {}) => {
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
