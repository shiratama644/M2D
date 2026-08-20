'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export { useAppStore as useApp } from '@/store/useAppStore';
export { useAppStore } from '@/store/useAppStore';

function StoreHydrator() {
  const hydrate = useAppStore((state) => state.hydrate);
  useEffect(() => {
    void hydrate();
    // hydrate() reads IndexedDB and is intentionally called only once on
    // mount. Including it in the deps array would cause spurious re-hydrations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StoreHydrator />
      {children}
    </>
  );
}
