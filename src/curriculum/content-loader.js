const CURRICULUM_PATH = '/content/curriculum/track-beginner-intermediate.v1.json';

const FALLBACK_CONTENT = Object.freeze({
    id: 'track-beginner-intermediate.v1',
    version: 1,
    title: 'Beginner to Intermediate Violin Track',
    tiers: ['beginner', 'intermediate'],
    masteryThresholds: {
        bronze: 60,
        silver: 80,
        gold: 92,
        distinctDays: 3,
    },
    units: [
        { id: 'u-beg-01', tier: 'beginner', title: 'Open Strings and Posture', order: 1, requiredObjectives: { practiceMinutes: 15, games: ['tuning-time', 'pitch-quest'], songs: ['open_strings'] }, missionTemplate: { steps: [{ id: 'step-tune', type: 'tuner', label: 'Tune open strings', target: 'all-strings' }] } },
        { id: 'u-beg-02', tier: 'beginner', title: 'Beat and Pulse', order: 2, requiredObjectives: { practiceMinutes: 18, games: ['rhythm-dash', 'rhythm-painter'], songs: ['twinkle'] }, missionTemplate: { steps: [{ id: 'step-rhythm', type: 'game', label: 'Rhythm Dash foundation', target: 'rhythm-dash:foundation' }] } },
        { id: 'u-beg-03', tier: 'beginner', title: 'Finger Patterns', order: 3, requiredObjectives: { practiceMinutes: 20, games: ['note-memory', 'scale-practice'], songs: ['mary', 'go_tell_aunt_rhody'] }, missionTemplate: { steps: [{ id: 'step-reading', type: 'game', label: 'Note Memory core', target: 'note-memory:core' }] } },
        { id: 'u-beg-04', tier: 'beginner', title: 'Beginner Capstone', order: 4, requiredObjectives: { practiceMinutes: 24, games: ['bow-hero', 'string-quest', 'ear-trainer'], songs: ['lightly_row', 'ode_to_joy'] }, missionTemplate: { steps: [{ id: 'step-cap-beg', type: 'song', label: 'Capstone song run', target: 'ode_to_joy:checkpoint-1' }] } },
        { id: 'u-int-01', tier: 'intermediate', title: 'Tempo and Articulation', order: 5, requiredObjectives: { practiceMinutes: 26, games: ['rhythm-dash', 'pizzicato', 'duet-challenge'], songs: ['minuet_1', 'gavotte'] }, missionTemplate: { steps: [{ id: 'step-int-rhythm', type: 'game', label: 'Rhythm Dash core', target: 'rhythm-dash:core' }] } },
        { id: 'u-int-02', tier: 'intermediate', title: 'Expression and Dynamics', order: 6, requiredObjectives: { practiceMinutes: 28, games: ['story-song', 'melody-maker'], songs: ['gavotte', 'minuet_1'] }, missionTemplate: { steps: [{ id: 'step-int-expr', type: 'song', label: 'Gavotte section B', target: 'gavotte:section-b' }] } },
        { id: 'u-int-03', tier: 'intermediate', title: 'Speed and Accuracy', order: 7, requiredObjectives: { practiceMinutes: 30, games: ['scale-practice', 'tuning-time', 'pitch-quest'], songs: ['perpetual_motion'] }, missionTemplate: { steps: [{ id: 'step-int-speed', type: 'song', label: 'Perpetual Motion section A', target: 'perpetual_motion:section-a' }] } },
        { id: 'u-int-04', tier: 'intermediate', title: 'Intermediate Capstone', order: 8, requiredObjectives: { practiceMinutes: 32, games: ['duet-challenge', 'bow-hero', 'melody-maker'], songs: ['perpetual_motion', 'gavotte'] }, missionTemplate: { steps: [{ id: 'step-int-cap', type: 'song', label: 'Perpetual Motion full run', target: 'perpetual_motion:full' }] } },
    ],
});

let cachedContent = null;
let loadingPromise = null;

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeUnit = (unit, index) => ({
    id: unit?.id || `unit-${index + 1}`,
    tier: unit?.tier || 'beginner',
    title: unit?.title || `Unit ${index + 1}`,
    order: Number.isFinite(unit?.order) ? unit.order : index + 1,
    requiredObjectives: {
        practiceMinutes: Math.max(5, Number(unit?.requiredObjectives?.practiceMinutes || 15)),
        games: Array.isArray(unit?.requiredObjectives?.games) ? unit.requiredObjectives.games.filter(Boolean) : [],
        songs: Array.isArray(unit?.requiredObjectives?.songs) ? unit.requiredObjectives.songs.filter(Boolean) : [],
    },
    missionTemplate: {
        steps: Array.isArray(unit?.missionTemplate?.steps) ? unit.missionTemplate.steps.filter(Boolean) : [],
        remediation: unit?.missionTemplate?.remediation && typeof unit.missionTemplate.remediation === 'object'
            ? unit.missionTemplate.remediation
            : {},
    },
});

const normalizeContent = (content) => {
    const base = content && typeof content === 'object' ? content : FALLBACK_CONTENT;
    const units = Array.isArray(base.units) ? base.units.map(normalizeUnit).sort((left, right) => left.order - right.order) : [];
    return {
        id: base.id || FALLBACK_CONTENT.id,
        version: Number.isFinite(base.version) ? base.version : 1,
        title: base.title || FALLBACK_CONTENT.title,
        tiers: Array.isArray(base.tiers) && base.tiers.length ? base.tiers : FALLBACK_CONTENT.tiers,
        masteryThresholds: {
            bronze: Number.isFinite(base?.masteryThresholds?.bronze) ? base.masteryThresholds.bronze : 60,
            silver: Number.isFinite(base?.masteryThresholds?.silver) ? base.masteryThresholds.silver : 80,
            gold: Number.isFinite(base?.masteryThresholds?.gold) ? base.masteryThresholds.gold : 92,
            distinctDays: Number.isFinite(base?.masteryThresholds?.distinctDays) ? base.masteryThresholds.distinctDays : 3,
        },
        units: units.length ? units : clone(FALLBACK_CONTENT.units),
    };
};

const fetchCurriculum = async () => {
    if (typeof fetch !== 'function') {
        return normalizeContent(FALLBACK_CONTENT);
    }

    const response = await fetch(CURRICULUM_PATH, { cache: 'no-cache' });
    if (!response.ok) {
        throw new Error(`Curriculum fetch failed: ${response.status}`);
    }
    const payload = await response.json();
    return normalizeContent(payload);
};

const loadCurriculum = async () => {
    try {
        return await fetchCurriculum();
    } catch {
        return normalizeContent(FALLBACK_CONTENT);
    }
};

export const getCurriculumContent = async ({ forceRefresh = false } = {}) => {
    if (!forceRefresh && cachedContent) {
        return clone(cachedContent);
    }

    if (!loadingPromise || forceRefresh) {
        loadingPromise = loadCurriculum().then((content) => {
            cachedContent = content;
            return cachedContent;
        }).finally(() => {
            loadingPromise = null;
        });
    }

    const content = await loadingPromise;
    return clone(content);
};

const getCurriculumUnits = async () => {
    const content = await getCurriculumContent();
    return content.units || [];
};

export const getCurriculumUnit = async (unitId) => {
    if (!unitId) return null;
    const units = await getCurriculumUnits();
    return units.find((unit) => unit.id === unitId) || null;
};
