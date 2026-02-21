const levelLabel = {
    easy: 'Easy',
    practice: 'Practice',
    challenge: 'Challenge',
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
        ? `No ${filterLabel.toLowerCase()} songs match "${query}".`
        : `No ${filterLabel.toLowerCase()} songs available yet.`;
    emptyState.hidden = false;
};

export const bindSongSearchFilter = ({ input = null, cards, filterInputs, emptyState }) => {
    const applyFilter = () => {
        const query = normalize(input?.value || '');
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

    if (input) {
        input.addEventListener('input', scheduleFilter);
        input.addEventListener('search', applyFilter);
    }
    filterInputs.forEach((option) => option.addEventListener('change', applyFilter));

    applyFilter();
};
