import { getJSON } from '../persistence/storage.js';

const exportButton = document.querySelector('[data-export-json]');
const exportStatus = document.querySelector('[data-export-status]');

const EVENT_KEY = 'panda-violin:events:v1';
const UI_KEY = 'panda-violin:ui-state:v1';

const updateStatus = (message) => {
    if (exportStatus) exportStatus.textContent = message;
};

const buildPayload = async () => {
    const [events, uiState] = await Promise.all([
        getJSON(EVENT_KEY),
        getJSON(UI_KEY),
    ]);

    return {
        exportedAt: new Date().toISOString(),
        appVersion: '2.0.0',
        events: Array.isArray(events) ? events : [],
        uiState: uiState ?? {},
    };
};

const shareFile = async (file) => {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
            title: 'Panda Violin Backup',
            text: 'Local backup file for Panda Violin.',
            files: [file],
        });
        return true;
    }
    return false;
};

const downloadFile = (file) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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

if (exportButton) {
    exportButton.addEventListener('click', handleExport);
}
