import { useAppStore } from '@/store/useAppStore';
import type { Feature } from '../types';

export const favoritesFeature: Feature = {
  id: 'favorites',
  label: 'Favorites',
  mount(engine) {
    const offToggle = engine.on('favorites.toggle', ({ id }) => {
      useAppStore.getState().toggleFavorite(id);
    });
    const offClear = engine.on('favorites.clear', () => {
      useAppStore.getState().clearFavorites();
    });
    return () => {
      offToggle();
      offClear();
    };
  },
};
