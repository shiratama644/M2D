'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { STORAGE_KEY, DEBUG_KEY, THEME_KEY, FAST_SEARCH_KEY, LANGUAGE_KEY, LOADER_KEY, VERSION_KEY, FAVORITES_KEY, SEARCH_HISTORY_KEY, SHOW_CARD_DESCRIPTION_KEY, ADVANCED_CONSOLE_KEY, MAX_SEARCH_HISTORY } from '../lib/helpers';
import translations from '../i18n/translations';

const AppContext = createContext(null);

// Safe localStorage helpers — no-op on the server during SSR.
const ls = {
  get:    (key)        => (typeof window !== 'undefined' ? localStorage.getItem(key) : null),
  set:    (key, value) => { if (typeof window !== 'undefined') localStorage.setItem(key, value); },
  remove: (key)        => { if (typeof window !== 'undefined') localStorage.removeItem(key); },
};

export function AppProvider({ children }) {
  const [theme, setTheme]                       = useState(() => ls.get(THEME_KEY) || 'dark');
  const [debugMode, setDebugMode]               = useState(() => ls.get(DEBUG_KEY) === 'true');
  const [fastSearch, setFastSearch]             = useState(() => ls.get(FAST_SEARCH_KEY) === 'true');
  const [showCardDescription, setShowCardDescription] = useState(() => ls.get(SHOW_CARD_DESCRIPTION_KEY) === 'true');
  const [advancedConsole, setAdvancedConsole]   = useState(() => ls.get(ADVANCED_CONSOLE_KEY) === 'true');
  const [language, setLanguage]                 = useState(() => ls.get(LANGUAGE_KEY) || 'en');
  const [modLoader, setModLoader]               = useState(() => ls.get(LOADER_KEY) || 'fabric');
  const [modVersion, setModVersion]             = useState(() => ls.get(VERSION_KEY) || '1.21.1');
  const [menuOpen, setMenuOpen]                 = useState(false);
  const [activeModId, setActiveModId]           = useState(null);

  const [favorites, setFavorites] = useState(() => {
    try { return new Set(JSON.parse(ls.get(FAVORITES_KEY) || '[]')); }
    catch { return new Set(); }
  });
  const [searchHistory, setSearchHistory] = useState(() => {
    try { return JSON.parse(ls.get(SEARCH_HISTORY_KEY) || '[]'); }
    catch { return []; }
  });
  const [profiles, setProfiles] = useState(() => {
    try { return JSON.parse(ls.get(STORAGE_KEY) || '[]'); }
    catch { return []; }
  });

  const [selectedMods, setSelectedMods] = useState(new Set());
  const [modDataMap, setModDataMap]     = useState({});

  // Loading overlay
  const [loading, setLoading] = useState({ visible: false, text: '', progress: null });

  // Modals
  const [settingsOpen, setSettingsOpen]         = useState(false);
  const [depModalOpen, setDepModalOpen]         = useState(false);
  const [selectedModalOpen, setSelectedModalOpen] = useState(false);

  // Custom dialog
  const [dialog, setDialog]       = useState(null);
  const dialogResolverRef         = useRef(null);

  const showAlert = useCallback((message) =>
    new Promise((resolve) => {
      dialogResolverRef.current = resolve;
      setDialog({ type: 'alert', message });
    }), []);

  const showConfirm = useCallback((message) =>
    new Promise((resolve) => {
      dialogResolverRef.current = resolve;
      setDialog({ type: 'confirm', message });
    }), []);

  const closeDialog = useCallback((result) => {
    const resolver = dialogResolverRef.current;
    dialogResolverRef.current = null;
    setDialog(null);
    if (resolver) resolver(result);
  }, []);

  // Debug logs (capped at 500 entries)
  const [debugLogs, setDebugLogs] = useState([]);
  const debugLogsRef = useRef([]);

  // ── Persist helpers ────────────────────────────────────────────────────────

  const toggleTheme = useCallback((value) => {
    setTheme(value);
    ls.set(THEME_KEY, value);
  }, []);

  const toggleDebug = useCallback((enabled) => {
    setDebugMode(enabled);
    ls.set(DEBUG_KEY, enabled);
  }, []);

  const toggleFastSearch = useCallback((enabled) => {
    setFastSearch(enabled);
    ls.set(FAST_SEARCH_KEY, enabled);
  }, []);

  const toggleShowCardDescription = useCallback((enabled) => {
    setShowCardDescription(enabled);
    ls.set(SHOW_CARD_DESCRIPTION_KEY, enabled);
  }, []);

  const toggleAdvancedConsole = useCallback((enabled) => {
    setAdvancedConsole(enabled);
    ls.set(ADVANCED_CONSOLE_KEY, enabled);
  }, []);

  const toggleLanguage = useCallback((lang) => {
    setLanguage(lang);
    ls.set(LANGUAGE_KEY, lang);
  }, []);

  const updateModLoader = useCallback((value) => {
    setModLoader(value);
    ls.set(LOADER_KEY, value);
  }, []);

  const updateModVersion = useCallback((value) => {
    setModVersion(value);
    ls.set(VERSION_KEY, value);
  }, []);

  // ── Debug log helpers ──────────────────────────────────────────────────────

  const addDebugLog = useCallback((level, msg) => {
    const entry = {
      level,
      msg,
      time: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
    };
    debugLogsRef.current = [...debugLogsRef.current.slice(-499), entry];
    setDebugLogs([...debugLogsRef.current]);
  }, []);

  const clearDebugLogs = useCallback(() => {
    debugLogsRef.current = [];
    setDebugLogs([]);
  }, []);

  // ── Loading overlay helpers ────────────────────────────────────────────────

  const showLoading = useCallback((text) => {
    setLoading({ visible: true, text, progress: null });
  }, []);

  const updateLoading = useCallback((text) => {
    setLoading((prev) => ({ ...prev, text }));
  }, []);

  const showProgress = useCallback((total) => {
    setLoading((prev) => ({
      ...prev,
      progress: {
        current: 0, total, percent: 0,
        progressText: total !== undefined ? `0 / ${total}` : '',
        etaText: 'ETA: Calculating...',
      },
    }));
  }, []);

  const updateProgress = useCallback((current, total, startTime) => {
    const percent = (current / total) * 100;
    let etaText = '';
    if (current > 0 && startTime) {
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = current / elapsed;
      const remaining = total - current;
      const eta = Math.ceil(remaining / speed);
      etaText = `ETA: ${eta > 60 ? `${Math.floor(eta / 60)}m ${eta % 60}s` : `${eta}s`}`;
    }
    setLoading((prev) => ({
      ...prev,
      progress: { current, total, percent, progressText: `${current} / ${total}`, etaText },
    }));
  }, []);

  const hideLoading = useCallback(() => {
    setLoading({ visible: false, text: '', progress: null });
  }, []);

  // ── Profile helpers ────────────────────────────────────────────────────────

  const saveProfiles = useCallback((newProfiles) => {
    setProfiles(newProfiles);
    ls.set(STORAGE_KEY, JSON.stringify(newProfiles));
  }, []);

  // ── Mod selection helpers ──────────────────────────────────────────────────

  const toggleMod = useCallback((id) => {
    setSelectedMods((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearMods = useCallback(() => setSelectedMods(new Set()), []);

  const addMod = useCallback((id) => {
    setSelectedMods((prev) => new Set([...prev, id]));
  }, []);

  const removeMod = useCallback((id) => {
    setSelectedMods((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const updateModDataMap = useCallback((updates) => {
    setModDataMap((prev) => ({ ...prev, ...updates }));
  }, []);

  const replaceSelectedMods = useCallback((modsArray) => {
    setSelectedMods(new Set(modsArray));
  }, []);

  // ── Favorites helpers ──────────────────────────────────────────────────────

  const toggleFavorite = useCallback((id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      ls.set(FAVORITES_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setFavorites(new Set());
    ls.remove(FAVORITES_KEY);
  }, []);

  // ── Search history helpers ─────────────────────────────────────────────────

  const addSearchHistory = useCallback((query) => {
    if (!query?.trim()) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((q) => q !== query.trim());
      const next = [query.trim(), ...filtered].slice(0, MAX_SEARCH_HISTORY);
      ls.set(SEARCH_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeSearchHistory = useCallback((query) => {
    setSearchHistory((prev) => {
      const next = prev.filter((q) => q !== query);
      ls.set(SEARCH_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    ls.remove(SEARCH_HISTORY_KEY);
  }, []);

  // ── Context value ──────────────────────────────────────────────────────────

  const value = {
    theme, toggleTheme,
    debugMode, toggleDebug,
    fastSearch, toggleFastSearch,
    showCardDescription, toggleShowCardDescription,
    advancedConsole, toggleAdvancedConsole,
    language, toggleLanguage,
    modLoader, updateModLoader,
    modVersion, updateModVersion,
    t: translations[language],
    menuOpen, setMenuOpen,
    activeModId, setActiveModId,
    favorites, toggleFavorite, clearFavorites,
    searchHistory, addSearchHistory, removeSearchHistory, clearSearchHistory,
    profiles, saveProfiles,
    selectedMods, toggleMod, clearMods, addMod, removeMod, replaceSelectedMods,
    modDataMap, updateModDataMap,
    loading, showLoading, updateLoading, showProgress, updateProgress, hideLoading,
    settingsOpen, setSettingsOpen,
    depModalOpen, setDepModalOpen,
    selectedModalOpen, setSelectedModalOpen,
    debugLogs, addDebugLog, clearDebugLogs,
    dialog, showAlert, showConfirm, closeDialog,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
