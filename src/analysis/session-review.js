import initCore, { SkillProfile, SkillCategory } from '../wasm/panda_core.js';
import { getLearningRecommendations } from '../ml/recommendations.js';
import { getJSON, getBlob } from '../persistence/storage.js';
import { createSkillProfileUtils } from '../utils/skill-profile.js';
import { exportRecording } from '../utils/recording-export.js';

const EVENT_KEY = 'panda-violin:events:v1';
const RECORDINGS_KEY = 'panda-violin:recordings:v1';

const { clamp, updateSkillProfile } = createSkillProfileUtils(SkillCategory);

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
let playbackUrl = '';
let currentRecordings = [];

playbackAudio.preload = 'none';

const todayDay = () => Math.floor(Date.now() / 86400000);
const isSoundEnabled = () => document.documentElement?.dataset?.sounds !== 'off';

const updatePlaybackButtons = (enabled) => {
    recordingEls.forEach((el) => {
        const button = el.querySelector('.recording-play');
        if (!button || button.dataset.recordingAvailable !== 'true') return;
        button.disabled = !enabled;
    });
};

const syncPlaybackSound = (enabled = isSoundEnabled()) => {
    playbackAudio.muted = !enabled;
    updatePlaybackButtons(enabled);
};

const stopPlayback = () => {
    if (!playbackAudio) return;
    if (!playbackAudio.paused) {
        playbackAudio.pause();
        playbackAudio.currentTime = 0;
    }
    if (playbackUrl) {
        URL.revokeObjectURL(playbackUrl);
        playbackUrl = '';
    }
};

const loadEvents = async () => {
    const stored = await getJSON(EVENT_KEY);
    return Array.isArray(stored) ? stored : [];
};

const loadRecordings = async () => {
    const stored = await getJSON(RECORDINGS_KEY);
    return Array.isArray(stored) ? stored : [];
};

const resolveRecordingSource = async (recording) => {
    if (!recording) return null;
    if (recording.dataUrl) return { url: recording.dataUrl, revoke: false };
    if (recording.blobKey) {
        const blob = await getBlob(recording.blobKey);
        if (!blob) return null;
        return { url: URL.createObjectURL(blob), revoke: true };
    }
    return null;
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
    currentRecordings = recentRecordings;
    const recent = events.filter((event) => event.type === 'song').slice(-2).reverse();
    recordingEls.forEach((el, index) => {
        const playButton = el.querySelector('.recording-play');
        const saveButton = el.querySelector('.recording-save');
        const item = recent[index];
        const titleEl = el.querySelector('[data-analysis="recording-title"]');
        const subEl = el.querySelector('[data-analysis="recording-sub"]');
        const recording = recentRecordings[index];

        if (recording?.dataUrl || recording?.blobKey) {
            if (titleEl) titleEl.textContent = recording.title || `Recording ${index + 1}`;
            if (subEl) subEl.textContent = `Saved clip · ${recording.duration || 0}s`;
            if (playButton) {
                playButton.disabled = !isSoundEnabled();
                playButton.dataset.recordingAvailable = 'true';
                playButton.dataset.recordingIndex = String(index);
            }
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.dataset.recordingIndex = String(index);
            }
            return;
        }

        if (!item) {
            if (titleEl) titleEl.textContent = 'Recording';
            if (subEl) subEl.textContent = 'No recent play';
            if (playButton) playButton.disabled = true;
            if (saveButton) saveButton.disabled = true;
            return;
        }
        const name = songMap.get(item.id) || item.id;
        if (titleEl) titleEl.textContent = 'Recent Play';
        if (subEl) subEl.textContent = `${name} · ${Math.round(item.accuracy || 0)}%`;
        if (playButton) {
            playButton.disabled = true;
            delete playButton.dataset.recordingAvailable;
        }
        if (saveButton) saveButton.disabled = true;
    });
};

const bindRecordingPlayback = () => {
    syncPlaybackSound();
    if (!soundListenerBound) {
        soundListenerBound = true;
        document.addEventListener('panda:sounds-change', (event) => {
            const enabled = event.detail?.enabled;
            syncPlaybackSound(enabled);
            if (!enabled) stopPlayback();
        });
    }
    recordingEls.forEach((el, index) => {
        const button = el.querySelector('.recording-play');
        if (!button || button.dataset.bound === 'true') return;
        button.dataset.bound = 'true';
        button.addEventListener('click', async () => {
            if (!isSoundEnabled()) return;
            const recording = currentRecordings[index];
            if (!recording?.dataUrl && !recording?.blobKey) return;
            const source = await resolveRecordingSource(recording);
            if (!source) return;
            stopPlayback();
            playbackAudio.src = source.url;
            if (source.revoke) {
                playbackUrl = source.url;
                playbackAudio.addEventListener('ended', () => stopPlayback(), { once: true });
            }
            syncPlaybackSound();
            playbackAudio.play().catch(() => {});
        });
    });
};

const bindRecordingExport = () => {
    recordingEls.forEach((el, index) => {
        const button = el.querySelector('.recording-save');
        if (!button || button.dataset.exportBound === 'true') return;
        button.dataset.exportBound = 'true';
        button.addEventListener('click', async () => {
            if (button.disabled) return;
            const recording = currentRecordings[index];
            if (!recording?.dataUrl && !recording?.blobKey) return;
            button.disabled = true;
            const original = button.textContent;
            button.textContent = '…';
            try {
                const blob = recording.blobKey ? await getBlob(recording.blobKey) : null;
                await exportRecording(recording, index, blob);
                button.textContent = '✓';
            } catch {
                button.textContent = '!';
            } finally {
                setTimeout(() => {
                    button.textContent = original || '⬇';
                    button.disabled = false;
                }, 1200);
            }
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
    bindRecordingPlayback();
    bindRecordingExport();

    const refreshRecordings = async () => {
        stopPlayback();
        const fresh = await loadRecordings();
        updateRecordings(events, songMap, fresh);
        bindRecordingPlayback();
        bindRecordingExport();
    };
    window.addEventListener('panda:recordings-updated', refreshRecordings);
    window.addEventListener('hashchange', stopPlayback, { passive: true });
    window.addEventListener('pagehide', stopPlayback, { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopPlayback();
    });

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

    const recs = await getLearningRecommendations();
    if (recs?.coachMessage && coachMessageEl) {
        coachMessageEl.textContent = recs.coachMessage;
    }
    if (recs?.coachActionMessage && coachAltEl) {
        coachAltEl.textContent = recs.coachActionMessage;
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSessionReview);
} else {
    initSessionReview();
}
