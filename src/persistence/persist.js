import { getJSON, setJSON } from './storage.js';
import { UI_STATE_KEY as STORAGE_KEY } from './storage-keys.js';

const IGNORE_IDS = new Set(['focus-timer']);
const IGNORE_PREFIXES = ['song-play-'];

const shouldIgnore = (input) => {
    if (!input) return true;
    if (input.type === 'file') return true;
    if (!input.id && input.type === 'checkbox') return true;
    if (input.dataset.persist === 'false') return true;
    if (input.id && IGNORE_IDS.has(input.id)) return true;
    if (input.id && IGNORE_PREFIXES.some((prefix) => input.id.startsWith(prefix))) return true;
    return false;
};

const loadState = async () => {
    const parsed = await getJSON(STORAGE_KEY);
    return {
        checks: parsed?.checks ?? {},
        radios: parsed?.radios ?? {},
    };
};

const saveState = async (state) => {
    await setJSON(STORAGE_KEY, state);
};

const applyState = (state) => {
    const inputs = document.querySelectorAll('input[type="checkbox"], input[type="radio"]');
    inputs.forEach((input) => {
        if (shouldIgnore(input)) return;
        if (input.type === 'checkbox') {
            if (input.id && Object.prototype.hasOwnProperty.call(state.checks, input.id)) {
                input.checked = Boolean(state.checks[input.id]);
            }
            return;
        }

        if (input.type === 'radio' && input.name) {
            const stored = state.radios[input.name];
            if (!stored) return;
            if (input.id && input.id === stored) {
                input.checked = true;
                return;
            }
            if (input.value && input.value === stored) {
                input.checked = true;
            }
        }
    });
    document.dispatchEvent(new CustomEvent('panda:persist-applied', { detail: state }));
};

const initPersistence = async () => {
    const state = await loadState();
    applyState(state);

    document.addEventListener('change', (event) => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;
        if (shouldIgnore(input)) return;

        if (input.type === 'checkbox' && input.id) {
            state.checks[input.id] = input.checked;
            saveState(state);
            return;
        }

        if (input.type === 'radio' && input.name) {
            const value = input.id || input.value;
            if (value) {
                state.radios[input.name] = value;
                saveState(state);
            }
        }
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPersistence);
} else {
    initPersistence();
}
