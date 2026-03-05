import { mapPointerToCanvasCoords } from '../utils/canvas-utils.js';

const resolveClientPoint = (event) => {
    if (event.touches && event.touches.length > 0) {
        return {
            clientX: event.touches[0].clientX,
            clientY: event.touches[0].clientY,
        };
    }

    return {
        clientX: event.clientX,
        clientY: event.clientY,
    };
};

const TRUE = () => true;
const NOOP = () => {};

const resolveRunningPointerOptions = (options = {}) => {
    return {
        engine: options.engine,
        isTracking: options.isTracking ?? TRUE,
        onStart: options.onStart ?? NOOP,
        onMove: options.onMove ?? NOOP,
        onEnd: options.onEnd ?? NOOP,
    };
};

/** Binds mouse and touch drag handling for a canvas-like interaction surface. */
export const bindCanvasPointerDrag = ({
    canvas,
    canStart = TRUE,
    isTracking = TRUE,
    onStart = NOOP,
    onMove = NOOP,
    onEnd = NOOP,
} = {}) => {
    if (!canvas) return () => {};

    const handlePointerMove = (event) => {
        if (!isTracking()) return;
        event.preventDefault();
        const { clientX, clientY } = resolveClientPoint(event);
        onMove({ clientX, clientY, event });
    };

    const handlePointerDown = (event) => {
        if (!canStart()) return;
        onStart(event);
        handlePointerMove(event);
    };

    const handlePointerUp = (event) => {
        onEnd(event);
    };

    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
    canvas.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
        canvas.removeEventListener('mousedown', handlePointerDown);
        canvas.removeEventListener('mousemove', handlePointerMove);
        window.removeEventListener('mouseup', handlePointerUp);
        canvas.removeEventListener('touchstart', handlePointerDown);
        canvas.removeEventListener('touchmove', handlePointerMove);
        window.removeEventListener('touchend', handlePointerUp);
    };
};

/** Binds canvas drag handling that only starts while the game engine is running. */
export const bindRunningCanvasPointerDrag = (options = {}) => {
    const { engine, isTracking, onStart, onMove, onEnd } = resolveRunningPointerOptions(options);
    return bindCanvasPointerDrag({
        canvas: engine?.canvas,
        canStart: () => Boolean(engine?.isRunning),
        isTracking,
        onStart,
        onMove,
        onEnd,
    });
};

/** Binds running canvas drag handling and maps client coordinates into canvas space. */
export const bindRunningMappedCanvasPointerDrag = (options = {}) => {
    const { engine, isTracking, onStart, onMove, onEnd } = resolveRunningPointerOptions(options);
    return bindRunningCanvasPointerDrag({
        engine,
        isTracking,
        onStart,
        onMove: ({ clientX, clientY, event }) => {
        const point = mapPointerToCanvasCoords(
            { clientX, clientY },
            engine?.canvas,
            engine?.width,
            engine?.height
        );
        onMove({
            ...point,
            clientX,
            clientY,
            event,
        });
    },
        onEnd,
    });
};
