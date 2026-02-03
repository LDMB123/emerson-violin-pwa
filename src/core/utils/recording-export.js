
export const safeFileName = (title) => {
    if (!title) return 'panda-violin-recording';
    const sanitized = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return sanitized.slice(0, 48) || 'panda-violin-recording';
};

export const dataUrlToBlob = async (dataUrl) => {
    const response = await fetch(dataUrl);
    return response.blob();
};

const resolveRecordingBlob = async (recording, blobOverride) => {
    if (blobOverride instanceof Blob) return blobOverride;
    if (recording?.blob instanceof Blob) return recording.blob;
    if (recording?.dataUrl) return dataUrlToBlob(recording.dataUrl);
    return null;
};

export const saveWithFilePicker = async (file) => {
    if (!('showSaveFilePicker' in window)) return false;
    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: file.name,
            types: [
                {
                    description: 'Panda Violin Recording',
                    accept: { [file.type || 'audio/webm']: ['.webm', '.mp4', '.wav', '.m4a'] },
                },
            ],
        });
        const writable = await handle.createWritable();
        await writable.write(file);
        await writable.close();
        return true;
    } catch {
        return false;
    }
};

export const shareFile = async (file) => {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                title: 'Panda Violin Recording',
                text: 'Practice recording',
                files: [file],
            });
            return true;
        } catch {
            return false;
        }
    }
    return false;
};

export const downloadFile = (file) => {
    triggerDownload(file);
};

export const buildRecordingFile = async (recording, index = 0, blobOverride = null) => {
    const blob = await resolveRecordingBlob(recording, blobOverride);
    if (!blob) return null;
    const type = blob.type || recording?.mimeType || 'audio/webm';
    const extension = type.includes('mp4') ? 'm4a' : type.includes('wav') ? 'wav' : 'webm';
    const title = recording.title || `recording-${index + 1}`;
    let dateTag = '';
    if (recording.createdAt) {
        try {
            const stamp = new Date(recording.createdAt);
            if (!Number.isNaN(stamp.getTime())) {
                dateTag = stamp.toISOString().slice(0, 10);
            }
        } catch {
            dateTag = '';
        }
    }
    const suffix = dateTag ? `-${dateTag}` : '';
    const fileName = `${safeFileName(title)}${suffix}.${extension}`;
    return new File([blob], fileName, { type });
};

export const exportRecording = async (recording, index = 0, blobOverride = null) => {
    const file = await buildRecordingFile(recording, index, blobOverride);
    if (!file) return false;
    const saved = await saveWithFilePicker(file);
    if (!saved) {
        const shared = await shareFile(file);
        if (!shared) {
            downloadFile(file);
        }
    }
    return true;
};
