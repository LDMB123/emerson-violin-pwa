import { getLearningRecommendations } from '../ml/recommendations.js';
import { loadEvents } from '../persistence/loaders.js';
import { SONG_RECORDED } from '../utils/event-names.js';
import { getSongCatalog } from './song-library.js';
import { buildSongUnlockMap, loadSongProgressState } from './song-progression.js';

const levelLabel = {
    easy: 'Easy',
    practice: 'Practice',
    challenge: 'Challenge',
};

const recommendationLevelMap = {
    beginner: 'easy',
    intermediate: 'practice',
    advanced: 'challenge',
};

const CHALLENGE_UNLOCK_THRESHOLD = 75;
const CHALLENGE_UNLOCK_REQUIRED = 3;
let globalSongLockBound = false;

const normalize = (value) => value.toLowerCase().trim();

const getFilterValue = (filterInputs) =>
    filterInputs.find((option) => option.checked)?.value ?? '';

const updateEmptyState = (emptyState, visibleCount, query, filter) => {
    if (!emptyState) return;
    if (visibleCount > 0) {
        emptyState.hidden = true;
        return;
    }
    const filterLabel = filter ? (levelLabel[filter] || 'All') : 'All';
    emptyState.textContent = query
        ? `No ${filterLabel.toLowerCase()} songs match "${query}".`
        : `No ${filterLabel.toLowerCase()} songs available yet.`;
    emptyState.hidden = false;
};

const applyRecommendedBadges = async (cards) => {
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

const refreshSongCards = async (cards, continueCard, continueTitle) => {
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

const initSongSearch = () => {
    const input = document.querySelector('[data-song-search]');
    const cards = Array.from(document.querySelectorAll('.song-card[data-song]'));
    if (!input || !cards.length) return;
    if (input.dataset.songSearchBound === 'true') {
        return;
    }
    input.dataset.songSearchBound = 'true';

    const filterInputs = Array.from(document.querySelectorAll('input[name="song-filter"]'));
    const emptyState = document.querySelector('[data-songs-empty]');
    const continueCard = document.querySelector('[data-continue-last-song]');
    const continueTitle = document.querySelector('[data-continue-last-song-title]');

    const applyFilter = () => {
        const query = normalize(input.value || '');
        const filter = getFilterValue(filterInputs);
        let visible = 0;
        cards.forEach((card) => {
            const title = card.querySelector('.song-title')?.textContent ?? '';
            const matchesQuery = !query || normalize(title).includes(query);
            const matchesLevel = !filter || card.dataset.level === filter;
            const shouldShow = matchesQuery && matchesLevel;
            card.classList.toggle('is-hidden', !shouldShow);
            card.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
            if (shouldShow) {
                card.removeAttribute('tabindex');
            } else {
                card.setAttribute('tabindex', '-1');
            }
            if (shouldShow) visible += 1;
        });
        updateEmptyState(emptyState, visible, query, filter);
    };

    let rafId = 0;
    const scheduleFilter = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            rafId = 0;
            applyFilter();
        });
    };

    input.addEventListener('input', scheduleFilter);
    input.addEventListener('search', applyFilter);
    filterInputs.forEach((option) => option.addEventListener('change', applyFilter));
    cards.forEach((card) => {
        if (card.dataset.songLockBound === 'true') return;
        card.dataset.songLockBound = 'true';
        card.addEventListener('click', (event) => {
            if (card.dataset.songLocked !== 'true') return;
            event.preventDefault();
            event.stopPropagation();
        });
    });

    applyFilter();
    applyRecommendedBadges(cards);
    refreshSongCards(cards, continueCard, continueTitle);

    if (!globalSongLockBound) {
        globalSongLockBound = true;
        document.addEventListener(SONG_RECORDED, () => {
            const liveCards = Array.from(document.querySelectorAll('.song-card[data-song]'));
            if (!liveCards.length) return;
            const liveContinueCard = document.querySelector('[data-continue-last-song]');
            const liveContinueTitle = document.querySelector('[data-continue-last-song-title]');
            refreshSongCards(liveCards, liveContinueCard, liveContinueTitle);
        });
    }
};

export const init = initSongSearch;
