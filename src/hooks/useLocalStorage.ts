'use client';

import { useState, useCallback, useEffect } from 'react';
import { persistGet, persistSet, persistRemove, persistHydrate } from '@/lib/persist';

function readPersist<T>(key: string, initialValue: T): T {
  try {
    const raw = persistGet(key);
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
}

/**
 * Reads, writes, and removes a value from IndexedDB (via persist) while
 * keeping a matching React state value in sync.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => readPersist(key, initialValue));

  useEffect(() => {
    void persistHydrate().then(() => {
      setStoredValue(readPersist(key, initialValue));
    });
  }, [key, initialValue]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        try {
          const next = value instanceof Function ? value(prev) : value;
          persistSet(key, typeof next === 'object' ? JSON.stringify(next) : String(next));
          return next;
        } catch (err) {
          console.error(`useLocalStorage: could not save "${key}"`, err);
          return prev;
        }
      });
    },
    [key],
  );

  const removeValue = useCallback(() => {
    setStoredValue(initialValue);
    persistRemove(key);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
