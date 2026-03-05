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

export const bindCanvasPointerDrag = ({
    canvas,
    canStart = () => true,
    isTracking = () => true,
    onStart = () => {},
    onMove = () => {},
    onEnd = () => {},
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
