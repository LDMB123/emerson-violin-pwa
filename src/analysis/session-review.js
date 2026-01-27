import initCore, { SkillProfile, SkillCategory } from '../wasm/panda_core.js';
import { getJSON } from '../persistence/storage.js';

const EVENT_KEY = 'panda-violin:events:v1';
const RECORDINGS_KEY = 'panda-violin:recordings:v1';

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const chartLine = document.querySelector('[data-analysis="chart-line"]');
const chartPoints = document.querySelector('[data-analysis="chart-points"]');
const chartCaption = document.querySelector('[data-analysis="chart-caption"]');
const minutesEl = document.querySelector('[data-analysis="minutes"]');
const accuracyEl = document.querySelector('[data-analysis="accuracy"]');
const coachMessageEl = document.querySelector('[data-analysis="coach-message"]');
const coachAltEl = document.querySelector('[data-analysis="coach-message-alt"]');
const recordingEls = Array.from(document.querySelectorAll('[data-analysis="recording"]'));
const skillEls = Array.from(document.querySelectorAll('[data-analysis="skill"]'));
const playbackAudio = new Audio();
let soundListenerBound = false;

const todayDay = () => Math.floor(Date.now() / 86400000);
const isSoundEnabled = () => document.documentElement?.dataset?.sounds !== 'off';

const syncPlaybackSound = (enabled = isSoundEnabled()) => {
    playbackAudio.muted = !enabled;
};

const loadEvents = async () => {
    const stored = await getJSON(EVENT_KEY);
    return Array.isArray(stored) ? stored : [];
};

const loadRecordings = async () => {
    const stored = await getJSON(RECORDINGS_KEY);
    return Array.isArray(stored) ? stored : [];
};

const scoreFromMinutes = (minutes, base = 54, step = 8) => {
    const score = base + minutes * step;
    return clamp(score);
};

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
    if (/^(goal-step-|parent-goal-)/.test(eventId) || /^goal-(warmup|scale|song)/.test(eventId)) {
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

const starString = (score) => {
    const stars = clamp(Math.round(score / 20), 1, 5);
    return '★★★★★'.slice(0, stars) + '☆☆☆☆☆'.slice(stars);
};

const coachMessageFor = (skill) => {
    switch (skill) {
        case 'pitch':
            return 'Great bowing arm! Try to keep your pitch steady through the middle section.';
        case 'rhythm':
            return 'Keep the pulse steady. Tap the rhythm before you play.';
        case 'bow_control':
            return 'Smooth bow path. Relax your hand and keep the bow straight.';
        case 'posture':
            return 'Tall spine and relaxed shoulders. Keep your wrists soft.';
        case 'reading':
            return 'Slow down and name each note before playing.';
        default:
            return 'Nice work today! Keep your tempo steady.';
    }
};

const buildChart = (values) => {
    const width = 320;
    const height = 180;
    const padding = 20;
    if (!values.length) return null;
    const step = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;
    const points = values.map((val, index) => {
        const x = padding + step * index;
        const y = padding + (1 - val / 100) * (height - padding * 2);
        return { x, y };
    });
    const path = points
        .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
        .join(' ');
    return { path, points };
};

const updateChart = (values) => {
    if (!chartLine || !chartPoints || !chartCaption) return;
    const chart = buildChart(values);
    if (!chart) return;
    chartLine.setAttribute('d', chart.path);
    chartPoints.innerHTML = '';
    chart.points.forEach((point) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x.toFixed(1));
        circle.setAttribute('cy', point.y.toFixed(1));
        circle.setAttribute('r', '6');
        chartPoints.appendChild(circle);
    });
    const latest = values[values.length - 1];
    chartCaption.textContent = latest >= 80 ? 'Great job!' : latest >= 60 ? 'Nice work!' : 'Keep practicing!';
};

const updateRecordings = (events, songMap, recordings) => {
    const recentRecordings = Array.isArray(recordings) ? recordings.slice(0, 2) : [];
    const recent = events.filter((event) => event.type === 'song').slice(-2).reverse();
    recordingEls.forEach((el, index) => {
        const playButton = el.querySelector('.recording-play');
        const item = recent[index];
        const titleEl = el.querySelector('[data-analysis="recording-title"]');
        const subEl = el.querySelector('[data-analysis="recording-sub"]');
        const recording = recentRecordings[index];

        if (recording?.dataUrl) {
            if (titleEl) titleEl.textContent = recording.title || `Recording ${index + 1}`;
            if (subEl) subEl.textContent = `Saved clip · ${recording.duration || 0}s`;
            if (playButton) {
                playButton.disabled = false;
                playButton.dataset.recordingIndex = String(index);
            }
            return;
        }

        if (!item) {
            if (titleEl) titleEl.textContent = 'Recording';
            if (subEl) subEl.textContent = 'No recent play';
            if (playButton) playButton.disabled = true;
            return;
        }
        const name = songMap.get(item.id) || item.id;
        if (titleEl) titleEl.textContent = 'Recent Play';
        if (subEl) subEl.textContent = `${name} · ${Math.round(item.accuracy || 0)}%`;
        if (playButton) playButton.disabled = true;
    });
};

const bindRecordingPlayback = (recordings) => {
    if (!Array.isArray(recordings) || !recordings.length) return;
    syncPlaybackSound();
    if (!soundListenerBound) {
        soundListenerBound = true;
        document.addEventListener('panda:sounds-change', (event) => {
            const enabled = event.detail?.enabled;
            syncPlaybackSound(enabled);
        });
    }
    recordingEls.forEach((el, index) => {
        const button = el.querySelector('.recording-play');
        if (!button || button.dataset.bound === 'true') return;
        const recording = recordings[index];
        if (!recording?.dataUrl) return;
        button.dataset.bound = 'true';
        button.addEventListener('click', () => {
            if (!isSoundEnabled()) return;
            playbackAudio.src = recording.dataUrl;
            syncPlaybackSound();
            playbackAudio.play().catch(() => {});
        });
    });
};

const updateSkills = (profile) => {
    const scoreMap = {
        bowing: profile.bow_control,
        fingering: profile.reading,
        rhythm: profile.rhythm,
        intonation: profile.pitch,
    };

    skillEls.forEach((el) => {
        const key = el.dataset.skill;
        const score = scoreMap[key] ?? 50;
        const starsEl = el.querySelector('[data-analysis="skill-stars"]');
        if (starsEl) starsEl.textContent = starString(score);
    });
};

const buildSongMap = () => {
    const map = new Map();
    document.querySelectorAll('.song-card[data-song]').forEach((card) => {
        const id = card.dataset.song;
        const title = card.querySelector('.song-title')?.textContent?.trim();
        if (id && title) map.set(id, title);
    });
    return map;
};

const initSessionReview = async () => {
    await initCore();
    const events = await loadEvents();
    const recordings = await loadRecordings();
    const songMap = buildSongMap();

    const songEvents = events.filter((event) => event.type === 'song');
    const recentAccuracies = songEvents.slice(-6).map((event) => clamp(event.accuracy || 0, 0, 100));
    if (recentAccuracies.length) updateChart(recentAccuracies);

    updateRecordings(events, songMap, recordings);
    bindRecordingPlayback(recordings);

    const refreshRecordings = async () => {
        const fresh = await loadRecordings();
        updateRecordings(events, songMap, fresh);
        bindRecordingPlayback(fresh);
    };
    window.addEventListener('panda:recordings-updated', refreshRecordings);

    const today = todayDay();
    const minutes = events.reduce((sum, event) => {
        if (event.day !== today) return sum;
        if (event.type === 'practice') return sum + (event.minutes || 0);
        if (event.type === 'song') return sum + Math.round((event.elapsed || event.duration || 0) / 60);
        return sum;
    }, 0);
    if (minutesEl) minutesEl.textContent = `${minutes} min`;

    const accuracyAvg = songEvents.length
        ? Math.round(songEvents.slice(-5).reduce((sum, event) => sum + (event.accuracy || 0), 0) / Math.min(5, songEvents.length))
        : 0;
    if (accuracyEl) accuracyEl.textContent = `${accuracyAvg}%`;

    const profile = new SkillProfile();
    events
        .filter((event) => event.type === 'practice')
        .forEach((event) => updateSkillProfile(profile, event.id, event.minutes || 0));

    songEvents.forEach((event) => {
        const accuracy = clamp(event.accuracy || 0, 0, 100);
        profile.update_skill(SkillCategory.Reading, clamp(accuracy, 30, 100));
        profile.update_skill(SkillCategory.Pitch, clamp(accuracy * 0.85, 25, 100));
    });

    events
        .filter((event) => event.type === 'game')
        .forEach((event) => {
            const score = clamp(event.accuracy || event.score || 0, 0, 100);
            if (event.id === 'rhythm-dash') profile.update_skill(SkillCategory.Rhythm, score);
            if (event.id === 'bow-hero') profile.update_skill(SkillCategory.BowControl, score);
        });

    updateSkills(profile);

    const weakest = profile.weakest_skill();
    const message = coachMessageFor(weakest);
    if (coachMessageEl) coachMessageEl.textContent = message;
    if (coachAltEl) coachAltEl.textContent = 'Keep your tempo steady and enjoy the melody.';
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSessionReview);
} else {
    initSessionReview();
}
