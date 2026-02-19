import { setRootDataset } from './platform-utils.js';

let statusEl = null;
let globalsBound = false;

const resolveElements = () => {
    statusEl = document.querySelector('[data-input-status]');
};

const inputLabels = {
    pen: 'Apple Pencil',
    touch: 'Touch',
    mouse: 'Trackpad/Mouse',
};

const setStatus = (type) => {
    if (!statusEl) return;
    const label = inputLabels[type] || 'Touch';
    statusEl.textContent = `Input: ${label}.`;
};

const updateHoverCapability = () => {
    const hover = window.matchMedia('(hover: hover)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;
    setRootDataset('hover', hover ? 'true' : 'false');
    setRootDataset('pointer', fine ? 'fine' : 'coarse');
};

const updateInputType = (type) => {
    const normalized = type || 'touch';
    setRootDataset('input', normalized);
    setStatus(normalized);
};

const bindGlobalListeners = () => {
    if (globalsBound) return;
    globalsBound = true;
    window.addEventListener('pointerdown', (event) => {
        if (!event.pointerType) return;
        updateInputType(event.pointerType);
    }, { passive: true });

    window.matchMedia('(pointer: fine)').addEventListener('change', updateHoverCapability);
    window.matchMedia('(hover: hover)').addEventListener('change', updateHoverCapability);
};

const initInputCapabilities = () => {
    resolveElements();
    updateHoverCapability();

    const fine = window.matchMedia('(pointer: fine)').matches;
    updateInputType(fine ? 'mouse' : 'touch');
    bindGlobalListeners();
};

export const init = initInputCapabilities;
