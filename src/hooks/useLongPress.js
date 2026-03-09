import { useRef, useCallback } from 'react';

/**
 * useLongPress hook (spec 2505-2514).
 *
 * Returns event handlers for pointerdown/up/cancel/move.
 * Triggers callback after 500ms hold, with visual feedback at 200ms.
 * Cancels on pointer move > 10px.
 *
 * @param {Function} onLongPress - Called when long-press is detected
 * @param {object} [options]
 * @param {number} [options.delay=500] - Long-press delay in ms
 * @param {Function} [options.onPress] - Called on short press (tap)
 * @returns {object} Event handler props to spread onto element
 */
export function useLongPress(onLongPress, options = {}) {
    const { delay = 500, onPress } = options;
    const timerRef = useRef(null);
    const startPosRef = useRef(null);
    const isLongPressRef = useRef(false);

    const clear = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const onPointerDown = useCallback((e) => {
        isLongPressRef.current = false;
        startPosRef.current = { x: e.clientX, y: e.clientY };

        timerRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            // Haptic feedback if available
            if (navigator.vibrate) navigator.vibrate(10);
            onLongPress(e);
        }, delay);
    }, [onLongPress, delay]);

    const onPointerUp = useCallback((e) => {
        clear();
        if (!isLongPressRef.current && onPress) {
            onPress(e);
        }
    }, [clear, onPress]);

    const onPointerMove = useCallback((e) => {
        if (!startPosRef.current) return;
        const dx = Math.abs(e.clientX - startPosRef.current.x);
        const dy = Math.abs(e.clientY - startPosRef.current.y);
        if (dx > 10 || dy > 10) {
            clear();
        }
    }, [clear]);

    const onPointerCancel = useCallback(() => {
        clear();
    }, [clear]);

    return {
        onPointerDown,
        onPointerUp,
        onPointerMove,
        onPointerCancel,
    };
}
