import { loadEvents } from '../persistence/loaders.js';
import { getCurriculumContent } from './content-loader.js';
import { loadCurriculumState } from './state.js';

const FLOW_FIRST_TIME = 'first_time';
const FLOW_PROGRESSING = 'progressing';
export const FLOW_REGRESSING = 'regressing';
const FLOW_STABLE = 'stable';

export const PHASE_BY_FLOW = {
    [FLOW_FIRST_TIME]: 'onramp',
    [FLOW_PROGRESSING]: 'advance',
    [FLOW_REGRESSING]: 'remediation',
    [FLOW_STABLE]: 'core',
};

const asNumber = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);

const average = (values) => {
    if (!values.length) return 0;
    const total = values.reduce((sum, value) => sum + asNumber(value), 0);
    return total / values.length;
};

const recentPerformance = (events = []) => {
    const qualityEvents = events
        .filter((event) => event && typeof event === 'object')
        .filter((event) => event.type === 'game' || event.type === 'song')
        .map((event) => ({
            accuracy: Number.isFinite(event.accuracy) ? event.accuracy : Number.isFinite(event.score) ? event.score : 0,
            timestamp: Number.isFinite(event.timestamp) ? event.timestamp : 0,
        }))
        .sort((left, right) => left.timestamp - right.timestamp);

    const lastSix = qualityEvents.slice(-6).map((event) => event.accuracy);
    const previousSix = qualityEvents.slice(-12, -6).map((event) => event.accuracy);

    return {
        total: qualityEvents.length,
        recentAvg: average(lastSix),
        previousAvg: average(previousSix),
    };
};

const summarizeUnitCompletion = (unit, events = []) => {
    const requiredGames = new Set(unit?.requiredObjectives?.games || []);
    const requiredSongs = new Set(unit?.requiredObjectives?.songs || []);
    const requiredMinutes = Math.max(0, Number(unit?.requiredObjectives?.practiceMinutes || 0));

    const gameDone = new Set();
    const songDone = new Set();
    let practiceMinutes = 0;

    events.forEach((event) => {
        if (!event || typeof event !== 'object') return;
        if (event.type === 'game' && requiredGames.has(event.id)) {
            const score = Number.isFinite(event.accuracy) ? event.accuracy : event.score;
            if (Number.isFinite(score) && score >= 60) {
                gameDone.add(event.id);
            }
        }
        if (event.type === 'song' && requiredSongs.has(event.id)) {
            const score = Number.isFinite(event.accuracy) ? event.accuracy : event.score;
            if (Number.isFinite(score) && score >= 60) {
                songDone.add(event.id);
            }
        }
        if (event.type === 'practice') {
            practiceMinutes += asNumber(event.minutes, 0);
        }
    });

    const gameRatio = requiredGames.size ? gameDone.size / requiredGames.size : 1;
    const songRatio = requiredSongs.size ? songDone.size / requiredSongs.size : 1;
    const practiceRatio = requiredMinutes ? Math.min(1, practiceMinutes / requiredMinutes) : 1;
    const completion = Math.round(((gameRatio + songRatio + practiceRatio) / 3) * 100);

    return {
        completion,
        gameRatio,
        songRatio,
        practiceRatio,
    };
};

const resolveFlow = ({ total, recentAvg, previousAvg }) => {
    if (total === 0) return FLOW_FIRST_TIME;
    if (recentAvg < 65) {
        return FLOW_REGRESSING;
    }
    if (recentAvg <= previousAvg - 6) {
        return FLOW_REGRESSING;
    }
    if (recentAvg >= previousAvg + 6 || (recentAvg >= 80 && previousAvg === 0)) {
        return FLOW_PROGRESSING;
    }
    return FLOW_STABLE;
};

const findUnitIndex = (units, currentUnitId) => {
    if (!Array.isArray(units) || !units.length) return 0;
    const index = units.findIndex((unit) => unit.id === currentUnitId);
    return index >= 0 ? index : 0;
};

const clampUnitIndex = (index, totalUnits) => {
    if (!Number.isFinite(index)) return 0;
    if (!totalUnits || totalUnits <= 1) return 0;
    return Math.max(0, Math.min(totalUnits - 1, Math.round(index)));
};

const chooseUnit = ({ units, state, flow, events }) => {
    if (!units.length) return null;

    const currentIndex = findUnitIndex(units, state.currentUnitId);
    const currentUnit = units[currentIndex];
    const completion = summarizeUnitCompletion(currentUnit, events).completion;

    let targetIndex = currentIndex;
    if (flow === FLOW_PROGRESSING && completion >= 75) {
        targetIndex = currentIndex + 1;
    } else if (flow === FLOW_REGRESSING && completion <= 45) {
        targetIndex = currentIndex - 1;
    }

    if (!state.currentUnitId && flow === FLOW_FIRST_TIME) {
        targetIndex = 0;
    }

    targetIndex = clampUnitIndex(targetIndex, units.length);
    return units[targetIndex] || units[0];
};

const loadCurriculumSnapshotInputs = async ({ events } = {}) => {
    const [content, state, sourceEvents] = await Promise.all([
        getCurriculumContent(),
        loadCurriculumState(),
        Array.isArray(events) ? Promise.resolve(events) : loadEvents(),
    ]);
    return { content, state, sourceEvents };
};

const deriveCurriculumSnapshot = ({ content, state, sourceEvents }) => {
    const performance = recentPerformance(sourceEvents);
    const flow = resolveFlow(performance);
    const units = Array.isArray(content.units) ? content.units : [];
    const unit = chooseUnit({ units, state, flow, events: sourceEvents }) || units[0] || null;
    return {
        content,
        state,
        events: sourceEvents,
        flow,
        performance,
        unit,
    };
};

export const getCurriculumSnapshot = async ({ events } = {}) => {
    const inputs = await loadCurriculumSnapshotInputs({ events });
    return deriveCurriculumSnapshot(inputs);
};
