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
export const CONCURRENCY_LIMIT = 15;

export const LOADER_OPTIONS = [
  { value: 'fabric', label: 'Fabric' },
  { value: 'forge', label: 'Forge' },
  { value: 'neoforge', label: 'NeoForge' },
  { value: 'quilt', label: 'Quilt' },
];
