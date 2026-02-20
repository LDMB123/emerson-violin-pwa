#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const failures = [];

const assertRule = (condition, message) => {
    if (!condition) failures.push(message);
};

const readJSON = (relativePath) => {
    const absolutePath = resolve(process.cwd(), relativePath);
    return JSON.parse(readFileSync(absolutePath, 'utf8'));
};

const curriculum = readJSON('public/content/curriculum/track-beginner-intermediate.v1.json');
const curriculumUnits = Array.isArray(curriculum.units) ? curriculum.units : [];
const beginnerUnits = curriculumUnits.filter((unit) => unit.tier === 'beginner');
const intermediateUnits = curriculumUnits.filter((unit) => unit.tier === 'intermediate');

assertRule(curriculumUnits.length >= 8, 'Curriculum must contain at least 8 units.');
assertRule(beginnerUnits.length >= 4, 'Curriculum must contain at least 4 beginner units.');
assertRule(intermediateUnits.length >= 4, 'Curriculum must contain at least 4 intermediate units.');

curriculumUnits.forEach((unit) => {
    assertRule(Array.isArray(unit?.missionTemplate?.steps) && unit.missionTemplate.steps.length >= 3,
        `Unit ${unit.id} is missing mission steps.`);
    assertRule(typeof unit?.requiredObjectives?.practiceMinutes === 'number' && unit.requiredObjectives.practiceMinutes > 0,
        `Unit ${unit.id} is missing required practice minutes.`);
    assertRule(Array.isArray(unit?.requiredObjectives?.games) && unit.requiredObjectives.games.length > 0,
        `Unit ${unit.id} is missing required games.`);
    assertRule(Array.isArray(unit?.requiredObjectives?.songs) && unit.requiredObjectives.songs.length > 0,
        `Unit ${unit.id} is missing required songs.`);
    assertRule(unit?.missionTemplate?.remediation && typeof unit.missionTemplate.remediation === 'object',
        `Unit ${unit.id} is missing remediation branches.`);
});

const songsCatalog = readJSON('public/content/songs/catalog.v2.json');
const songs = Array.isArray(songsCatalog.songs) ? songsCatalog.songs : [];
const beginnerSongs = songs.filter((song) => song.tier === 'beginner');
const intermediateSongs = songs.filter((song) => song.tier === 'intermediate');
const challengeSongs = songs.filter((song) => song.tier === 'challenge');

assertRule(songs.length >= 30, 'Song catalog must contain at least 30 songs.');
assertRule(beginnerSongs.length >= 12, 'Song catalog must contain at least 12 beginner songs.');
assertRule(intermediateSongs.length >= 12, 'Song catalog must contain at least 12 intermediate songs.');
assertRule(challengeSongs.length >= 6, 'Song catalog must contain at least 6 challenge songs.');

songs.forEach((song) => {
    assertRule(Array.isArray(song.sections) && song.sections.length > 0,
        `Song ${song.id} must define at least one section.`);
});

const gameConfigModule = await import(pathToFileURL(resolve(process.cwd(), 'src/games/game-config.js')).href);
const gameMeta = gameConfigModule.GAME_META || {};
const defaultMasteryThresholds = gameConfigModule.DEFAULT_MASTERY_THRESHOLDS || {};

assertRule(Object.keys(gameMeta).length >= 13, 'Game config must expose at least 13 games.');
assertRule(defaultMasteryThresholds.bronze >= 60, 'Mastery bronze threshold must be at least 60.');
assertRule(defaultMasteryThresholds.silver >= 80, 'Mastery silver threshold must be at least 80.');
assertRule(defaultMasteryThresholds.gold >= 92, 'Mastery gold threshold must be at least 92.');
assertRule(defaultMasteryThresholds.distinctDays >= 3, 'Mastery distinct-days threshold must be at least 3.');

Object.entries(gameMeta).forEach(([id, meta]) => {
    const packs = meta?.objectivePacks || {};
    ['foundation', 'core', 'mastery'].forEach((tier) => {
        assertRule(Array.isArray(packs[tier]) && packs[tier].length > 0,
            `Game ${id} is missing objective pack for tier ${tier}.`);
    });
    assertRule(meta?.masteryThresholds && typeof meta.masteryThresholds === 'object',
        `Game ${id} is missing mastery thresholds.`);
});

const eventNamesModule = await import(pathToFileURL(resolve(process.cwd(), 'src/utils/event-names.js')).href);
['PRACTICE_STEP_STARTED', 'PRACTICE_STEP_COMPLETED', 'MISSION_UPDATED', 'SONG_SECTION_COMPLETED', 'GAME_MASTERY_UPDATED']
    .forEach((key) => {
        assertRule(typeof eventNamesModule[key] === 'string' && eventNamesModule[key].startsWith('panda:'),
            `Event contract ${key} is missing.`);
    });

const recommendationsSource = [
    readFileSync(resolve(process.cwd(), 'src/ml/recommendations.js'), 'utf8'),
    readFileSync(resolve(process.cwd(), 'src/ml/recommendations-core.js'), 'utf8'),
].join('\n');
assertRule(/\bmission\b/.test(recommendationsSource), 'Recommendations must include mission contract fields.');
assertRule(/\bmastery\b/.test(recommendationsSource), 'Recommendations must include mastery contract fields.');
assertRule(/\bnextActions\b/.test(recommendationsSource), 'Recommendations must include nextActions contract fields.');

if (failures.length) {
    console.error('Learning completeness audit failed:');
    failures.forEach((message) => console.error(`- ${message}`));
    process.exit(1);
}

console.log('Learning completeness audit passed.');
