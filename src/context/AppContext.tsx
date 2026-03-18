'use client';

import React from 'react';

export { useAppStore as useApp } from '../store/useAppStore';
export { useAppStore } from '../store/useAppStore';

export function AppProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
