import { createIntervalTicker } from './interval-ticker.js';
import {
    COUNTDOWN_TICK_MS,
    toRemainingCountdownSeconds,
} from './countdown-utils.js';

/**
 * Creates a reusable countdown lifecycle with publish, pause, and resume
 * behavior shared across timers.
 *
 * @param {Object} options
 * @param {() => number} options.getRemainingSeconds
 * @param {(seconds: number) => void} options.setRemainingSeconds
 * @param {(seconds: number) => void} options.onPublish
 * @param {(() => void) | undefined} [options.onElapsed]
 * @param {((now: number, remainingSeconds: number) => void) | undefined} [options.onTick]
 * @param {(() => void) | undefined} [options.onStart]
 * @param {(() => void) | undefined} [options.onPause]
 * @param {() => boolean} [options.canResume=() => true]
 * @param {() => number} [options.now=() => Date.now()]
 * @param {((timerId: number | null) => void) | undefined} [options.setTimerHandle]
 * @param {typeof setInterval | undefined} [options.setIntervalFn]
 * @param {typeof clearInterval | undefined} [options.clearIntervalFn]
 * @returns {{
 *   start: (options?: { resetPublished?: boolean }) => boolean,
 *   stop: () => void,
 *   pause: () => boolean,
 *   resume: (options?: { beforeStart?: (() => void), resetPublished?: boolean }) => boolean,
 *   isRunning: () => boolean,
 *   resetPublished: () => void,
 *   clearPaused: () => void
 * }}
 */
export const createCountdownLifecycle = ({
    getRemainingSeconds,
    setRemainingSeconds,
    onPublish,
    onElapsed,
    onTick,
    onStart,
    onPause,
    canResume = () => true,
    now = () => Date.now(),
    setTimerHandle,
    setIntervalFn,
    clearIntervalFn,
}) => {
    let endTime = null;
    let paused = false;
    let lastPublishedRemaining = null;

    const publishTimerHandle = () => {
        if (!setTimerHandle) return;
        setTimerHandle(ticker.getId());
    };

    const publishRemaining = (nextRemaining) => {
        if (nextRemaining === lastPublishedRemaining) return false;
        lastPublishedRemaining = nextRemaining;
        setRemainingSeconds(nextRemaining);
        onPublish(nextRemaining);
        return true;
    };

    const stop = () => {
        ticker.stop();
        endTime = null;
        publishTimerHandle();
    };

    const tick = () => {
        if (!endTime) return;
        const currentNow = now();
        const nextRemaining = toRemainingCountdownSeconds(endTime, currentNow);
        publishRemaining(nextRemaining);
        onTick?.(currentNow, nextRemaining);
        if (nextRemaining > 0) return;
        stop();
        onElapsed?.();
    };

    const ticker = createIntervalTicker({
        onTick: tick,
        intervalMs: COUNTDOWN_TICK_MS,
        setIntervalFn,
        clearIntervalFn,
    });

    const start = ({ resetPublished = false } = {}) => {
        if (ticker.isRunning()) return false;
        paused = false;
        if (resetPublished) {
            lastPublishedRemaining = null;
        }
        const nextRemaining = getRemainingSeconds();
        endTime = now() + nextRemaining * 1000;
        const started = ticker.start();
        publishTimerHandle();
        publishRemaining(nextRemaining);
        if (started) onStart?.();
        return started;
    };

    const pause = () => {
        if (!ticker.isRunning()) return false;
        if (endTime) {
            const nextRemaining = toRemainingCountdownSeconds(endTime, now());
            publishRemaining(nextRemaining);
        }
        stop();
        paused = true;
        onPause?.();
        return true;
    };

    const resume = ({ beforeStart, resetPublished = false } = {}) => {
        if (!paused) return false;
        if (!canResume()) return false;
        if (getRemainingSeconds() <= 0) return false;
        beforeStart?.();
        return start({ resetPublished });
    };

    return {
        start,
        stop,
        pause,
        resume,
        isRunning: ticker.isRunning,
        resetPublished: () => {
            lastPublishedRemaining = null;
        },
        clearPaused: () => {
            paused = false;
        },
    };
};
