import { calculateMetronomeBpm, shouldClearTapTimes } from './trainer-utils.js';
import { updateMetronomeSliderFill } from './metronome-controller-view.js';

export const bindMetronomeSliderControl = ({
    slider,
    updateBpm,
    markTouched,
    resetReported,
} = {}) => {
    if (!slider || slider.dataset.metronomeBound === 'true') return;
    slider.dataset.metronomeBound = 'true';
    slider.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        target.dataset.userSet = 'true';
        resetReported();
        markTouched();
        updateBpm(target.value);
        updateMetronomeSliderFill(target);
    });
};

export const bindMetronomeToggleControl = ({
    toggle,
    isRunning,
    stop,
    start,
    markTouched,
} = {}) => {
    if (!toggle || toggle.dataset.metronomeBound === 'true') return;
    toggle.dataset.metronomeBound = 'true';
    toggle.addEventListener('click', () => {
        if (isRunning()) {
            stop();
            return;
        }
        markTouched();
        start();
    });
};

const getNextTapTimes = ({ tapTimes, now }) => {
    const nextTapTimes = tapTimes.slice();
    if (nextTapTimes.length && shouldClearTapTimes(nextTapTimes[nextTapTimes.length - 1], now)) {
        return [now];
    }
    nextTapTimes.push(now);
    if (nextTapTimes.length > 5) {
        nextTapTimes.shift();
    }
    return nextTapTimes;
};

export const bindMetronomeTapControl = ({
    tap,
    slider,
    readTapTimes,
    writeTapTimes,
    updateBpm,
    setStatus,
    getCurrentBpm,
    report,
    markTouched,
    resetReported,
} = {}) => {
    if (!tap || tap.dataset.metronomeBound === 'true') return;
    tap.dataset.metronomeBound = 'true';
    tap.addEventListener('click', () => {
        const now = performance.now();
        const nextTapTimes = getNextTapTimes({ tapTimes: readTapTimes(), now });
        writeTapTimes(nextTapTimes);

        if (nextTapTimes.length < 2) {
            setStatus('Tap again to set tempo.');
            return;
        }

        const intervals = nextTapTimes.slice(1).map((time, index) => time - nextTapTimes[index]);
        const bpm = calculateMetronomeBpm(intervals);
        if (slider) {
            slider.dataset.userSet = 'true';
        }
        resetReported();
        markTouched();
        updateBpm(bpm);
        setStatus(`Tempo set to ${getCurrentBpm()} BPM.`);
        report();
    });
};
