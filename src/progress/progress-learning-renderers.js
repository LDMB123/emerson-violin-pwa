import { clampRounded, positiveRound } from '../utils/math.js';
import { renderNextActionsList } from '../utils/render-utils.js';
import { tierFromScore } from '../songs/song-assessment.js';

const renderChipGrid = (container, chips, emptyText) => {
    if (!container) return;
    container.replaceChildren();
    if (!Array.isArray(chips) || !chips.length) {
        const empty = document.createElement('p');
        empty.textContent = emptyText;
        container.appendChild(empty);
        return;
    }

    chips.forEach((chip) => {
        const row = document.createElement('div');
        row.className = 'learning-chip';
        if (chip.state) row.dataset.state = chip.state;
        if (chip.tier) row.dataset.tier = chip.tier;

        const label = document.createElement('span');
        label.textContent = chip.label;
        const value = document.createElement('span');
        value.textContent = chip.value;

        row.append(label, value);
        container.appendChild(row);
    });
};

const renderMirroredChipGrid = (primary, secondary, chips, emptyText) => {
    renderChipGrid(primary, chips, emptyText);
    renderChipGrid(secondary, chips, emptyText);
};

const songTier = (score) => {
    const safe = clampRounded(score || 0, 0, 100);
    return tierFromScore(safe);
};



/** Renders the curriculum unit progression map into progress and parent surfaces. */
export const renderCurriculumMap = ({ curriculumContent, curriculumState, recommendations, progressEl, parentEl }) => {
    const units = Array.isArray(curriculumContent?.units) ? curriculumContent.units : [];
    const completed = new Set(Array.isArray(curriculumState?.completedUnitIds) ? curriculumState.completedUnitIds : []);
    const currentId = curriculumState?.currentUnitId || recommendations?.mission?.unitId || null;

    const chips = units.map((unit, index) => {
        const isComplete = completed.has(unit.id);
        const isCurrent = !isComplete && unit.id === currentId;
        return {
            label: `${index + 1}. ${unit.title}`,
            value: isComplete ? 'Complete' : isCurrent ? 'Current' : 'Queued',
            state: isComplete ? 'complete' : isCurrent ? 'current' : 'queued',
        };
    });

    renderMirroredChipGrid(
        progressEl,
        parentEl,
        chips,
        'Curriculum map will appear after your first mission.',
    );
};

/** Renders top song mastery chips into progress and parent surfaces. */
export const renderSongHeatmap = ({ songProgressState, songCatalog, progressEl, parentEl }) => {
    const entries = Object.entries(songProgressState?.songs || {})
        .map(([id, entry]) => ({ id, ...(entry || {}) }))
        .sort((left, right) => (right.bestAccuracy || 0) - (left.bestAccuracy || 0))
        .slice(0, 12);

    const byId = songCatalog?.byId || {};
    const chips = entries.map((entry) => ({
        label: byId?.[entry.id]?.title || entry.id,
        value: `${Math.round(entry.bestAccuracy || 0)}% · ${Math.round(entry.attempts || 0)} runs`,
        tier: songTier(entry.bestAccuracy || 0),
    }));

    renderMirroredChipGrid(
        progressEl,
        parentEl,
        chips,
        'No song mastery data yet.',
    );
};

/** Renders game mastery chips for every configured game into both surfaces. */
export const renderGameMasteryMatrix = ({
    gameMasteryState,
    gameMeta,
    gameLabels,
    progressEl,
    parentEl,
}) => {
    const chips = Object.keys(gameMeta || {})
        .map((id) => {
            const entry = gameMasteryState?.games?.[id] || null;
            const tier = entry?.tier || 'foundation';
            const attempts = positiveRound(entry?.attempts || 0);
            return {
                label: gameLabels[id] || id,
                value: `${tier} · ${attempts} runs`,
                tier,
            };
        });

    renderMirroredChipGrid(
        progressEl,
        parentEl,
        chips,
        'No game mastery data yet.',
    );
};

/** Renders the current next-action recommendation list into both surfaces. */
export const renderNextActions = ({ recommendations, progressEl, parentEl }) => {
    const actions = Array.isArray(recommendations?.nextActions) ? recommendations.nextActions : [];
    renderNextActionsList(progressEl, actions);
    renderNextActionsList(parentEl, actions);
};
