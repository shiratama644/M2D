import { useAppStore } from '@/store/useAppStore';
import type { Feature } from '../types';

export const settingsFeature: Feature = {
  id: 'settings',
  label: 'Settings',
  mount(engine) {
    const offs = [
      engine.on('settings.theme', ({ value }) => useAppStore.getState().toggleTheme(value)),
      engine.on('settings.language', ({ value }) => useAppStore.getState().toggleLanguage(value)),
      engine.on('settings.loader', ({ value }) => useAppStore.getState().updateModLoader(value)),
      engine.on('settings.version', ({ value }) => useAppStore.getState().updateModVersion(value)),
      engine.on('settings.flag', ({ key, value }) => {
        const s = useAppStore.getState();
        if (key === 'debug') s.toggleDebug(value);
        else if (key === 'fastSearch') s.toggleFastSearch(value);
        else if (key === 'showCardDescription') s.toggleShowCardDescription(value);
        else s.toggleAdvancedConsole(value);
      }),
      engine.on('search.history.clear', () => useAppStore.getState().clearSearchHistory()),
      engine.on('discover.set', ({ type }) => useAppStore.getState().setDiscoverType(type)),
      engine.on('mods.activate', ({ id }) => useAppStore.getState().setActiveModId(id)),
    ];
    return () => offs.forEach((off) => off());
  },
};
