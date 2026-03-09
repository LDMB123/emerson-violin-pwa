import React, { useEffect, useRef, useCallback } from 'react';
import { GAME_RECORDED } from '../../utils/event-names.js';
import { useAppEvent } from '../../hooks/useAppEvent.js';

/**
 * A native React implementation of the `canvas-engine-base.js` wrapper.
 * It provides the required DOM container API to legacy Canvas/WASM engines 
 * without triggering React state re-renders across 120fps physics loops.
 */
export function CanvasGameRunner({ gameId, bindCanvasEngine, onFinish, readyKey = 'ready', children }) {
    const containerRef = useRef(null);

    const handleGameRecorded = useCallback((e) => {
        if (onFinish) {
            onFinish(e.detail);
        }
    }, [onFinish]);

    useAppEvent(GAME_RECORDED, handleGameRecorded);

    useEffect(() => {
        if (!containerRef.current) return;
        if (typeof bindCanvasEngine !== 'function') return;

        const difficultyProfile = { speed: 1.0, complexity: 1.0 }; // Standard fallback

        // Bind the legacy Canvas Engine. The exported `bind` function inherently queries
        // `#view-game-${gameId}` and manages its own global `gameState` and reporting.
        if (bindCanvasEngine) {
            bindCanvasEngine(difficultyProfile);
        }

        return () => {
            // Dispatch a fake hashchange so createGame's bindGameSessionLifecycle 
            // tears down the engine natively.
            window.dispatchEvent(new Event('hashchange'));
        };
    }, [bindCanvasEngine, gameId, readyKey]);

    return (
        <div ref={containerRef} data-game-stage={gameId} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: '#000' }}>
            {/* The legacy DOM nodes expected by the specific game binding */}
            {children}
        </div>
    );
}
