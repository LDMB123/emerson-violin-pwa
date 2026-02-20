import { getCore } from '../wasm/load-core.js';
import { createSkillProfileUtils } from '../utils/skill-profile.js';
import { buildFallbackProgress } from './progress-model-fallback.js';
import { buildPrimaryProgressModel } from './progress-model-primary.js';
import {
    composeProgressResult,
    loadSupplementaryProgressData,
} from './progress-model-result.js';
import { collectEventIds } from './progress-model-events.js';

export { collectEventIds };

export const buildProgress = async (events) => {
    try {
        const { PlayerProgress, AchievementTracker, SkillProfile, SkillCategory, calculate_streak: calculateStreak } = await getCore();
        const { updateSkillProfile } = createSkillProfileUtils(SkillCategory);
        const primary = buildPrimaryProgressModel({
            events,
            PlayerProgress,
            AchievementTracker,
            SkillProfile,
            SkillCategory,
            calculateStreak,
            updateSkillProfile,
        });
        const supplemental = await loadSupplementaryProgressData();
        return composeProgressResult({
            ...primary,
            supplemental,
        });
    } catch (error) {
        return buildFallbackProgress(events, error);
    }
};
