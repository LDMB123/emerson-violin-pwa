const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const scoreFromMinutes = (minutes, base = 54, step = 8) => {
    const score = base + minutes * step;
    return clamp(score);
};

const createSkillProfileUtils = (SkillCategory) => {
    const updateAllSkills = (profile, score) => {
        profile.update_skill(SkillCategory.Pitch, score);
        profile.update_skill(SkillCategory.Rhythm, score);
        profile.update_skill(SkillCategory.BowControl, score);
        profile.update_skill(SkillCategory.Posture, score);
        profile.update_skill(SkillCategory.Reading, score);
    };

    const SKILL_RULES = [
        { test: /^pq-step-/, skill: SkillCategory.Pitch, weight: 1 },
        { test: /^et-step-/, skill: SkillCategory.Pitch, weight: 0.85 },
        { test: /^rd-set-/, skill: SkillCategory.Rhythm, weight: 1 },
        { test: /^rp-pattern-/, skill: SkillCategory.Rhythm, weight: 0.8 },
        { test: /^pz-step-/, skill: SkillCategory.Rhythm, weight: 0.75 },
        { test: /^bh-step-/, skill: SkillCategory.BowControl, weight: 1 },
        { test: /^bow-set-/, skill: SkillCategory.BowControl, weight: 0.9 },
        { test: /^sq-step-/, skill: SkillCategory.BowControl, weight: 0.85 },
        { test: /^tt-step-/, skill: SkillCategory.Pitch, weight: 0.9 },
        { test: /^sp-step-/, skill: SkillCategory.Pitch, weight: 0.95 },
        { test: /^ss-step-/, skill: SkillCategory.Reading, weight: 0.8 },
        { test: /^nm-card-/, skill: SkillCategory.Reading, weight: 0.7 },
        { test: /^mm-step-/, skill: SkillCategory.Reading, weight: 0.75 },
        { test: /^dc-step-/, skill: SkillCategory.Rhythm, weight: 0.9 },
    ];

    const updateSkillProfile = (profile, eventId, minutes) => {
        if (!eventId) return;
        if (/^(goal-step-|parent-goal-)/.test(eventId) || /^goal-(warmup|scale|song|rhythm|ear)/.test(eventId)) {
            updateAllSkills(profile, scoreFromMinutes(minutes, 52, 6));
            return;
        }
        for (const rule of SKILL_RULES) {
            if (rule.test.test(eventId)) {
                const weighted = scoreFromMinutes(minutes, 58, 9) * rule.weight;
                profile.update_skill(rule.skill, clamp(weighted));
                return;
            }
        }
        updateAllSkills(profile, scoreFromMinutes(minutes, 50, 4));
    };

    return {
        clamp,
        scoreFromMinutes,
        updateAllSkills,
        updateSkillProfile,
        SKILL_RULES,
    };
};

export {
    clamp,
    scoreFromMinutes,
    createSkillProfileUtils,
};
