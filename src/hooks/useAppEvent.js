// src/hooks/useAppEvent.js
import { useEffect } from 'react';
import { AppEventBus } from '../utils/AppEventBus.js';

/**
 * React Hook for strongly-typed subscription to the AppEventBus.
 * Auto-cleans up the listener on component unmount.
 * 
 * @param {string} eventName - The name of the event to listen for
 * @param {function} handler - Callback receiving the CustomEvent
 */
export function useAppEvent(eventName, handler) {
    useEffect(() => {
        if (!eventName || typeof handler !== 'function') return;

        AppEventBus.addEventListener(eventName, handler);
        return () => {
            AppEventBus.removeEventListener(eventName, handler);
        };
    }, [eventName, handler]);
}
