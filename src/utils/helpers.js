import fabricIconRaw from '../assets/icons/tags/loaders/fabric.svg?raw';
import forgeIconRaw from '../assets/icons/tags/loaders/forge.svg?raw';
import neoforgeIconRaw from '../assets/icons/tags/loaders/neoforge.svg?raw';
import quiltIconRaw from '../assets/icons/tags/loaders/quilt.svg?raw';

export const asyncPool = async (poolLimit, array, iteratorFn) => {
  const ret = [];
  const executing = new Set();
  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean).catch(clean);
    if (executing.size >= poolLimit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(ret);
};

export const formatNum = (n) =>
  new Intl.NumberFormat('en', { notation: 'compact' }).format(n);

export const STORAGE_KEY = 'mod_profiles';
export const DEBUG_KEY = 'mod_manager_debug';
export const THEME_KEY = 'mod_manager_theme';
export const FAST_SEARCH_KEY = 'mod_manager_fast_search';
export const LANGUAGE_KEY = 'mod_manager_language';
export const LOADER_KEY = 'mod_manager_loader';
export const VERSION_KEY = 'mod_manager_version';
export const FAVORITES_KEY = 'mod_manager_favorites';
export const SEARCH_HISTORY_KEY = 'mod_manager_search_history';
export const MAX_SEARCH_HISTORY = 50;
export const CONCURRENCY_LIMIT = 15;

export const LOADER_OPTIONS = [
  { value: 'fabric', label: 'Fabric' },
  { value: 'forge', label: 'Forge' },
  { value: 'neoforge', label: 'NeoForge' },
  { value: 'quilt', label: 'Quilt' },
];

export const LOADER_ICON_PATHS = {
  fabric:   fabricIconRaw,
  forge:    forgeIconRaw,
  neoforge: neoforgeIconRaw,
  quilt:    quiltIconRaw,
};

export const CATEGORY_OPTIONS = [
  { value: 'optimization', labelKey: 'optimization' },
  { value: 'technology', labelKey: 'technology' },
  { value: 'magic', labelKey: 'magic' },
  { value: 'adventure', labelKey: 'adventure' },
  { value: 'decoration', labelKey: 'decoration' },
  { value: 'equipment', labelKey: 'equipment' },
  { value: 'mobs', labelKey: 'mobs' },
  { value: 'library', labelKey: 'library' },
  { value: 'utility', labelKey: 'utility' },
  { value: 'worldgen', labelKey: 'worldgen' },
  { value: 'food', labelKey: 'food' },
  { value: 'storage', labelKey: 'storage' },
  { value: 'game-mechanics', labelKey: 'gameMechanics' },
];

export const ENVIRONMENT_OPTIONS = ['required', 'optional', 'unsupported'];

export const OTHER_FILTER_OPTIONS = [
  { value: 'open_source', labelKey: 'openSource' },
];
