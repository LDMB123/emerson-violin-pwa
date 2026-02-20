const AUDIO_EXTENSION_PATTERN = /\.(wav|mp3|opus)(?=($|[?#]))/i;
const AUDIO_ASSET_PATTERN = /(?:^|\/)\.?\/?assets\/audio\//i;

const getMediaSupport = () => {
    if (typeof document === 'undefined') {
        return {
            supportsOpus: false,
        };
    }

    const audio = document.createElement('audio');
    const supportsOggOpus = audio.canPlayType('audio/ogg; codecs=opus');
    const supportsWebmOpus = audio.canPlayType('audio/webm; codecs=opus');
    const supportsOpus = Boolean(supportsOggOpus || supportsWebmOpus);

    return { supportsOpus };
};

const { supportsOpus } = getMediaSupport();

const SOURCE_ORDER = supportsOpus
    ? ['opus', 'mp3', 'wav']
    : ['mp3', 'opus', 'wav'];

const splitSuffix = (path = '') => {
    const index = path.search(/[?#]/);
    if (index === -1) return [path, ''];
    return [path.slice(0, index), path.slice(index)];
};

const stripAudioExtension = (path = '') => path.replace(AUDIO_EXTENSION_PATTERN, '');

export const isAudioAssetPath = (path = '') => AUDIO_ASSET_PATTERN.test(path);

export const getAudioPathCandidates = (basePath) => {
    if (!basePath) return [];
    const [pathOnly, suffix] = splitSuffix(basePath);
    const cleanPath = stripAudioExtension(pathOnly);
    return SOURCE_ORDER.map((ext) => `${cleanPath}.${ext}${suffix}`);
};

export const getAudioPath = (basePath) => getAudioPathCandidates(basePath)[0] || basePath;

const readCandidateState = (audioEl) => {
    const raw = audioEl.dataset.audioCandidates || '';
    const candidates = raw.split('|').filter(Boolean);
    const index = Number.parseInt(audioEl.dataset.audioCandidateIndex || '0', 10);
    return {
        candidates,
        index: Number.isNaN(index) ? 0 : index,
    };
};

export const prepareAudioElementSource = (audioEl, basePath = null) => {
    if (!audioEl) return;
    const src = basePath || audioEl.getAttribute('src');
    if (!src || !isAudioAssetPath(src)) return;

    const candidates = getAudioPathCandidates(src);
    if (!candidates.length) return;

    audioEl.dataset.audioCandidates = candidates.join('|');
    audioEl.dataset.audioCandidateIndex = '0';
    audioEl.setAttribute('src', candidates[0]);

    if (audioEl.dataset.audioFallbackBound === 'true') return;
    audioEl.dataset.audioFallbackBound = 'true';

    audioEl.addEventListener('error', () => {
        const { candidates: nextCandidates, index } = readCandidateState(audioEl);
        const nextIndex = index + 1;
        if (nextIndex >= nextCandidates.length) return;

        audioEl.dataset.audioCandidateIndex = String(nextIndex);
        audioEl.setAttribute('src', nextCandidates[nextIndex]);
        audioEl.load();
    });
};
