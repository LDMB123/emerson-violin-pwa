import { clampRounded } from '../utils/math.js';
import { ensureChildDiv } from '../utils/dom-utils.js';
import { getSongEventScore } from './song-event-score.js';

const computeBestBySong = (events) => {
    return events.reduce((acc, event) => {
        if (event?.type !== 'song' || !event?.id) return acc;
        const score = getSongEventScore(event, { includeLegacyScore: true });
        if (!acc[event.id] || score > acc[event.id]) {
            acc[event.id] = score;
        }
        return acc;
    }, {});
};

/**
 * Updates the best-accuracy display for recorded song events.
 */
export const updateBestAccuracyUI = (events) => {
    const bestBySong = computeBestBySong(events);
    Object.entries(bestBySong).forEach(([songId, best]) => {
        const rounded = clampRounded(best, 0, 100);
        const card = document.querySelector(`.song-card[data-song="${songId}"]`);
        if (card) {
            const bestEl = ensureChildDiv(card, 'song-best');
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
