const root = document.documentElement;
const statusEl = document.querySelector('[data-input-status]');

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

const setDataset = (key, value) => {
    if (!root) return;
    if (value === null || value === undefined) {
        delete root.dataset[key];
    } else {
        root.dataset[key] = String(value);
    }
};

const updateHoverCapability = () => {
    const hover = window.matchMedia('(hover: hover)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;
    setDataset('hover', hover ? 'true' : 'false');
    setDataset('pointer', fine ? 'fine' : 'coarse');
};

const updateInputType = (type) => {
    const normalized = type || 'touch';
    setDataset('input', normalized);
    setStatus(normalized);
};

const init = () => {
    updateHoverCapability();

    const fine = window.matchMedia('(pointer: fine)').matches;
    updateInputType(fine ? 'mouse' : 'touch');

    if ('PointerEvent' in window) {
        window.addEventListener('pointerdown', (event) => {
            if (!event.pointerType) return;
            updateInputType(event.pointerType);
        }, { passive: true });
    } else {
        window.addEventListener('touchstart', () => updateInputType('touch'), { passive: true });
        window.addEventListener('mousedown', () => updateInputType('mouse'), { passive: true });
    }

    window.matchMedia('(pointer: fine)').addEventListener('change', updateHoverCapability);
    window.matchMedia('(hover: hover)').addEventListener('change', updateHoverCapability);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
