import { loadEvents } from '../persistence/loaders.js';
import { getAdaptiveLog } from './adaptive-engine.js';
import {
    GAME_BY_SKILL,
    GAME_LABELS,
    SKILL_LABELS,
    computeSkillScores,
    findWeakestSkill,
    computeSongLevel,
} from '../utils/recommendations-utils.js';
import { ensureCurrentMission } from '../curriculum/engine.js';
import { collectDueSongReviews } from '../songs/song-progression.js';
import { loadGameMasteryState } from '../games/game-mastery.js';
import { getSongCatalog } from '../songs/song-library.js';
import {
    DEFAULT_MASTERY_THRESHOLDS,
    masteryFromEvents,
    skillMastery,
    collectDueGameReviews,
    buildDueReviewAction,
} from './recommendations-mastery.js';
import {
    COACH_MESSAGES,
    buildLessonSteps,
    buildMissionContract,
    buildNextActions,
} from './recommendations-plan.js';

const loadRecommendationInputs = async () => {
    const [events, adaptiveLog, dueSongs, gameMasteryState, songCatalog] = await Promise.all([
        loadEvents(),
        getAdaptiveLog(),
        collectDueSongReviews().catch(() => []),
        loadGameMasteryState().catch(() => ({ games: {} })),
        getSongCatalog().catch(() => ({ byId: {} })),
    ]);
    return {
        events,
        adaptiveLog,
        metronomeTuning: { targetBpm: 90 }, // Stub fallback for deprecated config
        dueSongs,
        gameMasteryState,
        songCatalog,
    };
};

const buildBaseRecommendations = ({ events, adaptiveLog, metronomeTuning }) => {
    const skillScores = computeSkillScores(adaptiveLog);
    const weakestSkill = findWeakestSkill(skillScores);
    const songEvents = events.filter((event) => event.type === 'song');
    const songLevel = computeSongLevel(songEvents);
    const recommendedGameId = GAME_BY_SKILL[weakestSkill] || 'pitch-quest';
    const recommendedGameLabel = GAME_LABELS[recommendedGameId] || 'Pitch Quest';
    const metronomeTarget = metronomeTuning?.targetBpm || 90;

    const lessonPlan = buildLessonSteps({
        weakestSkill,
        recommendedGameId,
        metronomeTarget,
        songLevel,
    });
    const lessonSteps = lessonPlan.steps || [];
    const lessonTotal = lessonSteps.reduce((sum, step) => sum + (step.minutes || 0), 0);

    const coachCue = lessonPlan.coachCue || '';
    const coachMessage = coachCue || COACH_MESSAGES[weakestSkill] || COACH_MESSAGES.default;
    const firstStep = lessonSteps[0];
    const coachActionMessage = firstStep?.label
        ? `Start with ${firstStep.label.toLowerCase()}.`
        : `Try ${recommendedGameLabel} next to build ${weakestSkill.replace('_', ' ')}.`;

    return {
        weakestSkill,
        skillScores,
        recommendedGameId,
        recommendedGameLabel,
        songLevel,
        coachMessage,
        coachActionMessage,
        metronomeTarget,
        lessonSteps,
        lessonTotal,
        coachCue,
        skillLabel: SKILL_LABELS[weakestSkill] || 'Pitch',
    };
};

export const computeRecommendations = async () => {
    const {
        events,
        adaptiveLog,
        metronomeTuning,
        dueSongs,
        gameMasteryState,
        songCatalog,
    } = await loadRecommendationInputs();
    const dueGames = collectDueGameReviews(gameMasteryState, { now: Date.now() });
    const dueReviewAction = buildDueReviewAction({
        dueSongs,
        dueGames,
        songCatalog,
        gameLabels: GAME_LABELS,
    });
    const baseRecommendations = buildBaseRecommendations({
        events,
        adaptiveLog,
        metronomeTuning,
    });
    const {
        weakestSkill,
        skillScores,
        recommendedGameId,
        recommendedGameLabel,
        songLevel,
    } = baseRecommendations;

    const missionSnapshot = await ensureCurrentMission({
        recommendations: baseRecommendations,
        events,
    });

    const mission = buildMissionContract(missionSnapshot?.mission);

    const masteryEvents = masteryFromEvents(events, missionSnapshot?.content?.masteryThresholds || DEFAULT_MASTERY_THRESHOLDS);
    const mastery = {
        games: masteryEvents.games,
        songs: masteryEvents.songs,
        skills: skillMastery(skillScores, SKILL_LABELS),
    };

    const nextActions = buildNextActions({
        mission,
        recommendedGameId,
        recommendedGameLabel,
        weakestSkill,
        songLevel,
        dueReviewAction,
    });

    return {
        ...baseRecommendations,
        mission,
        mastery,
        nextActions,
    };
};
