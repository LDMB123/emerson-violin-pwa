import { createGame } from './game-shell.js';
import { createPlaybackRuntime, bindVisibilityLifecycle } from './game-interactive-runtime.js';
import {
    cachedEl,
    markChecklist,
    markChecklistIf,
    getTonePlayer,
    bindSoundsChange,
} from './shared.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { createStorySongView } from './story-song-view.js';
import {
    syncStorySongGameState,
    computeStorySongProgressAfterPage,
    resetStorySongProgressState,
} from './story-song-progress.js';
import { STORY_SONG_PAGES } from './story-song-pages.js';
import { stopStorySongPlayback } from './story-song-controls.js';
import { playStorySongPages } from './story-song-playback-loop.js';
import {
    prepareStorySongPlayback,
    finalizeStorySongPlayback,
} from './story-song-session.js';
import { createStorySongVisibilityHandlers } from './story-song-visibility.js';

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

const { bind } = createGame({
    id: 'story-song',
    computeAccuracy: (state) => state._storyPages?.length
        ? (state._completedPages / state._storyPages.length) * 100
        : 0,
    onReset: (gameState) => {
        // Don't interrupt active playback on tuning change
        if (gameState._isPlaying) return;
        syncStorySongGameState({
            gameState,
            pageIndex: 0,
            completedNotes: 0,
            completedPages: 0,
            score: 0,
        });
        if (gameState._updatePage) gameState._updatePage(0);
        if (gameState._updateStatus) gameState._updateStatus('Press Play-Along to start.');
    },
    onBind: (stage, difficulty, { reportSession, gameState, registerCleanup }) => {
        const toggle = stage.querySelector('#story-play');
        const statusEl = stage.querySelector('[data-story="status"]');
        const titleEl = stage.querySelector('[data-story="title"]');
        const pageEl = stage.querySelector('[data-story="page"]');
        const notesEl = stage.querySelector('[data-story="notes"]');
        const promptEl = stage.querySelector('[data-story="prompt"]');
        const storyPages = STORY_SONG_PAGES;

        // difficulty.speed: scales playback tempo; speed=1.0 keeps tempo=92 BPM (current behavior)
        // difficulty.complexity: visual feedback only (pages are fixed); speed scales tempo
        const stageSeconds = 4;
        const tempo = Math.round(92 * difficulty.speed);
        let wasPlaying = false;
        let pageIndex = 0;
        let completedNotes = 0;
        let completedPages = 0;
        const playback = createPlaybackRuntime();

        // Initialize gameState
        gameState._storyPages = storyPages;
        syncStorySongGameState({
            gameState,
            pageIndex,
            completedNotes,
            completedPages,
            isPlaying: playback.playing,
            score: 0,
        });

        const { updateStatus, updatePage } = createStorySongView({
            titleEl,
            pageEl,
            notesEl,
            promptEl,
            statusEl,
            toggle,
            storyPages,
        });

        const stopPlayback = ({ keepToggle = false, message } = {}) => {
            stopStorySongPlayback({
                playback,
                toggle,
                keepToggle,
                message,
                updateStatus,
                setIsPlaying: (isPlaying) => {
                    syncStorySongGameState({ gameState, isPlaying });
                },
            });
        };

        gameState._onDeactivate = () => {
            if (!playback.playing && !toggle?.checked) return;
            stopPlayback({ message: 'Play-along paused.' });
        };

        const resetStoryProgress = () => {
            resetStorySongProgressState({
                gameState,
                setPageIndex: (value) => {
                    pageIndex = value;
                },
                setCompletedNotes: (value) => {
                    completedNotes = value;
                },
                setCompletedPages: (value) => {
                    completedPages = value;
                },
            });
        };

        const resetStory = () => {
            resetStoryProgress();
            updatePage(0);
            updateStatus('Press Play-Along to start.');
        };

        // Store helpers for onReset
        gameState._updatePage = updatePage;
        gameState._updateStatus = updateStatus;

        const playStory = async () => {
            const session = prepareStorySongPlayback({
                toggle,
                isSoundEnabled,
                stopPlayback,
                getPlayer: getTonePlayer,
                pageIndex,
                storyPagesLength: storyPages.length,
                hasReported: Boolean(gameState._reported),
                resetStoryProgress,
                playback,
                syncIsPlaying: (isPlaying) => {
                    syncStorySongGameState({ gameState, isPlaying });
                },
                markChecklist,
                updateStatus,
            });
            if (!session) return;
            await playStorySongPages({
                player: session.player,
                token: session.token,
                getPageIndex: () => pageIndex,
                setPageIndex: (value) => {
                    pageIndex = value;
                    syncStorySongGameState({ gameState, pageIndex });
                },
                storyPages,
                isPlaybackCurrent: (tokenValue) => playback.isCurrent(tokenValue),
                isToggleChecked: () => Boolean(toggle?.checked),
                updatePage,
                tempo,
                stageSeconds,
                onPageCompleted: ({ page, pageIndex: completedPageIndex }) => {
                    const nextProgress = computeStorySongProgressAfterPage({
                        completedNotes,
                        completedPages,
                        pageIndex: completedPageIndex,
                        noteCount: page.notes.length,
                    });
                    completedNotes = nextProgress.completedNotes;
                    completedPages = nextProgress.completedPages;
                    syncStorySongGameState({
                        gameState,
                        completedNotes,
                        completedPages,
                        score: nextProgress.score,
                    });
                    markChecklistIf(page.notes.length >= 4, 'ss-step-2');
                    markChecklist('ss-step-3');
                },
            });
            finalizeStorySongPlayback({
                token: session.token,
                playback,
                syncIsPlaying: (isPlaying) => {
                    syncStorySongGameState({ gameState, isPlaying });
                },
                pageIndex,
                storyPagesLength: storyPages.length,
                toggle,
                updateStatus,
                reportSession,
            });
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
        updatePage(0);
        updateStatus();

        const soundsHandler = (event) => {
            if (event.detail?.enabled === false) {
                stopPlayback({ message: 'Sounds are off. Enable Sounds to play along.' });
            } else if (event.detail?.enabled === true) {
                updateStatus('Sounds on. Tap Play-Along to start.');
            }
        };
        bindSoundsChange(soundsHandler, registerCleanup);

        const visibilityHandlers = createStorySongVisibilityHandlers({
            toggle,
            stopPlayback,
            statusEl,
            getWasPlaying: () => wasPlaying,
            setWasPlaying: (value) => {
                wasPlaying = value;
            },
        });
        bindVisibilityLifecycle({
            onHidden: visibilityHandlers.onHidden,
            onVisible: visibilityHandlers.onVisible,
            registerCleanup,
        });
    },
});

export { updateStorySong as update, bind };
