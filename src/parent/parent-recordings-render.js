export const createParentRecordingsRenderer = () => {
    let listEl = null;
    let statusEl = null;
    let clearButton = null;

    const resolveElements = () => {
        listEl = document.querySelector('[data-parent-recordings]');
        statusEl = document.querySelector('[data-parent-recordings-status]');
        clearButton = document.querySelector('[data-parent-clear-recordings]');
    };

    const hasList = () => Boolean(listEl);
    const getClearButton = () => clearButton;
    const clearList = () => {
        if (listEl) listEl.replaceChildren();
    };

    const setStatus = (message) => {
        if (statusEl) statusEl.textContent = message;
    };

    const setClearEnabled = (enabled) => {
        if (clearButton) clearButton.disabled = !enabled;
    };

    const formatDuration = (seconds) => {
        const value = Number.isFinite(seconds) ? Math.round(seconds) : 0;
        const minutes = Math.floor(value / 60);
        const remainder = value % 60;
        if (!minutes) return `${remainder}s`;
        return `${minutes}:${String(remainder).padStart(2, '0')}`;
    };

    const buildRowDescriptor = ({ recording, index, soundEnabled }) => {
        const row = document.createElement('div');
        row.className = 'parent-recording-item';
        row.dataset.recordingIndex = String(index);

        const playBtn = document.createElement('button');
        playBtn.className = 'recording-play';
        playBtn.type = 'button';
        playBtn.setAttribute('aria-label', 'Play recording');
        playBtn.textContent = '\u25B6';

        const info = document.createElement('div');
        info.className = 'recording-info';
        const titleDiv = document.createElement('div');
        titleDiv.className = 'recording-title';
        const subDiv = document.createElement('div');
        subDiv.className = 'recording-sub';
        info.appendChild(titleDiv);
        info.appendChild(subDiv);

        const saveBtn = document.createElement('button');
        saveBtn.className = 'recording-save';
        saveBtn.type = 'button';
        saveBtn.setAttribute('aria-label', 'Save recording');
        saveBtn.textContent = '\u2B07';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'recording-delete';
        deleteBtn.type = 'button';
        deleteBtn.setAttribute('aria-label', 'Delete recording');
        deleteBtn.textContent = '\u2715';

        row.appendChild(playBtn);
        row.appendChild(info);
        row.appendChild(saveBtn);
        row.appendChild(deleteBtn);

        titleDiv.textContent = recording.title || `Recording ${index + 1}`;
        let createdAt = '';
        if (recording.createdAt) {
            const stamp = new Date(recording.createdAt);
            if (!Number.isNaN(stamp.getTime())) {
                createdAt = stamp.toLocaleDateString();
            }
        }
        const parts = [`Duration ${formatDuration(recording.duration || 0)}`];
        if (createdAt) parts.push(createdAt);
        subDiv.textContent = parts.join(' · ');

        const hasSource = Boolean(recording.dataUrl || recording.blobKey);
        playBtn.disabled = !soundEnabled || !hasSource;
        saveBtn.disabled = !hasSource;

        return {
            recording,
            index,
            hasSource,
            row,
            playBtn,
            saveBtn,
            deleteBtn,
        };
    };

    const renderRows = ({ recordings, soundEnabled }) => {
        if (!listEl) return [];
        listEl.replaceChildren();
        const descriptors = recordings.map((recording, index) =>
            buildRowDescriptor({
                recording,
                index,
                soundEnabled,
            }),
        );
        descriptors.forEach((descriptor) => listEl.appendChild(descriptor.row));
        return descriptors;
    };

    return {
        resolveElements,
        hasList,
        getClearButton,
        clearList,
        setStatus,
        setClearEnabled,
        renderRows,
    };
};
