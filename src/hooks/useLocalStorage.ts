'use client';

import { useState, useCallback } from 'react';

/**
 * Reads, writes, and removes a value from localStorage while keeping a
 * matching React state value in sync.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialValue;
      if (raw === 'true') return true as unknown as T;
      if (raw === 'false') return false as unknown as T;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
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
