// src/utils/AppEventBus.js

/**
 * AppEventBus
 * 
 * A centralized, typed EventTarget wrapper to migrate away from pervasive
 * document.addEventListener / document.dispatchEvent usage.
 * 
 * Supports "dual-emit" during the migration period: emitting on both this 
 * bus and the document so legacy vanilla JS modules still receive events.
 */

class EventBus extends EventTarget {
    /**
     * Emits a custom event with typed detail payload.
     * @param {string} eventName 
     * @param {any} [detail]
     * @param {boolean} [dualEmit=true] If true, also dispatches on document for legacy compat.
     */
    emit(eventName, detail = null, dualEmit = true) {
        const event = new CustomEvent(eventName, { detail });
        this.dispatchEvent(event);

        if (dualEmit) {
            // Emulate the exact same event on document for legacy receivers
            document.dispatchEvent(new CustomEvent(eventName, { detail }));
        }
    }
}

export const AppEventBus = new EventBus();

// Global for debugging if needed
window.__AppEventBus = AppEventBus;
