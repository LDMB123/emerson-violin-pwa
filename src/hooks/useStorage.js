import { useState, useEffect, useCallback } from 'react';

function useStorage(key, initialValue, storageObj) {
    // Lazy initialisation to prevent sync block on first render
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = storageObj.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Error reading ${key} from storage:`, error);
            return initialValue;
        }
    });

    const setValue = useCallback((value) => {
        try {
            // Allow value to be a function so we have same API as useState
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (valueToStore === undefined || valueToStore === null) {
                storageObj.removeItem(key);
            } else {
                storageObj.setItem(key, JSON.stringify(valueToStore));
            }
            // Dispatch a custom event to sync other components in the same tab
            window.dispatchEvent(new CustomEvent('local-storage', { detail: { key, newValue: valueToStore } }));
        } catch (error) {
            console.warn(`Error setting ${key} to storage:`, error);
        }
    }, [key, storedValue, storageObj]);

    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === key && e.newValue !== null) {
                try {
                    setStoredValue(JSON.parse(e.newValue));
                } catch {
                    setStoredValue(e.newValue);
                }
            } else if (e.key === key && e.newValue === null) {
                setStoredValue(initialValue);
            }
        };

        const handleCustomEvent = (e) => {
            if (e.detail.key === key) {
                setStoredValue(e.detail.newValue);
            }
        };

        // Standard StorageEvent handles cross-tab sync
        window.addEventListener('storage', handleStorageChange);
        // Custom event handles same-tab inner-component sync
        window.addEventListener('local-storage', handleCustomEvent);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('local-storage', handleCustomEvent);
        };
    }, [key, initialValue]);

    return [storedValue, setValue];
}

export function useLocalStorage(key, initialValue) {
    return useStorage(key, initialValue, typeof window !== 'undefined' ? window.localStorage : null);
}

export function useSessionStorage(key, initialValue) {
    return useStorage(key, initialValue, typeof window !== 'undefined' ? window.sessionStorage : null);
}
