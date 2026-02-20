export const renderChipGrid = (container, chips, emptyText) => {
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
    const safe = Math.max(0, Math.min(100, Math.round(score || 0)));
    if (safe >= 92) return 'gold';
    if (safe >= 80) return 'silver';
    if (safe >= 60) return 'bronze';
    return 'foundation';
};

const renderNextActionsList = (target, actions) => {
    if (!target) return;
    target.replaceChildren();
    if (!actions.length) {
        const fallback = document.createElement('li');
        fallback.textContent = 'Complete one mission step to get next teaching actions.';
        target.appendChild(fallback);
        return;
    }
    actions.slice(0, 3).forEach((action) => {
        const item = document.createElement('li');
        if (action?.href) {
            const link = document.createElement('a');
            link.href = action.href;
            link.textContent = action.label || 'Next step';
            item.appendChild(link);
        } else {
            item.textContent = action?.label || 'Next step';
        }
        if (action?.rationale) {
            item.append(` — ${action.rationale}`);
        }
        target.appendChild(item);
    });
};

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
            const attempts = Math.max(0, Math.round(entry?.attempts || 0));
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

export const renderNextActions = ({ recommendations, progressEl, parentEl }) => {
    const actions = Array.isArray(recommendations?.nextActions) ? recommendations.nextActions : [];
    renderNextActionsList(progressEl, actions);
    renderNextActionsList(parentEl, actions);
};
