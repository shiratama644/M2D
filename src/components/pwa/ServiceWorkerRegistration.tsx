'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => {
        console.error('SW registration failed:', err);
        useAppStore.getState().addDebugLog('warn', `Service worker failed: ${err}`);
      });
  }, []);

  return null;
}
