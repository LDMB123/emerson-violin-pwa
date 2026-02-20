export const parseViewSongId = (viewId) => {
    if (typeof viewId !== 'string') return null;
    if (!viewId.startsWith('view-song-')) return null;
    return viewId.replace('view-song-', '');
};

export const createControls = ({ song, checkpoint }) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'song-advanced-controls glass';
    wrapper.dataset.songAdvancedControls = 'true';

    const options = (song?.sections || []).map((section) => (
        `<option value="${section.id}">${section.label}</option>`
    )).join('');

    wrapper.innerHTML = `
        <div class="song-advanced-row">
            <label>
                <span>Section</span>
                <select data-song-section>
                    ${options || '<option value="full">Full Song</option>'}
                </select>
            </label>
            <label>
                <span>Tempo</span>
                <input type="range" min="50" max="130" value="100" step="5" data-song-tempo-scale>
                <strong data-song-tempo-label>100%</strong>
            </label>
        </div>
        <div class="song-advanced-row">
            <label class="song-loop-toggle">
                <input type="checkbox" data-song-loop>
                <span>Loop section</span>
            </label>
            <button class="btn btn-secondary" type="button" data-song-save-checkpoint>Save checkpoint</button>
            <button class="btn btn-ghost" type="button" data-song-resume-checkpoint>Resume checkpoint</button>
        </div>
        <p class="song-advanced-status" data-song-advanced-status aria-live="polite">Sectional practice ready.</p>
    `;

    if (checkpoint?.sectionId) {
        const select = wrapper.querySelector('[data-song-section]');
        if (select) select.value = checkpoint.sectionId;
    }

    if (Number.isFinite(checkpoint?.tempo)) {
        const scaleInput = wrapper.querySelector('[data-song-tempo-scale]');
        const label = wrapper.querySelector('[data-song-tempo-label]');
        const baseTempo = Number(song?.bpm || 80);
        const ratio = Math.round((checkpoint.tempo / Math.max(baseTempo, 1)) * 100);
        const nextValue = Math.max(50, Math.min(130, ratio));
        if (scaleInput) scaleInput.value = String(nextValue);
        if (label) label.textContent = `${nextValue}%`;
    }

    return wrapper;
};

export const setStatus = (controls, message) => {
    const status = controls?.querySelector('[data-song-advanced-status]');
    if (status) status.textContent = message;
};

export const sectionDuration = (sections, sectionId) => {
    if (!Array.isArray(sections) || !sections.length) return 0;
    const section = sections.find((item) => item.id === sectionId) || sections[0];
    if (!section) return 0;
    return Math.max(0, (section.end || 0) - (section.start || 0));
};
