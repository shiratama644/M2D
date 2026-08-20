import { useAppStore } from '@/store/useAppStore';
import type { Engine } from '../Engine';
import type { Feature } from '../types';

export const searchFeature: Feature = {
  id: 'search',
  label: 'Search',
  dependsOn: [],
  mount(engine: Engine) {
    const offCommit = engine.on('search.commit', (payload) => {
      if (payload.recordHistory === false) return;
      const { addSearchHistory, addContextHistory } = useAppStore.getState();
      if (payload.query?.trim()) addSearchHistory(payload.query.trim());
      addContextHistory({
        query: payload.query,
        sort: payload.sort,
        filters: payload.filters,
        projectType: payload.projectType,
      });
    });
    const offClear = engine.on('search.history.clear', () => {
      const { clearSearchHistory, clearContextHistory } = useAppStore.getState();
      clearSearchHistory();
      clearContextHistory();
    });
    const offRemove = engine.on('search.history.remove', ({ id }) => {
      useAppStore.getState().removeContextEntry(id);
    });
    return () => {
      offCommit();
      offClear();
      offRemove();
    };
  },
};
