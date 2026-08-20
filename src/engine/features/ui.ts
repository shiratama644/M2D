import { useAppStore } from '@/store/useAppStore';
import type { Feature } from '../types';

export const uiFeature: Feature = {
  id: 'ui',
  label: 'UI chrome',
  mount(engine) {
    const setPanel = (panel: string, open: boolean) => {
      const s = useAppStore.getState();
      if (panel === 'menu') s.setMenuOpen(open);
      else if (panel === 'settings') s.setSettingsOpen(open);
      else if (panel === 'history') s.setHistoryModalOpen(open);
      else if (panel === 'favorites') s.setFavoritesModalOpen(open);
      else if (panel === 'selected') s.setSelectedModalOpen(open);
      else if (panel === 'deps') s.setDepModalOpen(open);
    };
    const offOpen = engine.on('ui.open', ({ panel }) => setPanel(panel, true));
    const offClose = engine.on('ui.close', ({ panel }) => setPanel(panel, false));
    return () => {
      offOpen();
      offClose();
    };
  },
};
