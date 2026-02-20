import { SONG_RECORDED } from '../utils/event-names.js';
import { bindSongSearchFilter } from './song-search-filter.js';
import {
    applyRecommendedBadges,
    bindSongCardLockGuards,
    refreshSongCards,
} from './song-search-refresh.js';

let globalSongLockBound = false;

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

    bindSongSearchFilter({ input, cards, filterInputs, emptyState });
    bindSongCardLockGuards(cards);
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
