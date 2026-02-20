import { clamp } from '../utils/math.js';

const computeBestBySong = (events) => {
    return events.reduce((acc, event) => {
        if (event?.type !== 'song' || !event?.id) return acc;
        const score = Number.isFinite(event.accuracy)
            ? event.accuracy
            : Number.isFinite(event.timingAccuracy)
                ? event.timingAccuracy
                : Number.isFinite(event.score)
                    ? event.score
                    : 0;
        if (!acc[event.id] || score > acc[event.id]) {
            acc[event.id] = score;
        }
        return acc;
    }, {});
};

export const updateBestAccuracyUI = (events) => {
    const bestBySong = computeBestBySong(events);
    Object.entries(bestBySong).forEach(([songId, best]) => {
        const rounded = clamp(Math.round(best), 0, 100);
        const card = document.querySelector(`.song-card[data-song="${songId}"]`);
        if (card) {
            let bestEl = card.querySelector('.song-best');
            if (!bestEl) {
                bestEl = document.createElement('div');
                bestEl.className = 'song-best';
                card.appendChild(bestEl);
            }
            bestEl.textContent = `Best ${rounded}%`;
        }

        const view = document.getElementById(`view-song-${songId}`);
        if (view) {
            const meta = view.querySelector('.song-meta');
            if (meta) {
                let block = meta.querySelector('.song-meta-best');
                if (!block) {
                    block = document.createElement('div');
                    block.className = 'song-meta-best';
                    const labelEl = document.createElement('span');
                    labelEl.className = 'song-meta-label';
                    labelEl.textContent = 'Best';
                    const valueEl = document.createElement('strong');
                    valueEl.className = 'song-meta-value';
                    block.appendChild(labelEl);
                    block.appendChild(valueEl);
                    meta.appendChild(block);
                }
                const valueEl = block.querySelector('.song-meta-value');
                if (valueEl) valueEl.textContent = `${rounded}%`;
            }
        }
    });
};
