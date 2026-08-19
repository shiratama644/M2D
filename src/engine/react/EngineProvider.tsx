'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { startAppEngine } from '../createEngine';
import type { Engine } from '../Engine';

const EngineContext = createContext<Engine | null>(null);

export function EngineProvider({ children }: { children: ReactNode }) {
  const [engine] = useState(() => startAppEngine());

  useEffect(() => {
    engine.start();
  }, [engine]);

  return <EngineContext.Provider value={engine}>{children}</EngineContext.Provider>;
}

export function useEngine(): Engine {
  const engine = useContext(EngineContext);
  if (!engine) {
    throw new Error('useEngine must be used inside EngineProvider');
  }
  return engine;
}
