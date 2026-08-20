import type { Feature } from '../types';

/** Keeps a compact in-memory view of feature health for the debug console. */
export const diagnosticsFeature: Feature = {
  id: 'diagnostics',
  label: 'Diagnostics',
  dependsOn: ['search', 'selection'],
  mount(engine) {
    return engine.on(
      'engine.error',
      ({ source, error }) => {
        if (typeof console !== 'undefined') {
          console.warn(`[M2D engine] ${source}: ${error}`);
        }
      },
      { priority: 100 },
    );
  },
};
