import { useAppStore } from '@/store/useAppStore';
import type { Feature } from '../types';

export const selectionFeature: Feature = {
  id: 'selection',
  label: 'Selection',
  mount(engine) {
    return engine.on('selection.clear', () => {
      useAppStore.getState().clearMods();
    });
  },
};
