import { shouldShowGameCard } from './game-sort-model.js';

const ensureFavoriteButton = (card) => {
    let button = card.querySelector('[data-game-favorite]');
    if (button) return button;
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'game-favorite-btn';
    button.dataset.gameFavorite = 'true';
    card.appendChild(button);
    return button;
};

const syncFavoriteButton = (card, favoriteIds) => {
    const id = card.dataset.gameId;
    if (!id) return;
    const button = ensureFavoriteButton(card);
    const active = favoriteIds.has(id);
    const title = card.querySelector('.game-title')?.textContent?.trim() || 'game';
    button.textContent = active ? '★' : '☆';
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.setAttribute('aria-label', `${active ? 'Remove' : 'Add'} ${title} ${active ? 'from' : 'to'} favorites`);
    card.classList.toggle('is-favorite', active);
};

const updateGameSortEmptyState = (emptyState, selected, visibleCount, favoriteCount) => {
    if (!emptyState) return;
    if (visibleCount > 0) {
        emptyState.hidden = true;
        return;
    }
    const messageByFilter = {
        quick: 'No quick picks available yet.',
        favorites: favoriteCount
            ? 'No favorite games match this view yet.'
            : 'No favorites yet. Tap ☆ on any game to save it.',
        new: 'No new games left right now. Great progress!',
    };
    emptyState.textContent = messageByFilter[selected] || 'No games available yet.';
    emptyState.hidden = false;
};

export const applyGameSort = (context) => {
    const selected = context.sortControls.find((control) => control.checked)?.value || 'quick';
    let visibleCount = 0;
    context.cards.forEach((card) => {
        const visible = shouldShowGameCard({
            selected,
            id: card.dataset.gameId || '',
            sortTagsById: context.sortTagsById,
            favoriteIds: context.favoriteIds,
            newIds: context.newIds,
            quickIds: context.quickIds,
        });
        card.classList.toggle('is-hidden', !visible);
        card.setAttribute('aria-hidden', visible ? 'false' : 'true');
        if (visible) {
            card.removeAttribute('tabindex');
            visibleCount += 1;
        } else {
            card.setAttribute('tabindex', '-1');
        }
    });
    updateGameSortEmptyState(context.emptyState, selected, visibleCount, context.favoriteIds.size);
};

export const bindGameSortFavorites = (context, syncGameSortFavorites) => {
    context.cards.forEach((card) => {
        const button = ensureFavoriteButton(card);
        syncFavoriteButton(card, context.favoriteIds);
        if (button.dataset.gameFavoriteBound === 'true') return;
        button.dataset.gameFavoriteBound = 'true';
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const id = card.dataset.gameId;
            if (!id) return;
            if (context.favoriteIds.has(id)) {
                context.favoriteIds.delete(id);
            } else {
                context.favoriteIds.add(id);
            }
            syncGameSortFavorites(context);
            syncFavoriteButton(card, context.favoriteIds);
            applyGameSort(context);
        });
    });
};

export const bindGameSortControls = (context) => {
    context.sortControls.forEach((control) => {
        if (control.dataset.bound === 'true') return;
        control.dataset.bound = 'true';
        control.addEventListener('change', () => applyGameSort(context));
    });
};
