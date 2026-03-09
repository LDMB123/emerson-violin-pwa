import { useState, useEffect } from 'react';
import { loadEvents } from '../persistence/loaders.js';
import { buildProgress } from '../progress/progress-model.js';
import { PRACTICE_RECORDED, GAME_RECORDED, GOAL_TARGET_CHANGE } from '../utils/event-names.js';

/**
 * A React Hook that bridges the WASM-calculated progress model into React state.
 * Specifically updates when standard application DOM events (like PRACTICE_RECORDED) fire.
 */
export function useProgressSummary() {
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const fetchProgress = async () => {
            try {
                const events = await loadEvents();
                const prog = await buildProgress(events);
                if (mounted) {
                    setSummary(prog);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Failed to load progress', err);
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchProgress();

        const handleUpdate = () => {
            fetchProgress();
        };

        // Listen for legacy DOM events to trigger re-renders natively inside React
        document.addEventListener(PRACTICE_RECORDED, handleUpdate);
        document.addEventListener(GAME_RECORDED, handleUpdate);
        document.addEventListener(GOAL_TARGET_CHANGE, handleUpdate);

        return () => {
            mounted = false;
            document.removeEventListener(PRACTICE_RECORDED, handleUpdate);
            document.removeEventListener(GAME_RECORDED, handleUpdate);
            document.removeEventListener(GOAL_TARGET_CHANGE, handleUpdate);
        };
    }, []);

    return { summary, isLoading };
}
