#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const readJSON = (relativePath) => JSON.parse(readFileSync(resolve(root, relativePath), 'utf8'));
const readText = (relativePath) => readFileSync(resolve(root, relativePath), 'utf8');
const failures = [];

const fail = (message) => {
    failures.push(message);
};

const toUrl = (relativePath) => pathToFileURL(resolve(root, relativePath)).href;

const songsCatalog = readJSON('public/content/songs/catalog.v2.json');
const songIds = new Set((songsCatalog.songs || []).map((song) => song.id));
const songViewIds = new Set(
    readdirSync(resolve(root, 'public/views/songs'))
        .filter((entry) => entry.endsWith('.html'))
        .map((entry) => entry.replace(/\.html$/u, '')),
);

songIds.forEach((songId) => {
    if (!songViewIds.has(songId)) {
        fail(`Song catalog entry "${songId}" is missing public/views/songs/${songId}.html.`);
    }
});

const [gameConfigModule, gameRunnerContract, toolsContract, coachSongContract, recommendationsPlan] = await Promise.all([
    import(toUrl('src/games/game-config.js')),
    import(toUrl('src/games/game-runner-contract.js')),
    import(toUrl('src/views/Tools/tools-hub-contract.js')),
    import(toUrl('src/coach/coach-song-contract.js')),
    import(toUrl('src/ml/recommendations-plan.js')),
]);

const gameMetaIds = Object.keys(gameConfigModule.GAME_META || {});
const supportedGameIds = new Set(gameRunnerContract.SUPPORTED_GAME_IDS || []);
const gameViewIds = new Set(
    readdirSync(resolve(root, 'public/views/games'))
        .filter((entry) => entry.endsWith('.html'))
        .map((entry) => entry.replace(/\.html$/u, '')),
);

gameMetaIds.forEach((gameId) => {
    if (!supportedGameIds.has(gameId)) {
        fail(`GAME_META entry "${gameId}" is not wired into the game runner contract.`);
    }
    if (!gameViewIds.has(gameId)) {
        fail(`GAME_META entry "${gameId}" is missing public/views/games/${gameId}.html.`);
    }
});

supportedGameIds.forEach((gameId) => {
    if (!(gameId in (gameConfigModule.GAME_META || {}))) {
        fail(`Game runner contract entry "${gameId}" is missing from GAME_META.`);
    }
});

const routesSource = readText('src/routes.jsx');
const routePaths = new Set(
    [...routesSource.matchAll(/path:\s*'([^']+)'/gu)]
        .map((match) => match[1])
        .filter(Boolean)
        .map((route) => `/${route}`),
);
routePaths.add('/home');
routePaths.add('/');

const hasRoute = (route) => {
    if (routePaths.has(route)) return true;
    if (route.startsWith('/games/') && routePaths.has('/games/:gameId')) return true;
    if (route.startsWith('/songs/') && routePaths.has('/songs/:songId')) return true;
    if (route.startsWith('/songs/') && route.includes('/play') && routePaths.has('/songs/:songId/play')) return true;
    return false;
};

const toolLinks = toolsContract.TOOL_HUB_LINKS || [];
if (toolLinks.length !== 5) {
    fail(`Tools hub contract must expose 5 tool links. Found ${toolLinks.length}.`);
}

toolLinks.forEach((tool) => {
    if (!tool?.id || !tool?.to) {
        fail(`Invalid tool contract entry: ${JSON.stringify(tool)}.`);
        return;
    }
    if (!hasRoute(tool.to)) {
        fail(`Tool contract entry "${tool.id}" points to missing route "${tool.to}".`);
    }
});

const mapViewIdToRoute = (cta) => {
    if (cta === 'view-home') return '/home';
    if (cta === 'view-games') return '/games';
    if (cta === 'view-songs') return '/songs';
    if (cta === 'view-bowing') return '/tools/bowing';
    if (cta === 'view-posture') return '/tools/posture';
    if (cta === 'view-tuner') return '/tools/tuner';
    if (cta === 'view-trainer') return '/tools';
    if (cta.startsWith('view-game-')) {
        return `/games/${cta.replace('view-game-', '')}`;
    }
    return null;
};

['pitch', 'rhythm', 'bow_control', 'reading', 'posture'].forEach((weakestSkill) => {
    const plan = recommendationsPlan.buildLessonSteps({
        weakestSkill,
        skillScores: {
            pitch: 65,
            rhythm: 65,
            bow_control: 65,
            reading: 65,
            posture: 65,
        },
        recommendedGameId: 'pitch-quest',
        metronomeTarget: 90,
        songLevel: 'beginner',
        queuedGoals: [],
    });

    (plan?.steps || []).forEach((step) => {
        const route = mapViewIdToRoute(step.cta || '');
        if (!route || !hasRoute(route)) {
            fail(`Lesson step CTA "${step.cta}" for weakest skill "${weakestSkill}" does not map to a valid route.`);
        }
    });
});

const coachSongId = coachSongContract.pickCoachSongId({
    catalog: songsCatalog,
    progressState: null,
    preferredLabel: 'Play one beginner song slowly',
});

if (!coachSongId || !songIds.has(coachSongId)) {
    fail(`Coach embedded-song selector returned invalid song id "${coachSongId}".`);
}

if (failures.length > 0) {
    console.error('Feature parity audit failed:');
    failures.forEach((message) => console.error(`- ${message}`));
    process.exit(1);
}

console.log('Feature parity audit passed.');
