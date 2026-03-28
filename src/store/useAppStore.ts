'use client';

import { create } from 'zustand';
import translations, { type Translation } from '@/i18n/translations';
import {
  STORAGE_KEY,
  DEBUG_KEY,
  THEME_KEY,
  FAST_SEARCH_KEY,
  LANGUAGE_KEY,
  LOADER_KEY,
  VERSION_KEY,
  FAVORITES_KEY,
  SEARCH_HISTORY_KEY,
  SHOW_CARD_DESCRIPTION_KEY,
  ADVANCED_CONSOLE_KEY,
  DISCOVER_TYPE_KEY,
  CONTEXT_HISTORY_KEY,
  MAX_SEARCH_HISTORY,
  MAX_CONTEXT_HISTORY,
  LOCALE_MAP,
  type SearchFilters,
} from '@/lib/helpers';
import { ls } from '@/lib/localStorage';

/** Serialize an object to JSON with keys sorted so key-order differences don't break equality. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  const sorted = Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = stableStringify((value as Record<string, unknown>)[k]);
      return acc;
    }, {});
  return JSON.stringify(sorted);
}

/** Safely parse a JSON string from localStorage, returning fallback on failure. */
function parseJSON<T>(key: string, fallback: T): T {
  try {
    const raw = ls.get(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export type DiscoverType = 'mod' | 'modpack' | 'resourcepack' | 'shader';

/**
 * An immutable snapshot of the full search context at the moment a search was
 * committed. Entries are append-only and never mutated after creation.
 */
export interface SearchContextEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly query: string;
  readonly sort: string;
  readonly filters: SearchFilters;
  readonly projectType: DiscoverType;
}

export interface Profile {
  name: string;
  mods: string[];
  date: string;
}

export interface DebugLog {
  level: string;
  msg: string;
  time: string;
}

export interface LoadingProgress {
  current: number;
  total: number;
  percent: number;
  progressText: string;
  etaText: string;
}

export interface LoadingState {
  visible: boolean;
  text: string;
  progress: LoadingProgress | null;
}

export interface DialogState {
  type: 'alert' | 'confirm';
  message: string;
}

export interface AppState {
  // Settings (persisted)
  theme: string;
  toggleTheme: (v: string) => void;
  debugMode: boolean;
  toggleDebug: (v: boolean) => void;
  fastSearch: boolean;
  toggleFastSearch: (v: boolean) => void;
  showCardDescription: boolean;
  toggleShowCardDescription: (v: boolean) => void;
  advancedConsole: boolean;
  toggleAdvancedConsole: (v: boolean) => void;
  language: string;
  toggleLanguage: (v: string) => void;
  modLoader: string;
  updateModLoader: (v: string) => void;
  modVersion: string;
  updateModVersion: (v: string) => void;

  // Derived
  t: Translation;

  // UI State
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  activeModId: string | null;
  setActiveModId: (v: string | null) => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  historyModalOpen: boolean;
  setHistoryModalOpen: (v: boolean) => void;
  favoritesModalOpen: boolean;
  setFavoritesModalOpen: (v: boolean) => void;
  depModalOpen: boolean;
  setDepModalOpen: (v: boolean) => void;
  selectedModalOpen: boolean;
  setSelectedModalOpen: (v: boolean) => void;

  // Custom dialog
  dialog: DialogState | null;
  showAlert: (message: string) => Promise<undefined>;
  showConfirm: (message: string) => Promise<boolean>;
  closeDialog: (result?: boolean) => void;

  // Loading overlay
  loading: LoadingState;
  showLoading: (text: string) => void;
  updateLoading: (text: string) => void;
  showProgress: (total?: number) => void;
  updateProgress: (current: number, total: number, startTime: number) => void;
  hideLoading: () => void;

  // Profiles (persisted)
  profiles: Profile[];
  saveProfiles: (profiles: Profile[]) => void;

  // Selected mods
  selectedMods: Set<string>;
  toggleMod: (id: string) => void;
  clearMods: () => void;
  addMod: (id: string) => void;
  removeMod: (id: string) => void;
  replaceSelectedMods: (mods: string[]) => void;

  // Discover type (project type selector)
  discoverType: DiscoverType;
  setDiscoverType: (type: DiscoverType) => void;
  selectedModsByType: Record<DiscoverType, Set<string>>;

  // Mod data map (id -> mod metadata)
  modDataMap: Record<string, unknown>;
  updateModDataMap: (updates: Record<string, unknown>) => void;

  // Favorites (persisted)
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  clearFavorites: () => void;

  // Search history (persisted)
  searchHistory: string[];
  addSearchHistory: (query: string) => void;
  removeSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;

  // Context history — immutable snapshots of committed search contexts (persisted)
  contextHistory: SearchContextEntry[];
  addContextHistory: (entry: { query: string; sort: string; filters: SearchFilters; projectType: DiscoverType }) => void;
  removeContextEntry: (id: string) => void;
  clearContextHistory: () => void;

  // Debug logs
  debugLogs: DebugLog[];
  addDebugLog: (level: string, msg: string) => void;
  clearDebugLogs: () => void;

  // Hydration — loads all persisted values from localStorage on the client.
  hydrate: () => void;
}

let dialogResolver: ((result?: boolean) => void) | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  // ── Settings ──────────────────────────────────────────────────────────────
  // Initial values are SSR-safe defaults. Persisted values are loaded from
  // localStorage after mount via hydrate() to avoid SSR/client mismatches.

  theme: 'dark',
  toggleTheme: (value) => {
    set({ theme: value });
    ls.set(THEME_KEY, value);
  },

  debugMode: false,
  toggleDebug: (enabled) => {
    set({ debugMode: enabled });
    ls.set(DEBUG_KEY, String(enabled));
  },

  fastSearch: false,
  toggleFastSearch: (enabled) => {
    set({ fastSearch: enabled });
    ls.set(FAST_SEARCH_KEY, String(enabled));
  },

  showCardDescription: false,
  toggleShowCardDescription: (enabled) => {
    set({ showCardDescription: enabled });
    ls.set(SHOW_CARD_DESCRIPTION_KEY, String(enabled));
  },

  advancedConsole: false,
  toggleAdvancedConsole: (enabled) => {
    set({ advancedConsole: enabled });
    ls.set(ADVANCED_CONSOLE_KEY, String(enabled));
  },

  language: 'en',
  toggleLanguage: (lang) => {
    const t = translations[lang as keyof typeof translations] ?? translations.en;
    set({ language: lang, t });
    ls.set(LANGUAGE_KEY, lang);
  },

  modLoader: 'fabric',
  updateModLoader: (value) => {
    set({ modLoader: value });
    ls.set(LOADER_KEY, value);
  },

  modVersion: '1.21.1',
  updateModVersion: (value) => {
    set({ modVersion: value });
    ls.set(VERSION_KEY, value);
  },

  // ── Discover type ─────────────────────────────────────────────────────────

  discoverType: 'mod',

  selectedModsByType: {
    mod: new Set<string>(),
    modpack: new Set<string>(),
    resourcepack: new Set<string>(),
    shader: new Set<string>(),
  },

  setDiscoverType: (type) => {
    set((state) => ({
      discoverType: type,
      selectedMods: state.selectedModsByType[type],
    }));
    ls.set(DISCOVER_TYPE_KEY, type);
  },

  // ── Derived ───────────────────────────────────────────────────────────────
  t: translations.en,

  // ── UI State ──────────────────────────────────────────────────────────────

  menuOpen: false,
  setMenuOpen: (v) => set({ menuOpen: v }),

  activeModId: null,
  setActiveModId: (v) => set({ activeModId: v }),

  settingsOpen: false,
  setSettingsOpen: (v) => set({ settingsOpen: v }),

  historyModalOpen: false,
  setHistoryModalOpen: (v) => set({ historyModalOpen: v }),

  favoritesModalOpen: false,
  setFavoritesModalOpen: (v) => set({ favoritesModalOpen: v }),

  depModalOpen: false,
  setDepModalOpen: (v) => set({ depModalOpen: v }),

  selectedModalOpen: false,
  setSelectedModalOpen: (v) => set({ selectedModalOpen: v }),

  // ── Custom dialog ─────────────────────────────────────────────────────────

  dialog: null,

  showAlert: (message) =>
    new Promise<undefined>((resolve) => {
      dialogResolver = resolve as (result?: boolean) => void;
      set({ dialog: { type: 'alert', message } });
    }),

  showConfirm: (message) =>
    new Promise<boolean>((resolve) => {
      dialogResolver = resolve as (result?: boolean) => void;
      set({ dialog: { type: 'confirm', message } });
    }),

  closeDialog: (result) => {
    const resolver = dialogResolver;
    dialogResolver = null;
    set({ dialog: null });
    if (resolver) resolver(result);
  },

  // ── Loading overlay ───────────────────────────────────────────────────────

  loading: { visible: false, text: '', progress: null },

  showLoading: (text) => {
    set({ loading: { visible: true, text, progress: null } });
  },

  updateLoading: (text) => {
    set((state) => ({ loading: { ...state.loading, text } }));
  },

  showProgress: (total) => {
    set((state) => ({
      loading: {
        ...state.loading,
        progress: {
          current: 0,
          total: total ?? 0,
          percent: 0,
          progressText: total !== undefined ? `0 / ${total}` : '',
          etaText: 'ETA: Calculating...',
        },
      },
    }));
  },

  updateProgress: (current, total, startTime) => {
    const percent = (current / total) * 100;
    let etaText = '';
    if (current > 0 && startTime) {
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = current / elapsed;
      const remaining = total - current;
      const eta = Math.ceil(remaining / speed);
      etaText = `ETA: ${eta > 60 ? `${Math.floor(eta / 60)}m ${eta % 60}s` : `${eta}s`}`;
    }
    set((state) => ({
      loading: {
        ...state.loading,
        progress: { current, total, percent, progressText: `${current} / ${total}`, etaText },
      },
    }));
  },

  hideLoading: () => {
    set({ loading: { visible: false, text: '', progress: null } });
  },

  // ── Profiles ──────────────────────────────────────────────────────────────

  profiles: [],

  saveProfiles: (newProfiles) => {
    set({ profiles: newProfiles });
    ls.set(STORAGE_KEY, JSON.stringify(newProfiles));
  },

  // ── Selected mods ─────────────────────────────────────────────────────────

  selectedMods: new Set<string>(),

  toggleMod: (id) => {
    set((state) => {
      const next = new Set(state.selectedMods);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return {
        selectedMods: next,
        selectedModsByType: { ...state.selectedModsByType, [state.discoverType]: next },
      };
    });
  },

  clearMods: () => set((state) => ({
    selectedMods: new Set<string>(),
    selectedModsByType: { ...state.selectedModsByType, [state.discoverType]: new Set<string>() },
  })),

  addMod: (id) => {
    set((state) => {
      const next = new Set([...state.selectedMods, id]);
      return {
        selectedMods: next,
        selectedModsByType: { ...state.selectedModsByType, [state.discoverType]: next },
      };
    });
  },

  removeMod: (id) => {
    set((state) => {
      const next = new Set(state.selectedMods);
      next.delete(id);
      return {
        selectedMods: next,
        selectedModsByType: { ...state.selectedModsByType, [state.discoverType]: next },
      };
    });
  },

  replaceSelectedMods: (mods) => {
    set((state) => {
      const next = new Set(mods);
      return {
        selectedMods: next,
        selectedModsByType: { ...state.selectedModsByType, [state.discoverType]: next },
      };
    });
  },

  // ── Mod data map ──────────────────────────────────────────────────────────

  modDataMap: {},

  updateModDataMap: (updates) => {
    set((state) => {
      const merged = { ...state.modDataMap, ...updates };
      // Cap at 500 entries to avoid unbounded memory growth (LRU: drop oldest keys first).
      const keys = Object.keys(merged);
      if (keys.length <= 500) return { modDataMap: merged };
      const trimmed: Record<string, unknown> = {};
      for (const k of keys.slice(keys.length - 500)) trimmed[k] = merged[k];
      return { modDataMap: trimmed };
    });
  },

  // ── Favorites ─────────────────────────────────────────────────────────────

  favorites: new Set<string>(),

  toggleFavorite: (id) => {
    set((state) => {
      const next = new Set(state.favorites);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      ls.set(FAVORITES_KEY, JSON.stringify(Array.from(next)));
      return { favorites: next };
    });
  },

  clearFavorites: () => {
    set({ favorites: new Set<string>() });
    ls.remove(FAVORITES_KEY);
  },

  // ── Search history ────────────────────────────────────────────────────────

  searchHistory: [],

  addSearchHistory: (query) => {
    if (!query?.trim()) return;
    set((state) => {
      const trimmed = query.trim();
      const set_ = new Set(state.searchHistory);
      set_.delete(trimmed);
      const next = [trimmed, ...set_].slice(0, MAX_SEARCH_HISTORY);
      ls.set(SEARCH_HISTORY_KEY, JSON.stringify(next));
      return { searchHistory: next };
    });
  },

  removeSearchHistory: (query) => {
    set((state) => {
      const next = state.searchHistory.filter((q) => q !== query);
      ls.set(SEARCH_HISTORY_KEY, JSON.stringify(next));
      return { searchHistory: next };
    });
  },

  clearSearchHistory: () => {
    set({ searchHistory: [] });
    ls.remove(SEARCH_HISTORY_KEY);
  },

  // ── Context history ───────────────────────────────────────────────────────

  contextHistory: [],

  addContextHistory: (entry) => {
    const { contextHistory } = get();
    // Constraint 1 & 4: append-only, deduplicated — compare against the last entry only.
    const last = contextHistory[contextHistory.length - 1];
    if (
      last &&
      last.query === entry.query &&
      last.sort === entry.sort &&
      last.projectType === entry.projectType &&
      stableStringify(last.filters) === stableStringify(entry.filters)
    ) return;

    const newEntry: SearchContextEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      query: entry.query,
      sort: entry.sort,
      filters: entry.filters,
      projectType: entry.projectType,
    };

    // Constraint 2: entry is treated as immutable once stored.
    // Constraint 5: this array is derived from searchContext, never the other way.
    const next = [...contextHistory, newEntry].slice(-MAX_CONTEXT_HISTORY);
    ls.set(CONTEXT_HISTORY_KEY, JSON.stringify(next));
    set({ contextHistory: next });
  },

  removeContextEntry: (id) => {
    set((state) => {
      const next = state.contextHistory.filter((e) => e.id !== id);
      ls.set(CONTEXT_HISTORY_KEY, JSON.stringify(next));
      return { contextHistory: next };
    });
  },

  clearContextHistory: () => {
    set({ contextHistory: [] });
    ls.remove(CONTEXT_HISTORY_KEY);
  },

  // ── Debug logs ────────────────────────────────────────────────────────────

  debugLogs: [],

  addDebugLog: (level, msg) => {
    const lang = get().language;
    const locale = LOCALE_MAP[lang] ?? 'en-US';
    const entry: DebugLog = {
      level,
      msg,
      time: new Date().toLocaleTimeString(locale, { hour12: false }),
    };
    set((state) => ({
      debugLogs: [...state.debugLogs.slice(-499), entry],
    }));
  },

  clearDebugLogs: () => set({ debugLogs: [] }),

  // ── Hydration ─────────────────────────────────────────────────────────────

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const language = ls.get(LANGUAGE_KEY) || 'en';
    const t = translations[language as keyof typeof translations] ?? translations.en;
    set({
      theme: ls.get(THEME_KEY) || 'dark',
      debugMode: ls.get(DEBUG_KEY) === 'true',
      fastSearch: ls.get(FAST_SEARCH_KEY) === 'true',
      showCardDescription: ls.get(SHOW_CARD_DESCRIPTION_KEY) === 'true',
      advancedConsole: ls.get(ADVANCED_CONSOLE_KEY) === 'true',
      language,
      t,
      modLoader: ls.get(LOADER_KEY) || 'fabric',
      modVersion: ls.get(VERSION_KEY) || '1.21.1',
      discoverType: (ls.get(DISCOVER_TYPE_KEY) as DiscoverType | null) || 'mod',
      profiles: parseJSON<Profile[]>(STORAGE_KEY, []),
      favorites: new Set<string>(parseJSON<string[]>(FAVORITES_KEY, [])),
      searchHistory: parseJSON<string[]>(SEARCH_HISTORY_KEY, []),
      contextHistory: parseJSON<SearchContextEntry[]>(CONTEXT_HISTORY_KEY, []),
    });
  },
}));
