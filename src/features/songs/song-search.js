import { getLearningRecommendations } from '@core/ml/recommendations.js';
import { ensureTemplateInstance } from '@core/utils/templates.js';

const input = document.querySelector('[data-song-search]');
const cards = Array.from(document.querySelectorAll('.song-card[data-song]'));
const filterInputs = Array.from(document.querySelectorAll('input[name="song-filter"]'));
const emptyState = document.querySelector('[data-songs-empty]');
const recommendationTemplate = '#song-recommendation-template';

if (input && cards.length) {
    const normalize = (value) => value.toLowerCase().trim();
    const cardMeta = cards.map((card) => ({
        card,
        title: normalize(card.querySelector('.song-title')?.textContent ?? ''),
        level: card.dataset.level || '',
    }));

    const getFilter = () => filterInputs.find((option) => option.checked)?.value ?? '';

    const updateEmptyState = (visibleCount, query, filter) => {
        if (!emptyState) return;
        const filterLabel = filter ? `${filter[0].toUpperCase()}${filter.slice(1)}` : 'All';
        emptyState.textContent = query
            ? `No ${filterLabel.toLowerCase()} songs match "${query}". Try another title or switch levels.`
            : `No ${filterLabel.toLowerCase()} songs available yet.`;
    };

    const applyFilter = () => {
        const query = normalize(input.value || '');
        const filter = getFilter();
        let visible = 0;
        cardMeta.forEach(({ card, title, level }) => {
            const matchesQuery = !query || title.includes(query);
            const matchesLevel = !filter || level === filter;
            card.toggleAttribute('data-filtered', !(matchesQuery && matchesLevel));
            if (matchesQuery && matchesLevel) visible += 1;
        });
        updateEmptyState(visible, query, filter);
    };

    let rafId = 0;
    const scheduleFilter = () => {
        if (rafId) {
            cancelAnimationFrame(rafId);
        }
        rafId = requestAnimationFrame(() => {
            rafId = 0;
            applyFilter();
        });
    };

    input.addEventListener('input', scheduleFilter);
    input.addEventListener('search', applyFilter);
    filterInputs.forEach((option) => option.addEventListener('change', applyFilter));
    applyFilter();

    getLearningRecommendations().then((recs) => {
        if (!recs?.songLevel) return;
        cards.forEach((card) => {
            const isRecommended = card.dataset.level === recs.songLevel;
            if (isRecommended) {
                card.dataset.recommended = 'true';
            } else {
                delete card.dataset.recommended;
            }
            if (!isRecommended) return;
            const badge = ensureTemplateInstance(card, {
                selector: '.song-recommendation',
                templateId: recommendationTemplate,
                className: 'song-recommendation',
            });
            if (badge && !badge.textContent) badge.textContent = 'Recommended';
        });
    }).catch(() => {});
}
