import { getLearningRecommendations } from '../ml/recommendations.js';
import { loadEvents } from '../persistence/loaders.js';
import { getSongCatalog } from './song-library.js';
import { buildSongUnlockMap, loadSongProgressState } from './song-progression.js';

const recommendationLevelMap = {
    beginner: 'easy',
    intermediate: 'practice',
    advanced: 'challenge',
};

const CHALLENGE_UNLOCK_THRESHOLD = 75;
const CHALLENGE_UNLOCK_REQUIRED = 3;

const getSongStatsFromEvents = (events) => {
    if (!Array.isArray(events)) return {};
    return events.reduce((statsBySong, event) => {
        if (event?.type !== 'song' || !event?.id) return statsBySong;
        const accuracy = Number.isFinite(event.accuracy)
            ? event.accuracy
            : Number.isFinite(event.timingAccuracy)
                ? event.timingAccuracy
                : 0;
        const existing = statsBySong[event.id] || { attempts: 0, best: 0, stars: 0 };
        existing.attempts += 1;
        existing.best = Math.max(existing.best, accuracy);
        existing.stars = Math.max(existing.stars, Number.isFinite(event.stars) ? event.stars : 0);
        statsBySong[event.id] = existing;
        return statsBySong;
    }, {});
};

const mergeSongStats = (eventsStats, progressState) => {
    const merged = { ...eventsStats };
    const songs = progressState?.songs || {};
    Object.entries(songs).forEach(([songId, entry]) => {
        const existing = merged[songId] || { attempts: 0, best: 0, stars: 0 };
        merged[songId] = {
            attempts: Math.max(existing.attempts, Number(entry?.attempts || 0)),
            best: Math.max(existing.best, Number(entry?.bestAccuracy || 0)),
            stars: Math.max(existing.stars, Number(entry?.bestStars || 0)),
            sectionCount: entry?.sectionProgress ? Object.keys(entry.sectionProgress).length : 0,
            checkpoint: entry?.checkpoint || null,
        };
    });
    return merged;
};

const ensureSongProgressMeta = (card) => {
    let meta = card.querySelector('.song-progress-meta');
    if (meta) return meta;
    meta = document.createElement('div');
    meta.className = 'song-progress-meta';
    card.appendChild(meta);
    return meta;
};

const ensureSectionMeta = (card) => {
    let section = card.querySelector('.song-section-meta');
    if (section) return section;
    section = document.createElement('div');
    section.className = 'song-section-meta';
    card.appendChild(section);
    return section;
};

const formatSongStats = (stats) => {
    if (!stats) return 'No runs yet.';
    const attempts = Math.max(0, stats.attempts || 0);
    const best = Math.max(0, Math.min(100, Math.round(stats.best || 0)));
    const runLabel = attempts === 1 ? 'run' : 'runs';
    return `${attempts} ${runLabel} · Best ${best}%`;
};

const applySongStats = (cards, events, progressState, catalogById) => {
    const statsBySong = mergeSongStats(getSongStatsFromEvents(events), progressState);
    cards.forEach((card) => {
        const songId = card.dataset.song;
        const stats = songId ? statsBySong[songId] : null;
        const meta = ensureSongProgressMeta(card);
        meta.textContent = formatSongStats(stats);
        card.classList.toggle('is-mastered', Boolean(stats && stats.best >= 90));

        const sections = catalogById[songId]?.sections || [];
        const sectionMeta = ensureSectionMeta(card);
        sectionMeta.textContent = sections.length > 1 ? `${sections.length} sections` : 'Full run';

        if (stats?.checkpoint) {
            card.classList.add('has-checkpoint');
        } else {
            card.classList.remove('has-checkpoint');
        }
    });
};

const ensureLockHint = (card) => {
    let hint = card.querySelector('.song-lock-hint');
    if (hint) return hint;
    hint = document.createElement('div');
    hint.className = 'song-lock-hint';
    card.appendChild(hint);
    return hint;
};

const setCardLocked = (card, { locked, hintText }) => {
    const hint = ensureLockHint(card);
    hint.textContent = hintText;
    card.classList.toggle('song-soft-lock', locked);
    card.classList.toggle('is-locked', locked);
    card.dataset.songLocked = locked ? 'true' : 'false';
    if (locked) {
        card.setAttribute('aria-disabled', 'true');
    } else {
        card.removeAttribute('aria-disabled');
    }
};

const fallbackUnlockCount = (cards, events = []) => {
    const practiceSongs = new Set(
        cards
            .filter((card) => card.dataset.level === 'practice' && card.dataset.song)
            .map((card) => card.dataset.song),
    );

    const bestBySong = Object.entries(getSongStatsFromEvents(events)).reduce((acc, [id, stats]) => {
        acc[id] = stats.best;
        return acc;
    }, {});

    let cleanPracticeCount = 0;
    practiceSongs.forEach((songId) => {
        if ((bestBySong[songId] || 0) >= CHALLENGE_UNLOCK_THRESHOLD) {
            cleanPracticeCount += 1;
        }
    });
    return cleanPracticeCount;
};

const applyChallengeLocks = async ({ cards, events, unlockMap }) => {
    const challengeCards = cards.filter((card) => card.dataset.level === 'challenge');
    if (!challengeCards.length) return;

    const cleanPracticeCount = fallbackUnlockCount(cards, events);
    const readinessHint = `${Math.min(cleanPracticeCount, CHALLENGE_UNLOCK_REQUIRED)}/${CHALLENGE_UNLOCK_REQUIRED} clean Practice songs complete.`;
    const lockedHint = `Locked: complete curriculum prerequisites. Readiness ${readinessHint}.`;

    challengeCards.forEach((card) => {
        const songId = card.dataset.song;
        const unlocked = unlockMap?.[songId] === true;

        if (unlocked) {
            setCardLocked(card, {
                locked: false,
                hintText: 'Unlocked: Challenge songs are now ready.',
            });
            return;
        }

        setCardLocked(card, {
            locked: true,
            hintText: lockedHint,
        });
    });
};

const applyContinueLastSong = async (cards, continueCard, continueTitle, events = [], progressState = null) => {
    if (!continueCard) return;

    const songEvents = Array.isArray(events)
        ? events.filter((event) => event?.type === 'song' && event?.id)
        : [];

    if (!songEvents.length && !progressState) return;

    songEvents.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const lastFromEvents = songEvents[0]?.id;
    const checkpointCandidates = Object.entries(progressState?.songs || {})
        .filter(([, entry]) => entry?.checkpoint)
        .sort((left, right) => (right[1]?.updatedAt || 0) - (left[1]?.updatedAt || 0));
    const lastWithCheckpoint = checkpointCandidates[0]?.[0] || null;
    const targetSongId = lastWithCheckpoint || lastFromEvents;

    if (!targetSongId) return;

    const card = cards.find((entry) => entry.dataset.song === targetSongId);
    if (!card) return;

    continueCard.setAttribute('href', `#view-song-${targetSongId}`);
    const title = card.querySelector('.song-title')?.textContent?.trim();
    if (continueTitle && title) {
        continueTitle.textContent = title;
    }
};

export const bindSongCardLockGuards = (cards) => {
    cards.forEach((card) => {
        if (card.dataset.songLockBound === 'true') return;
        card.dataset.songLockBound = 'true';
        card.addEventListener('click', (event) => {
            if (card.dataset.songLocked !== 'true') return;
            event.preventDefault();
            event.stopPropagation();
        });
    });
};

export const applyRecommendedBadges = async (cards) => {
    try {
        const recs = await getLearningRecommendations();
        if (!recs?.songLevel) return;
        const mappedLevel = recommendationLevelMap[recs.songLevel] || recs.songLevel;
        cards.forEach((card) => {
            const isRecommended = card.dataset.level === mappedLevel;
            card.classList.toggle('is-recommended', isRecommended);
            if (!isRecommended) return;
            let badge = card.querySelector('.song-recommendation');
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'song-recommendation';
                card.appendChild(badge);
            }
            badge.textContent = 'Recommended';
        });
    } catch {
        // Ignore recommendation failures for local filtering.
    }
};

export const refreshSongCards = async (cards, continueCard, continueTitle) => {
    const [events, catalog, progressionState] = await Promise.all([
        loadEvents().catch(() => []),
        getSongCatalog().catch(() => ({ songs: [], byId: {} })),
        loadSongProgressState().catch(() => ({ songs: {} })),
    ]);

    const unlock = await buildSongUnlockMap(catalog).catch(() => ({ unlockMap: {} }));
    applySongStats(cards, events, progressionState, catalog.byId || {});
    await applyChallengeLocks({ cards, events, unlockMap: unlock.unlockMap });
    await applyContinueLastSong(cards, continueCard, continueTitle, events, progressionState);
};
