import { getLearningRecommendations } from '../ml/recommendations.js';
import { loadEvents } from '../persistence/loaders.js';

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
        ? `No ${filterLabel.toLowerCase()} songs match \"${query}\".`
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

const applyContinueLastSong = async (cards, continueCard, continueTitle) => {
    if (!continueCard) return;
    try {
        const events = await loadEvents();
        const songEvents = Array.isArray(events)
            ? events.filter((event) => event?.type === 'song' && event?.id)
            : [];
        if (!songEvents.length) return;
        songEvents.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const last = songEvents[0];
        const card = cards.find((entry) => entry.dataset.song === last.id);
        if (!card) return;
        continueCard.setAttribute('href', `#view-song-${last.id}`);
        const title = card.querySelector('.song-title')?.textContent?.trim();
        if (continueTitle && title) {
            continueTitle.textContent = title;
        }
    } catch {
        // Ignore history lookup errors.
    }
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

    applyFilter();
    applyRecommendedBadges(cards);
    applyContinueLastSong(cards, continueCard, continueTitle);
};

export const init = initSongSearch;
