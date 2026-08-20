import { useAppStore } from '@/store/useAppStore';
import type { Feature } from '../types';

export const selectionFeature: Feature = {
  id: 'selection',
  label: 'Selection',
  mount(engine) {
    const offs = [
      engine.on('selection.clear', () => useAppStore.getState().clearMods()),
      engine.on('selection.toggle', ({ id }) => useAppStore.getState().toggleMod(id)),
      engine.on('selection.add', ({ id }) => useAppStore.getState().addMod(id)),
      engine.on('selection.remove', ({ id }) => useAppStore.getState().removeMod(id)),
      engine.on('selection.replace', ({ ids }) => useAppStore.getState().replaceSelectedMods(ids)),
    ];
    return () => offs.forEach((off) => off());
  },
};
