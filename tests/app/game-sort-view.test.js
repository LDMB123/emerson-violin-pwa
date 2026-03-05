import { describe, expect, it, vi } from 'vitest';
import {
    applyGameSort,
    bindGameSortControls,
    bindGameSortFavorites,
} from '../../src/app/game-sort-view.js';

describe('app/game-sort-view', () => {
    const buildContext = ({ selected = 'quick', favoriteIds = new Set(), newIds = new Set(), quickIds = new Set() } = {}) => {
        document.body.innerHTML = `
            <fieldset>
                <input type="radio" name="game-sort" value="quick" ${selected === 'quick' ? 'checked' : ''} />
                <input type="radio" name="game-sort" value="favorites" ${selected === 'favorites' ? 'checked' : ''} />
            </fieldset>
            <p data-games-empty hidden></p>
            <article class="game-card" data-game-id="bow-hero"><h3 class="game-title">Bow Hero</h3></article>
            <article class="game-card" data-game-id="ear-trainer"><h3 class="game-title">Ear Trainer</h3></article>
        `;

        const cards = Array.from(document.querySelectorAll('.game-card'));
        return {
            sortControls: Array.from(document.querySelectorAll('input[name="game-sort"]')),
            cards,
            emptyState: document.querySelector('[data-games-empty]'),
            sortTagsById: new Map([
                ['bow-hero', ['quick']],
                ['ear-trainer', ['new']],
            ]),
            favoriteIds,
            newIds,
            quickIds,
            cardById: new Map(cards.map((card) => [card.dataset.gameId, card])),
            fallbackQuickIds: ['bow-hero'],
            fallbackNewIds: ['ear-trainer'],
        };
    };

    it('applies visibility and empty-state messaging for selected sort', () => {
        const context = buildContext({
            selected: 'favorites',
            favoriteIds: new Set(),
        });

        applyGameSort(context);

        const [bowHero, earTrainer] = context.cards;
        expect(bowHero.classList.contains('is-hidden')).toBe(true);
        expect(earTrainer.classList.contains('is-hidden')).toBe(true);
        expect(context.emptyState.hidden).toBe(false);
        expect(context.emptyState.textContent).toContain('No favorites yet');
    });

    it('binds favorite buttons and toggles favorite state on click', () => {
        const context = buildContext({
            selected: 'favorites',
            favoriteIds: new Set(),
        });
        const syncGameSortFavorites = vi.fn();

        bindGameSortFavorites(context, syncGameSortFavorites);
        const bowHero = context.cards[0];
        const favoriteButton = bowHero.querySelector('[data-game-favorite]');
        expect(favoriteButton).not.toBeNull();

        favoriteButton.click();

        expect(context.favoriteIds.has('bow-hero')).toBe(true);
        expect(syncGameSortFavorites).toHaveBeenCalledTimes(1);
        expect(favoriteButton.textContent).toBe('★');
        expect(bowHero.classList.contains('is-favorite')).toBe(true);
        expect(bowHero.classList.contains('is-hidden')).toBe(false);
    });

    it('binds sort controls and reapplies sorting on change', () => {
        const context = buildContext({
            selected: 'quick',
            quickIds: new Set(['bow-hero']),
        });

        bindGameSortControls(context);
        const favoritesControl = context.sortControls.find((el) => el.value === 'favorites');
        favoritesControl.checked = true;
        favoritesControl.dispatchEvent(new Event('change', { bubbles: true }));

        expect(context.cards[0].classList.contains('is-hidden')).toBe(true);
        expect(context.cards[1].classList.contains('is-hidden')).toBe(true);
    });
});
