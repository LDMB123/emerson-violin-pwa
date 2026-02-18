import { getJSON, setJSON, getBlob, setBlob, removeBlob } from '../persistence/storage.js';
import { dataUrlToBlob, blobToDataUrl, createBlobKey, downloadFile } from '../utils/recording-export.js';
import {
    EVENTS_KEY as EVENT_KEY,
    UI_STATE_KEY as UI_KEY,
    RECORDINGS_KEY,
    ML_MODEL_KEY,
    ML_LOG_KEY,
} from '../persistence/storage-keys.js';

const exportButton = document.querySelector('[data-export-json]');
const exportStatus = document.querySelector('[data-export-status]');
const importButton = document.querySelector('[data-import-json]');
const importStatus = document.querySelector('[data-import-status]');
const importInput = document.querySelector('[data-import-file]');

const normalizeRecordingForExport = async (recording) => {
    if (!recording || typeof recording !== 'object') return null;
    if (recording.dataUrl) return recording;
    if (!recording.blobKey) return recording;
    const blob = await getBlob(recording.blobKey);
    if (!blob) return recording;
    const dataUrl = await blobToDataUrl(blob);
    return {
        ...recording,
        dataUrl,
        blobKey: null,
        mimeType: blob.type || recording.mimeType || 'audio/webm',
    };
};

const hydrateRecordingForImport = async (recording) => {
    if (!recording || typeof recording !== 'object') return null;
    if (!recording.dataUrl) return recording;
    try {
        const blob = await dataUrlToBlob(recording.dataUrl);
        const blobKey = createBlobKey(recording.id || 'import');
        const stored = await setBlob(blobKey, blob);
        if (!stored) return recording;
        return {
            ...recording,
            dataUrl: null,
            blobKey,
            mimeType: blob.type || recording.mimeType || 'audio/webm',
        };
    } catch {
        return recording;
    }
};

const updateStatus = (message) => {
    if (exportStatus) exportStatus.textContent = message;
};

const updateImportStatus = (message) => {
    if (importStatus) importStatus.textContent = message;
};

const buildPayload = async () => {
    const [events, uiState, recordings, adaptiveModel, adaptiveLog] = await Promise.all([
        getJSON(EVENT_KEY),
        getJSON(UI_KEY),
        getJSON(RECORDINGS_KEY),
        getJSON(ML_MODEL_KEY),
        getJSON(ML_LOG_KEY),
    ]);

    const normalizedRecordings = Array.isArray(recordings)
        ? (await Promise.all(recordings.map((recording) => normalizeRecordingForExport(recording))))
            .filter(Boolean)
        : [];

    return {
        exportedAt: new Date().toISOString(),
        appVersion: '2.0.0',
        events: Array.isArray(events) ? events : [],
        uiState: uiState ?? {},
        recordings: normalizedRecordings,
        adaptiveModel: adaptiveModel ?? null,
        adaptiveLog: Array.isArray(adaptiveLog) ? adaptiveLog : [],
    };
};

const shareFile = async (file) => {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                title: 'Panda Violin Backup',
                text: 'Local backup file for Panda Violin.',
                files: [file],
            });
            return true;
        } catch {
            return false;
        }
    }
    return false;
};

const handleExport = async () => {
    updateStatus('Preparing backup…');
    try {
        const payload = await buildPayload();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const file = new File([blob], 'panda-violin-backup.json', { type: 'application/json' });

        const shared = await shareFile(file);
        if (!shared) {
            downloadFile(file);
        }
        updateStatus('Backup ready. Saved to Files or shared.');
    } catch {
        updateStatus('Unable to export backup. Try again.');
    }
};

const parseBackup = async (file) => {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid backup format.');
    }
    return data;
};

const applyBackup = async (payload) => {
    const updates = [];
    if (Array.isArray(payload.events)) updates.push(setJSON(EVENT_KEY, payload.events));
    if (payload.uiState && typeof payload.uiState === 'object') updates.push(setJSON(UI_KEY, payload.uiState));
    if (Array.isArray(payload.recordings)) {
        const existing = await getJSON(RECORDINGS_KEY);
        if (Array.isArray(existing)) {
            await Promise.allSettled(existing.map((recording) => removeBlob(recording?.blobKey)));
        }
        const trimmed = payload.recordings.slice(0, 4);
        const hydrated = (await Promise.all(trimmed.map((recording) => hydrateRecordingForImport(recording))))
            .filter(Boolean);
        updates.push(setJSON(RECORDINGS_KEY, hydrated));
    }
    if (payload.adaptiveModel && typeof payload.adaptiveModel === 'object') updates.push(setJSON(ML_MODEL_KEY, payload.adaptiveModel));
    if (Array.isArray(payload.adaptiveLog)) updates.push(setJSON(ML_LOG_KEY, payload.adaptiveLog));
    await Promise.all(updates);
};

const pickBackupFile = () => new Promise((resolve) => {
    if (!importInput) return resolve(null);
    const handleChange = () => {
        const file = importInput.files?.[0] ?? null;
        importInput.value = '';
        importInput.removeEventListener('change', handleChange);
        resolve(file);
    };
    importInput.addEventListener('change', handleChange, { once: true });
    importInput.click();
});

const getBackupFile = () => pickBackupFile();

const handleImport = async () => {
    updateImportStatus('Choose a backup file…');
    try {
        const file = await getBackupFile();
        if (!file) {
            updateImportStatus('Import cancelled.');
            return;
        }
        const payload = await parseBackup(file);
        updateImportStatus('Importing backup…');
        await applyBackup(payload);
        updateImportStatus('Import complete. Reloading…');
        setTimeout(() => {
            window.location.reload();
        }, 500);
    } catch {
        updateImportStatus('Backup import failed. Check the file and try again.');
    }
};

if (importButton) {
    importButton.addEventListener('click', handleImport);
}
if (importInput) {
    importInput.addEventListener('click', () => {
        updateImportStatus('Choose a backup file…');
    });
}

if (exportButton) {
    exportButton.addEventListener('click', handleExport);
}
