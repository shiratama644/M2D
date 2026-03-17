'use client';

import { useState, useCallback } from 'react';

/**
 * Reads, writes, and removes a value from localStorage while keeping a
 * matching React state value in sync.
 *
 * - Primitive values (string, number, boolean) are stored/restored as-is.
 * - All other values are JSON-serialised.
 *
 * @template T
 * @param {string} key            - localStorage key
 * @param {T}      initialValue   - Value to use when the key does not exist
 * @returns {[T, (value: T | ((prev: T) => T)) => void, () => void]}
 *   [storedValue, setValue, removeValue]
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialValue;
      if (raw === 'true') return true;
      if (raw === 'false') return false;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      try {
        const next = value instanceof Function ? value(storedValue) : value;
        setStoredValue(next);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            key,
            typeof next === 'object' ? JSON.stringify(next) : String(next),
          );
        }
      } catch (err) {
        console.error(`useLocalStorage: could not save "${key}"`, err);
      }
    },
    [key, storedValue],
  );

  const removeValue = useCallback(() => {
    setStoredValue(initialValue);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
