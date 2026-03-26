// SVG imports – Next.js webpack is configured to return SVG files as raw strings.
import fabricIconRaw from '@/assets/icons/tags/loaders/fabric.svg';
import forgeIconRaw from '@/assets/icons/tags/loaders/forge.svg';
import neoforgeIconRaw from '@/assets/icons/tags/loaders/neoforge.svg';
import quiltIconRaw from '@/assets/icons/tags/loaders/quilt.svg';
import irisIconRaw from '@/assets/icons/tags/loaders/iris.svg';
import optifineIconRaw from '@/assets/icons/tags/loaders/optifine.svg';
import vanillaIconRaw from '@/assets/icons/tags/loaders/vanilla.svg';
import canvasIconRaw from '@/assets/icons/tags/loaders/canvas.svg';

// ---------------------------------------------------------------------------
// Async concurrency utility
// ---------------------------------------------------------------------------

/**
 * Run `iteratorFn` over every item in `array`, keeping at most `poolLimit`
 * promises in flight at a time. Resolves with the results in the same order
 * as the input array.
 */
export const asyncPool = async <T, R>(
  poolLimit: number,
  array: T[],
  iteratorFn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const ret: Promise<R>[] = [];
  const executing = new Set<Promise<R>>();
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

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export const formatNum = (n: number): string =>
  new Intl.NumberFormat('en', { notation: 'compact' }).format(n);

// ---------------------------------------------------------------------------
// LocalStorage keys
// ---------------------------------------------------------------------------

export const STORAGE_KEY = 'mod_profiles';
export const DEBUG_KEY = 'mod_manager_debug';
export const THEME_KEY = 'mod_manager_theme';
export const FAST_SEARCH_KEY = 'mod_manager_fast_search';
export const LANGUAGE_KEY = 'mod_manager_language';
export const LOADER_KEY = 'mod_manager_loader';
export const VERSION_KEY = 'mod_manager_version';
export const FAVORITES_KEY = 'mod_manager_favorites';
export const SEARCH_HISTORY_KEY = 'mod_manager_search_history';
export const SHOW_CARD_DESCRIPTION_KEY = 'mod_manager_show_card_description';
export const ADVANCED_CONSOLE_KEY = 'mod_manager_advanced_console';
export const DISCOVER_TYPE_KEY = 'mod_manager_discover_type';
export const CONTEXT_HISTORY_KEY = 'mod_manager_context_history';

// ---------------------------------------------------------------------------
// App-wide constants
// ---------------------------------------------------------------------------

/** Maps internal language codes to BCP 47 locale strings. */
export const LOCALE_MAP: Record<string, string> = { en: 'en-US', ja: 'ja-JP' };

export const MAX_SEARCH_HISTORY = 50;
export const MAX_CONTEXT_HISTORY = 50;
export const CONCURRENCY_LIMIT = 15;
export const FALLBACK_ICON = 'https://cdn.modrinth.com/assets/unknown_server.png';

export const LEVEL_COLORS: Record<string, string> = {
  log: '#cbd5e1',
  info: '#7dd3fc',
  warn: '#facc15',
  error: '#f87171',
};

// ---------------------------------------------------------------------------
// Loader / category / environment options
// ---------------------------------------------------------------------------

export interface LoaderOption {
  value: string;
  label: string;
}

export interface CategoryOption {
  value: string;
  labelKey: string;
}

export interface OtherFilterOption {
  value: string;
  labelKey: string;
}

export const LOADER_OPTIONS: LoaderOption[] = [
  { value: 'fabric', label: 'Fabric' },
  { value: 'forge', label: 'Forge' },
  { value: 'neoforge', label: 'NeoForge' },
  { value: 'quilt', label: 'Quilt' },
];

export const SHADER_LOADER_OPTIONS: LoaderOption[] = [
  { value: 'iris', label: 'Iris' },
  { value: 'optifine', label: 'OptiFine' },
  { value: 'vanilla-shader', label: 'Vanilla Shader' },
  { value: 'canvas', label: 'Canvas' },
];

/** Returns the loader options appropriate for a given discover project type. */
export function getLoaderOptions(projectType: string): LoaderOption[] {
  if (projectType === 'shader') return SHADER_LOADER_OPTIONS;
  if (projectType === 'resourcepack') return [];
  return LOADER_OPTIONS;
}

export const LOADER_ICON_PATHS: Record<string, string> = {
  fabric: fabricIconRaw,
  forge: forgeIconRaw,
  neoforge: neoforgeIconRaw,
  quilt: quiltIconRaw,
  iris: irisIconRaw,
  optifine: optifineIconRaw,
  'vanilla-shader': vanillaIconRaw,
  canvas: canvasIconRaw,
};

export const CATEGORY_OPTIONS: CategoryOption[] = [
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

export const ENVIRONMENT_OPTIONS: string[] = ['required', 'optional', 'unsupported'];

export const OTHER_FILTER_OPTIONS: OtherFilterOption[] = [
  { value: 'open_source', labelKey: 'openSource' },
];

/**
 * Converts a hyphenated or underscore-separated category name to Title Case.
 * e.g. "path-tracing" -> "Path Tracing", "game-mechanics" -> "Game Mechanics"
 */
export function formatCategoryName(name: string): string {
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Returns the localised label for a category header (e.g. "performance_impact").
 * Falls back to `formatCategoryName(header)` when no translation exists.
 */
export function getCategoryHeaderLabel(
  header: string,
  categoryHeaders: Record<string, unknown>,
): string {
  const direct = categoryHeaders[header];
  if (typeof direct === 'string') return direct;
  // Try camelCase lookup (e.g. 'performance_impact' -> 'performanceImpact')
  const camel = header.replace(/[-_]([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  const camelVal = categoryHeaders[camel];
  if (typeof camelVal === 'string') return camelVal;
  return formatCategoryName(header);
}

/**
 * Returns the localised label for a category name.
 * Falls back to `formatCategoryName(name)` when no translation exists.
 */
export function getCategoryLabel(
  name: string,
  categories: Record<string, unknown>,
): string {
  // Try direct lookup first (e.g. 'optimization', 'path-tracing')
  const direct = categories[name];
  if (typeof direct === 'string') return direct;
  // Try camelCase lookup for legacy keys (e.g. 'game-mechanics' -> 'gameMechanics')
  const camel = name.replace(/[-_]([a-z0-9])/gi, (_, c: string) => c.toUpperCase());
  const camelVal = categories[camel];
  if (typeof camelVal === 'string') return camelVal;
  return formatCategoryName(name);
}

// ---------------------------------------------------------------------------
// Search filters (shared between store, hooks, and components)
// ---------------------------------------------------------------------------

/** Filter state captured from the search UI. All values are nullable strings. */
export interface SearchFilters {
  loaders: Record<string, string | null>;
  categories?: Record<string, string | null>;
  environment?: { client_side: string | null; server_side: string | null };
  other?: Record<string, string | null>;
  version?: string;
}

/** Returns the number of filter controls that have a non-null selection. */
export function countActiveFilters(filters: SearchFilters): number {
  let count = 0;
  if (filters.loaders) count += Object.values(filters.loaders).filter(Boolean).length;
  if (filters.categories) count += Object.values(filters.categories).filter(Boolean).length;
  if (filters.environment) count += Object.values(filters.environment).filter(Boolean).length;
  if (filters.other) count += Object.values(filters.other).filter(Boolean).length;
  return count;
}

/**
 * Formats a Unix timestamp for display in a history list.
 * - Same day → time only (HH:MM, 24-hour)
 * - Different day → "Mon D HH:MM"
 */
export function formatHistoryTime(timestamp: number, locale: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return (
    date.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) +
    ' ' +
    date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })
  );
}
