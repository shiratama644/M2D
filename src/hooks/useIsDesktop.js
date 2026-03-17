'use client';

import { useSyncExternalStore } from 'react';

const DESKTOP_QUERY = '(min-width: 1024px)';

function subscribe(callback) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

const getSnapshot       = () => window.matchMedia(DESKTOP_QUERY).matches;
const getServerSnapshot = () => false; // safe SSR default

/**
 * Returns `true` when the viewport is at least 1024 px wide.
 * Uses useSyncExternalStore for SSR-safe, effect-free reactive updates.
 */
export function useIsDesktop() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
