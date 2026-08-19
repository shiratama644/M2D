import { useAppStore } from '@/store/useAppStore';
import type { Feature } from '../types';

export const profilesFeature: Feature = {
  id: 'profiles',
  label: 'Profiles',
  mount(engine) {
    const offSave = engine.on('profiles.save', ({ name }) => {
      const { selectedMods, profiles, saveProfiles } = useAppStore.getState();
      const trimmed = name.trim();
      if (!trimmed || selectedMods.size === 0) return;
      if (profiles.some((p) => p.name === trimmed)) return;
      saveProfiles([
        ...profiles,
        { name: trimmed, mods: Array.from(selectedMods), date: new Date().toLocaleDateString() },
      ]);
    });
    const offLoad = engine.on('profiles.load', ({ index }) => {
      const { profiles, replaceSelectedMods } = useAppStore.getState();
      const profile = profiles[index];
      if (!profile) return;
      replaceSelectedMods(profile.mods);
    });
    return () => {
      offSave();
      offLoad();
    };
  },
};
