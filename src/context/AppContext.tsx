'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export { useAppStore as useApp } from '@/store/useAppStore';
export { useAppStore } from '@/store/useAppStore';

function StoreHydrator() {
  const hydrate = useAppStore((state) => state.hydrate);
  useEffect(() => {
    hydrate();
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
