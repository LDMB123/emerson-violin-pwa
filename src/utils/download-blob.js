/**
 * downloadBlob — programmatically trigger a file download from a Blob.
 * Automatically revokes the object URL after the click.
 *
 * @param {Blob|string} content — Blob or string to download
 * @param {string} filename — name of the downloaded file
 * @param {string} [type='application/octet-stream'] — MIME type (only used when content is a string)
 */
export function downloadBlob(content, filename, type = 'application/octet-stream') {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
