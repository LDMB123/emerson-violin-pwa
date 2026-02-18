import {
    cachedEl,
    markChecklist,
    markChecklistIf,
    setDifficultyBadge,
    recordGameEvent,
    attachTuning,
    getTonePlayer,
    stopTonePlayer,
} from './shared.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { SOUNDS_CHANGE } from '../utils/event-names.js';

const storyTitleEl = cachedEl('#view-game-story-song [data-story="title"]');

const updateStorySong = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-story-song input[id^="ss-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const titleEl = storyTitleEl();
    if (titleEl) {
        titleEl.textContent = checked === inputs.length ? 'Story Song Lab · Complete!' : 'Story Song Lab';
    }
};

const bindStorySong = (difficulty = { speed: 1.0, complexity: 1 }) => {
    const stage = document.querySelector('#view-game-story-song');
    if (!stage) return;
    const toggle = stage.querySelector('#story-play');
    const statusEl = stage.querySelector('[data-story="status"]');
    const titleEl = stage.querySelector('[data-story="title"]');
    const pageEl = stage.querySelector('[data-story="page"]');
    const notesEl = stage.querySelector('[data-story="notes"]');
    const promptEl = stage.querySelector('[data-story="prompt"]');
    const storyPages = [
        {
            title: 'Open String Overture',
            prompt: 'Warm up with your open strings.',
            notes: ['G', 'D', 'A', 'E'],
        },
        {
            title: 'Fingerboard Sparkle',
            prompt: 'Climb gently with first-finger steps.',
            notes: ['G', 'A', 'B', 'C'],
        },
        {
            title: 'Finale Glow',
            prompt: 'Resolve with a soft descent.',
            notes: ['D', 'C', 'B', 'A'],
        },
    ];
    // difficulty.speed: scales playback tempo; speed=1.0 keeps tempo=92 BPM (current behavior)
    // difficulty.complexity: visual feedback only (pages are fixed); speed scales tempo
    let stageSeconds = 4;
    let tempo = Math.round(92 * difficulty.speed);
    let reported = false;
    let wasPlaying = false;
    let pageIndex = 0;
    let completedNotes = 0;
    let completedPages = 0;
    let playToken = 0;

    const updateStatus = (message) => {
        if (!statusEl) return;
        if (message) {
            statusEl.textContent = message;
            return;
        }
        statusEl.textContent = toggle?.checked
            ? 'Play-along running — follow the notes.'
            : 'Press Play-Along to start.';
    };

    const updatePage = (index = pageIndex) => {
        const page = storyPages[index];
        if (titleEl) {
            titleEl.textContent = page ? `Story Song Lab · ${page.title}` : 'Story Song Lab';
        }
        if (pageEl) {
            pageEl.textContent = page ? `Page ${index + 1} of ${storyPages.length}` : '';
        }
        if (notesEl) {
            notesEl.textContent = page ? page.notes.join(' · ') : '♪ ♪ ♪';
        }
        if (promptEl) {
            promptEl.textContent = page ? page.prompt : 'Warm up with your open strings.';
        }
    };

    const stopPlayback = ({ keepToggle = false, message } = {}) => {
        playToken += 1;
        stopTonePlayer();
        if (!keepToggle && toggle) {
            toggle.checked = false;
        }
        if (message) {
            updateStatus(message);
        }
    };

    const reportResult = attachTuning('story-song', (tuning) => {
        stageSeconds = tuning.stageSeconds ?? stageSeconds;
        tempo = tuning.tempo ?? tuning.storyTempo ?? tempo;
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
        updatePage();
    });

    const reportSession = () => {
        if (reported) return;
        if (completedPages === 0) return;
        reported = true;
        const accuracy = storyPages.length ? (completedPages / storyPages.length) * 100 : 0;
        const score = completedNotes * 12 + completedPages * 40;
        reportResult({ accuracy, score });
        recordGameEvent('story-song', { accuracy, score });
    };

    const resetStory = () => {
        pageIndex = 0;
        completedNotes = 0;
        completedPages = 0;
        reported = false;
        updatePage();
        updateStatus('Press Play-Along to start.');
    };

    const playStory = async () => {
        if (!toggle || !toggle.checked) return;
        if (!isSoundEnabled()) {
            stopPlayback({ message: 'Sounds are off. Enable Sounds to play along.' });
            return;
        }
        const player = getTonePlayer();
        if (!player) {
            stopPlayback({ message: 'Audio is unavailable on this device.' });
            return;
        }
        if (pageIndex >= storyPages.length || reported) {
            pageIndex = 0;
            completedNotes = 0;
            completedPages = 0;
            reported = false;
        }
        const token = ++playToken;
        markChecklist('ss-step-1');
        updateStatus('Play-along running — follow the notes.');

        while (pageIndex < storyPages.length) {
            if (token !== playToken || !toggle.checked) break;
            const page = storyPages[pageIndex];
            updatePage(pageIndex);
            const played = await player.playSequence(page.notes, {
                tempo: page.tempo ?? tempo,
                gap: 0.12,
                duration: 0.4,
                volume: 0.2,
                type: 'triangle',
            });
            if (!played || token !== playToken || !toggle.checked) break;
            completedNotes += page.notes.length;
            completedPages = Math.max(completedPages, pageIndex + 1);
            markChecklistIf(page.notes.length >= 4, 'ss-step-2');
            markChecklist('ss-step-3');
            pageIndex += 1;
            if (pageIndex < storyPages.length) {
                await new Promise((resolve) => setTimeout(resolve, Math.max(400, stageSeconds * 250)));
            }
        }

        if (token !== playToken) return;
        if (pageIndex >= storyPages.length) {
            updateStatus('Story complete! Tap Play-Along to replay.');
            if (toggle) toggle.checked = false;
            reportSession();
        } else if (!toggle.checked) {
            updateStatus('Play-along paused. Tap Play-Along to resume.');
        } else {
            updateStatus('Play-along ready. Tap Play-Along to continue.');
        }
    };

    toggle?.addEventListener('change', () => {
        if (toggle.checked) {
            if (completedPages === 0) {
                resetStory();
            }
            playStory();
        } else {
            markChecklist('ss-step-4');
            stopPlayback({ keepToggle: true, message: 'Play-along paused. Tap Play-Along to resume.' });
            reportSession();
        }
    });
    updatePage();
    updateStatus();

    document.addEventListener(SOUNDS_CHANGE, (event) => {
        if (event.detail?.enabled === false) {
            stopPlayback({ message: 'Sounds are off. Enable Sounds to play along.' });
        } else if (event.detail?.enabled === true) {
            updateStatus('Sounds on. Tap Play-Along to start.');
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (!toggle) return;
        if (document.hidden) {
            wasPlaying = toggle.checked;
            stopPlayback({ message: 'Play-along paused.' });
        } else if (wasPlaying) {
            wasPlaying = false;
            if (statusEl) {
                statusEl.textContent = 'Play-along paused. Tap Play-Along to resume.';
            }
        }
    });

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#view-game-story-song') {
            resetStory();
            return;
        }
        stopPlayback();
        reportSession();
    }, { passive: true });
};

export { updateStorySong as update, bindStorySong as bind };
