import { describe, expect, it } from 'vitest';
import { createSkillProfileUtils } from '../src/utils/skill-profile.js';

const SkillCategory = {
    Pitch: 'pitch',
    Rhythm: 'rhythm',
    BowControl: 'bow_control',
    Posture: 'posture',
    Reading: 'reading',
};

const makeProfile = () => {
    const calls = [];
    return {
        calls,
        update_skill: (skill, value) => {
            calls.push({ skill, value });
        },
    };
};

describe('skill-profile utils', () => {
    it('updates all skills for lesson goal ids', () => {
        const { updateSkillProfile } = createSkillProfileUtils(SkillCategory);
        const profile = makeProfile();
        updateSkillProfile(profile, 'goal-ear', 3);
        const skills = profile.calls.map((call) => call.skill);
        expect(skills).toEqual(
            expect.arrayContaining([
                SkillCategory.Pitch,
                SkillCategory.Rhythm,
                SkillCategory.BowControl,
                SkillCategory.Posture,
                SkillCategory.Reading,
            ])
        );
    });

    it('applies weighted skill for pitch quest steps', () => {
        const { updateSkillProfile } = createSkillProfileUtils(SkillCategory);
        const profile = makeProfile();
        updateSkillProfile(profile, 'pq-step-1', 2);
        expect(profile.calls.length).toBe(1);
        expect(profile.calls[0].skill).toBe(SkillCategory.Pitch);
    });
});
