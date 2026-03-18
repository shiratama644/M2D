'use client';

import { create } from 'zustand';
import translations, { type Translation } from '../i18n/translations';
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
  MAX_SEARCH_HISTORY,
} from '../lib/helpers';

// Safe localStorage helpers — no-op on the server during SSR.
const ls = {
  get: (key: string): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem(key) : null,
  set: (key: string, value: string): void => {
    if (typeof window !== 'undefined') localStorage.setItem(key, value);
  },
  remove: (key: string): void => {
    if (typeof window !== 'undefined') localStorage.removeItem(key);
  },
};

// Module-level ref for dialog promise resolution (not a React ref).
let dialogResolver: ((result?: boolean) => void) | null = null;

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

  // Debug logs
  debugLogs: DebugLog[];
  addDebugLog: (level: string, msg: string) => void;
  clearDebugLogs: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // ── Settings ──────────────────────────────────────────────────────────────

  theme: ls.get(THEME_KEY) || 'dark',
  toggleTheme: (value) => {
    set({ theme: value, t: translations[value as keyof typeof translations] ?? get().t });
    ls.set(THEME_KEY, value);
  },

  debugMode: ls.get(DEBUG_KEY) === 'true',
  toggleDebug: (enabled) => {
    set({ debugMode: enabled });
    ls.set(DEBUG_KEY, String(enabled));
  },

  fastSearch: ls.get(FAST_SEARCH_KEY) === 'true',
  toggleFastSearch: (enabled) => {
    set({ fastSearch: enabled });
    ls.set(FAST_SEARCH_KEY, String(enabled));
  },

  showCardDescription: ls.get(SHOW_CARD_DESCRIPTION_KEY) === 'true',
  toggleShowCardDescription: (enabled) => {
    set({ showCardDescription: enabled });
    ls.set(SHOW_CARD_DESCRIPTION_KEY, String(enabled));
  },

  advancedConsole: ls.get(ADVANCED_CONSOLE_KEY) === 'true',
  toggleAdvancedConsole: (enabled) => {
    set({ advancedConsole: enabled });
    ls.set(ADVANCED_CONSOLE_KEY, String(enabled));
  },

  language: ls.get(LANGUAGE_KEY) || 'en',
  toggleLanguage: (lang) => {
    const t = translations[lang as keyof typeof translations] ?? translations.en;
    set({ language: lang, t });
    ls.set(LANGUAGE_KEY, lang);
  },

  modLoader: ls.get(LOADER_KEY) || 'fabric',
  updateModLoader: (value) => {
    set({ modLoader: value });
    ls.set(LOADER_KEY, value);
  },

  modVersion: ls.get(VERSION_KEY) || '1.21.1',
  updateModVersion: (value) => {
    set({ modVersion: value });
    ls.set(VERSION_KEY, value);
  },

  // ── Derived ───────────────────────────────────────────────────────────────

  get t(): Translation {
    const lang = ls.get(LANGUAGE_KEY) || 'en';
    return translations[lang as keyof typeof translations] ?? translations.en;
  },

  // ── UI State ──────────────────────────────────────────────────────────────

  menuOpen: false,
  setMenuOpen: (v) => set({ menuOpen: v }),

  activeModId: null,
  setActiveModId: (v) => set({ activeModId: v }),

  settingsOpen: false,
  setSettingsOpen: (v) => set({ settingsOpen: v }),

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

  profiles: (() => {
    try {
      return JSON.parse(ls.get(STORAGE_KEY) || '[]') as Profile[];
    } catch {
      return [];
    }
  })(),

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
      return { selectedMods: next };
    });
  },

  clearMods: () => set({ selectedMods: new Set<string>() }),

  addMod: (id) => {
    set((state) => ({ selectedMods: new Set([...state.selectedMods, id]) }));
  },

  removeMod: (id) => {
    set((state) => {
      const next = new Set(state.selectedMods);
      next.delete(id);
      return { selectedMods: next };
    });
  },

  replaceSelectedMods: (mods) => {
    set({ selectedMods: new Set(mods) });
  },

  // ── Mod data map ──────────────────────────────────────────────────────────

  modDataMap: {},

  updateModDataMap: (updates) => {
    set((state) => ({ modDataMap: { ...state.modDataMap, ...updates } }));
  },

  // ── Favorites ─────────────────────────────────────────────────────────────

  favorites: (() => {
    try {
      return new Set<string>(JSON.parse(ls.get(FAVORITES_KEY) || '[]'));
    } catch {
      return new Set<string>();
    }
  })(),

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

  searchHistory: (() => {
    try {
      return JSON.parse(ls.get(SEARCH_HISTORY_KEY) || '[]') as string[];
    } catch {
      return [];
    }
  })(),

  addSearchHistory: (query) => {
    if (!query?.trim()) return;
    set((state) => {
      const filtered = state.searchHistory.filter((q) => q !== query.trim());
      const next = [query.trim(), ...filtered].slice(0, MAX_SEARCH_HISTORY);
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

  // ── Debug logs ────────────────────────────────────────────────────────────

  debugLogs: [],

  addDebugLog: (level, msg) => {
    const entry: DebugLog = {
      level,
      msg,
      time: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
    };
    set((state) => ({
      debugLogs: [...state.debugLogs.slice(-499), entry],
    }));
  },

  clearDebugLogs: () => set({ debugLogs: [] }),
}));
