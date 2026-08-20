import { useAppStore } from '@/store/useAppStore';
import type { Feature } from '../types';

export const selectionFeature: Feature = {
  id: 'selection',
  label: 'Selection',
  mount(engine) {
    const offClear = engine.on('selection.clear', () => {
      useAppStore.getState().clearMods();
    });
    const offToggle = engine.on('selection.toggle', ({ id }) => {
      useAppStore.getState().toggleMod(id);
    });
    return () => {
      offClear();
      offToggle();
    };
  },
};
