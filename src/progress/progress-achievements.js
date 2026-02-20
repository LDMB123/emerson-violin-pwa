import { ACHIEVEMENT_UNLOCKED } from '../utils/event-names.js';

const BADGE_META = {
    first_note: { name: 'First Note', artSrc: null },
    streak_7: { name: 'Week Warrior', artSrc: './assets/badges/badge_practice_streak_1769390952199.webp' },
    level_5: { name: 'Rising Star', artSrc: null },
    practice_100: { name: 'Dedicated', artSrc: null },
    pitch_perfect: { name: 'Pitch Perfect', artSrc: './assets/badges/badge_pitch_master_1769390924763.webp' },
    rhythm_master: { name: 'Rhythm Master', artSrc: './assets/badges/badge_rhythm_star_1769390938421.webp' },
    bow_hero: { name: 'Bow Hero', artSrc: './assets/badges/badge_bow_hero_1769390964607.webp' },
    ear_training: { name: 'Golden Ear', artSrc: './assets/badges/badge_ear_training_1769391019017.webp' },
    all_games: { name: 'Game Master', artSrc: null },
};

const triggerMascotCelebration = () => {
    const mascot = document.querySelector('.progress-mascot');
    if (!mascot || mascot.classList.contains('is-celebrating')) return;
    mascot.classList.add('is-celebrating');
    mascot.addEventListener('animationend', () => {
        mascot.classList.remove('is-celebrating');
    }, { once: true });
};

const dispatchAchievementUnlocked = (id) => {
    const meta = BADGE_META[id];
    if (!meta) return;
    document.dispatchEvent(new CustomEvent(ACHIEVEMENT_UNLOCKED, {
        detail: { id, name: meta.name, artSrc: meta.artSrc },
    }));
};

const celebrateAchievementUnlock = (el, id) => {
    el.classList.add('just-unlocked');
    const art = el.querySelector('.badge-art');
    if (art) {
        art.addEventListener('animationend', () => {
            el.classList.remove('just-unlocked');
        }, { once: true });
    }
    triggerMascotCelebration();
    dispatchAchievementUnlocked(id);
};

export const renderProgressAchievements = ({ tracker, achievementEls = [] }) => {
    if (!tracker) return;
    achievementEls.forEach((el) => {
        const id = el.dataset.achievement;
        if (!id) return;
        const wasLocked = el.classList.contains('locked');
        const unlocked = tracker.is_unlocked(id);
        el.classList.toggle('unlocked', unlocked);
        el.classList.toggle('locked', !unlocked);
        if (unlocked && wasLocked) {
            celebrateAchievementUnlock(el, id);
        }
    });
};
