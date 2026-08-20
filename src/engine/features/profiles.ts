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
    const offDelete = engine.on('profiles.delete', ({ index }) => {
      const { profiles, saveProfiles } = useAppStore.getState();
      saveProfiles(profiles.filter((_, i) => i !== index));
    });
    const offRename = engine.on('profiles.rename', ({ index, name }) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const { profiles, saveProfiles } = useAppStore.getState();
      if (profiles.some((p, i) => i !== index && p.name === trimmed)) return;
      saveProfiles(profiles.map((p, i) => (i === index ? { ...p, name: trimmed } : p)));
    });
    const offImport = engine.on('profiles.import', ({ name, mods }) => {
      const { profiles, saveProfiles } = useAppStore.getState();
      saveProfiles([...profiles, { name, mods, date: new Date().toLocaleDateString() }]);
    });
    return () => {
      offSave();
      offLoad();
      offDelete();
      offRename();
      offImport();
    };
  },
};
