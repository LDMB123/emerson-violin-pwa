const input = document.querySelector('[data-song-search]');
const cards = Array.from(document.querySelectorAll('.song-card[data-song]'));

if (input && cards.length) {
    const normalize = (value) => value.toLowerCase().trim();

    const applyFilter = () => {
        const query = normalize(input.value || '');
        cards.forEach((card) => {
            if (!query) {
                card.classList.remove('is-hidden');
                return;
            }
            const title = card.querySelector('.song-title')?.textContent ?? '';
            const match = normalize(title).includes(query);
            card.classList.toggle('is-hidden', !match);
        });
    };

    input.addEventListener('input', applyFilter);
    input.addEventListener('search', applyFilter);
}
