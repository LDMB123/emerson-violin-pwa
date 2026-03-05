import { BaseCanvasEngine } from './canvas-engine-base.js';
import { bindRunningMappedCanvasPointerDrag } from './canvas-pointer-bindings.js';

export class DragCanvasEngineBase extends BaseCanvasEngine {
    constructor(canvas, onScoreUpdate) {
        super(canvas);
        this.onScoreUpdate = onScoreUpdate;
    }

    bindMappedDrag({
        isTracking,
        onStart,
        onMove,
        onEnd,
    } = {}) {
        this.cleanupEvents = bindRunningMappedCanvasPointerDrag({
            engine: this,
            isTracking,
            onStart,
            onMove,
            onEnd,
        });
    }

    notifyScoreUpdate(...args) {
        if (this.onScoreUpdate) {
            this.onScoreUpdate(...args);
        }
    }
}
