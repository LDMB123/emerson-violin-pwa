import { getLearningRecommendations } from '../ml/recommendations.js';

const input = document.querySelector('[data-song-search]');
const cards = Array.from(document.querySelectorAll('.song-card[data-song]'));
const filterInputs = Array.from(document.querySelectorAll('input[name="song-filter"]'));
const emptyState = document.querySelector('[data-songs-empty]');

if (input && cards.length) {
    const normalize = (value) => value.toLowerCase().trim();

    const getFilter = () => filterInputs.find((option) => option.checked)?.value ?? '';

    const updateEmptyState = (visibleCount, query, filter) => {
        if (!emptyState) return;
        if (visibleCount > 0) {
            emptyState.hidden = true;
            return;
        }
        const filterLabel = filter ? `${filter[0].toUpperCase()}${filter.slice(1)}` : 'All';
        emptyState.textContent = query
            ? `No ${filterLabel.toLowerCase()} songs match "${query}". Try another title or switch levels.`
            : `No ${filterLabel.toLowerCase()} songs available yet.`;
        emptyState.hidden = false;
    };

    const applyFilter = () => {
        const query = normalize(input.value || '');
        const filter = getFilter();
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
    }).catch(() => {});
}
