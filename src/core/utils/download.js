import { cloneTemplate } from './templates.js';

const DOWNLOAD_TEMPLATE_ID = '#download-link-template';
let cachedLink = null;

const ensureDownloadLink = () => {
    if (cachedLink && document.contains(cachedLink)) return cachedLink;
    const link = cloneTemplate(DOWNLOAD_TEMPLATE_ID);
    if (link) {
        cachedLink = link;
    } else {
        cachedLink = document.createElement('a');
        cachedLink.className = 'download-link';
    }
    cachedLink.setAttribute('aria-hidden', 'true');
    cachedLink.tabIndex = -1;
    const mount = document.body || document.documentElement;
    mount?.appendChild(cachedLink);
    return cachedLink;
};

export const downloadFile = (file, nameOverride) => {
    if (!(file instanceof Blob)) return false;
    const link = ensureDownloadLink();
    if (!link) return false;
    const url = URL.createObjectURL(file);
    link.href = url;
    link.download = nameOverride || (file instanceof File ? file.name : 'download');
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
};
